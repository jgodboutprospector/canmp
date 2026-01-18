import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
  uploadDonationPhoto,
  deleteFromS3,
  isValidImageType,
  getMaxFileSize,
} from '@/lib/services/s3';
import { requireAuth } from '@/lib/auth-server';
import { handleApiError } from '@/lib/api-error';

// GET /api/donations/photos - Get photos for a donation item
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    await requireAuth();

    const supabase = getSupabaseAdmin() as any;
    const { searchParams } = new URL(request.url);
    const donationItemId = searchParams.get('donation_item_id');

    if (!donationItemId) {
      return NextResponse.json(
        { success: false, error: 'donation_item_id is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('donation_photos')
      .select('*')
      .eq('donation_item_id', donationItemId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching photos:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/donations/photos - Upload a photo
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    await requireAuth();

    const supabase = getSupabaseAdmin() as any;
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const donationItemId = formData.get('donation_item_id') as string;
    const isPrimary = formData.get('is_primary') === 'true';

    if (!file || !donationItemId) {
      return NextResponse.json(
        { success: false, error: 'file and donation_item_id are required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!isValidImageType(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only images are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > getMaxFileSize()) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to S3
    const uploadResult = await uploadDonationPhoto(
      buffer,
      donationItemId,
      file.name,
      file.type
    );

    if (!uploadResult.success) {
      return NextResponse.json(
        { success: false, error: uploadResult.error },
        { status: 500 }
      );
    }

    // If this is the primary photo, unset other primaries
    if (isPrimary) {
      await supabase
        .from('donation_photos')
        .update({ is_primary: false })
        .eq('donation_item_id', donationItemId);
    }

    // Get current max sort order
    const { data: existingPhotos } = await supabase
      .from('donation_photos')
      .select('sort_order')
      .eq('donation_item_id', donationItemId)
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextSortOrder = existingPhotos?.[0]?.sort_order
      ? existingPhotos[0].sort_order + 1
      : 0;

    // Save to database
    const { data, error } = await supabase
      .from('donation_photos')
      .insert({
        donation_item_id: donationItemId,
        s3_url: uploadResult.url,
        s3_key: uploadResult.key,
        original_filename: file.name,
        file_size: file.size,
        mime_type: file.type,
        sort_order: nextSortOrder,
        is_primary: isPrimary,
      })
      .select()
      .single();

    if (error) {
      // Cleanup S3 if database insert fails
      if (uploadResult.key) {
        await deleteFromS3(uploadResult.key);
      }
      console.error('Error saving photo to database:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Update the donation item's image_path if this is the primary or first photo
    if (isPrimary || nextSortOrder === 0) {
      await supabase
        .from('donation_items')
        .update({ image_path: uploadResult.url })
        .eq('id', donationItemId);
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/donations/photos - Delete a photo
export async function DELETE(request: NextRequest) {
  try {
    // Require authentication
    await requireAuth();

    const supabase = getSupabaseAdmin() as any;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Photo ID is required' },
        { status: 400 }
      );
    }

    // Get the photo record first
    const { data: photo, error: fetchError } = await supabase
      .from('donation_photos')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !photo) {
      return NextResponse.json(
        { success: false, error: 'Photo not found' },
        { status: 404 }
      );
    }

    // Delete from S3
    const s3Deleted = await deleteFromS3(photo.s3_key);
    if (!s3Deleted) {
      console.warn('Failed to delete photo from S3:', photo.s3_key);
    }

    // Delete from database
    const { error } = await supabase
      .from('donation_photos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting photo:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // If this was the primary photo, set another as primary
    if (photo.is_primary) {
      const { data: nextPhoto } = await supabase
        .from('donation_photos')
        .select('id, s3_url')
        .eq('donation_item_id', photo.donation_item_id)
        .order('sort_order', { ascending: true })
        .limit(1)
        .single();

      if (nextPhoto) {
        await supabase
          .from('donation_photos')
          .update({ is_primary: true })
          .eq('id', nextPhoto.id);

        await supabase
          .from('donation_items')
          .update({ image_path: nextPhoto.s3_url })
          .eq('id', photo.donation_item_id);
      } else {
        // No more photos, clear the image_path
        await supabase
          .from('donation_items')
          .update({ image_path: null })
          .eq('id', photo.donation_item_id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/donations/photos - Update photo (set primary, reorder)
export async function PATCH(request: NextRequest) {
  try {
    // Require authentication
    await requireAuth();

    const supabase = getSupabaseAdmin() as any;
    const body = await request.json();
    const { id, is_primary, sort_order } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Photo ID is required' },
        { status: 400 }
      );
    }

    // Get the photo to find the donation_item_id
    const { data: photo, error: fetchError } = await supabase
      .from('donation_photos')
      .select('donation_item_id, s3_url')
      .eq('id', id)
      .single();

    if (fetchError || !photo) {
      return NextResponse.json(
        { success: false, error: 'Photo not found' },
        { status: 404 }
      );
    }

    // If setting as primary, unset others first
    if (is_primary) {
      await supabase
        .from('donation_photos')
        .update({ is_primary: false })
        .eq('donation_item_id', photo.donation_item_id);

      // Update the donation item's image_path
      await supabase
        .from('donation_items')
        .update({ image_path: photo.s3_url })
        .eq('id', photo.donation_item_id);
    }

    const updateData: { is_primary?: boolean; sort_order?: number } = {};
    if (is_primary !== undefined) updateData.is_primary = is_primary;
    if (sort_order !== undefined) updateData.sort_order = sort_order;

    const { data, error } = await supabase
      .from('donation_photos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating photo:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
  uploadDonationPhoto,
  deleteFromS3,
  isValidImageType,
  getMaxFileSize,
} from '@/lib/services/s3';
import { requireAuthFromRequest } from '@/lib/auth-server';
import { uuidSchema } from '@/lib/validation/schemas';
import {
  successResponse,
  errorResponse,
  handleApiError,
  checkRateLimit,
  getRateLimitIdentifier,
  rateLimitResponse,
  validateImageFile,
  createAuditLog,
  parseJsonBody,
} from '@/lib/api-server-utils';

// GET /api/donations/photos - Get photos for a donation item
export async function GET(request: NextRequest) {
  try {
    // Require authentication (supports both Bearer token and cookie-based auth)
    const { profile } = await requireAuthFromRequest(request);

    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(request, profile.id);
    const rateLimit = checkRateLimit(rateLimitId, { windowMs: 60000, maxRequests: 100 });
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const rawDonationItemId = searchParams.get('donation_item_id');

    if (!rawDonationItemId) {
      return errorResponse('donation_item_id is required', 400, 'MISSING_PARAM');
    }

    const donationItemId = uuidSchema.parse(rawDonationItemId);

    const { data, error } = await supabase
      .from('donation_photos')
      .select('*')
      .eq('donation_item_id', donationItemId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching photos:', error);
      return errorResponse(error.message, 500);
    }

    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/donations/photos - Upload a photo
export async function POST(request: NextRequest) {
  try {
    // Require authentication (supports both Bearer token and cookie-based auth)
    const { profile } = await requireAuthFromRequest(request);

    // Rate limiting (stricter for uploads)
    const rateLimitId = getRateLimitIdentifier(request, profile.id);
    const rateLimit = checkRateLimit(`upload:${rateLimitId}`, { windowMs: 60000, maxRequests: 20 });
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    const supabase = getSupabaseAdmin();
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const rawDonationItemId = formData.get('donation_item_id') as string;
    const isPrimary = formData.get('is_primary') === 'true';

    if (!file || !rawDonationItemId) {
      return errorResponse('file and donation_item_id are required', 400, 'MISSING_PARAM');
    }

    const donationItemId = uuidSchema.parse(rawDonationItemId);

    // Enhanced file validation
    const validation = validateImageFile(file, 10);
    if (!validation.valid) {
      return errorResponse(validation.error!, 400, 'INVALID_FILE');
    }

    // Additional validation using existing helpers
    if (!isValidImageType(file.type)) {
      return errorResponse('Invalid file type. Only images are allowed.', 400, 'INVALID_FILE_TYPE');
    }

    if (file.size > getMaxFileSize()) {
      return errorResponse('File size exceeds 10MB limit', 400, 'FILE_TOO_LARGE');
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
      return errorResponse(uploadResult.error || 'Upload failed', 500, 'UPLOAD_FAILED');
    }

    // If this is the primary photo, unset other primaries
    if (isPrimary) {
      await (supabase as any)
        .from('donation_photos')
        .update({ is_primary: false })
        .eq('donation_item_id', donationItemId);
    }

    // Get current max sort order
    const { data: existingPhotos } = await (supabase as any)
      .from('donation_photos')
      .select('sort_order')
      .eq('donation_item_id', donationItemId)
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextSortOrder = existingPhotos?.[0]?.sort_order
      ? existingPhotos[0].sort_order + 1
      : 0;

    // Save to database
    const { data, error } = await (supabase as any)
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
      return errorResponse(error.message, 500);
    }

    // Update the donation item's image_path if this is the primary or first photo
    if (isPrimary || nextSortOrder === 0) {
      await (supabase as any)
        .from('donation_items')
        .update({ image_path: uploadResult.url })
        .eq('id', donationItemId);
    }

    // Create audit log
    await createAuditLog(supabase, {
      userId: profile.id,
      action: 'create',
      entityType: 'donation_photo',
      entityId: data.id,
      newValue: { donation_item_id: donationItemId, filename: file.name },
    });

    return successResponse(data, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/donations/photos - Delete a photo
export async function DELETE(request: NextRequest) {
  try {
    // Require authentication (supports both Bearer token and cookie-based auth)
    const { profile } = await requireAuthFromRequest(request);

    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(request, profile.id);
    const rateLimit = checkRateLimit(`write:${rateLimitId}`, { windowMs: 60000, maxRequests: 30 });
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const rawId = searchParams.get('id');

    if (!rawId) {
      return errorResponse('Photo ID is required', 400, 'MISSING_ID');
    }

    const id = uuidSchema.parse(rawId);

    // Get the photo record first
    const { data: photo, error: fetchError } = await (supabase as any)
      .from('donation_photos')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !photo) {
      return errorResponse('Photo not found', 404, 'NOT_FOUND');
    }

    // Delete from S3
    const s3Deleted = await deleteFromS3(photo.s3_key);
    if (!s3Deleted) {
      console.warn('Failed to delete photo from S3:', photo.s3_key);
    }

    // Delete from database
    const { error } = await (supabase as any)
      .from('donation_photos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting photo:', error);
      return errorResponse(error.message, 500);
    }

    // If this was the primary photo, set another as primary
    if (photo.is_primary) {
      const { data: nextPhoto } = await (supabase as any)
        .from('donation_photos')
        .select('id, s3_url')
        .eq('donation_item_id', photo.donation_item_id)
        .order('sort_order', { ascending: true })
        .limit(1)
        .single();

      if (nextPhoto) {
        await (supabase as any)
          .from('donation_photos')
          .update({ is_primary: true })
          .eq('id', nextPhoto.id);

        await (supabase as any)
          .from('donation_items')
          .update({ image_path: nextPhoto.s3_url })
          .eq('id', photo.donation_item_id);
      } else {
        // No more photos, clear the image_path
        await (supabase as any)
          .from('donation_items')
          .update({ image_path: null })
          .eq('id', photo.donation_item_id);
      }
    }

    // Create audit log
    await createAuditLog(supabase, {
      userId: profile.id,
      action: 'delete',
      entityType: 'donation_photo',
      entityId: id,
      oldValue: photo,
    });

    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/donations/photos - Update photo (set primary, reorder)
export async function PATCH(request: NextRequest) {
  try {
    // Require authentication (supports both Bearer token and cookie-based auth)
    const { profile } = await requireAuthFromRequest(request);

    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(request, profile.id);
    const rateLimit = checkRateLimit(`write:${rateLimitId}`, { windowMs: 60000, maxRequests: 30 });
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    const supabase = getSupabaseAdmin();
    const body = await parseJsonBody(request);
    const { id: rawId, is_primary, sort_order } = body;

    if (!rawId) {
      return errorResponse('Photo ID is required', 400, 'MISSING_ID');
    }

    const id = uuidSchema.parse(rawId);

    // Get the photo to find the donation_item_id
    const { data: photo, error: fetchError } = await (supabase as any)
      .from('donation_photos')
      .select('donation_item_id, s3_url')
      .eq('id', id)
      .single();

    if (fetchError || !photo) {
      return errorResponse('Photo not found', 404, 'NOT_FOUND');
    }

    // If setting as primary, unset others first
    if (is_primary) {
      await (supabase as any)
        .from('donation_photos')
        .update({ is_primary: false })
        .eq('donation_item_id', photo.donation_item_id);

      // Update the donation item's image_path
      await (supabase as any)
        .from('donation_items')
        .update({ image_path: photo.s3_url })
        .eq('id', photo.donation_item_id);
    }

    const updateData: { is_primary?: boolean; sort_order?: number } = {};
    if (is_primary !== undefined) updateData.is_primary = is_primary;
    if (sort_order !== undefined) updateData.sort_order = sort_order;

    const { data, error } = await (supabase as any)
      .from('donation_photos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating photo:', error);
      return errorResponse(error.message, 500);
    }

    // Create audit log
    await createAuditLog(supabase, {
      userId: profile.id,
      action: 'update',
      entityType: 'donation_photo',
      entityId: id,
      newValue: updateData,
    });

    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}

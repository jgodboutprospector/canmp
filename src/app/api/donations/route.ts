import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// GET /api/donations - Fetch donations with optional filters
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const include_inactive = searchParams.get('include_inactive') === 'true';

    let query = supabase
      .from('donation_items')
      .select(`
        *,
        claimed_by_household:households(id, name),
        photos:donation_photos(*)
      `)
      .order('created_at', { ascending: false });

    if (!include_inactive) {
      query = query.eq('is_active', true);
    }

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching donations:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in donations GET:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/donations - Create a new donation item
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();

    const { data, error } = await supabase
      .from('donation_items')
      .insert({
        ...body,
        status: body.status || 'available',
        donated_date: body.donated_date || new Date().toISOString().split('T')[0],
      })
      .select(`
        *,
        claimed_by_household:households(id, name),
        photos:donation_photos(*)
      `)
      .single();

    if (error) {
      console.error('Error creating donation:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in donations POST:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/donations - Update a donation item
export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Donation ID is required' }, { status: 400 });
    }

    const { data, error } = await (supabase as any)
      .from('donation_items')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        claimed_by_household:households(id, name),
        photos:donation_photos(*)
      `)
      .single();

    if (error) {
      console.error('Error updating donation:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in donations PATCH:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/donations - Soft delete a donation item
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Donation ID is required' }, { status: 400 });
    }

    // Soft delete
    const { error } = await (supabase as any)
      .from('donation_items')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Error deleting donation:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in donations DELETE:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

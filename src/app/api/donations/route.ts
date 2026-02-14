import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAuthFromRequest } from '@/lib/auth-server';
import { createDonationSchema, searchParamSchema, uuidSchema } from '@/lib/validation/schemas';
import {
  successResponse,
  errorResponse,
  handleApiError,
  parsePagination,
  buildPaginationInfo,
  checkRateLimit,
  getRateLimitIdentifier,
  rateLimitResponse,
  createAuditLog,
} from '@/lib/api-server-utils';

// GET /api/donations - Fetch donations with optional filters and pagination
export async function GET(request: NextRequest) {
  try {
    // Require authentication (supports both Bearer token and cookie-based auth)
    const { userId, profile } = await requireAuthFromRequest(request);

    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(request, profile.id);
    const rateLimit = checkRateLimit(rateLimitId, { windowMs: 60000, maxRequests: 100 });
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);

    // Parse pagination
    const { page, limit, offset } = parsePagination(searchParams);

    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const rawSearch = searchParams.get('search');
    const include_inactive = searchParams.get('include_inactive') === 'true';

    // Sanitize search parameter
    const search = rawSearch ? searchParamSchema.parse(rawSearch) : null;

    // First, get total count for pagination
    let countQuery = supabase
      .from('donation_items')
      .select('*', { count: 'exact', head: true });

    if (!include_inactive) {
      countQuery = countQuery.eq('is_active', true);
    }
    if (category && category !== 'all') {
      countQuery = countQuery.eq('category', category);
    }
    if (status && status !== 'all') {
      countQuery = countQuery.eq('status', status);
    }
    if (search) {
      countQuery = countQuery.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Error counting donations:', countError);
      return errorResponse(countError.message, 500);
    }

    // Now fetch paginated data
    let query = supabase
      .from('donation_items')
      .select(`
        *,
        claimed_by_household:households(id, name),
        photos:donation_photos(*)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

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
      return errorResponse(error.message, 500);
    }

    const pagination = buildPaginationInfo(page, limit, count || 0);

    return successResponse(data, pagination);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/donations - Create a new donation item
export async function POST(request: NextRequest) {
  try {
    // Require authentication (supports both Bearer token and cookie-based auth)
    const { userId, profile } = await requireAuthFromRequest(request);

    // Rate limiting (stricter for write operations)
    const rateLimitId = getRateLimitIdentifier(request, profile.id);
    const rateLimit = checkRateLimit(`write:${rateLimitId}`, { windowMs: 60000, maxRequests: 30 });
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    const supabase = getSupabaseAdmin();
    const body = await request.json();

    // Validate input
    const validatedData = createDonationSchema.parse(body);

    const insertData = {
      ...validatedData,
      status: validatedData.status || 'available',
      donated_date: validatedData.donated_date || new Date().toISOString().split('T')[0],
    };

    const { data, error } = await (supabase as any)
      .from('donation_items')
      .insert(insertData)
      .select(`
        *,
        claimed_by_household:households(id, name),
        photos:donation_photos(*)
      `)
      .single();

    if (error) {
      console.error('Error creating donation:', error);
      return errorResponse(error.message, 500);
    }

    // Create audit log
    await createAuditLog(supabase, {
      userId: profile.id,
      action: 'create',
      entityType: 'donation_item',
      entityId: data.id,
      newValue: insertData,
    });

    return successResponse(data, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/donations - Update a donation item
export async function PATCH(request: NextRequest) {
  try {
    // Require authentication (supports both Bearer token and cookie-based auth)
    const { userId, profile } = await requireAuthFromRequest(request);

    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(request, profile.id);
    const rateLimit = checkRateLimit(`write:${rateLimitId}`, { windowMs: 60000, maxRequests: 30 });
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    const supabase = getSupabaseAdmin();
    const body = await request.json();
    const { id: rawId, ...updateData } = body;

    if (!rawId) {
      return errorResponse('Donation ID is required', 400, 'MISSING_ID');
    }

    const id = uuidSchema.parse(rawId);

    // Fetch current state for audit log
    const { data: oldData } = await (supabase as any)
      .from('donation_items')
      .select('*')
      .eq('id', id)
      .single();

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
      return errorResponse(error.message, 500);
    }

    // Create audit log
    await createAuditLog(supabase, {
      userId: profile.id,
      action: 'update',
      entityType: 'donation_item',
      entityId: id,
      oldValue: oldData,
      newValue: updateData,
    });

    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/donations - Soft delete a donation item
export async function DELETE(request: NextRequest) {
  try {
    // Require authentication (supports both Bearer token and cookie-based auth)
    const { userId, profile } = await requireAuthFromRequest(request);

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
      return errorResponse('Donation ID is required', 400, 'MISSING_ID');
    }

    const id = uuidSchema.parse(rawId);

    // Fetch current state for audit log
    const { data: oldData } = await (supabase as any)
      .from('donation_items')
      .select('*')
      .eq('id', id)
      .single();

    // Soft delete
    const { error } = await (supabase as any)
      .from('donation_items')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Error deleting donation:', error);
      return errorResponse(error.message, 500);
    }

    // Create audit log
    await createAuditLog(supabase, {
      userId: profile.id,
      action: 'delete',
      entityType: 'donation_item',
      entityId: id,
      oldValue: oldData,
    });

    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}

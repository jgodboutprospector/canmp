import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAuthFromRequest, requireRoleFromRequest } from '@/lib/auth-server';
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

// Validation schemas
const createVolunteerSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  languages_spoken: z.array(z.string()).optional().default([]),
  skills: z.array(z.string()).optional().default([]),
  background_check_date: z.string().optional(),
  orientation_date: z.string().optional(),
  availability_notes: z.string().optional(),
  emergency_contact_name: z.string().max(200).optional(),
  emergency_contact_phone: z.string().max(50).optional(),
  emergency_contact_relationship: z.string().max(100).optional(),
  address_street: z.string().max(255).optional(),
  address_city: z.string().max(100).optional(),
  address_state: z.string().max(50).optional(),
  address_zip: z.string().max(20).optional(),
  neon_id: z.string().optional(),
});

const updateVolunteerSchema = createVolunteerSchema.partial().extend({
  id: z.string().uuid(),
  is_active: z.boolean().optional(),
});

const logHoursSchema = z.object({
  volunteer_id: z.string().uuid(),
  date: z.string(),
  hours: z.number().positive().max(24),
  activity_type: z.string().max(100).optional(),
  description: z.string().optional(),
  event_id: z.string().uuid().optional(),
});

const updateAvailabilitySchema = z.object({
  volunteer_id: z.string().uuid(),
  availability: z.array(z.object({
    day_of_week: z.number().min(0).max(6),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
    is_available: z.boolean(),
    notes: z.string().optional(),
  })),
});

const importFromNeonSchema = z.object({
  neonAccountIds: z.array(z.string()),
});

const VOLUNTEER_SELECT = `
  *,
  neon_account:neon_accounts!volunteers_neon_id_fkey(neon_account_id, email, first_name, last_name)
`;

// GET /api/volunteers
export async function GET(request: NextRequest) {
  try {
    const { profile } = await requireAuthFromRequest(request);

    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(request, profile.id);
    const rateLimit = checkRateLimit(rateLimitId, { windowMs: 60000, maxRequests: 100 });
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const { page, limit, offset } = parsePagination(searchParams);

    // Check for special queries
    const source = searchParams.get('source');
    const volunteerId = searchParams.get('volunteer_id');
    const type = searchParams.get('type');

    // Get unlinked Neon accounts (for import)
    if (source === 'neon') {
      const { data, error } = await (supabase as any)
        .from('neon_accounts')
        .select('*')
        .eq('account_type', 'INDIVIDUAL')
        .is('volunteer_id', null)
        .order('last_name');

      if (error) return errorResponse(error.message, 500);
      return successResponse(data);
    }

    // Get volunteer hours
    if (type === 'hours' && volunteerId) {
      const { data, error } = await (supabase as any)
        .from('volunteer_hours')
        .select(`
          *,
          event:events(id, title),
          verified_by:users!volunteer_hours_verified_by_id_fkey(id, first_name, last_name),
          created_by:users!volunteer_hours_created_by_id_fkey(id, first_name, last_name)
        `)
        .eq('volunteer_id', volunteerId)
        .order('date', { ascending: false });

      if (error) return errorResponse(error.message, 500);
      return successResponse(data);
    }

    // Get volunteer availability
    if (type === 'availability' && volunteerId) {
      const { data, error } = await (supabase as any)
        .from('volunteer_availability')
        .select('*')
        .eq('volunteer_id', volunteerId)
        .order('day_of_week');

      if (error) return errorResponse(error.message, 500);
      return successResponse(data);
    }

    // Get activity types (for dropdown)
    if (type === 'activity_types') {
      const { data, error } = await (supabase as any)
        .from('volunteer_activity_types')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) return errorResponse(error.message, 500);
      return successResponse(data);
    }

    // Get hours summary
    if (type === 'hours_summary') {
      const { data, error } = await (supabase as any)
        .from('volunteer_hours_summary')
        .select('*')
        .order('total_hours', { ascending: false });

      if (error) return errorResponse(error.message, 500);
      return successResponse(data);
    }

    // Standard volunteer listing
    const search = searchParams.get('search');
    const activeOnly = searchParams.get('active') !== 'false';
    const hasBackgroundCheck = searchParams.get('background_check');
    const hasOrientation = searchParams.get('orientation');
    const skill = searchParams.get('skill');

    // Count query
    let countQuery = (supabase as any)
      .from('volunteers')
      .select('*', { count: 'exact', head: true });

    if (activeOnly) countQuery = countQuery.eq('is_active', true);
    if (hasBackgroundCheck === 'true') countQuery = countQuery.not('background_check_date', 'is', null);
    if (hasOrientation === 'true') countQuery = countQuery.not('orientation_date', 'is', null);
    if (skill) countQuery = countQuery.contains('skills', [skill]);
    if (search) {
      countQuery = countQuery.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { count } = await countQuery;

    // Data query
    let query = (supabase as any)
      .from('volunteers')
      .select('*')
      .order('last_name')
      .range(offset, offset + limit - 1);

    if (activeOnly) query = query.eq('is_active', true);
    if (hasBackgroundCheck === 'true') query = query.not('background_check_date', 'is', null);
    if (hasOrientation === 'true') query = query.not('orientation_date', 'is', null);
    if (skill) query = query.contains('skills', [skill]);
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) return errorResponse(error.message, 500);

    return successResponse(data, buildPaginationInfo(page, limit, count || 0));
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/volunteers
export async function POST(request: NextRequest) {
  try {
    const { profile } = await requireRoleFromRequest(request, ['admin', 'coordinator']);

    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(request, profile.id);
    const rateLimit = checkRateLimit(`write:${rateLimitId}`, { windowMs: 60000, maxRequests: 30 });
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const body = await request.json();

    // Import from Neon
    if (action === 'import') {
      const validatedData = importFromNeonSchema.parse(body);
      const results = [];
      const errors = [];

      for (const neonAccountId of validatedData.neonAccountIds) {
        try {
          // Get Neon account data
          const { data: neonAccount, error: fetchError } = await (supabase as any)
            .from('neon_accounts')
            .select('*')
            .eq('neon_account_id', neonAccountId)
            .single();

          if (fetchError || !neonAccount) {
            errors.push({ neonAccountId, error: 'Account not found' });
            continue;
          }

          // Check if already linked
          if (neonAccount.volunteer_id) {
            errors.push({ neonAccountId, error: 'Already linked to a volunteer' });
            continue;
          }

          // Create volunteer record
          const { data: volunteer, error: createError } = await (supabase as any)
            .from('volunteers')
            .insert({
              first_name: neonAccount.first_name || 'Unknown',
              last_name: neonAccount.last_name || 'Unknown',
              email: neonAccount.email,
              phone: neonAccount.phone,
              neon_id: neonAccountId,
              address_street: neonAccount.address_line1,
              address_city: neonAccount.city,
              address_state: neonAccount.state,
              address_zip: neonAccount.zip_code,
              is_active: true,
            })
            .select()
            .single();

          if (createError) {
            errors.push({ neonAccountId, error: createError.message });
            continue;
          }

          // Link Neon account to volunteer
          await (supabase as any)
            .from('neon_accounts')
            .update({ volunteer_id: volunteer.id, is_volunteer: true })
            .eq('neon_account_id', neonAccountId);

          results.push(volunteer);

          await createAuditLog(supabase, {
            userId: profile.id,
            action: 'create',
            entityType: 'volunteer',
            entityId: volunteer.id,
            metadata: { importedFrom: 'neon', neonAccountId },
          });
        } catch (err) {
          errors.push({ neonAccountId, error: err instanceof Error ? err.message : 'Unknown error' });
        }
      }

      return successResponse({ imported: results.length, results, errors }, undefined, 201);
    }

    // Log hours
    if (action === 'log_hours') {
      const validatedData = logHoursSchema.parse(body);

      const { data, error } = await (supabase as any)
        .from('volunteer_hours')
        .insert({
          ...validatedData,
          created_by_id: profile.id,
        })
        .select()
        .single();

      if (error) return errorResponse(error.message, 500);

      await createAuditLog(supabase, {
        userId: profile.id,
        action: 'create',
        entityType: 'volunteer_hours',
        entityId: data.id,
        newValue: validatedData,
      });

      return successResponse(data, undefined, 201);
    }

    // Create volunteer
    const validatedData = createVolunteerSchema.parse(body);

    const { data, error } = await (supabase as any)
      .from('volunteers')
      .insert({
        ...validatedData,
        email: validatedData.email || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) return errorResponse(error.message, 500);

    await createAuditLog(supabase, {
      userId: profile.id,
      action: 'create',
      entityType: 'volunteer',
      entityId: data.id,
      newValue: validatedData,
    });

    return successResponse(data, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/volunteers
export async function PATCH(request: NextRequest) {
  try {
    const { profile } = await requireRoleFromRequest(request, ['admin', 'coordinator']);

    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(request, profile.id);
    const rateLimit = checkRateLimit(`write:${rateLimitId}`, { windowMs: 60000, maxRequests: 30 });
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const body = await request.json();

    // Update availability
    if (action === 'availability') {
      const validatedData = updateAvailabilitySchema.parse(body);

      // Delete existing availability for this volunteer
      await (supabase as any)
        .from('volunteer_availability')
        .delete()
        .eq('volunteer_id', validatedData.volunteer_id);

      // Insert new availability
      const availabilityRecords = validatedData.availability.map(a => ({
        volunteer_id: validatedData.volunteer_id,
        ...a,
      }));

      const { data, error } = await (supabase as any)
        .from('volunteer_availability')
        .insert(availabilityRecords)
        .select();

      if (error) return errorResponse(error.message, 500);

      return successResponse(data);
    }

    // Verify hours
    if (action === 'verify_hours') {
      const { hours_id } = body;
      if (!hours_id) return errorResponse('hours_id is required', 400);

      const { data, error } = await (supabase as any)
        .from('volunteer_hours')
        .update({
          verified_by_id: profile.id,
          verified_at: new Date().toISOString(),
        })
        .eq('id', hours_id)
        .select()
        .single();

      if (error) return errorResponse(error.message, 500);

      return successResponse(data);
    }

    // Update volunteer
    const validatedData = updateVolunteerSchema.parse(body);
    const { id, ...updateData } = validatedData;

    // Fetch old data for audit
    const { data: oldData } = await (supabase as any)
      .from('volunteers')
      .select('*')
      .eq('id', id)
      .single();

    const { data, error } = await (supabase as any)
      .from('volunteers')
      .update({
        ...updateData,
        email: updateData.email || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return errorResponse(error.message, 500);

    await createAuditLog(supabase, {
      userId: profile.id,
      action: 'update',
      entityType: 'volunteer',
      entityId: id,
      oldValue: oldData,
      newValue: updateData,
    });

    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/volunteers
export async function DELETE(request: NextRequest) {
  try {
    const { profile } = await requireRoleFromRequest(request, ['admin']);

    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(request, profile.id);
    const rateLimit = checkRateLimit(`write:${rateLimitId}`, { windowMs: 60000, maxRequests: 30 });
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type');

    if (!id) {
      return errorResponse('ID is required', 400, 'MISSING_ID');
    }

    // Delete volunteer hours
    if (type === 'hours') {
      const { data: oldData } = await (supabase as any)
        .from('volunteer_hours')
        .select('*')
        .eq('id', id)
        .single();

      const { error } = await (supabase as any)
        .from('volunteer_hours')
        .delete()
        .eq('id', id);

      if (error) return errorResponse(error.message, 500);

      await createAuditLog(supabase, {
        userId: profile.id,
        action: 'delete',
        entityType: 'volunteer_hours',
        entityId: id,
        oldValue: oldData,
      });

      return successResponse({ deleted: true });
    }

    // Soft delete volunteer
    const { data: oldData } = await (supabase as any)
      .from('volunteers')
      .select('*')
      .eq('id', id)
      .single();

    const { error } = await (supabase as any)
      .from('volunteers')
      .update({ is_active: false })
      .eq('id', id);

    if (error) return errorResponse(error.message, 500);

    // Unlink from Neon account if linked
    if (oldData?.neon_id) {
      await (supabase as any)
        .from('neon_accounts')
        .update({ volunteer_id: null })
        .eq('neon_account_id', oldData.neon_id);
    }

    await createAuditLog(supabase, {
      userId: profile.id,
      action: 'delete',
      entityType: 'volunteer',
      entityId: id,
      oldValue: oldData,
    });

    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}

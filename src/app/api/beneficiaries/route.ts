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
const createHouseholdSchema = z.object({
  name: z.string().min(1).max(255),
  site_id: z.string().uuid().optional(),
  coordinator_id: z.string().uuid().optional(),
  primary_language: z.string().max(50).optional(),
  secondary_language: z.string().max(50).optional(),
  status: z.enum(['active', 'inactive', 'graduated']).default('active'),
  intake_date: z.string().optional(),
  notes: z.string().optional(),
});

const createBeneficiarySchema = z.object({
  household_id: z.string().uuid(),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  date_of_birth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  relationship_type: z.enum(['head_of_household', 'spouse', 'child', 'parent', 'sibling', 'other_relative', 'other']),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  country_of_origin: z.string().max(100).optional(),
  native_language: z.string().max(50).optional(),
  english_proficiency: z.enum(['none', 'basic', 'intermediate', 'advanced', 'fluent', 'native']).optional(),
  employment_status: z.string().max(50).optional(),
  education_level: z.string().max(100).optional(),
  notes: z.string().optional(),
});

const createCaseNoteSchema = z.object({
  household_id: z.string().uuid().optional(),
  beneficiary_id: z.string().uuid().optional(),
  content: z.string().min(1),
  visibility: z.enum(['all_staff', 'coordinators_only', 'private']).default('all_staff'),
  is_followup_required: z.boolean().default(false),
  followup_date: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const HOUSEHOLD_SELECT = `
  *,
  site:sites(id, name),
  coordinator:users(id, first_name, last_name, email),
  beneficiaries(id, first_name, last_name, relationship_type, date_of_birth)
`;

const BENEFICIARY_SELECT = `
  *,
  household:households(id, name, site:sites(id, name))
`;

// GET /api/beneficiaries - Fetch beneficiaries, households, or case notes
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
    const type = searchParams.get('type') || 'households';

    if (type === 'households') {
      const site_id = searchParams.get('site_id');
      const coordinator_id = searchParams.get('coordinator_id');
      const status = searchParams.get('status');
      const search = searchParams.get('search');

      let countQuery = supabase
        .from('households')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (site_id) countQuery = countQuery.eq('site_id', site_id);
      if (coordinator_id) countQuery = countQuery.eq('coordinator_id', coordinator_id);
      if (status) countQuery = countQuery.eq('status', status);
      if (search) countQuery = countQuery.ilike('name', `%${search}%`);

      const { count } = await countQuery;

      let query = supabase
        .from('households')
        .select(HOUSEHOLD_SELECT)
        .eq('is_active', true)
        .order('name')
        .range(offset, offset + limit - 1);

      if (site_id) query = query.eq('site_id', site_id);
      if (coordinator_id) query = query.eq('coordinator_id', coordinator_id);
      if (status) query = query.eq('status', status);
      if (search) query = query.ilike('name', `%${search}%`);

      const { data, error } = await query;

      if (error) return errorResponse(error.message, 500);

      return successResponse(data, buildPaginationInfo(page, limit, count || 0));
    }

    if (type === 'individuals') {
      const household_id = searchParams.get('household_id');
      const search = searchParams.get('search');

      let countQuery = supabase
        .from('beneficiaries')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (household_id) countQuery = countQuery.eq('household_id', household_id);
      if (search) {
        countQuery = countQuery.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
      }

      const { count } = await countQuery;

      let query = supabase
        .from('beneficiaries')
        .select(BENEFICIARY_SELECT)
        .eq('is_active', true)
        .order('last_name')
        .range(offset, offset + limit - 1);

      if (household_id) query = query.eq('household_id', household_id);
      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
      }

      const { data, error } = await query;

      if (error) return errorResponse(error.message, 500);

      return successResponse(data, buildPaginationInfo(page, limit, count || 0));
    }

    if (type === 'notes') {
      const household_id = searchParams.get('household_id');
      const beneficiary_id = searchParams.get('beneficiary_id');
      const visibility = searchParams.get('visibility');
      const followup_only = searchParams.get('followup_only') === 'true';

      let countQuery = supabase
        .from('case_notes')
        .select('*', { count: 'exact', head: true });

      if (household_id) countQuery = countQuery.eq('household_id', household_id);
      if (beneficiary_id) countQuery = countQuery.eq('beneficiary_id', beneficiary_id);
      if (visibility) countQuery = countQuery.eq('visibility', visibility);
      if (followup_only) {
        countQuery = countQuery.eq('is_followup_required', true).eq('followup_completed', false);
      }

      const { count } = await countQuery;

      let query = supabase
        .from('case_notes')
        .select(`
          *,
          household:households(id, name),
          beneficiary:beneficiaries(id, first_name, last_name),
          created_by:users(id, first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (household_id) query = query.eq('household_id', household_id);
      if (beneficiary_id) query = query.eq('beneficiary_id', beneficiary_id);
      if (visibility) query = query.eq('visibility', visibility);
      if (followup_only) {
        query = query.eq('is_followup_required', true).eq('followup_completed', false);
      }

      const { data, error } = await query;

      if (error) return errorResponse(error.message, 500);

      return successResponse(data, buildPaginationInfo(page, limit, count || 0));
    }

    return errorResponse('Invalid type parameter', 400, 'INVALID_TYPE');
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/beneficiaries - Create household, beneficiary, or case note
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
    const type = searchParams.get('type') || 'households';
    const body = await request.json();

    if (type === 'households') {
      const validatedData = createHouseholdSchema.parse(body);

      const { data, error } = await (supabase as any)
        .from('households')
        .insert({
          ...validatedData,
          intake_date: validatedData.intake_date || new Date().toISOString().split('T')[0],
        })
        .select(HOUSEHOLD_SELECT)
        .single();

      if (error) return errorResponse(error.message, 500);

      await createAuditLog(supabase, {
        userId: profile.id,
        action: 'create',
        entityType: 'household',
        entityId: data.id,
        newValue: validatedData,
      });

      return successResponse(data, undefined, 201);
    }

    if (type === 'individuals') {
      const validatedData = createBeneficiarySchema.parse(body);

      const { data, error } = await (supabase as any)
        .from('beneficiaries')
        .insert(validatedData)
        .select(BENEFICIARY_SELECT)
        .single();

      if (error) return errorResponse(error.message, 500);

      await createAuditLog(supabase, {
        userId: profile.id,
        action: 'create',
        entityType: 'beneficiary',
        entityId: data.id,
        newValue: validatedData,
      });

      return successResponse(data, undefined, 201);
    }

    if (type === 'notes') {
      const validatedData = createCaseNoteSchema.parse(body);

      if (!validatedData.household_id && !validatedData.beneficiary_id) {
        return errorResponse('Either household_id or beneficiary_id is required', 400, 'MISSING_PARAM');
      }

      const { data, error } = await (supabase as any)
        .from('case_notes')
        .insert({
          ...validatedData,
          created_by_id: profile.id,
        })
        .select(`
          *,
          household:households(id, name),
          beneficiary:beneficiaries(id, first_name, last_name),
          created_by:users(id, first_name, last_name)
        `)
        .single();

      if (error) return errorResponse(error.message, 500);

      await createAuditLog(supabase, {
        userId: profile.id,
        action: 'create',
        entityType: 'case_note',
        entityId: data.id,
        newValue: validatedData,
      });

      return successResponse(data, undefined, 201);
    }

    return errorResponse('Invalid type parameter', 400, 'INVALID_TYPE');
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/beneficiaries - Update household, beneficiary, or case note
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
    const type = searchParams.get('type') || 'households';
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return errorResponse('ID is required', 400, 'MISSING_ID');
    }

    const table = type === 'households' ? 'households'
      : type === 'individuals' ? 'beneficiaries'
      : type === 'notes' ? 'case_notes'
      : null;

    if (!table) {
      return errorResponse('Invalid type parameter', 400, 'INVALID_TYPE');
    }

    // Fetch old data for audit
    const { data: oldData } = await (supabase as any)
      .from(table)
      .select('*')
      .eq('id', id)
      .single();

    const { data, error } = await (supabase as any)
      .from(table)
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) return errorResponse(error.message, 500);

    await createAuditLog(supabase, {
      userId: profile.id,
      action: 'update',
      entityType: table.replace('_', '-'),
      entityId: id,
      oldValue: oldData,
      newValue: updateData,
    });

    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/beneficiaries - Soft delete household or beneficiary
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
    const type = searchParams.get('type') || 'households';
    const id = searchParams.get('id');

    if (!id) {
      return errorResponse('ID is required', 400, 'MISSING_ID');
    }

    if (type === 'households') {
      const { data: oldData } = await (supabase as any)
        .from('households')
        .select('*')
        .eq('id', id)
        .single();

      // Soft delete household and its beneficiaries
      const { error: beneficiaryError } = await (supabase as any)
        .from('beneficiaries')
        .update({ is_active: false })
        .eq('household_id', id);

      if (beneficiaryError) {
        console.warn('Error deactivating beneficiaries:', beneficiaryError);
      }

      const { error } = await (supabase as any)
        .from('households')
        .update({ is_active: false })
        .eq('id', id);

      if (error) return errorResponse(error.message, 500);

      await createAuditLog(supabase, {
        userId: profile.id,
        action: 'delete',
        entityType: 'household',
        entityId: id,
        oldValue: oldData,
      });

      return successResponse({ deleted: true });
    }

    if (type === 'individuals') {
      const { data: oldData } = await (supabase as any)
        .from('beneficiaries')
        .select('*')
        .eq('id', id)
        .single();

      const { error } = await (supabase as any)
        .from('beneficiaries')
        .update({ is_active: false })
        .eq('id', id);

      if (error) return errorResponse(error.message, 500);

      await createAuditLog(supabase, {
        userId: profile.id,
        action: 'delete',
        entityType: 'beneficiary',
        entityId: id,
        oldValue: oldData,
      });

      return successResponse({ deleted: true });
    }

    if (type === 'notes') {
      const { data: oldData } = await (supabase as any)
        .from('case_notes')
        .select('*')
        .eq('id', id)
        .single();

      // Hard delete for notes
      const { error } = await (supabase as any)
        .from('case_notes')
        .delete()
        .eq('id', id);

      if (error) return errorResponse(error.message, 500);

      await createAuditLog(supabase, {
        userId: profile.id,
        action: 'delete',
        entityType: 'case_note',
        entityId: id,
        oldValue: oldData,
      });

      return successResponse({ deleted: true });
    }

    return errorResponse('Invalid type parameter', 400, 'INVALID_TYPE');
  } catch (error) {
    return handleApiError(error);
  }
}

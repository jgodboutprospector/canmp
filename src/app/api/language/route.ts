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
const createTeacherSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  site_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  is_volunteer: z.boolean().default(false),
  certifications: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

const createClassSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  level: z.enum(['basic', 'beginner', 'intermediate', 'lets_talk']),
  teacher_id: z.string().uuid().optional(),
  site_id: z.string().uuid().optional(),
  day_of_week: z.string().max(20).optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  max_students: z.number().int().min(0).optional(),
  location: z.string().max(255).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

const createEnrollmentSchema = z.object({
  class_section_id: z.string().uuid(),
  beneficiary_id: z.string().uuid(),
  status: z.enum(['enrolled', 'completed', 'dropped', 'waitlist']).default('enrolled'),
  enrollment_date: z.string().optional(),
  pre_test_score: z.number().min(0).max(100).optional(),
  post_test_score: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});

const createAttendanceSchema = z.object({
  class_enrollment_id: z.string().uuid(),
  class_date: z.string(),
  is_present: z.boolean(),
  notes: z.string().optional(),
});

const CLASS_SELECT = `
  *,
  teacher:teachers(id, first_name, last_name, email),
  site:sites(id, name),
  enrollments:class_enrollments(
    id,
    status,
    enrollment_date,
    pre_test_score,
    post_test_score,
    beneficiary:beneficiaries(id, first_name, last_name)
  )
`;

// GET /api/language - Fetch language program data
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
    const type = searchParams.get('type') || 'classes';

    if (type === 'teachers') {
      const site_id = searchParams.get('site_id');

      let countQuery = supabase
        .from('teachers')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (site_id) countQuery = countQuery.eq('site_id', site_id);

      const { count } = await countQuery;

      let query = supabase
        .from('teachers')
        .select(`*, site:sites(id, name)`)
        .eq('is_active', true)
        .order('last_name')
        .range(offset, offset + limit - 1);

      if (site_id) query = query.eq('site_id', site_id);

      const { data, error } = await query;

      if (error) return errorResponse(error.message, 500);

      return successResponse(data, buildPaginationInfo(page, limit, count || 0));
    }

    if (type === 'classes') {
      const site_id = searchParams.get('site_id');
      const teacher_id = searchParams.get('teacher_id');
      const level = searchParams.get('level');

      let countQuery = supabase
        .from('class_sections')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (site_id) countQuery = countQuery.eq('site_id', site_id);
      if (teacher_id) countQuery = countQuery.eq('teacher_id', teacher_id);
      if (level) countQuery = countQuery.eq('level', level);

      const { count } = await countQuery;

      let query = supabase
        .from('class_sections')
        .select(CLASS_SELECT)
        .eq('is_active', true)
        .order('name')
        .range(offset, offset + limit - 1);

      if (site_id) query = query.eq('site_id', site_id);
      if (teacher_id) query = query.eq('teacher_id', teacher_id);
      if (level) query = query.eq('level', level);

      const { data, error } = await query;

      if (error) return errorResponse(error.message, 500);

      return successResponse(data, buildPaginationInfo(page, limit, count || 0));
    }

    if (type === 'enrollments') {
      const class_section_id = searchParams.get('class_section_id');
      const beneficiary_id = searchParams.get('beneficiary_id');
      const status = searchParams.get('status');

      let countQuery = supabase
        .from('class_enrollments')
        .select('*', { count: 'exact', head: true });

      if (class_section_id) countQuery = countQuery.eq('class_section_id', class_section_id);
      if (beneficiary_id) countQuery = countQuery.eq('beneficiary_id', beneficiary_id);
      if (status) countQuery = countQuery.eq('status', status);

      const { count } = await countQuery;

      let query = supabase
        .from('class_enrollments')
        .select(`
          *,
          class_section:class_sections(id, name, level),
          beneficiary:beneficiaries(id, first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (class_section_id) query = query.eq('class_section_id', class_section_id);
      if (beneficiary_id) query = query.eq('beneficiary_id', beneficiary_id);
      if (status) query = query.eq('status', status);

      const { data, error } = await query;

      if (error) return errorResponse(error.message, 500);

      return successResponse(data, buildPaginationInfo(page, limit, count || 0));
    }

    if (type === 'attendance') {
      const class_section_id = searchParams.get('class_section_id');
      const class_date = searchParams.get('class_date');

      if (!class_section_id) {
        return errorResponse('class_section_id is required for attendance', 400, 'MISSING_PARAM');
      }

      // Get enrollments for this class
      const { data: enrollments } = await (supabase as any)
        .from('class_enrollments')
        .select('id')
        .eq('class_section_id', class_section_id)
        .eq('status', 'enrolled');

      const enrollmentIds = (enrollments as { id: string }[] | null)?.map(e => e.id) || [];

      if (enrollmentIds.length === 0) {
        return successResponse([]);
      }

      let query = supabase
        .from('class_attendance')
        .select(`
          *,
          enrollment:class_enrollments(
            id,
            beneficiary:beneficiaries(id, first_name, last_name)
          )
        `)
        .in('class_enrollment_id', enrollmentIds)
        .order('class_date', { ascending: false });

      if (class_date) {
        query = query.eq('class_date', class_date);
      }

      const { data, error } = await query;

      if (error) return errorResponse(error.message, 500);

      return successResponse(data);
    }

    return errorResponse('Invalid type parameter', 400, 'INVALID_TYPE');
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/language - Create teacher, class, enrollment, or attendance
export async function POST(request: NextRequest) {
  try {
    const { profile } = await requireRoleFromRequest(request, ['admin', 'coordinator', 'teacher']);

    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(request, profile.id);
    const rateLimit = checkRateLimit(`write:${rateLimitId}`, { windowMs: 60000, maxRequests: 30 });
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'classes';
    const body = await request.json();

    if (type === 'teachers') {
      const validatedData = createTeacherSchema.parse(body);

      const { data, error } = await (supabase as any)
        .from('teachers')
        .insert(validatedData)
        .select(`*, site:sites(id, name)`)
        .single();

      if (error) return errorResponse(error.message, 500);

      await createAuditLog(supabase, {
        userId: profile.id,
        action: 'create',
        entityType: 'teacher',
        entityId: data.id,
        newValue: validatedData,
      });

      return successResponse(data, undefined, 201);
    }

    if (type === 'classes') {
      const validatedData = createClassSchema.parse(body);

      const { data, error } = await (supabase as any)
        .from('class_sections')
        .insert(validatedData)
        .select(CLASS_SELECT)
        .single();

      if (error) return errorResponse(error.message, 500);

      await createAuditLog(supabase, {
        userId: profile.id,
        action: 'create',
        entityType: 'class_section',
        entityId: data.id,
        newValue: validatedData,
      });

      return successResponse(data, undefined, 201);
    }

    if (type === 'enrollments') {
      const validatedData = createEnrollmentSchema.parse(body);

      // Check if already enrolled
      const { data: existing } = await (supabase as any)
        .from('class_enrollments')
        .select('id')
        .eq('class_section_id', validatedData.class_section_id)
        .eq('beneficiary_id', validatedData.beneficiary_id)
        .single();

      if (existing) {
        return errorResponse('Beneficiary is already enrolled in this class', 400, 'ALREADY_ENROLLED');
      }

      const { data, error } = await (supabase as any)
        .from('class_enrollments')
        .insert({
          ...validatedData,
          enrollment_date: validatedData.enrollment_date || new Date().toISOString().split('T')[0],
        })
        .select(`
          *,
          class_section:class_sections(id, name),
          beneficiary:beneficiaries(id, first_name, last_name)
        `)
        .single();

      if (error) return errorResponse(error.message, 500);

      await createAuditLog(supabase, {
        userId: profile.id,
        action: 'create',
        entityType: 'class_enrollment',
        entityId: data.id,
        newValue: validatedData,
      });

      return successResponse(data, undefined, 201);
    }

    if (type === 'attendance') {
      const validatedData = createAttendanceSchema.parse(body);

      // Upsert attendance record
      const { data, error } = await (supabase as any)
        .from('class_attendance')
        .upsert({
          class_enrollment_id: validatedData.class_enrollment_id,
          class_date: validatedData.class_date,
          is_present: validatedData.is_present,
          notes: validatedData.notes,
        }, {
          onConflict: 'class_enrollment_id,class_date',
        })
        .select()
        .single();

      if (error) return errorResponse(error.message, 500);

      await createAuditLog(supabase, {
        userId: profile.id,
        action: 'create',
        entityType: 'class_attendance',
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

// PATCH /api/language - Update teacher, class, or enrollment
export async function PATCH(request: NextRequest) {
  try {
    const { profile } = await requireRoleFromRequest(request, ['admin', 'coordinator', 'teacher']);

    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(request, profile.id);
    const rateLimit = checkRateLimit(`write:${rateLimitId}`, { windowMs: 60000, maxRequests: 30 });
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'classes';
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return errorResponse('ID is required', 400, 'MISSING_ID');
    }

    const table = type === 'teachers' ? 'teachers'
      : type === 'classes' ? 'class_sections'
      : type === 'enrollments' ? 'class_enrollments'
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

// DELETE /api/language - Soft delete teacher or class
export async function DELETE(request: NextRequest) {
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
    const type = searchParams.get('type') || 'classes';
    const id = searchParams.get('id');

    if (!id) {
      return errorResponse('ID is required', 400, 'MISSING_ID');
    }

    if (type === 'teachers') {
      const { data: oldData } = await (supabase as any)
        .from('teachers')
        .select('*')
        .eq('id', id)
        .single();

      const { error } = await (supabase as any)
        .from('teachers')
        .update({ is_active: false })
        .eq('id', id);

      if (error) return errorResponse(error.message, 500);

      await createAuditLog(supabase, {
        userId: profile.id,
        action: 'delete',
        entityType: 'teacher',
        entityId: id,
        oldValue: oldData,
      });

      return successResponse({ deleted: true });
    }

    if (type === 'classes') {
      const { data: oldData } = await (supabase as any)
        .from('class_sections')
        .select('*')
        .eq('id', id)
        .single();

      const { error } = await (supabase as any)
        .from('class_sections')
        .update({ is_active: false })
        .eq('id', id);

      if (error) return errorResponse(error.message, 500);

      await createAuditLog(supabase, {
        userId: profile.id,
        action: 'delete',
        entityType: 'class_section',
        entityId: id,
        oldValue: oldData,
      });

      return successResponse({ deleted: true });
    }

    if (type === 'enrollments') {
      const { data: oldData } = await (supabase as any)
        .from('class_enrollments')
        .select('*')
        .eq('id', id)
        .single();

      // Update status to dropped instead of hard delete
      const { error } = await (supabase as any)
        .from('class_enrollments')
        .update({ status: 'dropped' })
        .eq('id', id);

      if (error) return errorResponse(error.message, 500);

      await createAuditLog(supabase, {
        userId: profile.id,
        action: 'delete',
        entityType: 'class_enrollment',
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

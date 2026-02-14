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
  parseJsonBody,
} from '@/lib/api-server-utils';

// Validation schemas
const createEventSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  event_type: z.enum(['class', 'workshop', 'community', 'orientation', 'meeting', 'celebration', 'other']),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).default('scheduled'),
  site_id: z.string().uuid().optional(),
  location: z.string().max(500).optional(),
  start_date: z.string(),
  end_date: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  max_attendees: z.number().int().min(0).optional(),
  requires_registration: z.boolean().default(false),
  notes: z.string().optional(),
});

const createAttendeeSchema = z.object({
  event_id: z.string().uuid(),
  beneficiary_id: z.string().uuid(),
  status: z.enum(['registered', 'confirmed', 'attended', 'no_show', 'cancelled']).default('registered'),
  notes: z.string().optional(),
  support_needed: z.string().optional(),
});

const EVENT_SELECT = `
  *,
  site:sites(id, name),
  attendees:event_attendees(
    id,
    status,
    notes,
    beneficiary:beneficiaries(id, first_name, last_name)
  ),
  volunteers:event_volunteers(
    id,
    role,
    volunteer:volunteers(id, first_name, last_name)
  )
`;

// GET /api/events - Fetch events with optional filters and pagination
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

    const type = searchParams.get('type') || 'events';
    const event_type = searchParams.get('event_type');
    const status = searchParams.get('status');
    const site_id = searchParams.get('site_id');
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');
    const upcoming = searchParams.get('upcoming') === 'true';

    if (type === 'events') {
      // Count query
      let countQuery = supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (event_type) countQuery = countQuery.eq('event_type', event_type);
      if (status) countQuery = countQuery.eq('status', status);
      if (site_id) countQuery = countQuery.eq('site_id', site_id);
      if (from_date) countQuery = countQuery.gte('start_date', from_date);
      if (to_date) countQuery = countQuery.lte('start_date', to_date);
      if (upcoming) countQuery = countQuery.gte('start_date', new Date().toISOString().split('T')[0]);

      const { count } = await countQuery;

      // Data query
      let query = supabase
        .from('events')
        .select(EVENT_SELECT)
        .eq('is_active', true)
        .order('start_date', { ascending: upcoming })
        .range(offset, offset + limit - 1);

      if (event_type) query = query.eq('event_type', event_type);
      if (status) query = query.eq('status', status);
      if (site_id) query = query.eq('site_id', site_id);
      if (from_date) query = query.gte('start_date', from_date);
      if (to_date) query = query.lte('start_date', to_date);
      if (upcoming) query = query.gte('start_date', new Date().toISOString().split('T')[0]);

      const { data, error } = await query;

      if (error) return errorResponse(error.message, 500);

      return successResponse(data, buildPaginationInfo(page, limit, count || 0));
    }

    if (type === 'attendees') {
      const event_id = searchParams.get('event_id');

      if (!event_id) {
        return errorResponse('event_id is required for attendees', 400, 'MISSING_PARAM');
      }

      const { count } = await supabase
        .from('event_attendees')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event_id);

      const { data, error } = await supabase
        .from('event_attendees')
        .select(`
          *,
          beneficiary:beneficiaries(id, first_name, last_name, email, phone),
          event:events(id, title)
        `)
        .eq('event_id', event_id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) return errorResponse(error.message, 500);

      return successResponse(data, buildPaginationInfo(page, limit, count || 0));
    }

    return errorResponse('Invalid type parameter', 400, 'INVALID_TYPE');
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/events - Create an event or register an attendee
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
    const type = searchParams.get('type') || 'events';
    const body = await parseJsonBody(request);

    if (type === 'events') {
      const validatedData = createEventSchema.parse(body);

      const { data, error } = await (supabase as any)
        .from('events')
        .insert(validatedData)
        .select(EVENT_SELECT)
        .single();

      if (error) return errorResponse(error.message, 500);

      await createAuditLog(supabase, {
        userId: profile.id,
        action: 'create',
        entityType: 'event',
        entityId: data.id,
        newValue: validatedData,
      });

      return successResponse(data, undefined, 201);
    }

    if (type === 'attendees') {
      const validatedData = createAttendeeSchema.parse(body);

      // Check if already registered
      const { data: existing } = await (supabase as any)
        .from('event_attendees')
        .select('id')
        .eq('event_id', validatedData.event_id)
        .eq('beneficiary_id', validatedData.beneficiary_id)
        .single();

      if (existing) {
        return errorResponse('Beneficiary is already registered for this event', 400, 'ALREADY_REGISTERED');
      }

      const { data, error } = await (supabase as any)
        .from('event_attendees')
        .insert(validatedData)
        .select(`
          *,
          beneficiary:beneficiaries(id, first_name, last_name),
          event:events(id, title)
        `)
        .single();

      if (error) return errorResponse(error.message, 500);

      await createAuditLog(supabase, {
        userId: profile.id,
        action: 'create',
        entityType: 'event_attendee',
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

// PATCH /api/events - Update an event or attendee
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
    const type = searchParams.get('type') || 'events';
    const body = await parseJsonBody(request);
    const { id, ...updateData } = body;

    if (!id) {
      return errorResponse('ID is required', 400, 'MISSING_ID');
    }

    const table = type === 'events' ? 'events' : type === 'attendees' ? 'event_attendees' : null;

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

// DELETE /api/events - Soft delete an event or remove an attendee
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
    const type = searchParams.get('type') || 'events';
    const id = searchParams.get('id');

    if (!id) {
      return errorResponse('ID is required', 400, 'MISSING_ID');
    }

    if (type === 'events') {
      // Fetch old data for audit
      const { data: oldData } = await (supabase as any)
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      // Soft delete
      const { error } = await (supabase as any)
        .from('events')
        .update({ is_active: false })
        .eq('id', id);

      if (error) return errorResponse(error.message, 500);

      await createAuditLog(supabase, {
        userId: profile.id,
        action: 'delete',
        entityType: 'event',
        entityId: id,
        oldValue: oldData,
      });

      return successResponse({ deleted: true });
    }

    if (type === 'attendees') {
      // Fetch old data for audit
      const { data: oldData } = await (supabase as any)
        .from('event_attendees')
        .select('*')
        .eq('id', id)
        .single();

      // Hard delete for attendees
      const { error } = await (supabase as any)
        .from('event_attendees')
        .delete()
        .eq('id', id);

      if (error) return errorResponse(error.message, 500);

      await createAuditLog(supabase, {
        userId: profile.id,
        action: 'delete',
        entityType: 'event_attendee',
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

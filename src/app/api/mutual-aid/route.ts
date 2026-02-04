import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAuthFromRequest, requireRoleFromRequest } from '@/lib/auth-server';
import {
  successResponse,
  handleApiError,
  parsePagination,
  buildPaginationInfo,
  checkRateLimit,
  getRateLimitIdentifier,
  rateLimitResponse,
  createAuditLog,
} from '@/lib/api-server-utils';
import type { TransportationRequest, TransportationRequestStatus } from '@/types/database';

// Type helper for Supabase queries until migration is run and types regenerated
type TransportationTable = {
  Row: TransportationRequest;
  Insert: Partial<TransportationRequest>;
  Update: Partial<TransportationRequest>;
};

// Validation schemas
const createTransportationRequestSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  household_id: z.string().uuid(),
  beneficiary_id: z.string().uuid().optional().nullable(),
  mentor_team_id: z.string().uuid().optional().nullable(),

  // Pickup Location
  pickup_address_street: z.string().max(255).optional(),
  pickup_address_city: z.string().max(100).optional(),
  pickup_address_state: z.string().max(2).optional(),
  pickup_address_zip: z.string().max(10).optional(),
  pickup_notes: z.string().optional(),

  // Dropoff Location
  dropoff_address_street: z.string().max(255).optional(),
  dropoff_address_city: z.string().max(100).optional(),
  dropoff_address_state: z.string().max(2).optional(),
  dropoff_address_zip: z.string().max(10).optional(),
  dropoff_notes: z.string().optional(),

  // Scheduling
  request_date: z.string(), // ISO date string
  pickup_time: z.string().optional().nullable(),
  estimated_return_time: z.string().optional().nullable(),

  // Recurrence
  is_recurring: z.boolean().default(false),
  recurrence_pattern: z.enum(['weekly', 'bi-weekly', 'monthly']).optional().nullable(),
  recurrence_end_date: z.string().optional().nullable(),

  // Status & Tracking
  urgency: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),

  // Special Requirements
  needs_wheelchair_access: z.boolean().default(false),
  needs_car_seat: z.boolean().default(false),
  passenger_count: z.number().int().min(1).default(1),
  special_instructions: z.string().optional(),
});

const updateTransportationRequestSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  household_id: z.string().uuid().optional(),
  beneficiary_id: z.string().uuid().optional().nullable(),
  mentor_team_id: z.string().uuid().optional().nullable(),

  // Pickup Location
  pickup_address_street: z.string().max(255).optional(),
  pickup_address_city: z.string().max(100).optional(),
  pickup_address_state: z.string().max(2).optional(),
  pickup_address_zip: z.string().max(10).optional(),
  pickup_notes: z.string().optional().nullable(),

  // Dropoff Location
  dropoff_address_street: z.string().max(255).optional(),
  dropoff_address_city: z.string().max(100).optional(),
  dropoff_address_state: z.string().max(2).optional(),
  dropoff_address_zip: z.string().max(10).optional(),
  dropoff_notes: z.string().optional().nullable(),

  // Scheduling
  request_date: z.string().optional(),
  pickup_time: z.string().optional().nullable(),
  estimated_return_time: z.string().optional().nullable(),

  // Recurrence
  is_recurring: z.boolean().optional(),
  recurrence_pattern: z.enum(['weekly', 'bi-weekly', 'monthly']).optional().nullable(),
  recurrence_end_date: z.string().optional().nullable(),

  // Status & Tracking
  status: z.enum(['pending', 'scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
  urgency: z.enum(['low', 'medium', 'high', 'urgent']).optional(),

  // Special Requirements
  needs_wheelchair_access: z.boolean().optional(),
  needs_car_seat: z.boolean().optional(),
  passenger_count: z.number().int().min(1).optional(),
  special_instructions: z.string().optional().nullable(),
});

const assignVolunteerSchema = z.object({
  request_id: z.string().uuid(),
  volunteer_id: z.string().uuid(),
});

const completeRequestSchema = z.object({
  request_id: z.string().uuid(),
  completion_notes: z.string().optional(),
  actual_pickup_time: z.string().optional().nullable(),
  actual_dropoff_time: z.string().optional().nullable(),
});

// Select query for full transportation request data
const TRANSPORTATION_REQUEST_SELECT = `
  *,
  household:households(id, name, primary_language),
  beneficiary:beneficiaries(id, first_name, last_name),
  mentor_team:mentor_teams(id, name),
  assigned_volunteer:volunteers(id, first_name, last_name, email, phone),
  assigned_by:users!transportation_requests_assigned_by_id_fkey(id, first_name, last_name),
  completed_by:users!transportation_requests_completed_by_id_fkey(id, first_name, last_name),
  created_by:users!transportation_requests_created_by_id_fkey(id, first_name, last_name)
`;

// GET /api/mutual-aid
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

    // Get single request by ID
    const requestId = searchParams.get('id');
    if (requestId) {
      
      const { data, error } = await supabase
        .from('transportation_requests')
        .select(TRANSPORTATION_REQUEST_SELECT)
        .eq('id', requestId)
        .single();

      if (error) throw error;
      return successResponse({ data });
    }

    // Build query with filters
    const status = searchParams.get('status');
    const householdId = searchParams.get('household_id');
    const volunteerId = searchParams.get('volunteer_id');
    const mentorTeamId = searchParams.get('mentor_team_id');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    // Count query
    
    let countQuery = supabase
      .from('transportation_requests')
      .select('*', { count: 'exact', head: true });

    if (status) countQuery = countQuery.eq('status', status);
    if (householdId) countQuery = countQuery.eq('household_id', householdId);
    if (volunteerId) countQuery = countQuery.eq('assigned_volunteer_id', volunteerId);
    if (mentorTeamId) countQuery = countQuery.eq('mentor_team_id', mentorTeamId);
    if (fromDate) countQuery = countQuery.gte('request_date', fromDate);
    if (toDate) countQuery = countQuery.lte('request_date', toDate);

    const { count } = await countQuery;

    // Data query
    
    let dataQuery = supabase
      .from('transportation_requests')
      .select(TRANSPORTATION_REQUEST_SELECT)
      .order('request_date', { ascending: true })
      .order('pickup_time', { ascending: true })
      .range(offset, offset + limit - 1);

    if (status) dataQuery = dataQuery.eq('status', status);
    if (householdId) dataQuery = dataQuery.eq('household_id', householdId);
    if (volunteerId) dataQuery = dataQuery.eq('assigned_volunteer_id', volunteerId);
    if (mentorTeamId) dataQuery = dataQuery.eq('mentor_team_id', mentorTeamId);
    if (fromDate) dataQuery = dataQuery.gte('request_date', fromDate);
    if (toDate) dataQuery = dataQuery.lte('request_date', toDate);

    const { data, error } = await dataQuery;

    if (error) throw error;

    return successResponse({
      data,
      pagination: buildPaginationInfo(page, limit, count || 0),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

// POST /api/mutual-aid
export async function POST(request: NextRequest) {
  try {
    const { profile } = await requireAuthFromRequest(request);
    await requireRoleFromRequest(request, ['admin', 'coordinator']);

    const supabase = getSupabaseAdmin();
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Handle assign volunteer action
    if (action === 'assign') {
      const validated = assignVolunteerSchema.parse(body);

      const updatePayload = {
        assigned_volunteer_id: validated.volunteer_id,
        assigned_at: new Date().toISOString(),
        assigned_by_id: profile.id,
        status: 'scheduled' as TransportationRequestStatus,
      };
      const { data, error } = await supabase
        .from('transportation_requests')
        .update(updatePayload as never)
        .eq('id', validated.request_id)
        .select(TRANSPORTATION_REQUEST_SELECT)
        .single();

      if (error) throw error;

      await createAuditLog(supabase, {
        userId: profile.id,
        action: 'update',
        entityType: 'transportation-request',
        entityId: validated.request_id,
        newValue: { volunteer_id: validated.volunteer_id, status: 'scheduled' },
      });

      return successResponse({ data });
    }

    // Handle complete request action
    if (action === 'complete') {
      const validated = completeRequestSchema.parse(body);

      const completePayload = {
        status: 'completed' as TransportationRequestStatus,
        completed_at: new Date().toISOString(),
        completed_by_id: profile.id,
        completion_notes: validated.completion_notes || null,
        actual_pickup_time: validated.actual_pickup_time || null,
        actual_dropoff_time: validated.actual_dropoff_time || null,
      };
      const { data, error } = await supabase
        .from('transportation_requests')
        .update(completePayload as never)
        .eq('id', validated.request_id)
        .select(TRANSPORTATION_REQUEST_SELECT)
        .single();

      if (error) throw error;

      await createAuditLog(supabase, {
        userId: profile.id,
        action: 'update',
        entityType: 'transportation-request',
        entityId: validated.request_id,
        newValue: { status: 'completed' },
      });

      return successResponse({ data });
    }

    // Create new transportation request
    const validated = createTransportationRequestSchema.parse(body);

    const insertPayload = {
      ...validated,
      status: 'pending' as TransportationRequestStatus,
      created_by_id: profile.id,
    };
    const { data, error } = await supabase
      .from('transportation_requests')
      .insert(insertPayload as never)
      .select(TRANSPORTATION_REQUEST_SELECT)
      .single();

    if (error) throw error;

    const result = data as { id: string };
    await createAuditLog(supabase, {
      userId: profile.id,
      action: 'create',
      entityType: 'transportation-request',
      entityId: result.id,
      newValue: validated,
    });

    return successResponse({ data }, undefined, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

// PATCH /api/mutual-aid
export async function PATCH(request: NextRequest) {
  try {
    const { profile } = await requireAuthFromRequest(request);
    await requireRoleFromRequest(request, ['admin', 'coordinator']);

    const supabase = getSupabaseAdmin();
    const body = await request.json();

    const validated = updateTransportationRequestSchema.parse(body);
    const { id, ...updates } = validated;

    // Get old values for audit log
    
    const { data: oldData } = await supabase
      .from('transportation_requests')
      .select('*')
      .eq('id', id)
      .single();

    const { data, error } = await supabase
      .from('transportation_requests')
      .update(updates as never)
      .eq('id', id)
      .select(TRANSPORTATION_REQUEST_SELECT)
      .single();

    if (error) throw error;

    await createAuditLog(supabase, {
      userId: profile.id,
      action: 'update',
      entityType: 'transportation-request',
      entityId: id,
      oldValue: oldData ?? undefined,
      newValue: updates,
    });

    return successResponse({ data });
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/mutual-aid
export async function DELETE(request: NextRequest) {
  try {
    const { profile } = await requireAuthFromRequest(request);
    await requireRoleFromRequest(request, ['admin', 'coordinator']);

    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('id');

    if (!requestId) {
      return handleApiError(new Error('Request ID is required'));
    }

    // Soft delete by setting status to cancelled
    const cancelPayload = { status: 'cancelled' as TransportationRequestStatus };
    const { data, error } = await supabase
      .from('transportation_requests')
      .update(cancelPayload as never)
      .eq('id', requestId)
      .select(TRANSPORTATION_REQUEST_SELECT)
      .single();

    if (error) throw error;

    await createAuditLog(supabase, {
      userId: profile.id,
      action: 'delete',
      entityType: 'transportation-request',
      entityId: requestId,
      newValue: { status: 'cancelled' },
    });

    return successResponse({ data });
  } catch (err) {
    return handleApiError(err);
  }
}

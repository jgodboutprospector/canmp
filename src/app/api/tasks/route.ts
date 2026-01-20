import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAuthFromRequest } from '@/lib/auth-server';
import { createTaskSchema, updateTaskSchema } from '@/lib/validation/schemas';
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

const TASK_SELECT = `
  *,
  created_by:users!tasks_created_by_id_fkey(id, first_name, last_name, email),
  assignee:users!tasks_assignee_id_fkey(id, first_name, last_name, email),
  beneficiary:beneficiaries(id, first_name, last_name),
  household:households(id, name),
  volunteer:volunteers(id, first_name, last_name),
  class_section:class_sections(id, name),
  event:events(id, name),
  property:properties(id, name)
`;

// GET /api/tasks - Fetch tasks with optional filters and pagination
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

    const status = searchParams.get('status');
    const assignee_id = searchParams.get('assignee_id');
    const beneficiary_id = searchParams.get('beneficiary_id');
    const volunteer_id = searchParams.get('volunteer_id');
    const class_section_id = searchParams.get('class_section_id');
    const event_id = searchParams.get('event_id');
    const property_id = searchParams.get('property_id');
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');
    const include_archived = searchParams.get('include_archived') === 'true';

    // Build count query
    let countQuery = supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true });

    if (!include_archived) {
      countQuery = countQuery.eq('is_archived', false);
    }
    if (status) countQuery = countQuery.eq('status', status);
    if (assignee_id) countQuery = countQuery.eq('assignee_id', assignee_id);
    if (beneficiary_id) countQuery = countQuery.eq('beneficiary_id', beneficiary_id);
    if (volunteer_id) countQuery = countQuery.eq('volunteer_id', volunteer_id);
    if (class_section_id) countQuery = countQuery.eq('class_section_id', class_section_id);
    if (event_id) countQuery = countQuery.eq('event_id', event_id);
    if (property_id) countQuery = countQuery.eq('property_id', property_id);
    if (from_date) countQuery = countQuery.gte('due_date', from_date);
    if (to_date) countQuery = countQuery.lte('due_date', to_date);

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Error counting tasks:', countError);
      return errorResponse(countError.message, 500);
    }

    // Build data query with pagination
    let query = supabase
      .from('tasks')
      .select(TASK_SELECT)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (!include_archived) {
      query = query.eq('is_archived', false);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (assignee_id) {
      query = query.eq('assignee_id', assignee_id);
    }

    if (beneficiary_id) {
      query = query.eq('beneficiary_id', beneficiary_id);
    }

    if (volunteer_id) {
      query = query.eq('volunteer_id', volunteer_id);
    }

    if (class_section_id) {
      query = query.eq('class_section_id', class_section_id);
    }

    if (event_id) {
      query = query.eq('event_id', event_id);
    }

    if (property_id) {
      query = query.eq('property_id', property_id);
    }

    if (from_date) {
      query = query.gte('due_date', from_date);
    }

    if (to_date) {
      query = query.lte('due_date', to_date);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching tasks:', error);
      return errorResponse(error.message, 500);
    }

    const pagination = buildPaginationInfo(page, limit, count || 0);

    return successResponse(data, pagination);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/tasks - Create a new task
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
    const validatedData = createTaskSchema.parse(body);

    // Set created_by_id if not provided
    const insertData = {
      ...validatedData,
      created_by_id: validatedData.created_by_id || profile.id,
    };

    const { data, error } = await (supabase as any)
      .from('tasks')
      .insert(insertData)
      .select(TASK_SELECT)
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return errorResponse(error.message, 500);
    }

    // Create audit log
    await createAuditLog(supabase, {
      userId: profile.id,
      action: 'create',
      entityType: 'task',
      entityId: data.id,
      newValue: insertData,
    });

    return successResponse(data, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/tasks - Update a task
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
    const { id, ...updateFields } = body;

    if (!id) {
      return errorResponse('Task ID is required', 400, 'MISSING_ID');
    }

    // Validate input
    const validatedData = updateTaskSchema.parse(updateFields);

    // Fetch current state for audit log
    const { data: oldData } = await (supabase as any)
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    // If marking as done, set completed_at
    const updateData: Record<string, unknown> = { ...validatedData };
    if (updateData.status === 'done' && !updateData.completed_at) {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await (supabase as any)
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select(TASK_SELECT)
      .single();

    if (error) {
      console.error('Error updating task:', error);
      return errorResponse(error.message, 500);
    }

    // Create audit log
    await createAuditLog(supabase, {
      userId: profile.id,
      action: 'update',
      entityType: 'task',
      entityId: id,
      oldValue: oldData,
      newValue: updateData,
    });

    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/tasks - Delete a task (soft delete via archive)
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
    const id = searchParams.get('id');

    if (!id) {
      return errorResponse('Task ID is required', 400, 'MISSING_ID');
    }

    // Fetch current state for audit log
    const { data: oldData } = await (supabase as any)
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    // Soft delete by archiving instead of hard delete
    const { error } = await (supabase as any)
      .from('tasks')
      .update({ is_archived: true })
      .eq('id', id);

    if (error) {
      console.error('Error deleting task:', error);
      return errorResponse(error.message, 500);
    }

    // Create audit log
    await createAuditLog(supabase, {
      userId: profile.id,
      action: 'delete',
      entityType: 'task',
      entityId: id,
      oldValue: oldData,
    });

    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}

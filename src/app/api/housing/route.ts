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
const createPropertySchema = z.object({
  name: z.string().min(1).max(255),
  address: z.string().min(1).max(500),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zip_code: z.string().max(20).optional(),
  property_type: z.enum(['canmp_owned', 'master_lease']),
  site_id: z.string().uuid().optional(),
  notes: z.string().optional(),
});

const createUnitSchema = z.object({
  property_id: z.string().uuid(),
  unit_number: z.string().min(1).max(50),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().min(0).optional(),
  square_feet: z.number().int().min(0).optional(),
  monthly_rent: z.number().min(0).optional(),
  status: z.enum(['available', 'occupied', 'maintenance', 'offline']).default('available'),
  amenities: z.record(z.string(), z.any()).optional(),
  notes: z.string().optional(),
});

const createWorkOrderSchema = z.object({
  property_id: z.string().uuid(),
  unit_id: z.string().uuid().optional(),
  household_id: z.string().uuid().optional(),
  category: z.enum(['plumbing', 'hvac', 'electrical', 'appliance', 'structural', 'safety', 'pest', 'landscaping', 'other']),
  priority: z.enum(['urgent', 'high', 'medium', 'low']).default('medium'),
  status: z.enum(['open', 'scheduled', 'in_progress', 'on_hold', 'completed', 'cancelled']).default('open'),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  reported_by: z.string().max(255).optional(),
  assigned_to: z.string().max(255).optional(),
  scheduled_date: z.string().optional(),
  completed_date: z.string().optional(),
});

const PROPERTY_SELECT = `
  *,
  site:sites(id, name),
  units(*)
`;

const WORK_ORDER_SELECT = `
  *,
  property:properties(id, name, address),
  unit:units(id, unit_number),
  household:households(id, name),
  comments:work_order_comments(*)
`;

// GET /api/housing - Fetch housing data (properties, units, work orders, leases)
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
    const type = searchParams.get('type') || 'properties';
    const { page, limit, offset } = parsePagination(searchParams);

    if (type === 'properties') {
      const site_id = searchParams.get('site_id');
      const property_type = searchParams.get('property_type');

      // Count query
      let countQuery = supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (site_id) countQuery = countQuery.eq('site_id', site_id);
      if (property_type) countQuery = countQuery.eq('property_type', property_type);

      const { count } = await countQuery;

      // Data query
      let query = supabase
        .from('properties')
        .select(PROPERTY_SELECT)
        .eq('is_active', true)
        .order('name')
        .range(offset, offset + limit - 1);

      if (site_id) query = query.eq('site_id', site_id);
      if (property_type) query = query.eq('property_type', property_type);

      const { data, error } = await query;

      if (error) return errorResponse(error.message, 500);

      return successResponse(data, buildPaginationInfo(page, limit, count || 0));
    }

    if (type === 'units') {
      const property_id = searchParams.get('property_id');
      const status = searchParams.get('status');

      let countQuery = supabase
        .from('units')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (property_id) countQuery = countQuery.eq('property_id', property_id);
      if (status) countQuery = countQuery.eq('status', status);

      const { count } = await countQuery;

      let query = supabase
        .from('units')
        .select(`*, property:properties(id, name, address)`)
        .eq('is_active', true)
        .order('unit_number')
        .range(offset, offset + limit - 1);

      if (property_id) query = query.eq('property_id', property_id);
      if (status) query = query.eq('status', status);

      const { data, error } = await query;

      if (error) return errorResponse(error.message, 500);

      return successResponse(data, buildPaginationInfo(page, limit, count || 0));
    }

    if (type === 'work-orders') {
      const property_id = searchParams.get('property_id');
      const status = searchParams.get('status');
      const priority = searchParams.get('priority');

      let countQuery = supabase
        .from('work_orders')
        .select('*', { count: 'exact', head: true });

      if (property_id) countQuery = countQuery.eq('property_id', property_id);
      if (status) countQuery = countQuery.eq('status', status);
      if (priority) countQuery = countQuery.eq('priority', priority);

      const { count } = await countQuery;

      let query = supabase
        .from('work_orders')
        .select(WORK_ORDER_SELECT)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (property_id) query = query.eq('property_id', property_id);
      if (status) query = query.eq('status', status);
      if (priority) query = query.eq('priority', priority);

      const { data, error } = await query;

      if (error) return errorResponse(error.message, 500);

      return successResponse(data, buildPaginationInfo(page, limit, count || 0));
    }

    if (type === 'leases') {
      const status = searchParams.get('status');
      const lease_type = searchParams.get('lease_type');

      let countQuery = supabase
        .from('leases')
        .select('*', { count: 'exact', head: true });

      if (status) countQuery = countQuery.eq('status', status);
      if (lease_type) countQuery = countQuery.eq('lease_type', lease_type);

      const { count } = await countQuery;

      let query = supabase
        .from('leases')
        .select(`
          *,
          household:households(id, name),
          unit:units(id, unit_number, property:properties(id, name)),
          bridge_milestones(*)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) query = query.eq('status', status);
      if (lease_type) query = query.eq('lease_type', lease_type);

      const { data, error } = await query;

      if (error) return errorResponse(error.message, 500);

      return successResponse(data, buildPaginationInfo(page, limit, count || 0));
    }

    return errorResponse('Invalid type parameter', 400, 'INVALID_TYPE');
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/housing - Create property, unit, or work order
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
    const type = searchParams.get('type') || 'properties';
    const body = await parseJsonBody(request);

    if (type === 'properties') {
      const validatedData = createPropertySchema.parse(body);

      const { data, error } = await (supabase as any)
        .from('properties')
        .insert(validatedData)
        .select(PROPERTY_SELECT)
        .single();

      if (error) return errorResponse(error.message, 500);

      await createAuditLog(supabase, {
        userId: profile.id,
        action: 'create',
        entityType: 'property',
        entityId: data.id,
        newValue: validatedData,
      });

      return successResponse(data, undefined, 201);
    }

    if (type === 'units') {
      const validatedData = createUnitSchema.parse(body);

      const { data, error } = await (supabase as any)
        .from('units')
        .insert(validatedData)
        .select(`*, property:properties(id, name)`)
        .single();

      if (error) return errorResponse(error.message, 500);

      await createAuditLog(supabase, {
        userId: profile.id,
        action: 'create',
        entityType: 'unit',
        entityId: data.id,
        newValue: validatedData,
      });

      return successResponse(data, undefined, 201);
    }

    if (type === 'work-orders') {
      const validatedData = createWorkOrderSchema.parse(body);

      const { data, error } = await (supabase as any)
        .from('work_orders')
        .insert(validatedData)
        .select(WORK_ORDER_SELECT)
        .single();

      if (error) return errorResponse(error.message, 500);

      await createAuditLog(supabase, {
        userId: profile.id,
        action: 'create',
        entityType: 'work_order',
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

// PATCH /api/housing - Update property, unit, or work order
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
    const type = searchParams.get('type') || 'properties';
    const body = await parseJsonBody(request);
    const { id, ...updateData } = body;

    if (!id) {
      return errorResponse('ID is required', 400, 'MISSING_ID');
    }

    const table = type === 'properties' ? 'properties'
      : type === 'units' ? 'units'
      : type === 'work-orders' ? 'work_orders'
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

// DELETE /api/housing - Soft delete property, unit, lease, or work order
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
    const type = searchParams.get('type') || 'properties';
    const id = searchParams.get('id');

    if (!id) {
      return errorResponse('ID is required', 400, 'MISSING_ID');
    }

    // Map type to table and soft delete method
    let table: string;
    let softDeleteField: string;
    let softDeleteValue: string | boolean;

    switch (type) {
      case 'properties':
        table = 'properties';
        softDeleteField = 'is_active';
        softDeleteValue = false;
        break;
      case 'units':
        table = 'units';
        softDeleteField = 'status';
        softDeleteValue = 'offline';
        break;
      case 'leases':
        table = 'leases';
        softDeleteField = 'status';
        softDeleteValue = 'terminated';
        break;
      case 'work-orders':
        table = 'work_orders';
        softDeleteField = 'status';
        softDeleteValue = 'cancelled';
        break;
      default:
        return errorResponse('Invalid type parameter', 400, 'INVALID_TYPE');
    }

    // Fetch old data for audit
    const { data: oldData } = await (supabase as any)
      .from(table)
      .select('*')
      .eq('id', id)
      .single();

    if (!oldData) {
      return errorResponse('Record not found', 404, 'NOT_FOUND');
    }

    // Soft delete
    const { error } = await (supabase as any)
      .from(table)
      .update({ [softDeleteField]: softDeleteValue })
      .eq('id', id);

    if (error) return errorResponse(error.message, 500);

    await createAuditLog(supabase, {
      userId: profile.id,
      action: 'delete',
      entityType: table.replace('_', '-'),
      entityId: id,
      oldValue: oldData,
    });

    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}

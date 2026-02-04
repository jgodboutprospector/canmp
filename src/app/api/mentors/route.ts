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
const createMentorTeamSchema = z.object({
  name: z.string().min(1).max(200),
  household_id: z.string().uuid(),
  lead_volunteer_id: z.string().uuid(),
  member_ids: z.array(z.string().uuid()).optional().default([]),
  notes: z.string().optional(),
});

const updateMentorTeamSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  household_id: z.string().uuid().optional(),
  notes: z.string().optional(),
  is_active: z.boolean().optional(),
});

const addMemberSchema = z.object({
  team_id: z.string().uuid(),
  volunteer_id: z.string().uuid(),
  role: z.enum(['lead', 'member']).default('member'),
});

const updateMemberSchema = z.object({
  member_id: z.string().uuid(),
  role: z.enum(['lead', 'member']).optional(),
  is_active: z.boolean().optional(),
});

const addNoteSchema = z.object({
  team_id: z.string().uuid(),
  content: z.string().min(1),
  note_type: z.enum(['general', 'meeting', 'concern', 'milestone']).default('general'),
});

const createRequestSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  request_type: z.string().optional(),
  urgency: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  household_id: z.string().uuid(),
  beneficiary_id: z.string().uuid().optional(),
  preferred_date: z.string().optional(),
  mentor_team_id: z.string().uuid().optional(),
});

// Select query for full team data
const TEAM_SELECT = `
  *,
  household:households(
    *,
    beneficiaries(*)
  ),
  members:mentor_team_members(
    *,
    volunteer:volunteers(*)
  )
`;

// GET /api/mentors
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

    // Get single team by ID
    const teamId = searchParams.get('id');
    if (teamId) {
      const { data, error } = await (supabase as any)
        .from('mentor_teams')
        .select(TEAM_SELECT)
        .eq('id', teamId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return errorResponse('Mentor team not found', 404, 'NOT_FOUND');
        }
        return errorResponse(error.message, 500);
      }

      return successResponse(data);
    }

    // Get team notes
    const type = searchParams.get('type');
    const forTeamId = searchParams.get('team_id');

    if (type === 'notes' && forTeamId) {
      const { data, error } = await (supabase as any)
        .from('mentor_team_notes')
        .select(`
          *,
          created_by:users!mentor_team_notes_created_by_id_fkey(first_name, last_name)
        `)
        .eq('team_id', forTeamId)
        .order('created_at', { ascending: false });

      if (error) return errorResponse(error.message, 500);
      return successResponse(data);
    }

    // Standard team listing
    const search = searchParams.get('search');
    const activeOnly = searchParams.get('active') !== 'false';
    const householdId = searchParams.get('household_id');

    // Count query
    let countQuery = (supabase as any)
      .from('mentor_teams')
      .select('*', { count: 'exact', head: true });

    if (activeOnly) countQuery = countQuery.eq('is_active', true);
    if (householdId) countQuery = countQuery.eq('household_id', householdId);
    if (search) {
      countQuery = countQuery.ilike('name', `%${search}%`);
    }

    const { count } = await countQuery;

    // Data query
    let query = (supabase as any)
      .from('mentor_teams')
      .select(TEAM_SELECT)
      .order('name')
      .range(offset, offset + limit - 1);

    if (activeOnly) query = query.eq('is_active', true);
    if (householdId) query = query.eq('household_id', householdId);
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data, error } = await query;

    if (error) return errorResponse(error.message, 500);

    return successResponse(data, buildPaginationInfo(page, limit, count || 0));
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/mentors
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

    // Add member to team
    if (action === 'add_member') {
      const validatedData = addMemberSchema.parse(body);

      // Check if already a member
      const { data: existing } = await (supabase as any)
        .from('mentor_team_members')
        .select('id, is_active')
        .eq('team_id', validatedData.team_id)
        .eq('volunteer_id', validatedData.volunteer_id)
        .maybeSingle();

      if (existing) {
        if (existing.is_active) {
          return errorResponse('Volunteer is already a member of this team', 400, 'ALREADY_MEMBER');
        }
        // Reactivate inactive member
        const { data, error } = await (supabase as any)
          .from('mentor_team_members')
          .update({ is_active: true, role: validatedData.role })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) return errorResponse(error.message, 500);

        await createAuditLog(supabase, {
          userId: profile.id,
          action: 'update',
          entityType: 'mentor_team_member',
          entityId: existing.id,
          newValue: { is_active: true, role: validatedData.role },
        });

        return successResponse(data, undefined, 200);
      }

      // Add new member
      const { data, error } = await (supabase as any)
        .from('mentor_team_members')
        .insert({
          team_id: validatedData.team_id,
          volunteer_id: validatedData.volunteer_id,
          role: validatedData.role,
          joined_date: new Date().toISOString().split('T')[0],
          is_active: true,
        })
        .select()
        .single();

      if (error) return errorResponse(error.message, 500);

      await createAuditLog(supabase, {
        userId: profile.id,
        action: 'create',
        entityType: 'mentor_team_member',
        entityId: data.id,
        newValue: validatedData,
      });

      return successResponse(data, undefined, 201);
    }

    // Add note to team
    if (action === 'add_note') {
      const validatedData = addNoteSchema.parse(body);

      const { data, error } = await (supabase as any)
        .from('mentor_team_notes')
        .insert({
          team_id: validatedData.team_id,
          content: validatedData.content,
          note_type: validatedData.note_type,
          created_by_id: profile.id,
        })
        .select()
        .single();

      if (error) return errorResponse(error.message, 500);

      await createAuditLog(supabase, {
        userId: profile.id,
        action: 'create',
        entityType: 'mentor_team_note',
        entityId: data.id,
        newValue: validatedData,
      });

      return successResponse(data, undefined, 201);
    }

    // Create volunteer request
    if (action === 'add_request') {
      const validatedData = createRequestSchema.parse(body);

      const { data, error } = await (supabase as any)
        .from('volunteer_requests')
        .insert({
          title: validatedData.title,
          description: validatedData.description || null,
          request_type: validatedData.request_type || null,
          urgency: validatedData.urgency,
          household_id: validatedData.household_id,
          beneficiary_id: validatedData.beneficiary_id || null,
          preferred_date: validatedData.preferred_date || null,
          mentor_team_id: validatedData.mentor_team_id || null,
          status: 'pending',
          created_by_id: profile.id,
        })
        .select()
        .single();

      if (error) return errorResponse(error.message, 500);

      await createAuditLog(supabase, {
        userId: profile.id,
        action: 'create',
        entityType: 'volunteer_request',
        entityId: data.id,
        newValue: validatedData,
      });

      return successResponse(data, undefined, 201);
    }

    // Create mentor team with members
    const validatedData = createMentorTeamSchema.parse(body);

    // Create the team
    const { data: team, error: teamError } = await (supabase as any)
      .from('mentor_teams')
      .insert({
        name: validatedData.name.trim(),
        household_id: validatedData.household_id,
        assigned_date: new Date().toISOString().split('T')[0],
        notes: validatedData.notes || null,
        is_active: true,
      })
      .select()
      .single();

    if (teamError) return errorResponse(teamError.message, 500);

    // Add team members (lead + additional members)
    const members = [
      {
        team_id: team.id,
        volunteer_id: validatedData.lead_volunteer_id,
        role: 'lead',
        joined_date: new Date().toISOString().split('T')[0],
        is_active: true,
      },
      ...validatedData.member_ids.map((id) => ({
        team_id: team.id,
        volunteer_id: id,
        role: 'member',
        joined_date: new Date().toISOString().split('T')[0],
        is_active: true,
      })),
    ];

    const { error: membersError } = await (supabase as any)
      .from('mentor_team_members')
      .insert(members);

    if (membersError) {
      // Rollback team creation
      await (supabase as any)
        .from('mentor_teams')
        .delete()
        .eq('id', team.id);
      return errorResponse(membersError.message, 500);
    }

    // Fetch the complete team data
    const { data: completeTeam } = await (supabase as any)
      .from('mentor_teams')
      .select(TEAM_SELECT)
      .eq('id', team.id)
      .single();

    await createAuditLog(supabase, {
      userId: profile.id,
      action: 'create',
      entityType: 'mentor_team',
      entityId: team.id,
      newValue: {
        ...validatedData,
        member_count: members.length,
      },
    });

    return successResponse(completeTeam, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/mentors
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

    // Update member (role or is_active)
    if (action === 'update_member') {
      const validatedData = updateMemberSchema.parse(body);

      // Fetch old data for audit
      const { data: oldData } = await (supabase as any)
        .from('mentor_team_members')
        .select('*')
        .eq('id', validatedData.member_id)
        .single();

      const updateFields: Record<string, unknown> = {};
      if (validatedData.role !== undefined) updateFields.role = validatedData.role;
      if (validatedData.is_active !== undefined) updateFields.is_active = validatedData.is_active;

      const { data, error } = await (supabase as any)
        .from('mentor_team_members')
        .update(updateFields)
        .eq('id', validatedData.member_id)
        .select()
        .single();

      if (error) return errorResponse(error.message, 500);

      await createAuditLog(supabase, {
        userId: profile.id,
        action: 'update',
        entityType: 'mentor_team_member',
        entityId: validatedData.member_id,
        oldValue: oldData,
        newValue: updateFields,
      });

      return successResponse(data);
    }

    // Update team
    const validatedData = updateMentorTeamSchema.parse(body);
    const { id, ...updateData } = validatedData;

    // Fetch old data for audit
    const { data: oldData } = await (supabase as any)
      .from('mentor_teams')
      .select('*')
      .eq('id', id)
      .single();

    const { data, error } = await (supabase as any)
      .from('mentor_teams')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) return errorResponse(error.message, 500);

    await createAuditLog(supabase, {
      userId: profile.id,
      action: 'update',
      entityType: 'mentor_team',
      entityId: id,
      oldValue: oldData,
      newValue: updateData,
    });

    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/mentors
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

    // Remove member from team (soft delete)
    if (type === 'member') {
      const { data: oldData } = await (supabase as any)
        .from('mentor_team_members')
        .select('*')
        .eq('id', id)
        .single();

      const { error } = await (supabase as any)
        .from('mentor_team_members')
        .update({ is_active: false })
        .eq('id', id);

      if (error) return errorResponse(error.message, 500);

      await createAuditLog(supabase, {
        userId: profile.id,
        action: 'delete',
        entityType: 'mentor_team_member',
        entityId: id,
        oldValue: oldData,
      });

      return successResponse({ deleted: true });
    }

    // Soft delete team
    const { data: oldData } = await (supabase as any)
      .from('mentor_teams')
      .select('*')
      .eq('id', id)
      .single();

    const { error } = await (supabase as any)
      .from('mentor_teams')
      .update({ is_active: false })
      .eq('id', id);

    if (error) return errorResponse(error.message, 500);

    await createAuditLog(supabase, {
      userId: profile.id,
      action: 'delete',
      entityType: 'mentor_team',
      entityId: id,
      oldValue: oldData,
    });

    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}

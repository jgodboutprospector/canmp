'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Volunteer, Household, Beneficiary } from '@/types/database';
import type { ApiResponse } from '@/lib/api-server-utils';

// ============================================
// Volunteers Hook (Simple - for mentor teams dropdown)
// For full volunteer management, use useVolunteers from useVolunteers.ts
// ============================================

export function useVolunteers() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVolunteers();
  }, []);

  async function fetchVolunteers() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('volunteers')
        .select('*')
        .eq('is_active', true)
        .order('last_name');

      if (error) throw error;
      setVolunteers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch volunteers');
    } finally {
      setLoading(false);
    }
  }

  return { volunteers, loading, error, refetch: fetchVolunteers };
}

// ============================================
// Mentor Teams Hook
// ============================================

interface MentorTeam {
  id: string;
  name: string | null;
  household_id: string | null;
  assigned_date: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface MentorTeamMember {
  id: string;
  team_id: string;
  volunteer_id: string;
  role: string;
  joined_date: string;
  is_active: boolean;
  volunteer?: Volunteer;
}

interface MentorTeamWithRelations extends MentorTeam {
  household?: Household & { beneficiaries?: Beneficiary[] };
  members?: MentorTeamMember[];
}

export function useMentorTeams() {
  const [teams, setTeams] = useState<MentorTeamWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/mentors');
      const result: ApiResponse<MentorTeamWithRelations[]> = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch mentor teams');
      }

      setTeams(result.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch mentor teams');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const createTeam = useCallback(async (data: {
    name: string;
    household_id: string;
    lead_volunteer_id: string;
    member_ids?: string[];
    notes?: string;
  }) => {
    const response = await fetch('/api/mentors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result: ApiResponse<MentorTeamWithRelations> = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to create team');
    }

    await fetchTeams();
    return result.data;
  }, [fetchTeams]);

  const addMember = useCallback(async (teamId: string, volunteerId: string, role: 'lead' | 'member' = 'member') => {
    const response = await fetch('/api/mentors?action=add_member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_id: teamId, volunteer_id: volunteerId, role }),
    });

    const result: ApiResponse = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to add member');
    }

    await fetchTeams();
    return result.data;
  }, [fetchTeams]);

  const updateMember = useCallback(async (memberId: string, updates: { role?: 'lead' | 'member'; is_active?: boolean }) => {
    const response = await fetch('/api/mentors?action=update_member', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: memberId, ...updates }),
    });

    const result: ApiResponse = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to update member');
    }

    await fetchTeams();
    return result.data;
  }, [fetchTeams]);

  const removeMember = useCallback(async (memberId: string) => {
    const response = await fetch(`/api/mentors?id=${memberId}&type=member`, {
      method: 'DELETE',
    });

    const result: ApiResponse = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to remove member');
    }

    await fetchTeams();
    return result.data;
  }, [fetchTeams]);

  const deleteTeam = useCallback(async (teamId: string) => {
    const response = await fetch(`/api/mentors?id=${teamId}`, {
      method: 'DELETE',
    });

    const result: ApiResponse = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete team');
    }

    await fetchTeams();
    return result.data;
  }, [fetchTeams]);

  return {
    teams,
    loading,
    error,
    refetch: fetchTeams,
    createTeam,
    addMember,
    updateMember,
    removeMember,
    deleteTeam,
  };
}

export function useMentorTeam(id: string) {
  const [team, setTeam] = useState<MentorTeamWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeam = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/mentors?id=${id}`);
      const result: ApiResponse<MentorTeamWithRelations> = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch mentor team');
      }

      setTeam(result.data || null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch mentor team');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  return { team, loading, error, refetch: fetchTeam };
}

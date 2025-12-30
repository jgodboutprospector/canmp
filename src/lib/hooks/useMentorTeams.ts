'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Volunteer, Household, Beneficiary } from '@/types/database';

// ============================================
// Volunteers Hook
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

  useEffect(() => {
    fetchTeams();
  }, []);

  async function fetchTeams() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('mentor_teams')
        .select(`
          *,
          household:households(
            *,
            beneficiaries(*)
          ),
          members:mentor_team_members(
            *,
            volunteer:volunteers(*)
          )
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setTeams(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch mentor teams');
    } finally {
      setLoading(false);
    }
  }

  return { teams, loading, error, refetch: fetchTeams };
}

export function useMentorTeam(id: string) {
  const [team, setTeam] = useState<MentorTeamWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchTeam();
  }, [id]);

  async function fetchTeam() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('mentor_teams')
        .select(`
          *,
          household:households(
            *,
            beneficiaries(*)
          ),
          members:mentor_team_members(
            *,
            volunteer:volunteers(*)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setTeam(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch mentor team');
    } finally {
      setLoading(false);
    }
  }

  return { team, loading, error, refetch: fetchTeam };
}

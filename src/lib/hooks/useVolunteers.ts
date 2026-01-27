'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Volunteer, VolunteerHours, VolunteerAvailability, VolunteerWithRelations, VolunteerRequest, VolunteerRequestWithRelations } from '@/types/database';

// ============================================
// Volunteers List Hook
// ============================================

interface UseVolunteersOptions {
  activeOnly?: boolean;
  search?: string;
  skill?: string;
  hasBackgroundCheck?: boolean;
  hasOrientation?: boolean;
}

export function useVolunteers(options: UseVolunteersOptions = {}) {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVolunteers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('volunteers')
        .select('*')
        .order('last_name');

      // Apply filters
      if (options.activeOnly !== false) {
        query = query.eq('is_active', true);
      }

      if (options.search) {
        query = query.or(`first_name.ilike.%${options.search}%,last_name.ilike.%${options.search}%,email.ilike.%${options.search}%`);
      }

      if (options.skill) {
        query = query.contains('skills', [options.skill]);
      }

      if (options.hasBackgroundCheck) {
        query = query.not('background_check_date', 'is', null);
      }

      if (options.hasOrientation) {
        query = query.not('orientation_date', 'is', null);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setVolunteers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch volunteers');
    } finally {
      setLoading(false);
    }
  }, [options.activeOnly, options.search, options.skill, options.hasBackgroundCheck, options.hasOrientation]);

  useEffect(() => {
    fetchVolunteers();
  }, [fetchVolunteers]);

  return { volunteers, loading, error, refetch: fetchVolunteers };
}

// ============================================
// Single Volunteer Hook
// ============================================

export function useVolunteer(id: string | null) {
  const [volunteer, setVolunteer] = useState<VolunteerWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVolunteer = useCallback(async () => {
    if (!id) {
      setVolunteer(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('volunteers')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      setVolunteer(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch volunteer');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchVolunteer();
  }, [fetchVolunteer]);

  return { volunteer, loading, error, refetch: fetchVolunteer };
}

// ============================================
// Volunteer Hours Hook
// ============================================

interface VolunteerHoursWithRelations extends VolunteerHours {
  event?: { id: string; title: string } | null;
  verified_by?: { id: string; first_name: string; last_name: string } | null;
}

export function useVolunteerHours(volunteerId: string | null) {
  const [hours, setHours] = useState<VolunteerHoursWithRelations[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHours = useCallback(async () => {
    if (!volunteerId) {
      setHours([]);
      setTotalHours(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await (supabase as any)
        .from('volunteer_hours')
        .select(`
          *,
          event:events(id, title),
          verified_by:users!volunteer_hours_verified_by_id_fkey(id, first_name, last_name)
        `)
        .eq('volunteer_id', volunteerId)
        .order('date', { ascending: false });

      if (fetchError) throw fetchError;

      const hoursData = data || [];
      setHours(hoursData);
      setTotalHours(hoursData.reduce((sum: number, h: VolunteerHours) => sum + Number(h.hours), 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch volunteer hours');
    } finally {
      setLoading(false);
    }
  }, [volunteerId]);

  useEffect(() => {
    fetchHours();
  }, [fetchHours]);

  const logHours = useCallback(async (data: {
    date: string;
    hours: number;
    activity_type?: string;
    description?: string;
    event_id?: string;
  }) => {
    if (!volunteerId) return { error: 'No volunteer ID' };

    try {
      const { data: newEntry, error } = await (supabase as any)
        .from('volunteer_hours')
        .insert({
          volunteer_id: volunteerId,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchHours();
      return { data: newEntry, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Failed to log hours' };
    }
  }, [volunteerId, fetchHours]);

  const deleteHours = useCallback(async (hoursId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('volunteer_hours')
        .delete()
        .eq('id', hoursId);

      if (error) throw error;

      await fetchHours();
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to delete hours' };
    }
  }, [fetchHours]);

  return { hours, totalHours, loading, error, refetch: fetchHours, logHours, deleteHours };
}

// ============================================
// Volunteer Availability Hook
// ============================================

export function useVolunteerAvailability(volunteerId: string | null) {
  const [availability, setAvailability] = useState<VolunteerAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailability = useCallback(async () => {
    if (!volunteerId) {
      setAvailability([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await (supabase as any)
        .from('volunteer_availability')
        .select('*')
        .eq('volunteer_id', volunteerId)
        .order('day_of_week');

      if (fetchError) throw fetchError;
      setAvailability(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch availability');
    } finally {
      setLoading(false);
    }
  }, [volunteerId]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const updateAvailability = useCallback(async (newAvailability: Omit<VolunteerAvailability, 'id' | 'volunteer_id' | 'created_at' | 'updated_at'>[]) => {
    if (!volunteerId) return { error: 'No volunteer ID' };

    try {
      // Delete existing availability
      await (supabase as any)
        .from('volunteer_availability')
        .delete()
        .eq('volunteer_id', volunteerId);

      // Insert new availability
      const records = newAvailability.map(a => ({
        volunteer_id: volunteerId,
        ...a,
      }));

      const { error } = await (supabase as any)
        .from('volunteer_availability')
        .insert(records);

      if (error) throw error;

      await fetchAvailability();
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to update availability' };
    }
  }, [volunteerId, fetchAvailability]);

  return { availability, loading, error, refetch: fetchAvailability, updateAvailability };
}

// ============================================
// Neon Import Hook
// ============================================

interface NeonAccount {
  id: string;
  neon_account_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  volunteer_id: string | null;
  is_volunteer: boolean;
}

export function useNeonVolunteers() {
  const [neonAccounts, setNeonAccounts] = useState<NeonAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNeonAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await (supabase as any)
        .from('neon_accounts')
        .select('*')
        .eq('account_type', 'INDIVIDUAL')
        .is('volunteer_id', null)
        .order('last_name');

      if (fetchError) throw fetchError;
      setNeonAccounts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Neon accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNeonAccounts();
  }, [fetchNeonAccounts]);

  const importVolunteers = useCallback(async (neonAccountIds: string[]) => {
    const results: { imported: number; errors: Array<{ id: string; error: string }> } = {
      imported: 0,
      errors: [],
    };

    for (const neonAccountId of neonAccountIds) {
      try {
        // Get Neon account
        const { data: neonAccount } = await (supabase as any)
          .from('neon_accounts')
          .select('*')
          .eq('neon_account_id', neonAccountId)
          .single();

        if (!neonAccount) {
          results.errors.push({ id: neonAccountId, error: 'Account not found' });
          continue;
        }

        // Create volunteer
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
          results.errors.push({ id: neonAccountId, error: createError.message });
          continue;
        }

        // Link Neon account
        await (supabase as any)
          .from('neon_accounts')
          .update({ volunteer_id: volunteer.id, is_volunteer: true })
          .eq('neon_account_id', neonAccountId);

        results.imported++;
      } catch (err) {
        results.errors.push({ id: neonAccountId, error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    await fetchNeonAccounts();
    return results;
  }, [fetchNeonAccounts]);

  return { neonAccounts, loading, error, refetch: fetchNeonAccounts, importVolunteers };
}

// ============================================
// Activity Types Hook
// ============================================

interface ActivityType {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export function useActivityTypes() {
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchActivityTypes() {
      try {
        setLoading(true);
        const { data, error: fetchError } = await (supabase as any)
          .from('volunteer_activity_types')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (fetchError) throw fetchError;
        setActivityTypes(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch activity types');
      } finally {
        setLoading(false);
      }
    }

    fetchActivityTypes();
  }, []);

  return { activityTypes, loading, error };
}

// ============================================
// Hours Summary Hook
// ============================================

interface HoursSummary {
  volunteer_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  is_active: boolean;
  total_hours: number;
  total_entries: number;
  last_volunteer_date: string | null;
  hours_this_month: number;
  hours_this_year: number;
}

export function useHoursSummary() {
  const [summary, setSummary] = useState<HoursSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await (supabase as any)
        .from('volunteer_hours_summary')
        .select('*')
        .order('total_hours', { ascending: false });

      if (fetchError) throw fetchError;
      setSummary(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch hours summary');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return { summary, loading, error, refetch: fetchSummary };
}

// ============================================
// Volunteer Requests Hook
// ============================================

interface UseVolunteerRequestsOptions {
  status?: string;
  householdId?: string;
  volunteerId?: string;
}

export function useVolunteerRequests(options: UseVolunteerRequestsOptions = {}) {
  const [requests, setRequests] = useState<VolunteerRequestWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = (supabase as any)
        .from('volunteer_requests')
        .select(`
          *,
          household:households(id, name),
          beneficiary:beneficiaries(id, first_name, last_name),
          assigned_volunteer:volunteers(id, first_name, last_name, email, phone),
          created_by:users!volunteer_requests_created_by_id_fkey(id, first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (options.status) {
        query = query.eq('status', options.status);
      }
      if (options.householdId) {
        query = query.eq('household_id', options.householdId);
      }
      if (options.volunteerId) {
        query = query.eq('assigned_volunteer_id', options.volunteerId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setRequests(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  }, [options.status, options.householdId, options.volunteerId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const createRequest = useCallback(async (data: Partial<VolunteerRequest>) => {
    try {
      const { data: newRequest, error } = await (supabase as any)
        .from('volunteer_requests')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      await fetchRequests();
      return { data: newRequest, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Failed to create request' };
    }
  }, [fetchRequests]);

  const assignVolunteer = useCallback(async (requestId: string, volunteerId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('volunteer_requests')
        .update({
          assigned_volunteer_id: volunteerId,
          assigned_at: new Date().toISOString(),
          status: 'matched',
        })
        .eq('id', requestId);

      if (error) throw error;
      await fetchRequests();
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to assign volunteer' };
    }
  }, [fetchRequests]);

  const completeRequest = useCallback(async (requestId: string, notes: string, hoursSpent: number) => {
    try {
      const { error } = await (supabase as any)
        .from('volunteer_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completion_notes: notes,
          hours_spent: hoursSpent,
        })
        .eq('id', requestId);

      if (error) throw error;
      await fetchRequests();
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to complete request' };
    }
  }, [fetchRequests]);

  return { requests, loading, error, refetch: fetchRequests, createRequest, assignVolunteer, completeRequest };
}

// ============================================
// Volunteer Request Types Hook
// ============================================

interface RequestType {
  id: string;
  name: string;
  description: string | null;
  typical_duration_hours: number | null;
  skills_required: string[] | null;
  is_active: boolean;
}

export function useRequestTypes() {
  const [requestTypes, setRequestTypes] = useState<RequestType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRequestTypes() {
      try {
        setLoading(true);
        const { data, error: fetchError } = await (supabase as any)
          .from('volunteer_request_types')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (fetchError) throw fetchError;
        setRequestTypes(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch request types');
      } finally {
        setLoading(false);
      }
    }

    fetchRequestTypes();
  }, []);

  return { requestTypes, loading, error };
}

// ============================================
// Matching Volunteers Hook
// ============================================

interface MatchingVolunteer {
  volunteer_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  match_score: number;
  has_required_skills: boolean;
  speaks_required_language: boolean;
  is_available_on_day: boolean;
}

export function useMatchingVolunteers(requestId: string | null) {
  const [matches, setMatches] = useState<MatchingVolunteer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findMatches = useCallback(async () => {
    if (!requestId) {
      setMatches([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await (supabase as any)
        .rpc('find_matching_volunteers', { request_id: requestId });

      if (fetchError) throw fetchError;
      setMatches(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find matching volunteers');
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    if (requestId) {
      findMatches();
    }
  }, [requestId, findMatches]);

  return { matches, loading, error, refetch: findMatches };
}

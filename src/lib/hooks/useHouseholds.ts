'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Household, Beneficiary, User, Site } from '@/types/database';

interface HouseholdWithRelations extends Household {
  beneficiaries?: Beneficiary[];
  coordinator?: User | null;
  site?: Site | null;
}

export function useHouseholds() {
  const [households, setHouseholds] = useState<HouseholdWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHouseholds();
  }, []);

  async function fetchHouseholds() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('households')
        .select(`
          *,
          beneficiaries(*),
          coordinator:users!households_assigned_coordinator_id_fkey(*),
          site:sites(*)
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setHouseholds(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch households');
    } finally {
      setLoading(false);
    }
  }

  return { households, loading, error, refetch: fetchHouseholds };
}

export function useHousehold(id: string) {
  const [household, setHousehold] = useState<HouseholdWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchHousehold();
  }, [id]);

  async function fetchHousehold() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('households')
        .select(`
          *,
          beneficiaries(*),
          coordinator:users!households_assigned_coordinator_id_fkey(*),
          site:sites(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setHousehold(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch household');
    } finally {
      setLoading(false);
    }
  }

  return { household, loading, error, refetch: fetchHousehold };
}

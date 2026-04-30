'use client';

import { useState, useEffect, useRef } from 'react';
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
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    fetchHouseholds();
    return () => { mountedRef.current = false; };
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
      if (!mountedRef.current) return;
      setHouseholds(data || []);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to fetch households');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }

  return { households, loading, error, refetch: fetchHouseholds };
}

export function useHousehold(id: string) {
  const [household, setHousehold] = useState<HouseholdWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (id) fetchHousehold();
    return () => { mountedRef.current = false; };
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
      if (!mountedRef.current) return;
      setHousehold(data);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to fetch household');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }

  return { household, loading, error, refetch: fetchHousehold };
}

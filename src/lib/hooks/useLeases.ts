'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Lease, Household, Unit, Property, BridgeMilestone } from '@/types/database';

interface LeaseWithRelations extends Lease {
  household: Household | null;
  unit: (Unit & { property: Property | null }) | null;
  bridge_milestones?: BridgeMilestone[];
}

export function useLeases() {
  const [leases, setLeases] = useState<LeaseWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeases();
  }, []);

  async function fetchLeases() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leases')
        .select(`
          *,
          household:households(*),
          unit:units(*, property:properties(*)),
          bridge_milestones(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeases(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch leases');
    } finally {
      setLoading(false);
    }
  }

  return { leases, loading, error, refetch: fetchLeases };
}

export function useLease(id: string) {
  const [lease, setLease] = useState<LeaseWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchLease();
  }, [id]);

  async function fetchLease() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leases')
        .select(`
          *,
          household:households(*),
          unit:units(*, property:properties(*)),
          bridge_milestones(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setLease(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch lease');
    } finally {
      setLoading(false);
    }
  }

  return { lease, loading, error, refetch: fetchLease };
}

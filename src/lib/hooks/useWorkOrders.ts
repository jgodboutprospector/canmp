'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { WorkOrder, Property, Unit, Household, WorkOrderComment } from '@/types/database';

interface WorkOrderWithRelations extends WorkOrder {
  property: Property | null;
  unit: Unit | null;
  household: Household | null;
  work_order_comments?: WorkOrderComment[];
}

export function useWorkOrders() {
  const [workOrders, setWorkOrders] = useState<WorkOrderWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  async function fetchWorkOrders() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          *,
          property:properties(*),
          unit:units(*),
          household:households(*),
          work_order_comments(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkOrders(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch work orders');
    } finally {
      setLoading(false);
    }
  }

  return { workOrders, loading, error, refetch: fetchWorkOrders };
}

export function useWorkOrder(id: string) {
  const [workOrder, setWorkOrder] = useState<WorkOrderWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchWorkOrder();
  }, [id]);

  async function fetchWorkOrder() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          *,
          property:properties(*),
          unit:units(*),
          household:households(*),
          work_order_comments(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setWorkOrder(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch work order');
    } finally {
      setLoading(false);
    }
  }

  return { workOrder, loading, error, refetch: fetchWorkOrder };
}

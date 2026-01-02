'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { AuditAction, EntityType } from '@/lib/audit';

export interface AuditLog {
  id: string;
  action: AuditAction;
  entity_type: EntityType;
  entity_id: string;
  entity_name: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  changes: Record<string, { from: any; to: any }> | null;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
  ip_address: string | null;
  metadata: Record<string, any> | null;
}

export interface UseAuditLogsOptions {
  entityType?: EntityType;
  entityId?: string;
  userId?: string;
  action?: AuditAction;
  limit?: number;
  offset?: number;
}

export interface UseAuditLogsReturn {
  logs: AuditLog[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

/**
 * Hook to fetch audit logs with filtering options
 */
export function useAuditLogs(options: UseAuditLogsOptions = {}): UseAuditLogsReturn {
  const {
    entityType,
    entityId,
    userId,
    action,
    limit = 50,
    offset = 0,
  } = options;

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentOffset, setCurrentOffset] = useState(offset);

  const fetchLogs = useCallback(async (appendResults = false) => {
    try {
      if (!appendResults) {
        setLoading(true);
      }

      // Build query
      let query = (supabase as any)
        .from('audit_logs_view')
        .select('*', { count: 'exact' });

      // Apply filters
      if (entityType) {
        query = query.eq('entity_type', entityType);
      }
      if (entityId) {
        query = query.eq('entity_id', entityId);
      }
      if (action) {
        query = query.eq('action', action);
      }

      // Pagination
      query = query
        .order('created_at', { ascending: false })
        .range(appendResults ? currentOffset : 0, (appendResults ? currentOffset : 0) + limit - 1);

      const { data, error: queryError, count } = await query;

      if (queryError) throw queryError;

      if (appendResults) {
        setLogs((prev) => [...prev, ...(data || [])]);
      } else {
        setLogs(data || []);
      }

      if (count !== null) {
        setTotalCount(count);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, action, limit, currentOffset]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const refetch = useCallback(async () => {
    setCurrentOffset(0);
    await fetchLogs(false);
  }, [fetchLogs]);

  const loadMore = useCallback(async () => {
    const newOffset = currentOffset + limit;
    setCurrentOffset(newOffset);
    await fetchLogs(true);
  }, [currentOffset, limit, fetchLogs]);

  const hasMore = logs.length < totalCount;

  return { logs, loading, error, totalCount, refetch, loadMore, hasMore };
}

/**
 * Hook to fetch audit logs for a specific entity
 */
export function useEntityAuditLogs(
  entityType: EntityType,
  entityId: string,
  limit = 20
): UseAuditLogsReturn {
  return useAuditLogs({ entityType, entityId, limit });
}

/**
 * Hook to fetch recent audit logs for a specific user
 */
export function useUserAuditLogs(
  userId: string,
  limit = 50
): UseAuditLogsReturn {
  return useAuditLogs({ userId, limit });
}

/**
 * Hook to fetch recent activity across all entities
 */
export function useRecentActivity(limit = 20): UseAuditLogsReturn {
  return useAuditLogs({ limit });
}

export interface AuditLogStats {
  totalLogs: number;
  todayCount: number;
  weekCount: number;
  byAction: Record<AuditAction, number>;
  byEntityType: Record<string, number>;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch audit log statistics
 */
export function useAuditLogStats(): AuditLogStats {
  const [stats, setStats] = useState<Omit<AuditLogStats, 'loading' | 'error'>>({
    totalLogs: 0,
    todayCount: 0,
    weekCount: 0,
    byAction: {} as Record<AuditAction, number>,
    byEntityType: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);

        // Get total count
        const { count: totalCount } = await (supabase as any)
          .from('audit_logs')
          .select('*', { count: 'exact', head: true });

        // Get today's count
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count: todayCount } = await (supabase as any)
          .from('audit_logs')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', today.toISOString());

        // Get this week's count
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const { count: weekCount } = await (supabase as any)
          .from('audit_logs')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', weekAgo.toISOString());

        // Get counts by action
        const { data: actionCounts } = await (supabase as any)
          .from('audit_logs')
          .select('action')
          .limit(10000);

        const byAction: Record<string, number> = {};
        if (actionCounts) {
          actionCounts.forEach((log: { action: string }) => {
            byAction[log.action] = (byAction[log.action] || 0) + 1;
          });
        }

        // Get counts by entity type
        const { data: entityCounts } = await (supabase as any)
          .from('audit_logs')
          .select('entity_type')
          .limit(10000);

        const byEntityType: Record<string, number> = {};
        if (entityCounts) {
          entityCounts.forEach((log: { entity_type: string }) => {
            byEntityType[log.entity_type] = (byEntityType[log.entity_type] || 0) + 1;
          });
        }

        setStats({
          totalLogs: totalCount || 0,
          todayCount: todayCount || 0,
          weekCount: weekCount || 0,
          byAction: byAction as Record<AuditAction, number>,
          byEntityType,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch audit log stats');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return { ...stats, loading, error };
}

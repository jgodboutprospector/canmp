'use client';

import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '@/lib/api-client';
import type { TransportationRequestWithRelations, TransportationRequestStatus } from '@/types/database';
import type { ApiResponse } from '@/lib/api-server-utils';

// ============================================
// Transportation Requests Hook
// ============================================

interface UseTransportationRequestsOptions {
  status?: TransportationRequestStatus;
  householdId?: string;
  volunteerId?: string;
  mentorTeamId?: string;
  fromDate?: string;
  toDate?: string;
}

export function useTransportationRequests(options: UseTransportationRequestsOptions = {}) {
  const [requests, setRequests] = useState<TransportationRequestWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (options.status) params.set('status', options.status);
      if (options.householdId) params.set('household_id', options.householdId);
      if (options.volunteerId) params.set('volunteer_id', options.volunteerId);
      if (options.mentorTeamId) params.set('mentor_team_id', options.mentorTeamId);
      if (options.fromDate) params.set('from_date', options.fromDate);
      if (options.toDate) params.set('to_date', options.toDate);

      const url = `/api/mutual-aid${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await authFetch(url);
      const result: ApiResponse<TransportationRequestWithRelations[]> = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch transportation requests');
      }

      setRequests(result.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transportation requests');
    } finally {
      setLoading(false);
    }
  }, [options.status, options.householdId, options.volunteerId, options.mentorTeamId, options.fromDate, options.toDate]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const createRequest = useCallback(async (data: {
    title: string;
    description?: string;
    household_id: string;
    beneficiary_id?: string | null;
    mentor_team_id?: string | null;
    pickup_address_street?: string;
    pickup_address_city?: string;
    pickup_address_state?: string;
    pickup_address_zip?: string;
    pickup_notes?: string;
    dropoff_address_street?: string;
    dropoff_address_city?: string;
    dropoff_address_state?: string;
    dropoff_address_zip?: string;
    dropoff_notes?: string;
    request_date: string;
    pickup_time?: string | null;
    estimated_return_time?: string | null;
    is_recurring?: boolean;
    recurrence_pattern?: 'weekly' | 'bi-weekly' | 'monthly' | null;
    recurrence_end_date?: string | null;
    urgency?: 'low' | 'medium' | 'high' | 'urgent';
    needs_wheelchair_access?: boolean;
    needs_car_seat?: boolean;
    passenger_count?: number;
    special_instructions?: string;
  }) => {
    const response = await authFetch('/api/mutual-aid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result: ApiResponse<TransportationRequestWithRelations> = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to create transportation request');
    }

    await fetchRequests();
    return result.data;
  }, [fetchRequests]);

  const updateRequest = useCallback(async (id: string, updates: Record<string, unknown>) => {
    const response = await authFetch('/api/mutual-aid', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });

    const result: ApiResponse<TransportationRequestWithRelations> = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to update transportation request');
    }

    await fetchRequests();
    return result.data;
  }, [fetchRequests]);

  const assignVolunteer = useCallback(async (requestId: string, volunteerId: string) => {
    const response = await authFetch('/api/mutual-aid?action=assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: requestId, volunteer_id: volunteerId }),
    });

    const result: ApiResponse<TransportationRequestWithRelations> = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to assign volunteer');
    }

    await fetchRequests();
    return result.data;
  }, [fetchRequests]);

  const completeRequest = useCallback(async (requestId: string, data?: {
    completion_notes?: string;
    actual_pickup_time?: string | null;
    actual_dropoff_time?: string | null;
  }) => {
    const response = await authFetch('/api/mutual-aid?action=complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: requestId, ...data }),
    });

    const result: ApiResponse<TransportationRequestWithRelations> = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to complete request');
    }

    await fetchRequests();
    return result.data;
  }, [fetchRequests]);

  const cancelRequest = useCallback(async (requestId: string) => {
    const response = await authFetch(`/api/mutual-aid?id=${requestId}`, {
      method: 'DELETE',
    });

    const result: ApiResponse<TransportationRequestWithRelations> = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to cancel request');
    }

    await fetchRequests();
    return result.data;
  }, [fetchRequests]);

  return {
    requests,
    loading,
    error,
    refetch: fetchRequests,
    createRequest,
    updateRequest,
    assignVolunteer,
    completeRequest,
    cancelRequest,
  };
}

// ============================================
// Single Transportation Request Hook
// ============================================

export function useTransportationRequest(id: string) {
  const [request, setRequest] = useState<TransportationRequestWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequest = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      const response = await authFetch(`/api/mutual-aid?id=${id}`);
      const result: ApiResponse<TransportationRequestWithRelations> = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch transportation request');
      }

      setRequest(result.data || null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transportation request');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  return { request, loading, error, refetch: fetchRequest };
}

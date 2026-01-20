'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DonationCategory, DonationStatus, DonationPhoto } from '@/types/database';
import { authFetch } from '@/lib/api-client';

export interface DonationItem {
  id: string;
  name: string;
  description: string | null;
  category: DonationCategory;
  condition: string | null;
  quantity: number;
  status: DonationStatus;
  location: string | null;
  bin_number: string | null;
  donor_name: string | null;
  donated_date: string | null;
  image_path: string | null;
  photos?: DonationPhoto[];
  claimed_by_household: {
    id: string;
    name: string;
  } | null;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface DonationFilters {
  category?: DonationCategory | 'all';
  status?: DonationStatus | 'all';
  search?: string;
  includeInactive?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateDonationInput {
  name: string;
  description?: string;
  category: DonationCategory;
  condition?: string;
  quantity?: number;
  location?: string;
  bin_number?: string;
  donor_name?: string;
  donor_phone?: string;
  donor_email?: string;
  donated_date?: string;
}

export interface UpdateDonationInput {
  id: string;
  name?: string;
  description?: string;
  category?: DonationCategory;
  condition?: string;
  quantity?: number;
  status?: DonationStatus;
  location?: string;
  bin_number?: string;
  donor_name?: string;
  claimed_by?: string | null;
}

/**
 * Hook for managing donation items via the API with pagination support
 */
export function useDonations(initialFilters?: DonationFilters) {
  const [items, setItems] = useState<DonationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DonationFilters>({
    page: 1,
    limit: 50,
    ...initialFilters,
  });
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);

  const fetchItems = useCallback(async (newFilters?: DonationFilters) => {
    const activeFilters = newFilters || filters;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (activeFilters.category && activeFilters.category !== 'all') {
        params.append('category', activeFilters.category);
      }
      if (activeFilters.status && activeFilters.status !== 'all') {
        params.append('status', activeFilters.status);
      }
      if (activeFilters.search) {
        params.append('search', activeFilters.search);
      }
      if (activeFilters.includeInactive) {
        params.append('include_inactive', 'true');
      }
      if (activeFilters.page) {
        params.append('page', String(activeFilters.page));
      }
      if (activeFilters.limit) {
        params.append('limit', String(activeFilters.limit));
      }

      const url = `/api/donations${params.toString() ? `?${params}` : ''}`;
      const response = await authFetch(url);
      const result = await response.json();

      if (result.success) {
        setItems(result.data || []);
        if (result.pagination) {
          setPagination(result.pagination);
        }
      } else {
        setError(result.error || 'Failed to fetch donations');
      }
    } catch (err) {
      setError('Failed to connect to API');
      console.error('Donations API error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const createItem = useCallback(async (input: CreateDonationInput): Promise<DonationItem | null> => {
    try {
      const response = await authFetch('/api/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const result = await response.json();

      if (result.success) {
        // Refresh the list after creating
        await fetchItems();
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to create donation');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create donation';
      setError(message);
      throw err;
    }
  }, [fetchItems]);

  const updateItem = useCallback(async (input: UpdateDonationInput): Promise<DonationItem | null> => {
    try {
      const response = await authFetch('/api/donations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const result = await response.json();

      if (result.success) {
        // Update the item in the local state
        setItems(prev =>
          prev.map(item => (item.id === input.id ? result.data : item))
        );
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to update donation');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update donation';
      setError(message);
      throw err;
    }
  }, []);

  const deleteItem = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await authFetch(`/api/donations?id=${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        // Remove from local state
        setItems(prev => prev.filter(item => item.id !== id));
        return true;
      } else {
        throw new Error(result.error || 'Failed to delete donation');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete donation';
      setError(message);
      throw err;
    }
  }, []);

  const updateFilters = useCallback((newFilters: Partial<DonationFilters>) => {
    const merged = { ...filters, ...newFilters };
    // Reset to page 1 when filters change (except for page changes)
    if (!('page' in newFilters)) {
      merged.page = 1;
    }
    setFilters(merged);
    fetchItems(merged);
  }, [filters, fetchItems]);

  const goToPage = useCallback((page: number) => {
    updateFilters({ page });
  }, [updateFilters]);

  const nextPage = useCallback(() => {
    if (pagination?.hasMore) {
      goToPage((pagination?.page || 1) + 1);
    }
  }, [pagination, goToPage]);

  const prevPage = useCallback(() => {
    if (pagination && pagination.page > 1) {
      goToPage(pagination.page - 1);
    }
  }, [pagination, goToPage]);

  return {
    items,
    loading,
    error,
    filters,
    pagination,
    refresh: fetchItems,
    createItem,
    updateItem,
    deleteItem,
    updateFilters,
    goToPage,
    nextPage,
    prevPage,
    setError,
  };
}

// Stats helper for dashboard
export function useDonationStats() {
  const { items, loading, error, pagination } = useDonations({ limit: 1000 });

  const stats = {
    total: pagination?.total || items.length,
    available: items.filter(i => i.status === 'available').length,
    reserved: items.filter(i => i.status === 'reserved').length,
    claimed: items.filter(i => i.status === 'claimed').length,
    pendingPickup: items.filter(i => i.status === 'pending_pickup').length,
    byCategory: {} as Record<DonationCategory, number>,
  };

  items.forEach(item => {
    stats.byCategory[item.category] = (stats.byCategory[item.category] || 0) + 1;
  });

  return { stats, loading, error };
}

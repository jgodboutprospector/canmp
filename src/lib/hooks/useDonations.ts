'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DonationCategory, DonationStatus, DonationPhoto } from '@/types/database';

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

export interface DonationFilters {
  category?: DonationCategory | 'all';
  status?: DonationStatus | 'all';
  search?: string;
  includeInactive?: boolean;
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
 * Hook for managing donation items via the API
 */
export function useDonations(initialFilters?: DonationFilters) {
  const [items, setItems] = useState<DonationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DonationFilters>(initialFilters || {});

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

      const url = `/api/donations${params.toString() ? `?${params}` : ''}`;
      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setItems(result.data || []);
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
      const response = await fetch('/api/donations', {
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
      const response = await fetch('/api/donations', {
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
      const response = await fetch(`/api/donations?id=${id}`, {
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
    setFilters(merged);
    fetchItems(merged);
  }, [filters, fetchItems]);

  return {
    items,
    loading,
    error,
    filters,
    refresh: fetchItems,
    createItem,
    updateItem,
    deleteItem,
    updateFilters,
    setError,
  };
}

// Stats helper for dashboard
export function useDonationStats() {
  const { items, loading, error } = useDonations();

  const stats = {
    total: items.length,
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

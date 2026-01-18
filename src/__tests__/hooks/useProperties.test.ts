/**
 * Tests for useProperties hook
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useProperties, useProperty } from '@/lib/hooks/useProperties';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('useProperties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch properties on mount', async () => {
    const mockProperties = [
      {
        id: '1',
        name: 'Test Property',
        address: '123 Main St',
        units: [
          { id: 'u1', unit_number: '101', bedrooms: 2 },
        ],
      },
    ];

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: mockProperties, error: null }),
    } as any);

    const { result } = renderHook(() => useProperties());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.properties).toEqual(mockProperties);
    expect(result.current.error).toBeNull();
  });

  it('should handle fetch errors', async () => {
    const mockError = new Error('Failed to fetch');

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: null, error: mockError }),
    } as any);

    const { result } = renderHook(() => useProperties());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch');
    expect(result.current.properties).toEqual([]);
  });

  it('should filter only active properties', async () => {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    } as any);

    renderHook(() => useProperties());

    await waitFor(() => {
      const fromCall = mockSupabase.from.mock.results[0].value;
      expect(fromCall.eq).toHaveBeenCalledWith('is_active', true);
    });
  });

  it('should allow refetching properties', async () => {
    const mockData = [{ id: '1', name: 'Property', units: [] }];

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: mockData, error: null }),
    } as any);

    const { result } = renderHook(() => useProperties());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear mock calls
    jest.clearAllMocks();

    // Trigger refetch
    result.current.refetch();

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('properties');
    });
  });
});

describe('useProperty', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch a single property by id', async () => {
    const mockProperty = {
      id: '1',
      name: 'Test Property',
      address: '123 Main St',
      units: [{ id: 'u1', unit_number: '101' }],
    };

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockProperty, error: null }),
    } as any);

    const { result } = renderHook(() => useProperty('1'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.property).toEqual(mockProperty);
    expect(result.current.error).toBeNull();
  });

  it('should handle errors when fetching single property', async () => {
    const mockError = new Error('Property not found');

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: mockError }),
    } as any);

    const { result } = renderHook(() => useProperty('999'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Property not found');
    expect(result.current.property).toBeNull();
  });

  it('should not fetch if id is not provided', () => {
    renderHook(() => useProperty(''));

    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('should refetch when id changes', async () => {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: {}, error: null }),
    } as any);

    const { rerender } = renderHook(({ id }) => useProperty(id), {
      initialProps: { id: '1' },
    });

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('properties');
    });

    jest.clearAllMocks();

    // Change id
    rerender({ id: '2' });

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('properties');
    });
  });
});

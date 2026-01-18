import { renderHook, waitFor } from '@testing-library/react';
import { useLeases, useLease } from '@/lib/hooks/useLeases';
import { supabase } from '@/lib/supabase';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('useLeases', () => {
  const mockLeases = [
    {
      id: '1',
      household_id: 'household-1',
      unit_id: 'unit-1',
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      household: { id: 'household-1', name: 'Test Household' },
      unit: {
        id: 'unit-1',
        number: '101',
        property: { id: 'property-1', name: 'Test Property' },
      },
      bridge_milestones: [],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should start with loading state', () => {
    const mockSelect = jest.fn(() => ({
      order: jest.fn(() => new Promise(() => {})), // Never resolves
    }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useLeases());
    expect(result.current.loading).toBe(true);
    expect(result.current.leases).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should fetch leases successfully', async () => {
    const mockOrder = jest.fn(() => Promise.resolve({ data: mockLeases, error: null }));
    const mockSelect = jest.fn(() => ({ order: mockOrder }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useLeases());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.leases).toEqual(mockLeases);
    expect(result.current.error).toBeNull();
    expect(supabase.from).toHaveBeenCalledWith('leases');
  });

  it('should handle errors when fetching leases fails', async () => {
    const mockError = new Error('Database connection failed');
    const mockOrder = jest.fn(() => Promise.resolve({ data: null, error: mockError }));
    const mockSelect = jest.fn(() => ({ order: mockOrder }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useLeases());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Database connection failed');
    expect(result.current.leases).toEqual([]);
  });

  it('should handle refetch functionality', async () => {
    const mockOrder = jest.fn(() => Promise.resolve({ data: mockLeases, error: null }));
    const mockSelect = jest.fn(() => ({ order: mockOrder }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useLeases());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockSelect).toHaveBeenCalledTimes(1);

    // Call refetch
    result.current.refetch();

    await waitFor(() => {
      expect(mockSelect).toHaveBeenCalledTimes(2);
    });
  });

  it('should include all necessary relations', async () => {
    const mockOrder = jest.fn(() => Promise.resolve({ data: mockLeases, error: null }));
    const mockSelect = jest.fn(() => ({ order: mockOrder }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    renderHook(() => useLeases());

    await waitFor(() => {
      expect(mockSelect).toHaveBeenCalled();
    });

    const selectQuery = mockSelect.mock.calls[0][0];
    expect(selectQuery).toContain('household:households');
    expect(selectQuery).toContain('unit:units');
    expect(selectQuery).toContain('property:properties');
    expect(selectQuery).toContain('bridge_milestones');
  });

  it('should return empty array when no data is returned', async () => {
    const mockOrder = jest.fn(() => Promise.resolve({ data: null, error: null }));
    const mockSelect = jest.fn(() => ({ order: mockOrder }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useLeases());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.leases).toEqual([]);
  });
});

describe('useLease', () => {
  const mockLease = {
    id: '1',
    household_id: 'household-1',
    unit_id: 'unit-1',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    household: { id: 'household-1', name: 'Test Household' },
    unit: {
      id: 'unit-1',
      number: '101',
      property: { id: 'property-1', name: 'Test Property' },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch single lease successfully', async () => {
    const mockSingle = jest.fn(() => Promise.resolve({ data: mockLease, error: null }));
    const mockEq = jest.fn(() => ({ single: mockSingle }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useLease('1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.lease).toEqual(mockLease);
    expect(result.current.error).toBeNull();
    expect(mockEq).toHaveBeenCalledWith('id', '1');
  });

  it('should handle errors when fetching single lease', async () => {
    const mockError = new Error('Lease not found');
    const mockSingle = jest.fn(() => Promise.resolve({ data: null, error: mockError }));
    const mockEq = jest.fn(() => ({ single: mockSingle }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useLease('999'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Lease not found');
    expect(result.current.lease).toBeNull();
  });

  it('should not fetch when id is empty', () => {
    const mockSelect = jest.fn();
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    renderHook(() => useLease(''));

    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('should refetch when id changes', async () => {
    const mockSingle = jest.fn(() => Promise.resolve({ data: mockLease, error: null }));
    const mockEq = jest.fn(() => ({ single: mockSingle }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { rerender } = renderHook(({ id }) => useLease(id), {
      initialProps: { id: '1' },
    });

    await waitFor(() => {
      expect(mockEq).toHaveBeenCalledWith('id', '1');
    });

    rerender({ id: '2' });

    await waitFor(() => {
      expect(mockEq).toHaveBeenCalledWith('id', '2');
    });

    expect(mockEq).toHaveBeenCalledTimes(2);
  });
});

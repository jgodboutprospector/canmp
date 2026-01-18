import { renderHook, waitFor } from '@testing-library/react';
import { useWorkOrders, useWorkOrder } from '@/lib/hooks/useWorkOrders';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('useWorkOrders', () => {
  const mockWorkOrders = [
    {
      id: '1',
      title: 'Fix broken window',
      description: 'Window in unit 101 is broken',
      status: 'open',
      priority: 'high',
      property_id: 'property-1',
      unit_id: 'unit-1',
      household_id: 'household-1',
      created_at: '2024-01-01T00:00:00Z',
      property: { id: 'property-1', name: 'Test Property' },
      unit: { id: 'unit-1', number: '101' },
      household: { id: 'household-1', name: 'Test Household' },
      work_order_comments: [],
    },
    {
      id: '2',
      title: 'Leaky faucet',
      description: 'Kitchen faucet dripping',
      status: 'in_progress',
      priority: 'medium',
      property_id: 'property-1',
      unit_id: 'unit-2',
      household_id: 'household-2',
      created_at: '2024-01-02T00:00:00Z',
      property: { id: 'property-1', name: 'Test Property' },
      unit: { id: 'unit-2', number: '102' },
      household: { id: 'household-2', name: 'Another Household' },
      work_order_comments: [],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should start with loading state', () => {
    const mockSelect = jest.fn(() => ({
      order: jest.fn(() => new Promise(() => {})),
    }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useWorkOrders());
    expect(result.current.loading).toBe(true);
    expect(result.current.workOrders).toEqual([]);
  });

  it('should fetch work orders successfully', async () => {
    const mockOrder = jest.fn(() => Promise.resolve({ data: mockWorkOrders, error: null }));
    const mockSelect = jest.fn(() => ({ order: mockOrder }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useWorkOrders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.workOrders).toEqual(mockWorkOrders);
    expect(result.current.error).toBeNull();
    expect(supabase.from).toHaveBeenCalledWith('work_orders');
  });

  it('should handle errors when fetch fails', async () => {
    const mockError = new Error('Network error');
    const mockOrder = jest.fn(() => Promise.resolve({ data: null, error: mockError }));
    const mockSelect = jest.fn(() => ({ order: mockOrder }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useWorkOrders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.workOrders).toEqual([]);
  });

  it('should include property, unit, and household relations', async () => {
    const mockOrder = jest.fn(() => Promise.resolve({ data: mockWorkOrders, error: null }));
    const mockSelect = jest.fn(() => ({ order: mockOrder }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    renderHook(() => useWorkOrders());

    await waitFor(() => {
      expect(mockSelect).toHaveBeenCalled();
    });

    const selectQuery = mockSelect.mock.calls[0][0];
    expect(selectQuery).toContain('property:properties');
    expect(selectQuery).toContain('unit:units');
    expect(selectQuery).toContain('household:households');
    expect(selectQuery).toContain('work_order_comments');
  });

  it('should support refetch functionality', async () => {
    const mockOrder = jest.fn(() => Promise.resolve({ data: mockWorkOrders, error: null }));
    const mockSelect = jest.fn(() => ({ order: mockOrder }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useWorkOrders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockSelect).toHaveBeenCalledTimes(1);

    result.current.refetch();

    await waitFor(() => {
      expect(mockSelect).toHaveBeenCalledTimes(2);
    });
  });

  it('should order work orders by created_at descending', async () => {
    const mockOrder = jest.fn(() => Promise.resolve({ data: mockWorkOrders, error: null }));
    const mockSelect = jest.fn(() => ({ order: mockOrder }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    renderHook(() => useWorkOrders());

    await waitFor(() => {
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });

  it('should handle empty work orders list', async () => {
    const mockOrder = jest.fn(() => Promise.resolve({ data: [], error: null }));
    const mockSelect = jest.fn(() => ({ order: mockOrder }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useWorkOrders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.workOrders).toEqual([]);
  });
});

describe('useWorkOrder', () => {
  const mockWorkOrder = {
    id: '1',
    title: 'Fix broken window',
    description: 'Window in unit 101 is broken',
    status: 'open',
    priority: 'high',
    property_id: 'property-1',
    unit_id: 'unit-1',
    household_id: 'household-1',
    created_at: '2024-01-01T00:00:00Z',
    property: { id: 'property-1', name: 'Test Property' },
    unit: { id: 'unit-1', number: '101' },
    household: { id: 'household-1', name: 'Test Household' },
    work_order_comments: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch single work order successfully', async () => {
    const mockSingle = jest.fn(() => Promise.resolve({ data: mockWorkOrder, error: null }));
    const mockEq = jest.fn(() => ({ single: mockSingle }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useWorkOrder('1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.workOrder).toEqual(mockWorkOrder);
    expect(result.current.error).toBeNull();
    expect(mockEq).toHaveBeenCalledWith('id', '1');
  });

  it('should handle errors when fetching single work order', async () => {
    const mockError = new Error('Work order not found');
    const mockSingle = jest.fn(() => Promise.resolve({ data: null, error: mockError }));
    const mockEq = jest.fn(() => ({ single: mockSingle }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useWorkOrder('999'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Work order not found');
    expect(result.current.workOrder).toBeNull();
  });

  it('should not fetch when id is empty', () => {
    const mockSelect = jest.fn();
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    renderHook(() => useWorkOrder(''));

    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('should update when id changes', async () => {
    const mockSingle = jest.fn(() => Promise.resolve({ data: mockWorkOrder, error: null }));
    const mockEq = jest.fn(() => ({ single: mockSingle }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { rerender } = renderHook(({ id }) => useWorkOrder(id), {
      initialProps: { id: '1' },
    });

    await waitFor(() => {
      expect(mockEq).toHaveBeenCalledWith('id', '1');
    });

    rerender({ id: '2' });

    await waitFor(() => {
      expect(mockEq).toHaveBeenCalledWith('id', '2');
    });
  });
});

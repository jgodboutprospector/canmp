import { renderHook, waitFor } from '@testing-library/react';
import { useHouseholds, useHousehold } from '@/lib/hooks/useHouseholds';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('useHouseholds', () => {
  const mockHouseholds = [
    {
      id: 'household-1',
      name: 'Smith Family',
      is_active: true,
      assigned_coordinator_id: 'user-1',
      site_id: 'site-1',
      created_at: '2024-01-01T00:00:00Z',
      beneficiaries: [
        { id: 'ben-1', first_name: 'John', last_name: 'Smith' },
        { id: 'ben-2', first_name: 'Jane', last_name: 'Smith' },
      ],
      coordinator: { id: 'user-1', first_name: 'Admin', last_name: 'User', email: 'admin@test.com' },
      site: { id: 'site-1', name: 'Main Site' },
    },
    {
      id: 'household-2',
      name: 'Johnson Family',
      is_active: true,
      assigned_coordinator_id: 'user-2',
      site_id: 'site-1',
      created_at: '2024-01-02T00:00:00Z',
      beneficiaries: [
        { id: 'ben-3', first_name: 'Bob', last_name: 'Johnson' },
      ],
      coordinator: { id: 'user-2', first_name: 'Coordinator', last_name: 'Two', email: 'coord@test.com' },
      site: { id: 'site-1', name: 'Main Site' },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should start with loading state', () => {
    const mockSelect = jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => new Promise(() => {})),
      })),
    }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useHouseholds());
    expect(result.current.loading).toBe(true);
    expect(result.current.households).toEqual([]);
  });

  it('should fetch all households successfully', async () => {
    const mockOrder = jest.fn(() => Promise.resolve({ data: mockHouseholds, error: null }));
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useHouseholds());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.households).toEqual(mockHouseholds);
    expect(result.current.error).toBeNull();
    expect(supabase.from).toHaveBeenCalledWith('households');
  });

  it('should filter by active households only', async () => {
    const mockOrder = jest.fn(() => Promise.resolve({ data: mockHouseholds, error: null }));
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    renderHook(() => useHouseholds());

    await waitFor(() => {
      expect(mockEq).toHaveBeenCalledWith('is_active', true);
    });
  });

  it('should include beneficiaries relation', async () => {
    const mockOrder = jest.fn(() => Promise.resolve({ data: mockHouseholds, error: null }));
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    renderHook(() => useHouseholds());

    await waitFor(() => {
      expect(mockSelect).toHaveBeenCalled();
    });

    const selectQuery = mockSelect.mock.calls[0][0];
    expect(selectQuery).toContain('beneficiaries(*)');
    expect(selectQuery).toContain('coordinator:users');
    expect(selectQuery).toContain('site:sites(*)');
  });

  it('should handle errors when fetch fails', async () => {
    const mockError = new Error('Database error');
    const mockOrder = jest.fn(() => Promise.resolve({ data: null, error: mockError }));
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useHouseholds());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Database error');
    expect(result.current.households).toEqual([]);
  });

  it('should support refetch functionality', async () => {
    const mockOrder = jest.fn(() => Promise.resolve({ data: mockHouseholds, error: null }));
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useHouseholds());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockSelect).toHaveBeenCalledTimes(1);

    result.current.refetch();

    await waitFor(() => {
      expect(mockSelect).toHaveBeenCalledTimes(2);
    });
  });

  it('should order households by name', async () => {
    const mockOrder = jest.fn(() => Promise.resolve({ data: mockHouseholds, error: null }));
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    renderHook(() => useHouseholds());

    await waitFor(() => {
      expect(mockOrder).toHaveBeenCalledWith('name');
    });
  });

  it('should handle empty households list', async () => {
    const mockOrder = jest.fn(() => Promise.resolve({ data: [], error: null }));
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useHouseholds());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.households).toEqual([]);
  });
});

describe('useHousehold', () => {
  const mockHousehold = {
    id: 'household-1',
    name: 'Smith Family',
    is_active: true,
    assigned_coordinator_id: 'user-1',
    site_id: 'site-1',
    created_at: '2024-01-01T00:00:00Z',
    beneficiaries: [
      { id: 'ben-1', first_name: 'John', last_name: 'Smith' },
      { id: 'ben-2', first_name: 'Jane', last_name: 'Smith' },
    ],
    coordinator: { id: 'user-1', first_name: 'Admin', last_name: 'User', email: 'admin@test.com' },
    site: { id: 'site-1', name: 'Main Site' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch single household successfully', async () => {
    const mockSingle = jest.fn(() => Promise.resolve({ data: mockHousehold, error: null }));
    const mockEq = jest.fn(() => ({ single: mockSingle }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useHousehold('household-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.household).toEqual(mockHousehold);
    expect(result.current.error).toBeNull();
    expect(mockEq).toHaveBeenCalledWith('id', 'household-1');
  });

  it('should handle errors when fetching single household', async () => {
    const mockError = new Error('Household not found');
    const mockSingle = jest.fn(() => Promise.resolve({ data: null, error: mockError }));
    const mockEq = jest.fn(() => ({ single: mockSingle }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useHousehold('999'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Household not found');
    expect(result.current.household).toBeNull();
  });

  it('should not fetch when id is empty', () => {
    const mockSelect = jest.fn();
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    renderHook(() => useHousehold(''));

    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('should update when id changes', async () => {
    const mockSingle = jest.fn(() => Promise.resolve({ data: mockHousehold, error: null }));
    const mockEq = jest.fn(() => ({ single: mockSingle }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { rerender } = renderHook(({ id }) => useHousehold(id), {
      initialProps: { id: 'household-1' },
    });

    await waitFor(() => {
      expect(mockEq).toHaveBeenCalledWith('id', 'household-1');
    });

    rerender({ id: 'household-2' });

    await waitFor(() => {
      expect(mockEq).toHaveBeenCalledWith('id', 'household-2');
    });
  });
});

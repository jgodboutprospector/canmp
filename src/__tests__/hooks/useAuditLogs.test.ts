import { renderHook, waitFor } from '@testing-library/react';
import { useAuditLogs, useEntityAuditLogs, useUserAuditLogs, useRecentActivity } from '@/lib/hooks/useAuditLogs';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('useAuditLogs', () => {
  const mockLogs = [
    {
      id: 'log-1',
      action: 'create' as const,
      entity_type: 'beneficiary' as const,
      entity_id: 'ben-1',
      entity_name: 'John Doe',
      old_values: null,
      new_values: { first_name: 'John', last_name: 'Doe' },
      changes: null,
      created_at: '2024-01-01T00:00:00Z',
      user_name: 'Admin User',
      user_email: 'admin@example.com',
      ip_address: '192.168.1.1',
      metadata: null,
    },
    {
      id: 'log-2',
      action: 'update' as const,
      entity_type: 'household' as const,
      entity_id: 'household-1',
      entity_name: 'Smith Family',
      old_values: { status: 'pending' },
      new_values: { status: 'active' },
      changes: { status: { from: 'pending', to: 'active' } },
      created_at: '2024-01-02T00:00:00Z',
      user_name: 'Coordinator',
      user_email: 'coord@example.com',
      ip_address: '192.168.1.2',
      metadata: null,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should start with loading state', () => {
    const mockRange = jest.fn(() => new Promise(() => {}));
    const mockOrder = jest.fn(() => ({ range: mockRange }));
    const mockSelect = jest.fn(() => ({ order: mockOrder }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useAuditLogs());

    expect(result.current.loading).toBe(true);
    expect(result.current.logs).toEqual([]);
  });

  it('should fetch audit logs successfully', async () => {
    const mockRange = jest.fn(() => Promise.resolve({ data: mockLogs, error: null, count: 2 }));
    const mockOrder = jest.fn(() => ({ range: mockRange }));
    const mockSelect = jest.fn(() => ({ order: mockOrder }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useAuditLogs());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.logs).toEqual(mockLogs);
    expect(result.current.totalCount).toBe(2);
    expect(supabase.from).toHaveBeenCalledWith('audit_logs_view');
  });

  it('should filter by entity type', async () => {
    const mockRange = jest.fn(() => Promise.resolve({ data: [mockLogs[0]], error: null, count: 1 }));
    const mockOrder = jest.fn(() => ({ range: mockRange }));
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    renderHook(() => useAuditLogs({ entityType: 'beneficiary' }));

    await waitFor(() => {
      expect(mockEq).toHaveBeenCalledWith('entity_type', 'beneficiary');
    });
  });

  it('should filter by entity id', async () => {
    const mockRange = jest.fn(() => Promise.resolve({ data: [mockLogs[0]], error: null, count: 1 }));
    const mockOrder = jest.fn(() => ({ range: mockRange }));
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    renderHook(() => useAuditLogs({ entityId: 'ben-1' }));

    await waitFor(() => {
      expect(mockEq).toHaveBeenCalledWith('entity_id', 'ben-1');
    });
  });

  it('should filter by action', async () => {
    const mockRange = jest.fn(() => Promise.resolve({ data: [mockLogs[0]], error: null, count: 1 }));
    const mockOrder = jest.fn(() => ({ range: mockRange }));
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    renderHook(() => useAuditLogs({ action: 'create' }));

    await waitFor(() => {
      expect(mockEq).toHaveBeenCalledWith('action', 'create');
    });
  });

  it('should order by created_at descending', async () => {
    const mockRange = jest.fn(() => Promise.resolve({ data: mockLogs, error: null, count: 2 }));
    const mockOrder = jest.fn(() => ({ range: mockRange }));
    const mockSelect = jest.fn(() => ({ order: mockOrder }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    renderHook(() => useAuditLogs());

    await waitFor(() => {
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });

  it('should apply pagination with limit and offset', async () => {
    const mockRange = jest.fn(() => Promise.resolve({ data: mockLogs, error: null, count: 100 }));
    const mockOrder = jest.fn(() => ({ range: mockRange }));
    const mockSelect = jest.fn(() => ({ order: mockOrder }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    renderHook(() => useAuditLogs({ limit: 25, offset: 0 }));

    await waitFor(() => {
      expect(mockRange).toHaveBeenCalledWith(0, 24); // 0 to limit-1
    });
  });

  it('should handle errors', async () => {
    const mockError = new Error('Failed to fetch audit logs');
    const mockRange = jest.fn(() => Promise.resolve({ data: null, error: mockError, count: null }));
    const mockOrder = jest.fn(() => ({ range: mockRange }));
    const mockSelect = jest.fn(() => ({ order: mockOrder }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useAuditLogs());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch audit logs');
    expect(result.current.logs).toEqual([]);
  });

  it('should support refetch', async () => {
    const mockRange = jest.fn(() => Promise.resolve({ data: mockLogs, error: null, count: 2 }));
    const mockOrder = jest.fn(() => ({ range: mockRange }));
    const mockSelect = jest.fn(() => ({ order: mockOrder }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useAuditLogs());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await result.current.refetch();

    await waitFor(() => {
      expect(mockSelect).toHaveBeenCalledTimes(2);
    });
  });

  it('should determine hasMore correctly', async () => {
    const mockRange = jest.fn(() => Promise.resolve({ data: mockLogs, error: null, count: 100 }));
    const mockOrder = jest.fn(() => ({ range: mockRange }));
    const mockSelect = jest.fn(() => ({ order: mockOrder }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useAuditLogs({ limit: 50 }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasMore).toBe(true);
    expect(result.current.totalCount).toBe(100);
  });

  it('should load more logs', async () => {
    const mockRange = jest.fn()
      .mockResolvedValueOnce({ data: mockLogs, error: null, count: 100 })
      .mockResolvedValueOnce({ data: [mockLogs[1]], error: null, count: 100 });
    const mockOrder = jest.fn(() => ({ range: mockRange }));
    const mockSelect = jest.fn(() => ({ order: mockOrder }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useAuditLogs({ limit: 50 }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await result.current.loadMore();

    await waitFor(() => {
      expect(mockRange).toHaveBeenCalledTimes(2);
    });
  });
});

describe('useEntityAuditLogs', () => {
  const mockLogs = [
    {
      id: 'log-1',
      action: 'update' as const,
      entity_type: 'beneficiary' as const,
      entity_id: 'ben-1',
      entity_name: 'John Doe',
      created_at: '2024-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch logs for specific entity', async () => {
    const mockRange = jest.fn(() => Promise.resolve({ data: mockLogs, error: null, count: 1 }));
    const mockOrder = jest.fn(() => ({ range: mockRange }));
    // Chain two .eq() calls: first returns object with .eq(), second returns object with .order()
    const mockEq2 = jest.fn(() => ({ order: mockOrder }));
    const mockEq1 = jest.fn(() => ({ eq: mockEq2 }));
    const mockSelect = jest.fn(() => ({ eq: mockEq1 }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useEntityAuditLogs('beneficiary', 'ben-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockEq1).toHaveBeenCalledWith('entity_type', 'beneficiary');
    expect(mockEq2).toHaveBeenCalledWith('entity_id', 'ben-1');
  });
});

describe('useUserAuditLogs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch logs for specific user', async () => {
    const mockRange = jest.fn(() => Promise.resolve({ data: [], error: null, count: 0 }));
    const mockOrder = jest.fn(() => ({ range: mockRange }));
    const mockSelect = jest.fn(() => ({ order: mockOrder }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    renderHook(() => useUserAuditLogs('user-1', 25));

    await waitFor(() => {
      expect(mockRange).toHaveBeenCalledWith(0, 24);
    });
  });
});

describe('useRecentActivity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch recent activity with default limit', async () => {
    const mockRange = jest.fn(() => Promise.resolve({ data: [], error: null, count: 0 }));
    const mockOrder = jest.fn(() => ({ range: mockRange }));
    const mockSelect = jest.fn(() => ({ order: mockOrder }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    renderHook(() => useRecentActivity());

    await waitFor(() => {
      expect(mockRange).toHaveBeenCalledWith(0, 19); // limit 20, so 0 to 19
    });
  });

  it('should fetch recent activity with custom limit', async () => {
    const mockRange = jest.fn(() => Promise.resolve({ data: [], error: null, count: 0 }));
    const mockOrder = jest.fn(() => ({ range: mockRange }));
    const mockSelect = jest.fn(() => ({ order: mockOrder }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    renderHook(() => useRecentActivity(10));

    await waitFor(() => {
      expect(mockRange).toHaveBeenCalledWith(0, 9);
    });
  });
});

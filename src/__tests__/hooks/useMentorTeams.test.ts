import { renderHook, waitFor } from '@testing-library/react';
import { useVolunteers, useMentorTeams, useMentorTeam } from '@/lib/hooks/useMentorTeams';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('useVolunteers', () => {
  const mockVolunteers = [
    {
      id: 'volunteer-1',
      first_name: 'Alice',
      last_name: 'Smith',
      email: 'alice@example.com',
      phone: '555-0100',
      is_active: true,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch volunteers successfully', async () => {
    const mockOrder = jest.fn(() => Promise.resolve({ data: mockVolunteers, error: null }));
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useVolunteers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.volunteers).toEqual(mockVolunteers);
    expect(supabase.from).toHaveBeenCalledWith('volunteers');
  });

  it('should filter by active volunteers', async () => {
    const mockOrder = jest.fn(() => Promise.resolve({ data: mockVolunteers, error: null }));
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    renderHook(() => useVolunteers());

    await waitFor(() => {
      expect(mockEq).toHaveBeenCalledWith('is_active', true);
    });
  });

  it('should order by last_name', async () => {
    const mockOrder = jest.fn(() => Promise.resolve({ data: mockVolunteers, error: null }));
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    renderHook(() => useVolunteers());

    await waitFor(() => {
      expect(mockOrder).toHaveBeenCalledWith('last_name');
    });
  });

  it('should handle errors', async () => {
    const mockError = new Error('Failed to fetch volunteers');
    const mockOrder = jest.fn(() => Promise.resolve({ data: null, error: mockError }));
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useVolunteers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch volunteers');
  });

  it('should support refetch', async () => {
    const mockOrder = jest.fn(() => Promise.resolve({ data: mockVolunteers, error: null }));
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useVolunteers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    result.current.refetch();

    await waitFor(() => {
      expect(mockSelect).toHaveBeenCalledTimes(2);
    });
  });
});

describe('useMentorTeams', () => {
  const mockTeams = [
    {
      id: 'team-1',
      name: 'Team Alpha',
      household_id: 'household-1',
      assigned_date: '2024-01-01',
      is_active: true,
      notes: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      household: {
        id: 'household-1',
        name: 'Smith Family',
        beneficiaries: [],
      },
      members: [],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch mentor teams successfully', async () => {
    const mockOrder = jest.fn(() => Promise.resolve({ data: mockTeams, error: null }));
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useMentorTeams());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.teams).toEqual(mockTeams);
    expect(supabase.from).toHaveBeenCalledWith('mentor_teams');
  });

  it('should filter by active teams', async () => {
    const mockOrder = jest.fn(() => Promise.resolve({ data: mockTeams, error: null }));
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    renderHook(() => useMentorTeams());

    await waitFor(() => {
      expect(mockEq).toHaveBeenCalledWith('is_active', true);
    });
  });

  it('should include household with beneficiaries and members', async () => {
    const mockOrder = jest.fn(() => Promise.resolve({ data: mockTeams, error: null }));
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    renderHook(() => useMentorTeams());

    await waitFor(() => {
      expect(mockSelect).toHaveBeenCalled();
    });

    const selectQuery = mockSelect.mock.calls[0][0];
    expect(selectQuery).toContain('household:households');
    expect(selectQuery).toContain('beneficiaries(*)');
    expect(selectQuery).toContain('members:mentor_team_members');
    expect(selectQuery).toContain('volunteer:volunteers');
  });

  it('should order by name', async () => {
    const mockOrder = jest.fn(() => Promise.resolve({ data: mockTeams, error: null }));
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    renderHook(() => useMentorTeams());

    await waitFor(() => {
      expect(mockOrder).toHaveBeenCalledWith('name');
    });
  });

  it('should handle errors', async () => {
    const mockError = new Error('Failed to fetch mentor teams');
    const mockOrder = jest.fn(() => Promise.resolve({ data: null, error: mockError }));
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useMentorTeams());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch mentor teams');
  });

  it('should support refetch', async () => {
    const mockOrder = jest.fn(() => Promise.resolve({ data: mockTeams, error: null }));
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useMentorTeams());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    result.current.refetch();

    await waitFor(() => {
      expect(mockSelect).toHaveBeenCalledTimes(2);
    });
  });
});

describe('useMentorTeam', () => {
  const mockTeam = {
    id: 'team-1',
    name: 'Team Alpha',
    household_id: 'household-1',
    is_active: true,
    household: {
      id: 'household-1',
      name: 'Smith Family',
      beneficiaries: [],
    },
    members: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch single mentor team successfully', async () => {
    const mockSingle = jest.fn(() => Promise.resolve({ data: mockTeam, error: null }));
    const mockEq = jest.fn(() => ({ single: mockSingle }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useMentorTeam('team-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.team).toEqual(mockTeam);
    expect(mockEq).toHaveBeenCalledWith('id', 'team-1');
  });

  it('should handle errors', async () => {
    const mockError = new Error('Team not found');
    const mockSingle = jest.fn(() => Promise.resolve({ data: null, error: mockError }));
    const mockEq = jest.fn(() => ({ single: mockSingle }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useMentorTeam('999'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Team not found');
  });

  it('should not fetch when id is empty', () => {
    const mockSelect = jest.fn();
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    renderHook(() => useMentorTeam(''));

    expect(mockSelect).not.toHaveBeenCalled();
  });
});

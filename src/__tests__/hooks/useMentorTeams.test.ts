import { renderHook, waitFor } from '@testing-library/react';
import { useVolunteers, useMentorTeams, useMentorTeam } from '@/lib/hooks/useMentorTeams';
import { supabase } from '@/lib/supabase';

// Mock supabase for useVolunteers (still uses direct Supabase)
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Mock fetch for useMentorTeams and useMentorTeam (use API)
const mockFetch = jest.fn();
global.fetch = mockFetch;

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
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, data: mockTeams }),
    });

    const { result } = renderHook(() => useMentorTeams());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.teams).toEqual(mockTeams);
    expect(mockFetch).toHaveBeenCalledWith('/api/mentors');
  });

  it('should handle API errors', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: false, error: 'Failed to fetch mentor teams' }),
    });

    const { result } = renderHook(() => useMentorTeams());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch mentor teams');
  });

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useMentorTeams());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
  });

  it('should support refetch', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: mockTeams }),
    });

    const { result } = renderHook(() => useMentorTeams());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await result.current.refetch();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  it('should provide createTeam function', async () => {
    mockFetch
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: mockTeams }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: mockTeams[0] }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: mockTeams }),
      });

    const { result } = renderHook(() => useMentorTeams());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await result.current.createTeam({
      name: 'New Team',
      household_id: 'household-1',
      lead_volunteer_id: 'volunteer-1',
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/mentors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'New Team',
        household_id: 'household-1',
        lead_volunteer_id: 'volunteer-1',
      }),
    });
  });

  it('should provide addMember function', async () => {
    mockFetch
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: mockTeams }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: {} }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: mockTeams }),
      });

    const { result } = renderHook(() => useMentorTeams());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await result.current.addMember('team-1', 'volunteer-1', 'member');

    expect(mockFetch).toHaveBeenCalledWith('/api/mentors?action=add_member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        team_id: 'team-1',
        volunteer_id: 'volunteer-1',
        role: 'member',
      }),
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
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, data: mockTeam }),
    });

    const { result } = renderHook(() => useMentorTeam('team-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.team).toEqual(mockTeam);
    expect(mockFetch).toHaveBeenCalledWith('/api/mentors?id=team-1');
  });

  it('should handle errors', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: false, error: 'Team not found' }),
    });

    const { result } = renderHook(() => useMentorTeam('999'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Team not found');
  });

  it('should not fetch when id is empty', async () => {
    const { result } = renderHook(() => useMentorTeam(''));

    // Should remain in initial state
    expect(result.current.team).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should support refetch', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: mockTeam }),
    });

    const { result } = renderHook(() => useMentorTeam('team-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await result.current.refetch();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});

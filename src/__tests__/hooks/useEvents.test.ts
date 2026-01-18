import { renderHook, waitFor } from '@testing-library/react';
import { useEvents, useEvent, useUpcomingEvents } from '@/lib/hooks/useEvents';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('useEvents', () => {
  const mockEvents = [
    {
      id: 'event-1',
      title: 'Community Meeting',
      description: 'Monthly community meeting',
      event_type: 'meeting',
      status: 'scheduled',
      site_id: 'site-1',
      location: 'Community Center',
      is_virtual: false,
      virtual_link: null,
      start_date: '2024-06-01',
      start_time: '18:00',
      end_date: '2024-06-01',
      end_time: '20:00',
      is_all_day: false,
      is_recurring: false,
      recurrence_rule: null,
      max_attendees: 50,
      requires_registration: true,
      registration_deadline: '2024-05-30',
      organizer_id: 'user-1',
      notes: null,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      site: { id: 'site-1', name: 'Main Site' },
      attendees: [],
      volunteers: [],
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

    const { result } = renderHook(() => useEvents());
    expect(result.current.loading).toBe(true);
    expect(result.current.events).toEqual([]);
  });

  it('should fetch events successfully', async () => {
    const mockOrder = jest.fn(() => Promise.resolve({ data: mockEvents, error: null }));
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useEvents());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.events).toEqual(mockEvents);
    expect(result.current.error).toBeNull();
    expect(supabase.from).toHaveBeenCalledWith('events');
  });

  it('should filter by active events only', async () => {
    const mockOrder = jest.fn(() => Promise.resolve({ data: mockEvents, error: null }));
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    renderHook(() => useEvents());

    await waitFor(() => {
      expect(mockEq).toHaveBeenCalledWith('is_active', true);
    });
  });

  it('should order by start_date ascending', async () => {
    const mockOrder = jest.fn(() => Promise.resolve({ data: mockEvents, error: null }));
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    renderHook(() => useEvents());

    await waitFor(() => {
      expect(mockOrder).toHaveBeenCalledWith('start_date', { ascending: true });
    });
  });

  it('should include attendees and volunteers relations', async () => {
    const mockOrder = jest.fn(() => Promise.resolve({ data: mockEvents, error: null }));
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    renderHook(() => useEvents());

    await waitFor(() => {
      expect(mockSelect).toHaveBeenCalled();
    });

    const selectQuery = mockSelect.mock.calls[0][0];
    expect(selectQuery).toContain('site:sites(*)');
    expect(selectQuery).toContain('attendees:event_attendees');
    expect(selectQuery).toContain('volunteers:event_volunteers');
  });

  it('should handle errors', async () => {
    const mockError = new Error('Failed to fetch events');
    const mockOrder = jest.fn(() => Promise.resolve({ data: null, error: mockError }));
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useEvents());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch events');
    expect(result.current.events).toEqual([]);
  });

  it('should support refetch', async () => {
    const mockOrder = jest.fn(() => Promise.resolve({ data: mockEvents, error: null }));
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useEvents());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    result.current.refetch();

    await waitFor(() => {
      expect(mockSelect).toHaveBeenCalledTimes(2);
    });
  });
});

describe('useEvent', () => {
  const mockEvent = {
    id: 'event-1',
    title: 'Community Meeting',
    event_type: 'meeting',
    status: 'scheduled',
    start_date: '2024-06-01',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    site: { id: 'site-1', name: 'Main Site' },
    attendees: [],
    volunteers: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch single event successfully', async () => {
    const mockSingle = jest.fn(() => Promise.resolve({ data: mockEvent, error: null }));
    const mockEq = jest.fn(() => ({ single: mockSingle }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useEvent('event-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.event).toEqual(mockEvent);
    expect(mockEq).toHaveBeenCalledWith('id', 'event-1');
  });

  it('should handle errors', async () => {
    const mockError = new Error('Event not found');
    const mockSingle = jest.fn(() => Promise.resolve({ data: null, error: mockError }));
    const mockEq = jest.fn(() => ({ single: mockSingle }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useEvent('999'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Event not found');
    expect(result.current.event).toBeNull();
  });

  it('should not fetch when id is empty', () => {
    const mockSelect = jest.fn();
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    renderHook(() => useEvent(''));

    expect(mockSelect).not.toHaveBeenCalled();
  });
});

describe('useUpcomingEvents', () => {
  const mockUpcomingEvents = [
    {
      id: 'event-1',
      title: 'Future Event',
      start_date: '2024-12-31',
      is_active: true,
      site: { id: 'site-1', name: 'Main Site' },
      attendees: [],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch upcoming events with default limit', async () => {
    const mockLimit = jest.fn(() => Promise.resolve({ data: mockUpcomingEvents, error: null }));
    const mockOrder = jest.fn(() => ({ limit: mockLimit }));
    const mockGte = jest.fn(() => ({ order: mockOrder }));
    const mockEq = jest.fn(() => ({ gte: mockGte }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useUpcomingEvents());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockLimit).toHaveBeenCalledWith(5);
    expect(result.current.events).toEqual(mockUpcomingEvents);
  });

  it('should fetch upcoming events with custom limit', async () => {
    const mockLimit = jest.fn(() => Promise.resolve({ data: mockUpcomingEvents, error: null }));
    const mockOrder = jest.fn(() => ({ limit: mockLimit }));
    const mockGte = jest.fn(() => ({ order: mockOrder }));
    const mockEq = jest.fn(() => ({ gte: mockGte }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useUpcomingEvents(10));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockLimit).toHaveBeenCalledWith(10);
  });

  it('should filter by future dates', async () => {
    const mockLimit = jest.fn(() => Promise.resolve({ data: mockUpcomingEvents, error: null }));
    const mockOrder = jest.fn(() => ({ limit: mockLimit }));
    const mockGte = jest.fn(() => ({ order: mockOrder }));
    const mockEq = jest.fn(() => ({ gte: mockGte }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    renderHook(() => useUpcomingEvents());

    await waitFor(() => {
      expect(mockGte).toHaveBeenCalled();
    });

    const gteCall = mockGte.mock.calls[0];
    expect(gteCall[0]).toBe('start_date');
    expect(typeof gteCall[1]).toBe('string'); // Should be today's date
  });

  it('should handle errors', async () => {
    const mockError = new Error('Failed to fetch upcoming events');
    const mockLimit = jest.fn(() => Promise.resolve({ data: null, error: mockError }));
    const mockOrder = jest.fn(() => ({ limit: mockLimit }));
    const mockGte = jest.fn(() => ({ order: mockOrder }));
    const mockEq = jest.fn(() => ({ gte: mockGte }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useUpcomingEvents());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch upcoming events');
  });
});

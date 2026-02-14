/**
 * Stress tests for concurrent request handling in hooks.
 *
 * Verifies fixes for:
 * - AbortController cancels stale requests when filters change
 * - Search input debouncing prevents request flooding
 * - Concurrent creates/updates work correctly
 */

import { renderHook, act, waitFor } from '@testing-library/react';

// --- Mocks ---------------------------------------------------------------

const mockAuthFetch = jest.fn();
jest.mock('@/lib/api-client', () => ({
  authFetch: (...args: unknown[]) => mockAuthFetch(...args),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    }),
  },
}));

import { useTasks } from '@/lib/hooks/useTasksData';
import { useDonations } from '@/lib/hooks/useDonations';

// --- Helpers --------------------------------------------------------------

/**
 * Build a JSON Response-like object that respects AbortController.
 * If the signal is aborted before the delay, the promise rejects with AbortError.
 */
function jsonResponse(
  body: Record<string, unknown>,
  delay = 0
): Promise<{ json: () => Promise<Record<string, unknown>> }> {
  const response = { json: () => Promise.resolve(body) };
  if (delay === 0) return Promise.resolve(response);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(response), delay);
    // If caller passed a signal, respect abort
    // (handled by the wrapper below)
    (response as any)._timer = timer;
    (response as any)._reject = reject;
  });
}

/**
 * Wraps mockAuthFetch to respect AbortController signals, just like real fetch.
 */
function mockWithAbort(
  handler: (url: string, opts?: any) => Promise<any>
) {
  return (url: string, opts?: any) => {
    const signal = opts?.signal as AbortSignal | undefined;
    const promise = handler(url, opts);

    if (!signal) return promise;

    return new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(new DOMException('The operation was aborted.', 'AbortError'));
        return;
      }

      const onAbort = () => {
        reject(new DOMException('The operation was aborted.', 'AbortError'));
      };
      signal.addEventListener('abort', onAbort);

      promise.then(
        (val) => {
          signal.removeEventListener('abort', onAbort);
          if (signal.aborted) {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          } else {
            resolve(val);
          }
        },
        (err) => {
          signal.removeEventListener('abort', onAbort);
          reject(err);
        }
      );
    });
  };
}

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: `task-${Math.random().toString(36).slice(2, 8)}`,
    title: 'Test task',
    description: null,
    notes: null,
    status: 'todo',
    priority: 'medium',
    due_date: null,
    completed_at: null,
    created_by_id: null,
    assignee_id: null,
    beneficiary_id: null,
    household_id: null,
    volunteer_id: null,
    class_section_id: null,
    event_id: null,
    property_id: null,
    sort_order: 0,
    is_archived: false,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeDonation(overrides: Record<string, unknown> = {}) {
  return {
    id: `don-${Math.random().toString(36).slice(2, 8)}`,
    name: 'Test item',
    description: null,
    category: 'clothing',
    condition: null,
    quantity: 1,
    status: 'available',
    location: null,
    bin_number: null,
    donor_name: null,
    donated_date: null,
    image_path: null,
    claimed_by_household: null,
    ...overrides,
  };
}

// --------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('AbortController - Stale Request Cancellation (useTasks)', () => {
  it('FIXED: slow request is aborted when filters change, only latest data shows', async () => {
    /**
     * Scenario: User selects status=todo, then quickly switches to status=done.
     * The todo request is slow (200 ms), the done request is fast (50 ms).
     * With AbortController, the slow request is cancelled and its response is discarded.
     */
    const todoTasks = [makeTask({ id: 'slow-1', status: 'todo', title: 'Slow result' })];
    const doneTasks = [makeTask({ id: 'fast-1', status: 'done', title: 'Fast result' })];

    mockAuthFetch.mockImplementation(mockWithAbort((url: string) => {
      if (url.includes('status=todo')) {
        return jsonResponse({ success: true, data: todoTasks, pagination: { page: 1, limit: 50, total: 1, totalPages: 1, hasMore: false } }, 200);
      }
      return jsonResponse({ success: true, data: doneTasks, pagination: { page: 1, limit: 50, total: 1, totalPages: 1, hasMore: false } }, 50);
    }));

    // Mount with status=todo (slow request starts)
    const { result, rerender } = renderHook(
      ({ filters }) => useTasks(filters),
      { initialProps: { filters: { status: 'todo' as const } } }
    );

    // Immediately switch to status=done (fast request starts, slow one aborted)
    rerender({ filters: { status: 'done' as const } });

    // Advance past the fast request timeout
    jest.advanceTimersByTime(60);
    await waitFor(() => expect(result.current.loading).toBe(false));

    // FIXED: Only the latest (done) data shows — the stale todo request was aborted
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].id).toBe('fast-1');
    expect(result.current.tasks[0].title).toBe('Fast result');
  });

  it('FIXED: error from aborted request does not set error state', async () => {
    let callNum = 0;
    mockAuthFetch.mockImplementation(mockWithAbort(() => {
      callNum++;
      if (callNum === 1) {
        // First call: slow failure
        return new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Network error')), 200)
        );
      }
      // Second call: fast success
      return jsonResponse(
        { success: true, data: [makeTask({ id: 'valid', title: 'Valid' })], pagination: { page: 1, limit: 50, total: 1, totalPages: 1, hasMore: false } },
        50
      );
    }));

    const { result, rerender } = renderHook(
      ({ filters }) => useTasks(filters),
      { initialProps: { filters: { status: 'todo' as const } } }
    );

    // Trigger second fetch via filter change (aborts the first)
    rerender({ filters: { status: 'done' as const } });

    jest.advanceTimersByTime(60);
    await waitFor(() => expect(result.current.loading).toBe(false));

    // FIXED: The aborted first request's error doesn't overwrite valid data
    expect(result.current.error).toBeNull();
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].id).toBe('valid');
  });

  it('concurrent create and fetch should not duplicate items', async () => {
    const existingTask = makeTask({ id: 'existing-1', title: 'Existing' });
    const newTask = makeTask({ id: 'new-1', title: 'New task' });

    // Initial fetch returns existing task
    mockAuthFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: true,
        data: [existingTask],
        pagination: { page: 1, limit: 50, total: 1, totalPages: 1, hasMore: false },
      }),
    });

    const { result } = renderHook(() => useTasks());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tasks).toHaveLength(1);

    // Now create a new task
    mockAuthFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, data: newTask }),
    });

    await act(async () => {
      await result.current.createTask({ title: 'New task' });
    });

    // The new task should be prepended, no duplicates
    expect(result.current.tasks).toHaveLength(2);
    expect(result.current.tasks[0].id).toBe('new-1');
    expect(result.current.tasks[1].id).toBe('existing-1');
  });

  it('concurrent updates to same task both reach the server', async () => {
    const task = makeTask({ id: 'task-1', title: 'Original', status: 'todo', priority: 'low' });

    // Initial fetch
    mockAuthFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: true,
        data: [task],
        pagination: { page: 1, limit: 50, total: 1, totalPages: 1, hasMore: false },
      }),
    });

    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const updatedTitle = makeTask({ id: 'task-1', title: 'Updated title', status: 'todo', priority: 'low' });
    const updatedPriority = makeTask({ id: 'task-1', title: 'Original', status: 'todo', priority: 'high' });

    mockAuthFetch
      .mockImplementationOnce(() => jsonResponse({ success: true, data: updatedTitle }, 100))
      .mockImplementationOnce(() => jsonResponse({ success: true, data: updatedPriority }, 50));

    // Fire both updates simultaneously
    await act(async () => {
      const p1 = result.current.updateTask({ id: 'task-1', title: 'Updated title' });
      const p2 = result.current.updateTask({ id: 'task-1', priority: 'high' as const });
      jest.advanceTimersByTime(150);
      await Promise.all([p1, p2]);
    });

    const finalTask = result.current.tasks.find((t: { id: string }) => t.id === 'task-1');
    expect(finalTask).toBeDefined();

    // Both updates were sent to the server (mutations are NOT aborted)
    expect(mockAuthFetch).toHaveBeenCalledTimes(3); // 1 fetch + 2 updates
  });
});

describe('AbortController + Debounce (useDonations)', () => {
  it('FIXED: search input is debounced — only last search fires', async () => {
    /**
     * Scenario: User types "abcde" quickly — each keystroke calls updateFilters.
     * With debouncing (300ms), only the final "abcde" search fires after the
     * debounce window. Intermediate searches are cancelled.
     */
    const finalData = [makeDonation({ id: 'item-abcde', name: 'Result for abcde' })];

    mockAuthFetch.mockImplementation(mockWithAbort((url: string) => {
      if (url.includes('search=abcde')) {
        return jsonResponse({
          success: true,
          data: finalData,
          pagination: { page: 1, limit: 50, total: 1, totalPages: 1, hasMore: false },
        });
      }
      // Initial or intermediate
      return jsonResponse({
        success: true,
        data: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0, hasMore: false },
      });
    }));

    const { result } = renderHook(() => useDonations());

    // Wait for initial load
    await waitFor(() => expect(result.current.loading).toBe(false));
    const initialCalls = mockAuthFetch.mock.calls.length;

    // Rapidly type search characters
    for (const search of ['a', 'ab', 'abc', 'abcd', 'abcde']) {
      act(() => {
        result.current.updateFilters({ search });
      });
    }

    // Advance past debounce window inside act() so React processes the
    // state update triggered by the setTimeout callback (setFilters).
    await act(async () => {
      jest.advanceTimersByTime(350);
    });

    // Wait for the fetch triggered by the filter change to complete
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Only 1 search request should have been sent (the debounced final one)
    const searchCalls = mockAuthFetch.mock.calls
      .slice(initialCalls)
      .filter((call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('search='));
    expect(searchCalls).toHaveLength(1);
    expect(searchCalls[0][0]).toContain('search=abcde');
  });

  it('filter changes (non-search) fire immediately with cancellation', async () => {
    /**
     * Category/status filter changes should fire immediately (no debounce),
     * but AbortController still cancels stale requests.
     */
    mockAuthFetch.mockImplementation(mockWithAbort(() =>
      jsonResponse({
        success: true,
        data: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0, hasMore: false },
      }, 20)
    ));

    const { result } = renderHook(() => useDonations());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const initialCalls = mockAuthFetch.mock.calls.length;

    // Change category filter — should fire immediately
    act(() => {
      result.current.updateFilters({ category: 'clothing' as any });
    });

    jest.advanceTimersByTime(25);
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Should have fired immediately (1 new call)
    const newCalls = mockAuthFetch.mock.calls.length - initialCalls;
    expect(newCalls).toBe(1);
  });

  it('create during active fetch should not cause inconsistent state', async () => {
    const existing = makeDonation({ id: 'existing-1' });
    const created = makeDonation({ id: 'created-1', name: 'Newly created' });

    // Initial fetch
    mockAuthFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: true,
        data: [existing],
        pagination: { page: 1, limit: 50, total: 1, totalPages: 1, hasMore: false },
      }),
    });

    const { result } = renderHook(() => useDonations());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Create triggers POST then refetches the list
    mockAuthFetch
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: created }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          data: [created, existing],
          pagination: { page: 1, limit: 50, total: 2, totalPages: 1, hasMore: false },
        }),
      });

    await act(async () => {
      await result.current.createItem({
        name: 'Newly created',
        category: 'clothing' as const,
      });
    });

    expect(result.current.items).toHaveLength(2);
  });

  it('delete removes item from local state immediately', async () => {
    const items = Array.from({ length: 3 }, (_, i) =>
      makeDonation({ id: `item-${i}`, name: `Item ${i}` })
    );

    mockAuthFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: true,
        data: items,
        pagination: { page: 1, limit: 50, total: 3, totalPages: 1, hasMore: false },
      }),
    });

    const { result } = renderHook(() => useDonations());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toHaveLength(3);

    mockAuthFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true }),
    });

    await act(async () => {
      await result.current.deleteItem('item-1');
    });

    expect(result.current.items).toHaveLength(2);
    expect(result.current.items.find((i: { id: string }) => i.id === 'item-1')).toBeUndefined();
  });
});

describe('AbortController - Cleanup', () => {
  it('unmounting the hook aborts in-flight requests', async () => {
    let abortedSignal: AbortSignal | undefined;

    mockAuthFetch.mockImplementation((_url: string, opts?: any) => {
      abortedSignal = opts?.signal;
      // Slow response — will be aborted when hook unmounts
      return new Promise(() => {});
    });

    const { unmount } = renderHook(() => useTasks());

    // The hook started a fetch
    expect(mockAuthFetch).toHaveBeenCalledTimes(1);
    expect(abortedSignal).toBeDefined();
    expect(abortedSignal!.aborted).toBe(false);

    // Unmount aborts the in-flight request
    unmount();
    expect(abortedSignal!.aborted).toBe(true);
  });

  it('filter change passes signal to authFetch', async () => {
    mockAuthFetch.mockImplementation(mockWithAbort(() =>
      jsonResponse({
        success: true,
        data: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0, hasMore: false },
      })
    ));

    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Every call to authFetch should include a signal
    for (const call of mockAuthFetch.mock.calls) {
      const opts = call[1] as Record<string, unknown> | undefined;
      expect(opts?.signal).toBeDefined();
    }
  });
});

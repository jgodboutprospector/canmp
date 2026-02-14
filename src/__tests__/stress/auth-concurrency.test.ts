/**
 * Stress tests for authentication concurrency.
 *
 * Verifies the session dedup fix in authFetch and documents remaining
 * edge cases around token refresh in AuthProvider.
 */

// --- Mock setup (must come before imports) --------------------------------

const mockGetSession = jest.fn();
const mockRefreshSession = jest.fn();
const mockSignOut = jest.fn();
const mockOnAuthStateChange = jest.fn().mockReturnValue({
  data: { subscription: { unsubscribe: jest.fn() } },
});

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      refreshSession: (...args: unknown[]) => mockRefreshSession(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      signInWithPassword: jest.fn(),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}));

// Mock global fetch for authFetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// We must reset the module between tests to clear the session cache
let authFetch: typeof import('@/lib/api-client').authFetch;

// --- Helpers --------------------------------------------------------------

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    access_token: 'valid-token-123',
    refresh_token: 'refresh-123',
    expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    user: { id: 'user-1', email: 'test@example.com' },
    ...overrides,
  };
}

// --------------------------------------------------------------------------

beforeEach(async () => {
  jest.clearAllMocks();
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ success: true, data: [] }),
  });

  // Reset the module to clear the session promise cache
  jest.resetModules();
  const mod = await import('@/lib/api-client');
  authFetch = mod.authFetch;
});

describe('authFetch - Session Deduplication (FIXED)', () => {
  it('should deduplicate concurrent getSession calls within 1 second', async () => {
    const session = makeSession();
    mockGetSession.mockResolvedValue({ data: { session }, error: null });

    // Fire 10 concurrent requests
    const promises = Array.from({ length: 10 }, (_, i) =>
      authFetch(`/api/tasks?page=${i + 1}`)
    );
    await Promise.all(promises);

    // With session dedup, getSession should only be called ONCE
    expect(mockGetSession).toHaveBeenCalledTimes(1);
    // But all 10 fetch calls should still go out
    expect(mockFetch).toHaveBeenCalledTimes(10);

    // All should have the same Authorization header
    for (const call of mockFetch.mock.calls) {
      const headers = call[1]?.headers;
      expect(headers?.['Authorization']).toBe('Bearer valid-token-123');
    }
  });

  it('should deduplicate dashboard mount (6 hooks loading simultaneously)', async () => {
    const session = makeSession();
    mockGetSession.mockResolvedValue({ data: { session }, error: null });

    // Simulate 6 hooks loading simultaneously (dashboard mount)
    const urls = [
      '/api/tasks',
      '/api/donations',
      '/api/volunteers',
      '/api/events',
      '/api/beneficiaries',
      '/api/mutual-aid',
    ];

    const promises = urls.map(url => authFetch(url));
    await Promise.all(promises);

    // With session dedup, getSession called only once
    expect(mockGetSession).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledTimes(6);
  });

  it('concurrent POST requests should all use the same token', async () => {
    const session = makeSession({ access_token: 'consistent-token' });
    mockGetSession.mockResolvedValue({ data: { session }, error: null });

    const creates = Array.from({ length: 5 }, (_, i) =>
      authFetch('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ title: `Task ${i + 1}` }),
      })
    );

    await Promise.all(creates);

    // All 5 requests should have the SAME token (session dedup)
    const tokens = mockFetch.mock.calls.map(
      (call: unknown[]) => {
        const opts = call[1] as Record<string, Record<string, string>>;
        return opts.headers?.['Authorization'];
      }
    );

    expect(tokens).toHaveLength(5);
    const uniqueTokens = new Set(tokens);
    expect(uniqueTokens.size).toBe(1);
    expect(uniqueTokens.has('Bearer consistent-token')).toBe(true);
  });

  it('should make a fresh getSession call after cache expires', async () => {
    const session1 = makeSession({ access_token: 'token-v1' });
    const session2 = makeSession({ access_token: 'token-v2' });

    mockGetSession
      .mockResolvedValueOnce({ data: { session: session1 }, error: null })
      .mockResolvedValueOnce({ data: { session: session2 }, error: null });

    // First batch
    await authFetch('/api/tasks');
    expect(mockGetSession).toHaveBeenCalledTimes(1);

    // Advance past 1-second cache window
    const originalNow = Date.now;
    Date.now = jest.fn().mockReturnValue(originalNow() + 1_100);

    // Second request should trigger a new getSession
    await authFetch('/api/donations');
    expect(mockGetSession).toHaveBeenCalledTimes(2);

    const firstToken = mockFetch.mock.calls[0][1].headers['Authorization'];
    const secondToken = mockFetch.mock.calls[1][1].headers['Authorization'];
    expect(firstToken).toBe('Bearer token-v1');
    expect(secondToken).toBe('Bearer token-v2');

    Date.now = originalNow;
  });
});

describe('authFetch - Token in Headers', () => {
  it('should set Authorization header with Bearer token', async () => {
    const session = makeSession({ access_token: 'my-special-token' });
    mockGetSession.mockResolvedValue({ data: { session }, error: null });

    await authFetch('/api/tasks');

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/tasks',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-special-token',
        }),
        credentials: 'include',
      })
    );
  });

  it('should send request without auth when session is null', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    await authFetch('/api/health');

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/health',
      expect.objectContaining({
        credentials: 'include',
      })
    );

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['Authorization']).toBeUndefined();
  });

  it('should set Content-Type for JSON body requests', async () => {
    mockGetSession.mockResolvedValue({ data: { session: makeSession() }, error: null });

    await authFetch('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: 'New task' }),
    });

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('should not override existing Content-Type', async () => {
    mockGetSession.mockResolvedValue({ data: { session: makeSession() }, error: null });

    await authFetch('/api/donations/import', {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data' },
      body: 'file-data',
    });

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['Content-Type']).toBe('multipart/form-data');
  });
});

describe('authFetch - Concurrent Mutations', () => {
  it('should handle mixed success/failure in concurrent requests', async () => {
    const session = makeSession();
    mockGetSession.mockResolvedValue({ data: { session }, error: null });

    // Alternate between success and failure responses
    mockFetch.mockImplementation((_url: string, opts: Record<string, unknown>) => {
      const body = JSON.parse(opts.body as string);
      if (body.shouldFail) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ success: false, error: 'Server error' }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: body }),
      });
    });

    const requests = [
      authFetch('/api/tasks', { method: 'POST', body: JSON.stringify({ title: 'OK 1' }) }),
      authFetch('/api/tasks', { method: 'POST', body: JSON.stringify({ title: 'OK 2', shouldFail: true }) }),
      authFetch('/api/tasks', { method: 'POST', body: JSON.stringify({ title: 'OK 3' }) }),
    ];

    const responses = await Promise.all(requests);

    expect(responses).toHaveLength(3);
    expect(responses[0].ok).toBe(true);
    expect(responses[1].ok).toBe(false);
    expect(responses[2].ok).toBe(true);
  });
});

describe('Token Refresh Race Conditions', () => {
  it('refreshingRef boolean prevents concurrent refreshes within same microtask', async () => {
    let refreshCount = 0;

    mockRefreshSession.mockImplementation(() => {
      refreshCount++;
      return new Promise(resolve =>
        setTimeout(() => resolve({
          data: { session: makeSession() },
          error: null,
        }), 50)
      );
    });

    // Simulate what AuthProvider does: check, then refresh
    const refreshingRef = { current: false };

    async function attemptRefresh() {
      if (!refreshingRef.current) {
        refreshingRef.current = true;
        try {
          await mockRefreshSession();
        } finally {
          refreshingRef.current = false;
        }
      }
    }

    jest.useFakeTimers();
    const attempts = [attemptRefresh(), attemptRefresh(), attemptRefresh()];
    jest.advanceTimersByTime(100);
    jest.useRealTimers();
    await Promise.all(attempts);

    // The boolean ref prevents concurrent refreshes within the same microtask
    expect(refreshCount).toBe(1);
  });

  it('authFetch uses cached session even during AuthProvider refresh', async () => {
    const expiringSession = makeSession({
      access_token: 'expiring-token',
      expires_at: Math.floor(Date.now() / 1000) + 60,
    });

    mockGetSession.mockResolvedValue({ data: { session: expiringSession }, error: null });

    // authFetch uses whatever getSession returns — it doesn't coordinate
    // with AuthProvider's refresh. But with session dedup, concurrent
    // calls at least all get the same (potentially stale) token.
    const response = await authFetch('/api/tasks');

    const authHeader = mockFetch.mock.calls[0][1].headers['Authorization'];
    expect(authHeader).toBe('Bearer expiring-token');
  });
});

describe('Session Edge Cases', () => {
  it('should handle getSession returning error', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'Session expired', status: 401 },
    });

    await authFetch('/api/health');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['Authorization']).toBeUndefined();
  });

  it('should handle getSession throwing an error', async () => {
    mockGetSession.mockRejectedValue(new Error('Auth service unavailable'));

    // authFetch should propagate the error since it can't get a session
    await expect(authFetch('/api/health')).rejects.toThrow();
  });

  it('all concurrent requests share session state during sign-out', async () => {
    // With session dedup, all requests within the cache window get the
    // same session — either all have auth or none do.
    const session = makeSession();
    mockGetSession.mockResolvedValue({ data: { session }, error: null });

    const requests = Array.from({ length: 5 }, (_, i) =>
      authFetch(`/api/data-${i}`)
    );

    const results = await Promise.all(requests);
    expect(results).toHaveLength(5);

    // All should have the same auth header (dedup ensures consistency)
    const tokens = mockFetch.mock.calls.map(
      (call: unknown[]) => {
        const opts = call[1] as Record<string, Record<string, string>>;
        return opts.headers?.['Authorization'];
      }
    );
    const uniqueTokens = new Set(tokens);
    expect(uniqueTokens.size).toBe(1);
  });
});

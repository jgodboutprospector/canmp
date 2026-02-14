'use client';

import { supabase } from './supabase';

// Deduplicate concurrent getSession calls.
// When multiple hooks mount simultaneously (e.g. dashboard load), they all
// call authFetch at the same time. Without dedup, each one independently
// calls supabase.auth.getSession(), wasting round-trips and creating a
// window where some calls could get a stale/null session during refresh.
let sessionPromise: Promise<string | null> | null = null;
let sessionPromiseExpiry = 0;

async function getSessionToken(): Promise<string | null> {
  const now = Date.now();
  // Reuse an in-flight or recently-resolved promise for 1 second
  if (sessionPromise && now < sessionPromiseExpiry) {
    return sessionPromise;
  }

  sessionPromise = supabase.auth.getSession().then(({ data: { session } }) => {
    return session?.access_token ?? null;
  });
  sessionPromiseExpiry = now + 1_000; // cache for 1 second

  return sessionPromise;
}

/**
 * Authenticated fetch helper that automatically includes the Bearer token
 * from the current Supabase session.
 *
 * Concurrent calls within a 1-second window share the same getSession()
 * call, preventing thundering-herd session lookups on dashboard load.
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getSessionToken();

  const headers: HeadersInit = {
    ...(options.headers || {}),
  };

  // Add Authorization header if we have a session
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  // Add Content-Type for JSON requests if body is present and content-type not set
  if (options.body && typeof options.body === 'string') {
    if (!(headers as Record<string, string>)['Content-Type']) {
      (headers as Record<string, string>)['Content-Type'] = 'application/json';
    }
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Also send cookies as fallback
  });
}

/**
 * Helper for GET requests
 */
export async function authGet(url: string): Promise<Response> {
  return authFetch(url, { method: 'GET' });
}

/**
 * Helper for POST requests with JSON body
 */
export async function authPost(url: string, data: unknown): Promise<Response> {
  return authFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

/**
 * Helper for PATCH requests with JSON body
 */
export async function authPatch(url: string, data: unknown): Promise<Response> {
  return authFetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

/**
 * Helper for DELETE requests
 */
export async function authDelete(url: string): Promise<Response> {
  return authFetch(url, { method: 'DELETE' });
}

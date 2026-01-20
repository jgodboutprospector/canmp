'use client';

import { supabase } from './supabase';

/**
 * Authenticated fetch helper that automatically includes the Bearer token
 * from the current Supabase session
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Get the current session token
  const { data: { session } } = await supabase.auth.getSession();

  const headers: HeadersInit = {
    ...(options.headers || {}),
  };

  // Add Authorization header if we have a session
  if (session?.access_token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${session.access_token}`;
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

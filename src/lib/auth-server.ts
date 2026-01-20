import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import type { NextRequest } from 'next/server';

export type UserRole = 'admin' | 'coordinator' | 'teacher' | 'board_member' | 'volunteer';

interface UserProfile {
  id: string;
  auth_user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
}

export async function getServerSession() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );

  // Use getUser() instead of getSession() for more reliable server-side auth
  // getUser() validates the JWT token against Supabase auth server
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  // Return a session-like object with the user
  return { user };
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  // Use service role to bypass RLS for profile lookup
  const { createClient } = await import('@supabase/supabase-js');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('users')
    .select('id, auth_user_id, email, first_name, last_name, role')
    .eq('auth_user_id', userId)
    .single();

  if (error || !data) {
    console.error('getUserProfile error:', error);
    return null;
  }

  return data as UserProfile;
}

export async function requireAuth() {
  const session = await getServerSession();

  if (!session) {
    throw new AuthError('Unauthorized', 401);
  }

  const profile = await getUserProfile(session.user.id);

  if (!profile) {
    throw new AuthError('User profile not found', 401);
  }

  return { session, profile };
}

/**
 * Authenticate from request - supports both Bearer token and cookie-based auth
 * Use this in API routes where cookies may not be available
 */
export async function requireAuthFromRequest(request: NextRequest) {
  let userId: string | null = null;

  // First, try to get user from Authorization header (Bearer token)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (!error && user) {
      userId = user.id;
    }
  }

  // If no Authorization header or it failed, try cookie-based session
  if (!userId) {
    const session = await getServerSession();
    if (session?.user) {
      userId = session.user.id;
    }
  }

  if (!userId) {
    throw new AuthError('Unauthorized', 401);
  }

  const profile = await getUserProfile(userId);

  if (!profile) {
    throw new AuthError('User profile not found', 401);
  }

  return { userId, profile };
}

/**
 * Require specific roles from request
 */
export async function requireRoleFromRequest(request: NextRequest, allowedRoles: UserRole[]) {
  const { userId, profile } = await requireAuthFromRequest(request);

  if (!allowedRoles.includes(profile.role)) {
    throw new AuthError('Forbidden', 403);
  }

  return { userId, profile };
}

export async function requireRole(allowedRoles: UserRole[]) {
  const { session, profile } = await requireAuth();

  if (!allowedRoles.includes(profile.role)) {
    throw new AuthError('Forbidden', 403);
  }

  return { session, profile };
}

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export function secureCompare(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;

  try {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');

    if (bufA.length !== bufB.length) {
      // Still do comparison to prevent timing attack
      crypto.timingSafeEqual(bufA, bufA);
      return false;
    }

    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

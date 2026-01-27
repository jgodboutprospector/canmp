'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import { UserProfile, UserRole, getUserProfile, updateLastLogin, hasPermission } from '@/lib/auth';

// Token refresh buffer - refresh if expiring within this many seconds
const TOKEN_REFRESH_BUFFER_SECONDS = 5 * 60; // 5 minutes

// App version for cache invalidation - update this when deploying breaking changes
const APP_VERSION = '1.0.1';
const APP_VERSION_KEY = 'canmp_app_version';

/**
 * Clear all Supabase-related storage keys from localStorage and sessionStorage
 * This ensures no stale auth tokens persist after logout
 */
function clearAllAuthStorage() {
  if (typeof window === 'undefined') return;

  // Clear localStorage
  const localKeys = Object.keys(localStorage);
  localKeys.forEach(key => {
    // Clear Supabase auth tokens (sb-*-auth-token pattern)
    if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')) {
      localStorage.removeItem(key);
    }
  });

  // Clear sessionStorage
  const sessionKeys = Object.keys(sessionStorage);
  sessionKeys.forEach(key => {
    if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')) {
      sessionStorage.removeItem(key);
    }
  });

  // Clear specific known keys
  localStorage.removeItem('supabase.auth.token');
}

/**
 * Check if app version has changed and clear cache if needed
 */
function checkVersionAndClearCache() {
  if (typeof window === 'undefined') return;

  const storedVersion = localStorage.getItem(APP_VERSION_KEY);
  if (storedVersion !== APP_VERSION) {
    // Version mismatch - clear all cached data
    clearAllAuthStorage();
    localStorage.setItem(APP_VERSION_KEY, APP_VERSION);
  }
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isTeacher: boolean;
  isCoordinator: boolean;
  canManageUsers: boolean;
  canEditBeneficiaries: boolean;
  canViewReports: boolean;
  canManageAttendance: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Check if session token is expiring soon
function isTokenExpiringSoon(session: Session | null): boolean {
  if (!session?.expires_at) return false;
  const expiresAt = session.expires_at * 1000; // Convert to milliseconds
  const now = Date.now();
  const bufferMs = TOKEN_REFRESH_BUFFER_SECONDS * 1000;
  return expiresAt - now < bufferMs;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const initializedRef = useRef(false);
  const refreshingRef = useRef(false);

  // Clear all auth state
  const clearAuthState = useCallback(() => {
    setSession(null);
    setUser(null);
    setProfile(null);
    setLoading(false);
    // Clear all Supabase auth storage
    clearAllAuthStorage();
  }, []);

  // Load user profile with error handling
  const loadProfile = useCallback(async (userId: string) => {
    try {
      const userProfile = await getUserProfile(userId);
      setProfile(userProfile);
    } catch (error) {
      console.error('Error loading user profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Check app version and clear cache if needed
    checkVersionAndClearCache();

    let isMounted = true;

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
          // Clear any stale session data
          await supabase.auth.signOut();
          if (isMounted) {
            clearAuthState();
          }
          return;
        }

        // Check if token is expiring soon and proactively refresh
        if (session && isTokenExpiringSoon(session) && !refreshingRef.current) {
          refreshingRef.current = true;
          try {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError || !refreshData.session) {
              console.warn('Failed to refresh expiring token, signing out');
              await supabase.auth.signOut();
              if (isMounted) {
                clearAuthState();
                router.push('/login');
              }
              return;
            }
            // Use the refreshed session
            if (isMounted) {
              setSession(refreshData.session);
              setUser(refreshData.session.user);
              await loadProfile(refreshData.session.user.id);
            }
          } finally {
            refreshingRef.current = false;
          }
          return;
        }

        if (isMounted) {
          setSession(session);
          setUser(session?.user ?? null);

          if (session?.user) {
            await loadProfile(session.user.id);
          } else {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Safety timeout - if loading takes more than 10 seconds, something is wrong
    const timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('Auth loading timeout - forcing completion');
        setLoading(false);
      }
    }, 10000);

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        // Handle SIGNED_OUT event - clear all state immediately
        if (event === 'SIGNED_OUT') {
          clearAuthState();
          return;
        }

        // Handle token refresh errors by signing out
        if (event === 'TOKEN_REFRESHED' && !session) {
          clearAuthState();
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await loadProfile(session.user.id);
          if (event === 'SIGNED_IN') {
            await updateLastLogin(session.user.id);
          }
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadProfile, clearAuthState, router]);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error as Error };
    }

    return { error: null };
  }

  async function signOut() {
    // Clear local state BEFORE calling Supabase signOut to prevent race conditions
    clearAuthState();
    router.push('/login');
    // Then sign out from Supabase
    await supabase.auth.signOut();
  }

  // Permission helpers
  const role: UserRole = profile?.role || 'volunteer';
  const isAdmin = role === 'admin';
  const isTeacher = role === 'teacher';
  const isCoordinator = role === 'coordinator';
  const canManageUsers = hasPermission(role, 'manage_users');
  const canEditBeneficiaries = hasPermission(role, 'edit_beneficiaries');
  const canViewReports = hasPermission(role, 'view_reports');
  const canManageAttendance = hasPermission(role, 'manage_attendance');

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signOut,
    isAdmin,
    isTeacher,
    isCoordinator,
    canManageUsers,
    canEditBeneficiaries,
    canViewReports,
    canManageAttendance,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import { UserProfile, UserRole, getUserProfile, updateLastLogin, hasPermission } from '@/lib/auth';

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Define loadProfile before useEffect to avoid hoisting issues
  const loadProfile = async (userId: string) => {
    const userProfile = await getUserProfile(userId);
    setProfile(userProfile);
    setLoading(false);
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
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
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error as Error };
    }

    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    router.push('/login');
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

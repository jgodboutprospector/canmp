'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

// User roles (matches database enum: admin, coordinator, teacher, board_member, volunteer)
export type UserRole = 'admin' | 'coordinator' | 'teacher' | 'board_member' | 'volunteer';

// User profile with role
export interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: UserRole;
  teacher_id: string | null;
  volunteer_id: string | null;
  avatar_url: string | null;
  is_active: boolean;
}

// Auth context type
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

// Create context
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Sign in function
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error, data: null };
  }

  return { error: null, data };
}

// Sign out function
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Get user profile from users table (linked via auth_user_id)
export async function getUserProfile(authUserId: string): Promise<UserProfile | null> {
  console.log('getUserProfile called with authUserId:', authUserId);

  const { data, error } = await (supabase as any)
    .from('users')
    .select('*')
    .eq('auth_user_id', authUserId)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error);
    console.error('authUserId was:', authUserId);
    return null;
  }

  console.log('User profile loaded:', data);

  // Map users table fields to UserProfile interface
  return {
    id: data.id,
    email: data.email,
    first_name: data.first_name,
    last_name: data.last_name,
    role: data.role,
    teacher_id: null,
    volunteer_id: null,
    avatar_url: null,
    is_active: data.is_active,
  } as UserProfile;
}

// Update last login (users table uses updated_at, not last_login)
export async function updateLastLogin(authUserId: string) {
  await (supabase as any)
    .from('users')
    .update({ updated_at: new Date().toISOString() })
    .eq('auth_user_id', authUserId);
}

// Role permission helpers
export function hasPermission(role: UserRole, permission: string): boolean {
  const permissions: Record<UserRole, string[]> = {
    admin: [
      'manage_users',
      'edit_beneficiaries',
      'view_reports',
      'manage_attendance',
      'manage_housing',
      'manage_events',
      'manage_volunteers',
      'sync_neon',
      'view_all',
    ],
    coordinator: [
      'edit_beneficiaries',
      'view_reports',
      'manage_attendance',
      'manage_housing',
      'manage_events',
      'view_all',
    ],
    teacher: [
      'manage_attendance',
      'view_own_classes',
      'edit_student_notes',
    ],
    board_member: [
      'view_reports',
      'view_dashboard',
    ],
    volunteer: [
      'view_assigned_families',
      'add_notes',
    ],
  };

  return permissions[role]?.includes(permission) || false;
}

// Create admin user (server-side only)
export async function createUser(
  email: string,
  password: string,
  role: UserRole,
  firstName?: string,
  lastName?: string
) {
  // This should be called from a server action or API route
  // using the service role key
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      role,
    },
  });

  return { data, error };
}

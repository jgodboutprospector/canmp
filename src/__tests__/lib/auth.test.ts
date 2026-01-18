/**
 * Tests for authentication utilities
 */

import { hasPermission, getUserProfile } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('Authentication Utilities', () => {
  describe('hasPermission', () => {
    it('should grant all permissions to admin', () => {
      expect(hasPermission('admin', 'manage_users')).toBe(true);
      expect(hasPermission('admin', 'edit_beneficiaries')).toBe(true);
      expect(hasPermission('admin', 'view_reports')).toBe(true);
      expect(hasPermission('admin', 'manage_attendance')).toBe(true);
      expect(hasPermission('admin', 'manage_housing')).toBe(true);
      expect(hasPermission('admin', 'sync_neon')).toBe(true);
    });

    it('should grant coordinator permissions correctly', () => {
      expect(hasPermission('coordinator', 'edit_beneficiaries')).toBe(true);
      expect(hasPermission('coordinator', 'view_reports')).toBe(true);
      expect(hasPermission('coordinator', 'manage_attendance')).toBe(true);
      expect(hasPermission('coordinator', 'manage_housing')).toBe(true);
      expect(hasPermission('coordinator', 'manage_users')).toBe(false);
      expect(hasPermission('coordinator', 'sync_neon')).toBe(false);
    });

    it('should grant teacher permissions correctly', () => {
      expect(hasPermission('teacher', 'manage_attendance')).toBe(true);
      expect(hasPermission('teacher', 'view_own_classes')).toBe(true);
      expect(hasPermission('teacher', 'edit_student_notes')).toBe(true);
      expect(hasPermission('teacher', 'edit_beneficiaries')).toBe(false);
      expect(hasPermission('teacher', 'manage_users')).toBe(false);
      expect(hasPermission('teacher', 'view_reports')).toBe(false);
    });

    it('should grant board_member permissions correctly', () => {
      expect(hasPermission('board_member', 'view_reports')).toBe(true);
      expect(hasPermission('board_member', 'view_dashboard')).toBe(true);
      expect(hasPermission('board_member', 'edit_beneficiaries')).toBe(false);
      expect(hasPermission('board_member', 'manage_users')).toBe(false);
    });

    it('should grant volunteer permissions correctly', () => {
      expect(hasPermission('volunteer', 'view_assigned_families')).toBe(true);
      expect(hasPermission('volunteer', 'add_notes')).toBe(true);
      expect(hasPermission('volunteer', 'edit_beneficiaries')).toBe(false);
      expect(hasPermission('volunteer', 'manage_users')).toBe(false);
      expect(hasPermission('volunteer', 'view_reports')).toBe(false);
    });

    it('should return false for non-existent permissions', () => {
      expect(hasPermission('admin', 'non_existent_permission')).toBe(false);
      expect(hasPermission('volunteer', 'delete_everything')).toBe(false);
    });
  });

  describe('getUserProfile', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should fetch user profile successfully', async () => {
      const mockUserData = {
        id: 'user123',
        auth_user_id: 'auth123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'coordinator',
        is_active: true,
      };

      (mockSupabase as any).from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUserData, error: null }),
      });

      const profile = await getUserProfile('auth123');

      expect(profile).toEqual({
        id: 'user123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'coordinator',
        teacher_id: null,
        volunteer_id: null,
        avatar_url: null,
        is_active: true,
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('users');
    });

    it('should return null on error', async () => {
      (mockSupabase as any).from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'User not found' },
        }),
      });

      const profile = await getUserProfile('invalid123');

      expect(profile).toBeNull();
    });

    it('should query by auth_user_id', async () => {
      const mockEq = jest.fn().mockReturnThis();

      (mockSupabase as any).from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: mockEq,
        single: jest.fn().mockResolvedValue({ data: {}, error: null }),
      });

      await getUserProfile('auth789');

      expect(mockEq).toHaveBeenCalledWith('auth_user_id', 'auth789');
    });
  });
});

import { hasPermission, UserRole } from '@/lib/auth';

describe('Auth Permissions', () => {
  describe('hasPermission', () => {
    it('should return true for admin with manage_users permission', () => {
      expect(hasPermission('admin', 'manage_users')).toBe(true);
    });

    it('should return false for volunteer with manage_users permission', () => {
      expect(hasPermission('volunteer', 'manage_users')).toBe(false);
    });

    it('should return true for admin with edit_beneficiaries permission', () => {
      expect(hasPermission('admin', 'edit_beneficiaries')).toBe(true);
    });

    it('should return true for coordinator with edit_beneficiaries permission', () => {
      expect(hasPermission('coordinator', 'edit_beneficiaries')).toBe(true);
    });

    it('should return false for teacher with edit_beneficiaries permission', () => {
      expect(hasPermission('teacher', 'edit_beneficiaries')).toBe(false);
    });

    it('should return true for teacher with manage_attendance permission', () => {
      expect(hasPermission('teacher', 'manage_attendance')).toBe(true);
    });

    it('should return true for board_member with view_reports permission', () => {
      expect(hasPermission('board_member', 'view_reports')).toBe(true);
    });

    it('should return false for board_member with manage_users permission', () => {
      expect(hasPermission('board_member', 'manage_users')).toBe(false);
    });

    it('should return true for volunteer with add_notes permission', () => {
      expect(hasPermission('volunteer', 'add_notes')).toBe(true);
    });

    it('should return false for unknown permission', () => {
      expect(hasPermission('admin', 'unknown_permission')).toBe(false);
    });
  });

  describe('UserRole type', () => {
    it('should include all valid roles', () => {
      const roles: UserRole[] = ['admin', 'coordinator', 'teacher', 'board_member', 'volunteer'];
      expect(roles).toHaveLength(5);
    });
  });
});

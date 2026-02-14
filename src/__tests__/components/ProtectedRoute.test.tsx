/**
 * Tests for ProtectedRoute component
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/components/providers/AuthProvider';

// Mock dependencies
jest.mock('@/components/providers/AuthProvider');
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  })),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Import useRouter after mock so we can access the mock push
import { useRouter } from 'next/navigation';
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('ProtectedRoute', () => {
  const mockPush = jest.fn();
  const mockRouter = {
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter as any);
  });

  it('should show loading state when auth is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      profile: null,
      session: null,
      loading: true,
      signIn: jest.fn(),
      signOut: jest.fn(),
      isAdmin: false,
      isTeacher: false,
      isCoordinator: false,
      canManageUsers: false,
      canEditBeneficiaries: false,
      canViewReports: false,
      canManageAttendance: false,
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should redirect to login when user is not authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      profile: null,
      session: null,
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
      isAdmin: false,
      isTeacher: false,
      isCoordinator: false,
      canManageUsers: false,
      canEditBeneficiaries: false,
      canViewReports: false,
      canManageAttendance: false,
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should render children when user is authenticated', () => {
    const mockUser = { id: '123', email: 'test@example.com' } as any;
    const mockProfile = {
      id: '123',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'coordinator' as const,
      teacher_id: null,
      volunteer_id: null,
      avatar_url: null,
      is_active: true,
    };

    mockUseAuth.mockReturnValue({
      user: mockUser,
      profile: mockProfile,
      session: {} as any,
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
      isAdmin: false,
      isTeacher: false,
      isCoordinator: true,
      canManageUsers: false,
      canEditBeneficiaries: true,
      canViewReports: true,
      canManageAttendance: true,
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should show access denied when user role is not allowed', () => {
    const mockUser = { id: '123', email: 'test@example.com' } as any;
    const mockProfile = {
      id: '123',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'volunteer' as const,
      teacher_id: null,
      volunteer_id: null,
      avatar_url: null,
      is_active: true,
    };

    mockUseAuth.mockReturnValue({
      user: mockUser,
      profile: mockProfile,
      session: {} as any,
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
      isAdmin: false,
      isTeacher: false,
      isCoordinator: false,
      canManageUsers: false,
      canEditBeneficiaries: false,
      canViewReports: false,
      canManageAttendance: false,
    });

    render(
      <ProtectedRoute allowedRoles={['admin', 'coordinator']}>
        <div>Admin Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText(/don't have permission/i)).toBeInTheDocument();
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('should render children when user role is allowed', () => {
    const mockUser = { id: '123', email: 'test@example.com' } as any;
    const mockProfile = {
      id: '123',
      email: 'test@example.com',
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin' as const,
      teacher_id: null,
      volunteer_id: null,
      avatar_url: null,
      is_active: true,
    };

    mockUseAuth.mockReturnValue({
      user: mockUser,
      profile: mockProfile,
      session: {} as any,
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
      isAdmin: true,
      isTeacher: false,
      isCoordinator: false,
      canManageUsers: true,
      canEditBeneficiaries: true,
      canViewReports: true,
      canManageAttendance: true,
    });

    render(
      <ProtectedRoute allowedRoles={['admin', 'coordinator']}>
        <div>Admin Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Admin Content')).toBeInTheDocument();
    expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
  });
});

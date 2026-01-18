import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { getUserProfile, updateLastLogin } from '@/lib/auth';
import { useRouter } from 'next/navigation';

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  getUserProfile: jest.fn(),
  updateLastLogin: jest.fn(),
  hasPermission: jest.fn((role, permission) => {
    if (role === 'admin') return true;
    if (role === 'teacher' && permission === 'manage_attendance') return true;
    return false;
  }),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('AuthProvider', () => {
  const mockPush = jest.fn();
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated',
    created_at: '2024-01-01T00:00:00Z',
  };

  const mockProfile = {
    id: 'user-123',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    role: 'admin' as const,
    is_active: true,
  };

  const mockSession = {
    user: mockUser,
    access_token: 'test-token',
    refresh_token: 'refresh-token',
    expires_at: Date.now() + 3600000,
    expires_in: 3600,
  };

  const TestComponent = () => {
    const auth = useAuth();
    return (
      <div>
        <div data-testid="loading">{auth.loading.toString()}</div>
        <div data-testid="user">{auth.user?.email || 'null'}</div>
        <div data-testid="profile">{auth.profile?.first_name || 'null'}</div>
        <div data-testid="is-admin">{auth.isAdmin.toString()}</div>
        <button onClick={() => auth.signOut()}>Sign Out</button>
      </div>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  describe('Initial state', () => {
    it('should start with loading state', () => {
      (supabase.auth.getSession as jest.Mock).mockImplementation(() => new Promise(() => {}));
      (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('loading')).toHaveTextContent('true');
      expect(screen.getByTestId('user')).toHaveTextContent('null');
    });
  });

  describe('Successful authentication', () => {
    it('should load user and profile on successful session', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      (getUserProfile as jest.Mock).mockResolvedValue(mockProfile);

      (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      expect(screen.getByTestId('profile')).toHaveTextContent('Test');
      expect(screen.getByTestId('is-admin')).toHaveTextContent('true');
    });

    it('should handle no session', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('null');
      expect(screen.getByTestId('profile')).toHaveTextContent('null');
    });
  });

  describe('Failed authentication', () => {
    it('should handle getSession errors', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: new Error('Session error'),
      });

      (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });

      (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('null');
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('should handle profile loading errors', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      (getUserProfile as jest.Mock).mockRejectedValue(new Error('Profile error'));

      (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      expect(screen.getByTestId('profile')).toHaveTextContent('null');
    });
  });

  describe('Logout flow', () => {
    it('should handle sign out correctly', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      (getUserProfile as jest.Mock).mockResolvedValue(mockProfile);

      (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });

      (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      const signOutButton = screen.getByText('Sign Out');
      await act(async () => {
        signOutButton.click();
      });

      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      const TestComponentWithoutProvider = () => {
        useAuth();
        return <div>Test</div>;
      };

      // Suppress error output for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => render(<TestComponentWithoutProvider />)).toThrow(
        'useAuth must be used within an AuthProvider'
      );

      consoleSpy.mockRestore();
    });

    it('should return context values', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      (getUserProfile as jest.Mock).mockResolvedValue(mockProfile);

      (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });

      const TestContextValues = () => {
        const auth = useAuth();
        return (
          <div>
            <div data-testid="has-user">{(!!auth.user).toString()}</div>
            <div data-testid="has-session">{(!!auth.session).toString()}</div>
            <div data-testid="has-profile">{(!!auth.profile).toString()}</div>
            <div data-testid="can-manage-users">{auth.canManageUsers.toString()}</div>
            <div data-testid="can-view-reports">{auth.canViewReports.toString()}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestContextValues />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('has-user')).toHaveTextContent('true');
        expect(screen.getByTestId('has-session')).toHaveTextContent('true');
        expect(screen.getByTestId('has-profile')).toHaveTextContent('true');
        expect(screen.getByTestId('can-manage-users')).toHaveTextContent('true');
        expect(screen.getByTestId('can-view-reports')).toHaveTextContent('true');
      });
    });
  });

  describe('Permission helpers', () => {
    it('should correctly set isAdmin for admin role', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      (getUserProfile as jest.Mock).mockResolvedValue({
        ...mockProfile,
        role: 'admin',
      });

      (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });

      const TestPermissions = () => {
        const auth = useAuth();
        return (
          <div>
            <div data-testid="is-admin">{auth.isAdmin.toString()}</div>
            <div data-testid="is-teacher">{auth.isTeacher.toString()}</div>
            <div data-testid="is-coordinator">{auth.isCoordinator.toString()}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestPermissions />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-admin')).toHaveTextContent('true');
        expect(screen.getByTestId('is-teacher')).toHaveTextContent('false');
        expect(screen.getByTestId('is-coordinator')).toHaveTextContent('false');
      });
    });

    it('should correctly set isTeacher for teacher role', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      (getUserProfile as jest.Mock).mockResolvedValue({
        ...mockProfile,
        role: 'teacher',
      });

      (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });

      const TestPermissions = () => {
        const auth = useAuth();
        return (
          <div>
            <div data-testid="is-admin">{auth.isAdmin.toString()}</div>
            <div data-testid="is-teacher">{auth.isTeacher.toString()}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestPermissions />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-admin')).toHaveTextContent('false');
        expect(screen.getByTestId('is-teacher')).toHaveTextContent('true');
      });
    });
  });

  describe('Auth state changes', () => {
    it('should handle SIGNED_IN event', async () => {
      let authCallback: ((event: string, session: any) => void) | null = null;

      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });

      (getUserProfile as jest.Mock).mockResolvedValue(mockProfile);
      (updateLastLogin as jest.Mock).mockResolvedValue(undefined);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      // Simulate sign in event
      await act(async () => {
        if (authCallback) {
          authCallback('SIGNED_IN', mockSession);
        }
      });

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      });

      expect(updateLastLogin).toHaveBeenCalledWith('user-123');
    });

    it('should handle TOKEN_REFRESHED event with null session', async () => {
      let authCallback: ((event: string, session: any) => void) | null = null;

      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      (getUserProfile as jest.Mock).mockResolvedValue(mockProfile);

      (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      // Simulate token refresh failure
      await act(async () => {
        if (authCallback) {
          authCallback('TOKEN_REFRESHED', null);
        }
      });

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('null');
      });
    });
  });

  describe('Safety timeout', () => {
    it('should force loading completion after timeout', async () => {
      jest.useFakeTimers();

      (supabase.auth.getSession as jest.Mock).mockImplementation(() => new Promise(() => {}));

      (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('loading')).toHaveTextContent('true');

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      jest.useRealTimers();
    });
  });
});

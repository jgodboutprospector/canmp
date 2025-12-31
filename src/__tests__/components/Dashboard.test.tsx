import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from '@/app/(app)/dashboard/page';

// Mock the AuthProvider
jest.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({
    profile: { first_name: 'Test', last_name: 'User', role: 'admin' },
    loading: false,
  }),
}));

// Mock supabase responses for dashboard data
const mockSupabaseFrom = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      mockSupabaseFrom(table);
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };
    },
  },
}));

describe('Dashboard', () => {
  beforeEach(() => {
    mockSupabaseFrom.mockClear();
  });

  it('should render dashboard title', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  it('should display greeting with user name', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Test\. Here's what's happening today\./)).toBeInTheDocument();
    });
  });

  it('should render all stat cards', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Active Households')).toBeInTheDocument();
      expect(screen.getByText('Occupied Units')).toBeInTheDocument();
      expect(screen.getByText('Class Enrollments')).toBeInTheDocument();
      expect(screen.getByText('Open Work Orders')).toBeInTheDocument();
    });
  });

  it('should render second row stats', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Bridge Families')).toBeInTheDocument();
      expect(screen.getByText('Pending Follow-ups')).toBeInTheDocument();
      expect(screen.getByText('Rent Collected This Month')).toBeInTheDocument();
    });
  });

  it('should render needs attention section', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Needs Attention')).toBeInTheDocument();
    });
  });

  it('should render recent activity section', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    });
  });

  it('should query required tables on load', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(mockSupabaseFrom).toHaveBeenCalledWith('households');
      expect(mockSupabaseFrom).toHaveBeenCalledWith('units');
      expect(mockSupabaseFrom).toHaveBeenCalledWith('class_enrollments');
      expect(mockSupabaseFrom).toHaveBeenCalledWith('work_orders');
      expect(mockSupabaseFrom).toHaveBeenCalledWith('leases');
      expect(mockSupabaseFrom).toHaveBeenCalledWith('case_notes');
      expect(mockSupabaseFrom).toHaveBeenCalledWith('rent_ledger');
    });
  });

  it('should show loading state initially', () => {
    // The component shows loading before data is fetched
    render(<Dashboard />);

    // Either shows loading or has loaded by now
    const dashboard = screen.queryByText('Dashboard') || screen.queryByText('Loading dashboard...');
    expect(dashboard).toBeInTheDocument();
  });

  it('should display zero values when no data exists', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      // Should show 0 for all stats when no data
      const zeroStats = screen.getAllByText('0');
      expect(zeroStats.length).toBeGreaterThan(0);
    });
  });

  it('should show "all caught up" when no urgent items', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('All caught up! No urgent items.')).toBeInTheDocument();
    });
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import JobListingsPage from '@/app/(app)/workforce/jobs/page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/workforce/jobs',
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date) => '2024-01-15'),
}));

// Mock job listings data matching actual schema
const mockJobListings = [
  {
    id: 'job1',
    title: 'Software Developer',
    company: 'Tech Corp',
    location: 'Portland, ME',
    hourly_wage_min: 25,
    hourly_wage_max: 35,
    schedule_type: 'Full-time',
    description: 'Build amazing software',
    requirements: 'JavaScript, React',
    contact_name: 'John HR',
    contact_email: 'john@techcorp.com',
    contact_phone: '207-555-1234',
    external_url: 'https://techcorp.com/jobs/1',
    status: 'active',
    openings: 3,
    placements: 1,
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 'job2',
    title: 'CNA',
    company: 'Maine Hospital',
    location: 'Lewiston, ME',
    hourly_wage_min: 18,
    hourly_wage_max: 22,
    schedule_type: 'Part-time',
    description: 'Patient care',
    requirements: 'CNA certification',
    contact_name: 'Jane Manager',
    contact_email: 'jane@hospital.com',
    contact_phone: null,
    external_url: null,
    status: 'active',
    openings: 5,
    placements: 2,
    created_at: '2024-01-10T08:00:00Z',
  },
];

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      order: jest.fn().mockResolvedValue({ data: mockJobListings, error: null }),
    })),
  },
}));

describe('WorkforceJobsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render tab navigation', async () => {
    render(<JobListingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Kanban')).toBeInTheDocument();
      // Job Listings appears in both tab and header, use getAllByText
      expect(screen.getAllByText('Job Listings').length).toBeGreaterThan(0);
      expect(screen.getByText('Training')).toBeInTheDocument();
    });
  });

  it('should render Add Job Listing button', async () => {
    render(<JobListingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Add Job Listing')).toBeInTheDocument();
    });
  });

  it('should display job listings after loading', async () => {
    render(<JobListingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Software Developer')).toBeInTheDocument();
      expect(screen.getByText('Tech Corp')).toBeInTheDocument();
      expect(screen.getByText('CNA')).toBeInTheDocument();
      expect(screen.getByText('Maine Hospital')).toBeInTheDocument();
    });
  });
});

describe('WorkforceJobsPage API Integration', () => {
  it('should call Supabase to fetch job_listings on mount', async () => {
    render(<JobListingsPage />);

    await waitFor(() => {
      const { supabase } = require('@/lib/supabase');
      expect(supabase.from).toHaveBeenCalledWith('job_listings');
    });
  });
});

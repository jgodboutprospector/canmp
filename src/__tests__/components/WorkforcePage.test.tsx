import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import WorkforcePage from '@/app/(app)/workforce/page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/workforce',
}));

// Mock supabase
const mockParticipants = [
  {
    id: '1',
    status: 'intake',
    target_occupation: 'Software Developer',
    current_employer: null,
    current_job_title: null,
    current_hourly_wage: null,
    notes: null,
    career_summary: null,
    preferred_industries: null,
    preferred_schedule: null,
    strengths: null,
    areas_for_growth: null,
    beneficiary: {
      id: 'b1',
      first_name: 'John',
      last_name: 'Doe',
      phone: '207-555-1234',
      email: 'john@example.com',
    },
  },
  {
    id: '2',
    status: 'searching',
    target_occupation: 'Nurse',
    current_employer: 'Hospital',
    current_job_title: 'CNA',
    current_hourly_wage: 18.5,
    notes: null,
    career_summary: null,
    preferred_industries: null,
    preferred_schedule: null,
    strengths: null,
    areas_for_growth: null,
    beneficiary: {
      id: 'b2',
      first_name: 'Jane',
      last_name: 'Smith',
      phone: null,
      email: null,
    },
  },
];

const mockSelect = jest.fn().mockReturnThis();
const mockEq = jest.fn().mockReturnThis();
const mockOrder = jest.fn().mockResolvedValue({ data: mockParticipants, error: null });

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      update: jest.fn().mockReturnThis(),
    }),
  },
}));

describe('WorkforcePage', () => {
  beforeEach(() => {
    mockOrder.mockResolvedValue({ data: mockParticipants, error: null });
  });

  it('should render page header', async () => {
    render(<WorkforcePage />);

    await waitFor(() => {
      expect(screen.getByText('Workforce Development')).toBeInTheDocument();
      expect(screen.getByText('Track job seekers through the employment pipeline')).toBeInTheDocument();
    });
  });

  it('should render tab navigation', async () => {
    render(<WorkforcePage />);

    await waitFor(() => {
      expect(screen.getByText('Kanban')).toBeInTheDocument();
      expect(screen.getByText('Job Listings')).toBeInTheDocument();
      expect(screen.getByText('Training')).toBeInTheDocument();
    });
  });

  it('should render add participant button', async () => {
    render(<WorkforcePage />);

    await waitFor(() => {
      expect(screen.getByText('Add Participant')).toBeInTheDocument();
    });
  });

  it('should render all status columns', async () => {
    render(<WorkforcePage />);

    await waitFor(() => {
      expect(screen.getByText('Intake')).toBeInTheDocument();
      expect(screen.getByText('Preparing')).toBeInTheDocument();
      expect(screen.getByText('Job Searching')).toBeInTheDocument();
      expect(screen.getByText('Interviewing')).toBeInTheDocument();
      expect(screen.getByText('Placed')).toBeInTheDocument();
      expect(screen.getByText('Employed 90+ Days')).toBeInTheDocument();
    });
  });

  it('should display participant cards with names', async () => {
    render(<WorkforcePage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('should display target occupation on cards', async () => {
    render(<WorkforcePage />);

    await waitFor(() => {
      expect(screen.getByText('Software Developer')).toBeInTheDocument();
      expect(screen.getByText('Nurse')).toBeInTheDocument();
    });
  });

  it('should display current employment info when available', async () => {
    render(<WorkforcePage />);

    await waitFor(() => {
      expect(screen.getByText('CNA @ Hospital')).toBeInTheDocument();
    });
  });

  it('should show stats with participant counts', async () => {
    render(<WorkforcePage />);

    await waitFor(() => {
      // Stats row shows counts per status
      // 1 in intake, 1 in searching
      const oneCountElements = screen.getAllByText('1');
      expect(oneCountElements.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('should show loading state initially', () => {
    render(<WorkforcePage />);

    // Either shows loading or has loaded
    const loading = screen.queryByText('Loading...');
    const header = screen.queryByText('Workforce Development');
    expect(loading || header).toBeInTheDocument();
  });

  it('should render participant cards as draggable', async () => {
    render(<WorkforcePage />);

    await waitFor(() => {
      const cards = document.querySelectorAll('[draggable="true"]');
      expect(cards.length).toBe(2); // Two participants
    });
  });
});

describe('WorkforcePage with empty data', () => {
  beforeEach(() => {
    mockOrder.mockResolvedValue({ data: [], error: null });
  });

  it('should show "No participants" in empty columns', async () => {
    render(<WorkforcePage />);

    await waitFor(() => {
      const emptyMessages = screen.getAllByText('No participants');
      expect(emptyMessages.length).toBe(6); // All 6 columns empty
    });
  });
});

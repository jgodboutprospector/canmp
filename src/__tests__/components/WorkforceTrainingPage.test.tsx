import { render, screen, waitFor } from '@testing-library/react';
import TrainingPage from '@/app/(app)/workforce/training/page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/workforce/training',
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date) => '2024-01-15'),
}));

// Mock training programs data matching actual schema
const mockTrainingPrograms = [
  {
    id: 'prog1',
    name: 'ESL Level 1',
    provider: 'Adult Learning Center',
    description: 'Basic English language skills',
    category: 'ESL/English',
    duration_hours: 40,
    cost: 0,
    location: 'Portland, ME',
    schedule: 'Mon/Wed 6-8pm',
    certification_offered: 'ESL Certificate',
    contact_name: 'Maria Teacher',
    contact_email: 'maria@alc.org',
    contact_phone: '207-555-2345',
    external_url: 'https://alc.org/esl',
    status: 'active',
    start_date: '2024-02-01',
    end_date: '2024-04-01',
    max_participants: 20,
    created_at: '2024-01-05T09:00:00Z',
  },
  {
    id: 'prog2',
    name: 'CNA Training',
    provider: 'Healthcare Institute',
    description: 'Certified Nursing Assistant training program',
    category: 'Healthcare/CNA',
    duration_hours: 120,
    cost: 1500,
    location: 'Lewiston, ME',
    schedule: 'Full-time 2 months',
    certification_offered: 'CNA Certification',
    contact_name: 'Dr. Smith',
    contact_email: 'smith@hci.edu',
    contact_phone: '207-555-3456',
    external_url: null,
    status: 'upcoming',
    start_date: '2024-03-01',
    end_date: '2024-05-01',
    max_participants: 15,
    created_at: '2024-01-08T10:00:00Z',
  },
];

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      order: jest.fn().mockResolvedValue({ data: mockTrainingPrograms, error: null }),
    })),
  },
}));

describe('WorkforceTrainingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render tab navigation', async () => {
    render(<TrainingPage />);

    await waitFor(() => {
      expect(screen.getByText('Kanban')).toBeInTheDocument();
      expect(screen.getByText('Job Listings')).toBeInTheDocument();
      expect(screen.getByText('Training')).toBeInTheDocument();
    });
  });

  it('should render Add Training Program button', async () => {
    render(<TrainingPage />);

    await waitFor(() => {
      expect(screen.getByText('Add Training Program')).toBeInTheDocument();
    });
  });

  it('should display training programs after loading', async () => {
    render(<TrainingPage />);

    await waitFor(() => {
      expect(screen.getByText('ESL Level 1')).toBeInTheDocument();
      expect(screen.getByText('Adult Learning Center')).toBeInTheDocument();
      expect(screen.getByText('CNA Training')).toBeInTheDocument();
      expect(screen.getByText('Healthcare Institute')).toBeInTheDocument();
    });
  });
});

describe('WorkforceTrainingPage API Integration', () => {
  it('should call Supabase to fetch training_programs on mount', async () => {
    render(<TrainingPage />);

    await waitFor(() => {
      const { supabase } = require('@/lib/supabase');
      expect(supabase.from).toHaveBeenCalledWith('training_programs');
    });
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import DonationsPage from '@/app/(app)/donations/page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/donations',
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date) => '2024-01-15'),
}));

// Mock donations data matching actual schema
const mockDonations = [
  {
    id: 'don1',
    name: 'Winter Coats',
    description: 'Various sizes available',
    category: 'clothing',
    condition: 'good',
    quantity: 25,
    status: 'available',
    location: 'Warehouse A',
    bin_number: 'A12',
    donor_name: 'Local Church',
    donated_date: '2024-01-10',
    image_path: null,
    claimed_by_household: null,
  },
];

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      order: jest.fn().mockResolvedValue({ data: mockDonations, error: null }),
    })),
  },
}));

describe('DonationsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render Add Item button', async () => {
    render(<DonationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Add Item')).toBeInTheDocument();
    });
  });

  it('should render search input', async () => {
    render(<DonationsPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search items/i)).toBeInTheDocument();
    });
  });
});

describe('DonationsPage API Integration', () => {
  it('should call Supabase to fetch donation_items on mount', async () => {
    render(<DonationsPage />);

    await waitFor(() => {
      const { supabase } = require('@/lib/supabase');
      expect(supabase.from).toHaveBeenCalledWith('donation_items');
    });
  });
});

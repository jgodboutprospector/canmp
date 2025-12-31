import { render, screen, waitFor } from '@testing-library/react';
import ExternalContactsTab from '@/components/modules/beneficiaries/ExternalContactsTab';

// Mock supabase
const mockContacts = [
  {
    id: 'bc1',
    relationship_type: 'case_worker',
    is_primary: true,
    notes: 'Primary case worker',
    external_contact: {
      id: 'ec1',
      first_name: 'Jane',
      last_name: 'Smith',
      title: 'Senior Case Manager',
      contact_type: 'case_worker',
      phone: '207-555-1234',
      email: 'jane@agency.org',
      languages: null,
      is_certified: false,
      organization: {
        id: 'org1',
        name: 'Maine Refugee Services',
      },
    },
  },
  {
    id: 'bc2',
    relationship_type: 'translator',
    is_primary: false,
    notes: null,
    external_contact: {
      id: 'ec2',
      first_name: 'Ahmed',
      last_name: 'Hassan',
      title: 'Certified Interpreter',
      contact_type: 'translator',
      phone: '207-555-5678',
      email: 'ahmed@translations.com',
      languages: ['Arabic', 'French'],
      is_certified: true,
      organization: null,
    },
  },
];

const mockSelect = jest.fn().mockReturnThis();
const mockEq = jest.fn().mockReturnThis();
const mockOrder = jest.fn().mockResolvedValue({ data: mockContacts, error: null });

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      delete: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
    }),
  },
}));

describe('ExternalContactsTab', () => {
  beforeEach(() => {
    mockOrder.mockResolvedValue({ data: mockContacts, error: null });
  });

  it('should render description text', async () => {
    render(<ExternalContactsTab beneficiaryId="test-id" />);

    await waitFor(() => {
      expect(screen.getByText(/Case workers, translators, and other contacts/)).toBeInTheDocument();
    });
  });

  it('should render Add Contact button', async () => {
    render(<ExternalContactsTab beneficiaryId="test-id" />);

    await waitFor(() => {
      expect(screen.getByText('Add Contact')).toBeInTheDocument();
    });
  });

  it('should display contact names', async () => {
    render(<ExternalContactsTab beneficiaryId="test-id" />);

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Ahmed Hassan')).toBeInTheDocument();
    });
  });

  it('should display contact type badges', async () => {
    render(<ExternalContactsTab beneficiaryId="test-id" />);

    await waitFor(() => {
      expect(screen.getByText('Case Worker')).toBeInTheDocument();
      expect(screen.getByText('Translator')).toBeInTheDocument();
    });
  });

  it('should display organization name when present', async () => {
    render(<ExternalContactsTab beneficiaryId="test-id" />);

    await waitFor(() => {
      expect(screen.getByText('Maine Refugee Services')).toBeInTheDocument();
    });
  });

  it('should show primary indicator for primary contacts', async () => {
    render(<ExternalContactsTab beneficiaryId="test-id" />);

    await waitFor(() => {
      // The star icon indicates primary status
      const starIcons = document.querySelectorAll('.fill-yellow-500');
      expect(starIcons.length).toBeGreaterThan(0);
    });
  });
});

describe('ExternalContactsTab with empty data', () => {
  beforeEach(() => {
    mockOrder.mockResolvedValue({ data: [], error: null });
  });

  it('should show empty state message', async () => {
    render(<ExternalContactsTab beneficiaryId="test-id" />);

    await waitFor(() => {
      expect(screen.getByText('No external contacts linked yet')).toBeInTheDocument();
    });
  });
});

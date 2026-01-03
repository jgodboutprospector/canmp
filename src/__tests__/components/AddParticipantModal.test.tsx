import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddParticipantModal } from '@/components/modules/workforce/AddParticipantModal';

// Mock beneficiaries data
const mockBeneficiaries = [
  { id: 'b1', first_name: 'John', last_name: 'Doe', household: { name: 'Doe Family' } },
  { id: 'b2', first_name: 'Jane', last_name: 'Smith', household: null },
  { id: 'b3', first_name: 'Bob', last_name: 'Johnson', household: { name: 'Johnson Family' } },
];

// Mock existing participants (b1 already enrolled)
const mockExistingParticipants = [
  { beneficiary_id: 'b1' },
];

const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn((table: string) => {
      if (table === 'beneficiaries') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: mockBeneficiaries, error: null }),
        };
      }
      if (table === 'workforce_participants') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: mockExistingParticipants, error: null }),
          insert: mockInsert,
        };
      }
      if (table === 'workforce_notes') {
        return {
          insert: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        insert: mockInsert,
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
    }),
  },
}));

describe('AddParticipantModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    render(
      <AddParticipantModal
        isOpen={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.queryByText('Add Workforce Participant')).not.toBeInTheDocument();
  });

  it('should render modal when isOpen is true', async () => {
    render(
      <AddParticipantModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Add Workforce Participant')).toBeInTheDocument();
    });
  });

  it('should call onClose when Cancel button is clicked', async () => {
    render(
      <AddParticipantModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalled();
  });
});

describe('AddParticipantModal API Integration', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch beneficiaries from Supabase on mount', async () => {
    render(
      <AddParticipantModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      const { supabase } = require('@/lib/supabase');
      expect(supabase.from).toHaveBeenCalledWith('beneficiaries');
    });
  });

  it('should fetch existing participants to filter them out', async () => {
    render(
      <AddParticipantModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      const { supabase } = require('@/lib/supabase');
      expect(supabase.from).toHaveBeenCalledWith('workforce_participants');
    });
  });
});

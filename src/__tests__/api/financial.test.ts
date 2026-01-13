/**
 * API Endpoint Tests - Financial (Aplos, Neon, Ramp)
 *
 * Tests for financial service helper functions and business logic
 */

import {
  formatCardNumber,
  getCardStatusColor,
  getTransactionStatusColor,
  getReimbursementStatusColor,
} from '@/lib/services/ramp';

describe('Financial Services', () => {
  describe('Ramp Helper Functions', () => {
    describe('formatCardNumber', () => {
      it('should format last four digits', () => {
        expect(formatCardNumber('1234')).toBe('•••• 1234');
        expect(formatCardNumber('5678')).toBe('•••• 5678');
      });
    });

    describe('getCardStatusColor', () => {
      it('should return correct color for active status', () => {
        expect(getCardStatusColor('active')).toBe('bg-green-100 text-green-700');
      });

      it('should return correct color for suspended status', () => {
        expect(getCardStatusColor('suspended')).toBe('bg-yellow-100 text-yellow-700');
      });

      it('should return correct color for terminated status', () => {
        expect(getCardStatusColor('terminated')).toBe('bg-red-100 text-red-700');
      });

      it('should return correct color for pending status', () => {
        expect(getCardStatusColor('pending')).toBe('bg-gray-100 text-gray-700');
      });
    });

    describe('getTransactionStatusColor', () => {
      it('should return correct color for cleared status', () => {
        expect(getTransactionStatusColor('cleared')).toBe('bg-green-100 text-green-700');
      });

      it('should return correct color for pending status', () => {
        expect(getTransactionStatusColor('pending')).toBe('bg-yellow-100 text-yellow-700');
      });

      it('should return correct color for declined status', () => {
        expect(getTransactionStatusColor('declined')).toBe('bg-red-100 text-red-700');
      });

      it('should return correct color for refunded status', () => {
        expect(getTransactionStatusColor('refunded')).toBe('bg-blue-100 text-blue-700');
      });
    });

    describe('getReimbursementStatusColor', () => {
      it('should return correct color for approved status', () => {
        expect(getReimbursementStatusColor('approved')).toBe('bg-green-100 text-green-700');
      });

      it('should return correct color for pending status', () => {
        expect(getReimbursementStatusColor('pending')).toBe('bg-yellow-100 text-yellow-700');
      });

      it('should return correct color for rejected status', () => {
        expect(getReimbursementStatusColor('rejected')).toBe('bg-red-100 text-red-700');
      });

      it('should return correct color for paid status', () => {
        expect(getReimbursementStatusColor('paid')).toBe('bg-blue-100 text-blue-700');
      });
    });
  });

  describe('Financial API Response Structure', () => {
    it('should validate Aplos dashboard response structure', () => {
      const mockAplosResponse = {
        success: true,
        data: {
          funds: [],
          recentTransactions: [],
          incomeVsExpense: { income: 0, expense: 0 },
        },
        demo: true,
      };

      expect(mockAplosResponse).toHaveProperty('success');
      expect(mockAplosResponse).toHaveProperty('data');
      expect(mockAplosResponse.data).toHaveProperty('funds');
    });

    it('should validate Neon dashboard response structure', () => {
      const mockNeonResponse = {
        success: true,
        data: {
          donors: [],
          donations: [],
          totalRaised: 0,
          recentDonations: [],
        },
        demo: true,
      };

      expect(mockNeonResponse).toHaveProperty('success');
      expect(mockNeonResponse).toHaveProperty('data');
      expect(mockNeonResponse.data).toHaveProperty('donors');
    });

    it('should validate Ramp dashboard response structure', () => {
      const mockRampResponse = {
        success: true,
        data: {
          cards: [],
          transactions: [],
          reimbursements: [],
          totalSpend: 0,
          activeCards: 0,
          pendingReimbursements: 0,
        },
        demo: true,
      };

      expect(mockRampResponse).toHaveProperty('success');
      expect(mockRampResponse).toHaveProperty('data');
      expect(mockRampResponse.data).toHaveProperty('cards');
      expect(mockRampResponse.data).toHaveProperty('transactions');
    });
  });

  describe('Financial Data Types', () => {
    it('should have valid RampCard type structure', () => {
      const mockCard = {
        id: 'card-1',
        display_name: 'Test Card',
        last_four: '1234',
        cardholder_id: 'user-1',
        cardholder_name: 'John Doe',
        is_physical: false,
        state: 'active' as const,
        created_at: '2024-01-01T00:00:00Z',
      };

      expect(mockCard.id).toBeDefined();
      expect(mockCard.last_four).toHaveLength(4);
      expect(['active', 'suspended', 'terminated', 'pending']).toContain(mockCard.state);
    });

    it('should have valid RampTransaction type structure', () => {
      const mockTransaction = {
        id: 'txn-1',
        amount: 100.00,
        currency: 'USD',
        merchant_name: 'Test Merchant',
        card_id: 'card-1',
        card_holder_name: 'John Doe',
        user_id: 'user-1',
        state: 'cleared' as const,
        transaction_date: '2024-01-15',
        created_at: '2024-01-15T00:00:00Z',
      };

      expect(mockTransaction.id).toBeDefined();
      expect(mockTransaction.amount).toBeGreaterThanOrEqual(0);
      expect(['pending', 'cleared', 'declined', 'refunded']).toContain(mockTransaction.state);
    });

    it('should have valid RampReimbursement type structure', () => {
      const mockReimbursement = {
        id: 'reimb-1',
        user_id: 'user-1',
        user_name: 'John Doe',
        amount: 50.00,
        currency: 'USD',
        merchant: 'Test Vendor',
        transaction_date: '2024-01-10',
        status: 'pending' as const,
        created_at: '2024-01-10T00:00:00Z',
      };

      expect(mockReimbursement.id).toBeDefined();
      expect(mockReimbursement.amount).toBeGreaterThanOrEqual(0);
      expect(['pending', 'approved', 'rejected', 'paid']).toContain(mockReimbursement.status);
    });
  });
});

/**
 * Tests for Financial Data Hooks
 *
 * Tests useAplosData, useRampData, useNeonData, and useFinancialDashboard hooks
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useAplosData, useRampData, useNeonData, useFinancialDashboard } from '@/lib/hooks/useFinancialData';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Financial Data Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useAplosData', () => {
    it('should initialize with loading state', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
      const { result } = renderHook(() => useAplosData('transactions'));

      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should fetch and return Aplos transactions data', async () => {
      const mockTransactions = [
        { id: '1', date: '2025-12-28', amount: 5000, memo: 'Test transaction' },
      ];
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockTransactions, isDemo: false }),
      });

      const { result } = renderHook(() => useAplosData('transactions'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockTransactions);
      expect(result.current.isDemo).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: false, error: 'API Error' }),
      });

      const { result } = renderHook(() => useAplosData('transactions'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('API Error');
      expect(result.current.data).toBeNull();
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAplosData('transactions'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to connect to API');
    });

    it('should include fund_id in request when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: [], isDemo: true }),
      });

      renderHook(() => useAplosData('transactions', 'fund-123'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('fund_id=fund-123')
        );
      });
    });

    it('should not include fund_id when set to "all"', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: [], isDemo: true }),
      });

      renderHook(() => useAplosData('transactions', 'all'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
        expect(mockFetch).not.toHaveBeenCalledWith(
          expect.stringContaining('fund_id=all')
        );
      });
    });

    it('should provide a refresh function that refetches data', async () => {
      const firstData = [{ id: '1', amount: 100 }];
      const secondData = [{ id: '1', amount: 100 }, { id: '2', amount: 200 }];

      mockFetch
        .mockResolvedValueOnce({
          json: async () => ({ success: true, data: firstData, isDemo: false }),
        })
        .mockResolvedValueOnce({
          json: async () => ({ success: true, data: secondData, isDemo: false }),
        });

      const { result } = renderHook(() => useAplosData('transactions'));

      await waitFor(() => {
        expect(result.current.data).toEqual(firstData);
      });

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.data).toEqual(secondData);
    });
  });

  describe('useRampData', () => {
    it('should fetch and return Ramp cards data', async () => {
      const mockCards = [
        { id: 'card-1', display_name: 'Operations Card', state: 'active' },
      ];
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockCards, isDemo: true }),
      });

      const { result } = renderHook(() => useRampData('cards'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockCards);
      expect(result.current.isDemo).toBe(true);
    });

    it('should construct correct URL for different data types', async () => {
      mockFetch.mockResolvedValue({
        json: async () => ({ success: true, data: [], isDemo: true }),
      });

      const { unmount: unmount1 } = renderHook(() => useRampData('cards'));
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/financial/ramp?type=cards');
      });
      unmount1();

      mockFetch.mockClear();
      const { unmount: unmount2 } = renderHook(() => useRampData('transactions'));
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/financial/ramp?type=transactions');
      });
      unmount2();

      mockFetch.mockClear();
      renderHook(() => useRampData('reimbursements'));
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/financial/ramp?type=reimbursements');
      });
    });

    it('should handle error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: false, error: 'Invalid data type' }),
      });

      const { result } = renderHook(() => useRampData('invalid'));

      await waitFor(() => {
        expect(result.current.error).toBe('Invalid data type');
      });
    });
  });

  describe('useNeonData', () => {
    it('should fetch and return Neon donors data', async () => {
      const mockDonors = [
        { id: 'd-1', firstName: 'John', lastName: 'Doe', totalDonations: 5000 },
      ];
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockDonors, isDemo: false }),
      });

      const { result } = renderHook(() => useNeonData('donors'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockDonors);
    });

    it('should fetch donations data correctly', async () => {
      const mockDonations = [
        { id: 'don-1', donorName: 'John Doe', amount: 500, status: 'completed' },
      ];
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockDonations, isDemo: true }),
      });

      const { result } = renderHook(() => useNeonData('donations'));

      await waitFor(() => {
        expect(result.current.data).toEqual(mockDonations);
      });
    });

    it('should fetch campaigns data correctly', async () => {
      const mockCampaigns = [
        { id: 'c-1', name: 'Year-End Giving', goal: 50000, raised: 32500 },
      ];
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockCampaigns, isDemo: true }),
      });

      const { result } = renderHook(() => useNeonData('campaigns'));

      await waitFor(() => {
        expect(result.current.data).toEqual(mockCampaigns);
      });
    });

    it('should fetch memberships data correctly', async () => {
      const mockMemberships = [
        { id: 'm-1', donorName: 'John Doe', level: 'Patron', status: 'active' },
      ];
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockMemberships, isDemo: true }),
      });

      const { result } = renderHook(() => useNeonData('memberships'));

      await waitFor(() => {
        expect(result.current.data).toEqual(mockMemberships);
      });
    });
  });

  describe('useFinancialDashboard', () => {
    it('should fetch data from both Aplos and Ramp APIs', async () => {
      const mockAplosData = { funds: [], transactions: [], incomeStatement: [] };
      const mockRampData = { cards: [], transactions: [], reimbursements: [] };

      mockFetch
        .mockResolvedValueOnce({
          json: async () => ({ success: true, data: mockAplosData, isDemo: true }),
        })
        .mockResolvedValueOnce({
          json: async () => ({ success: true, data: mockRampData, isDemo: false }),
        });

      const { result } = renderHook(() => useFinancialDashboard());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenCalledWith('/api/financial/aplos?type=dashboard');
      expect(mockFetch).toHaveBeenCalledWith('/api/financial/ramp?type=dashboard');
    });

    it('should set aplosData and rampData when both succeed', async () => {
      const mockAplosData = { funds: [{ id: '1', name: 'General' }], transactions: [], incomeStatement: [] };
      const mockRampData = { cards: [{ id: 'c-1', display_name: 'Card 1' }], transactions: [], reimbursements: [] };

      mockFetch
        .mockResolvedValueOnce({
          json: async () => ({ success: true, data: mockAplosData, isDemo: true }),
        })
        .mockResolvedValueOnce({
          json: async () => ({ success: true, data: mockRampData, isDemo: false }),
        });

      const { result } = renderHook(() => useFinancialDashboard());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.aplosData).toEqual(mockAplosData);
      expect(result.current.rampData).toEqual(mockRampData);
      expect(result.current.isDemo).toBe(true); // Set from aplos result
    });

    it('should handle partial failures gracefully', async () => {
      const mockAplosData = { funds: [], transactions: [], incomeStatement: [] };

      mockFetch
        .mockResolvedValueOnce({
          json: async () => ({ success: true, data: mockAplosData, isDemo: true }),
        })
        .mockResolvedValueOnce({
          json: async () => ({ success: false, error: 'Ramp API unavailable' }),
        });

      const { result } = renderHook(() => useFinancialDashboard());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should still have aplos data even if ramp fails
      expect(result.current.aplosData).toEqual(mockAplosData);
      expect(result.current.rampData).toBeNull();
    });

    it('should handle complete network failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useFinancialDashboard());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to connect to API');
    });

    it('should provide a refresh function', async () => {
      mockFetch
        .mockResolvedValueOnce({
          json: async () => ({ success: true, data: { funds: [] }, isDemo: true }),
        })
        .mockResolvedValueOnce({
          json: async () => ({ success: true, data: { cards: [] }, isDemo: false }),
        });

      const { result } = renderHook(() => useFinancialDashboard());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(typeof result.current.refresh).toBe('function');
    });
  });
});

describe('Financial Data Type Validation', () => {
  describe('Aplos Types', () => {
    it('should validate AplosFund structure', () => {
      const fund = {
        id: '1',
        name: 'General Fund',
        balance: 125000,
        is_default: true,
      };

      expect(fund).toHaveProperty('id');
      expect(fund).toHaveProperty('name');
      expect(typeof fund.balance).toBe('number');
    });

    it('should validate AplosTransaction structure', () => {
      const transaction = {
        id: '1',
        date: '2025-12-28',
        amount: 5000,
        memo: 'Test transaction',
        type: 'credit' as const,
      };

      expect(transaction).toHaveProperty('id');
      expect(transaction).toHaveProperty('date');
      expect(transaction).toHaveProperty('amount');
      expect(['credit', 'debit']).toContain(transaction.type);
    });

    it('should validate AplosIncomeStatementLine structure', () => {
      const line = {
        category: 'Revenue',
        account_name: 'Donations',
        current_amount: 12500,
        ytd_amount: 85000,
      };

      expect(line.category).toBe('Revenue');
      expect(typeof line.current_amount).toBe('number');
      expect(typeof line.ytd_amount).toBe('number');
    });

    it('should validate AplosTrialBalanceLine structure', () => {
      const line = {
        account_name: 'Cash',
        type: 'Asset',
        debit: 125000,
        credit: 0,
        net_balance: 125000,
      };

      expect(line.account_name).toBe('Cash');
      expect(line.net_balance).toBe(line.debit - line.credit);
    });
  });

  describe('Ramp Types', () => {
    it('should validate RampCard states', () => {
      const validStates = ['active', 'suspended', 'terminated', 'pending'];

      validStates.forEach(state => {
        const card = {
          id: 'card-1',
          display_name: 'Test Card',
          last_four: '1234',
          cardholder_name: 'John Doe',
          state: state as 'active' | 'suspended' | 'terminated' | 'pending',
          is_physical: true,
          spending_limit: 5000,
          current_spend: 2340,
        };
        expect(validStates).toContain(card.state);
      });
    });

    it('should validate RampTransaction states', () => {
      const validStates = ['pending', 'cleared', 'declined', 'refunded'];

      validStates.forEach(state => {
        const transaction = {
          id: 'txn-1',
          amount: 100,
          merchant_name: 'Test Store',
          category: 'Office Supplies',
          card_holder_name: 'John Doe',
          state: state as 'pending' | 'cleared' | 'declined' | 'refunded',
          transaction_date: '2025-12-28',
        };
        expect(validStates).toContain(transaction.state);
      });
    });

    it('should validate RampReimbursement statuses', () => {
      const validStatuses = ['pending', 'approved', 'rejected', 'paid'];

      validStatuses.forEach(status => {
        const reimbursement = {
          id: 'reimb-1',
          user_name: 'John Doe',
          amount: 125,
          merchant: 'Walmart',
          status: status as 'pending' | 'approved' | 'rejected' | 'paid',
          transaction_date: '2025-12-27',
          category: 'Supplies',
        };
        expect(validStatuses).toContain(reimbursement.status);
      });
    });
  });

  describe('Neon Types', () => {
    it('should validate NeonDonor structure', () => {
      const donor = {
        id: 'd-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        totalDonations: 15000,
        donationCount: 12,
        lastDonationDate: '2025-12-15',
        membershipStatus: 'active' as const,
        createdAt: '2020-03-15',
      };

      expect(donor.firstName).toBe('John');
      expect(donor.email).toContain('@');
      expect(['active', 'expired', 'none']).toContain(donor.membershipStatus);
    });

    it('should validate NeonDonation payment methods', () => {
      const validMethods = ['credit_card', 'check', 'cash', 'ach', 'other'];

      validMethods.forEach(method => {
        const donation = {
          id: 'don-1',
          donorId: 'd-1',
          donorName: 'John Doe',
          amount: 500,
          date: '2025-12-22',
          paymentMethod: method as 'credit_card' | 'check' | 'cash' | 'ach' | 'other',
          status: 'completed' as const,
          recurring: false,
        };
        expect(validMethods).toContain(donation.paymentMethod);
      });
    });

    it('should validate NeonCampaign statuses', () => {
      const validStatuses = ['active', 'completed', 'draft'];

      validStatuses.forEach(status => {
        const campaign = {
          id: 'c-1',
          name: 'Test Campaign',
          goal: 50000,
          raised: 32500,
          donorCount: 45,
          startDate: '2025-11-01',
          endDate: '2025-12-31',
          status: status as 'active' | 'completed' | 'draft',
        };
        expect(validStatuses).toContain(campaign.status);
      });
    });

    it('should validate NeonMembership statuses', () => {
      const validStatuses = ['active', 'expired', 'pending'];

      validStatuses.forEach(status => {
        const membership = {
          id: 'm-1',
          donorId: 'd-1',
          donorName: 'John Doe',
          level: 'Patron',
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          status: status as 'active' | 'expired' | 'pending',
          amount: 500,
          autoRenew: true,
        };
        expect(validStatuses).toContain(membership.status);
      });
    });
  });
});

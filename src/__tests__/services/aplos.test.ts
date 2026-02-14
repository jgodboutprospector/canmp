import { aplosClient } from '@/lib/services/aplos';

// fetchWithTimeout wraps global.fetch with AbortController signal (2 args to fetch)
global.fetch = jest.fn();

describe('Aplos Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton state — constructor already ran, so set instance properties directly
    (aplosClient as any).accessToken = null;
    (aplosClient as any).tokenExpiry = null;
    (aplosClient as any).clientId = 'test-client-id';
    (aplosClient as any).sidecarUrl = 'http://localhost:3001';
  });

  // Helper to mock sidecar auth response
  function mockSidecarAuth() {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'test-access-token' }),
    });
  }

  describe('Authentication', () => {
    it('should authenticate via sidecar', async () => {
      mockSidecarAuth();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { funds: [] } }),
      });

      const result = await aplosClient.getFunds();

      expect(result).toEqual([]);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth-token'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should handle sidecar auth errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      await expect(aplosClient.getFunds()).rejects.toThrow();
    });

    it('should throw error when credentials are missing', async () => {
      (aplosClient as any).clientId = '';

      await expect(aplosClient.getFunds()).rejects.toThrow('not configured');
    });

    it('should handle auth endpoint errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Server error',
      });

      await expect(aplosClient.getFunds()).rejects.toThrow();
    });
  });

  describe('getFunds', () => {
    it('should fetch funds successfully', async () => {
      mockSidecarAuth();

      const mockFunds = [
        { id: '1', name: 'General Fund', balance: 10000 },
        { id: '2', name: 'Building Fund', balance: 5000 },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { funds: mockFunds } }),
      });

      const result = await aplosClient.getFunds();

      expect(result).toEqual(mockFunds);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/funds'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer:'),
          }),
        })
      );
    });

    it('should handle empty funds list', async () => {
      mockSidecarAuth();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { funds: [] } }),
      });

      const result = await aplosClient.getFunds();

      expect(result).toEqual([]);
    });

    it('should handle API errors', async () => {
      mockSidecarAuth();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Server error',
      });

      await expect(aplosClient.getFunds()).rejects.toThrow();
    });
  });

  describe('getTransactions', () => {
    it('should fetch transactions with filters', async () => {
      mockSidecarAuth();

      const mockTransactions = [
        {
          id: '1',
          date: '2024-01-15',
          amount: 100,
          memo: 'Donation',
          contact_id: 'c1',
          fund_id: 'f1',
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { transactions: mockTransactions } }),
      });

      const result = await aplosClient.getTransactions({
        fund_id: 'f1',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(result).toEqual(mockTransactions);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('f_fund=f1'),
        expect.anything()
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('f_rangestart=2024-01-01'),
        expect.anything()
      );
    });

    it('should handle pagination parameters', async () => {
      mockSidecarAuth();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { transactions: [] } }),
      });

      await aplosClient.getTransactions({ page: 2, per_page: 50 });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2'),
        expect.anything()
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('per_page=50'),
        expect.anything()
      );
    });
  });

  describe('getTrialBalance', () => {
    it('should compute trial balance from accounts', async () => {
      mockSidecarAuth();

      const mockAccounts = [
        { account_number: '1000', name: 'Cash', type: 'asset', balance: 5000 },
        { account_number: '3000', name: 'Revenue', type: 'revenue', balance: 10000 },
        { account_number: '5000', name: 'Expense', type: 'expense', balance: 3000 },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { accounts: mockAccounts } }),
      });

      const result = await aplosClient.getTrialBalance();

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('account_number');
      expect(result[0]).toHaveProperty('debit');
      expect(result[0]).toHaveProperty('credit');
      expect(result[0]).toHaveProperty('net_balance');
    });

    it('should filter out zero balance accounts', async () => {
      mockSidecarAuth();

      const mockAccounts = [
        { account_number: '1000', name: 'Cash', type: 'asset', balance: 0 },
        { account_number: '3000', name: 'Revenue', type: 'revenue', balance: 5000 },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { accounts: mockAccounts } }),
      });

      const result = await aplosClient.getTrialBalance();

      expect(result.length).toBe(1);
      expect(result[0].account_number).toBe('3000');
    });
  });

  describe('Error handling', () => {
    it('should handle network failures', async () => {
      mockSidecarAuth();

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(aplosClient.getFunds()).rejects.toThrow();
    });

    it('should handle malformed responses', async () => {
      mockSidecarAuth();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'response' }),
      });

      const result = await aplosClient.getFunds();

      expect(result).toEqual([]);
    });
  });

  describe('Token refresh logic', () => {
    it('should reuse token if not expired', async () => {
      // First auth
      mockSidecarAuth();

      // First request
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { funds: [] } }),
      });

      // Second request (should reuse token, no auth needed)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { funds: [] } }),
      });

      await aplosClient.getFunds();
      await aplosClient.getFunds();

      // Should only auth once
      const authCalls = (global.fetch as jest.Mock).mock.calls.filter(call =>
        call[0].includes('/auth-token')
      );
      expect(authCalls).toHaveLength(1);
    });
  });
});

import { rampClient } from '@/lib/services/ramp';

// fetchWithTimeout wraps global.fetch, so mocking global.fetch still works
global.fetch = jest.fn();

describe('Ramp Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RAMP_CLIENT_ID = 'test-client-id';
    process.env.RAMP_CLIENT_SECRET = 'test-client-secret';
    // Reset token state for singleton
    (rampClient as any).accessToken = null;
    (rampClient as any).tokenExpiry = null;
  });

  afterEach(() => {
    delete process.env.RAMP_CLIENT_ID;
    delete process.env.RAMP_CLIENT_SECRET;
  });

  describe('OAuth authentication', () => {
    it('should authenticate with client credentials', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'test-access-token',
            expires_in: 3600,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [],
          }),
        });

      const result = await rampClient.getCards();

      // fetchWithTimeout merges signal into options and passes 2 args to fetch
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/token'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Basic'),
          }),
        })
      );
    });

    it('should handle auth errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      await expect(rampClient.getCards()).rejects.toThrow();
    });
  });

  describe('getCards', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test-token',
          expires_in: 3600,
        }),
      });
    });

    it('should fetch cards successfully', async () => {
      const mockCards = [
        {
          id: 'card-1',
          display_name: 'John Doe Card',
          last_four: '1234',
          cardholder_id: 'user-1',
          cardholder_name: 'John Doe',
          is_physical: true,
          state: 'active',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockCards,
        }),
      });

      const result = await rampClient.getCards();

      expect(result.data).toEqual(mockCards);
    });

    it('should filter by user_id', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await rampClient.getCards({ user_id: 'user-1' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('user_id=user-1'),
        expect.anything()
      );
    });

    it('should filter by state', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await rampClient.getCards({ state: 'active' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('state=active'),
        expect.anything()
      );
    });

    it('should handle pagination', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          page: {
            next: 'next-cursor',
            prev: 'prev-cursor',
          },
        }),
      });

      const result = await rampClient.getCards({ page_size: 50, start: 'cursor-123' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('page_size=50'),
        expect.anything()
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('start=cursor-123'),
        expect.anything()
      );
      expect(result.page).toBeDefined();
    });
  });

  describe('getTransactions', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test-token',
          expires_in: 3600,
        }),
      });
    });

    it('should fetch transactions successfully', async () => {
      const mockTransactions = [
        {
          id: 'txn-1',
          amount: 50.00,
          currency: 'USD',
          merchant_name: 'Coffee Shop',
          card_id: 'card-1',
          card_holder_name: 'John Doe',
          user_id: 'user-1',
          state: 'cleared',
          transaction_date: '2024-01-15',
          created_at: '2024-01-15T10:00:00Z',
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockTransactions,
        }),
      });

      const result = await rampClient.getTransactions();

      expect(result.data).toEqual(mockTransactions);
    });

    it('should filter by date range', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await rampClient.getTransactions({
        from_date: '2024-01-01',
        to_date: '2024-01-31',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('from_date=2024-01-01'),
        expect.anything()
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('to_date=2024-01-31'),
        expect.anything()
      );
    });

    it('should filter by card_id and state', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await rampClient.getTransactions({
        card_id: 'card-1',
        state: 'cleared',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('card_id=card-1'),
        expect.anything()
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('state=cleared'),
        expect.anything()
      );
    });
  });

  describe('Error handling', () => {
    it('should handle API errors', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'token', expires_in: 3600 }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Server error',
        });

      await expect(rampClient.getCards()).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(rampClient.getCards()).rejects.toThrow();
    });
  });

  describe('Token refresh', () => {
    it('should reuse valid token', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'token', expires_in: 3600 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [] }),
        });

      await rampClient.getCards();
      await rampClient.getCards();

      const authCalls = (global.fetch as jest.Mock).mock.calls.filter(call =>
        call[0].includes('/token')
      );
      expect(authCalls).toHaveLength(1);
    });
  });

  describe('Reimbursements', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token', expires_in: 3600 }),
      });
    });

    it('should fetch reimbursements', async () => {
      const mockReimbursements = [
        {
          id: 'reimb-1',
          user_id: 'user-1',
          user_name: 'John Doe',
          amount: 25.00,
          currency: 'USD',
          merchant: 'Office Supply',
          transaction_date: '2024-01-10',
          status: 'pending',
          created_at: '2024-01-10T00:00:00Z',
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockReimbursements }),
      });

      const result = await rampClient.getReimbursements();

      expect(result.data).toEqual(mockReimbursements);
    });

    it('should filter by status', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await rampClient.getReimbursements({ status: 'approved' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('status=approved'),
        expect.anything()
      );
    });
  });
});

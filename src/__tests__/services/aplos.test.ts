import { aplosClient } from '@/lib/services/aplos';
import * as crypto from 'crypto';

global.fetch = jest.fn();

// Mock crypto module
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  privateDecrypt: jest.fn(),
  constants: {
    RSA_PKCS1_OAEP_PADDING: 4,
    RSA_PKCS1_PADDING: 1,
  },
}));

describe('Aplos Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.APLOS_CLIENT_ID = 'test-client-id';
    process.env.APLOS_PRIVATE_KEY = 'LS0tLS1CRUdJTi'; // Mock base64 key
  });

  afterEach(() => {
    delete process.env.APLOS_CLIENT_ID;
    delete process.env.APLOS_PRIVATE_KEY;
  });

  describe('Authentication', () => {
    it('should authenticate with encrypted token', async () => {
      const mockEncryptedToken = Buffer.from('encrypted-token').toString('base64');
      const mockDecryptedToken = 'decrypted-access-token';

      (crypto.privateDecrypt as jest.Mock).mockReturnValue(Buffer.from(mockDecryptedToken));

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { token: mockEncryptedToken },
        }),
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { funds: [] },
        }),
      });

      const result = await aplosClient.getFunds();

      expect(result).toEqual([]);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/'),
        expect.anything()
      );
    });

    it('should handle decryption errors', async () => {
      (crypto.privateDecrypt as jest.Mock).mockImplementation(() => {
        throw new Error('Decryption failed');
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { token: 'bad-token' },
        }),
      });

      await expect(aplosClient.getFunds()).rejects.toThrow();
    });

    it('should throw error when credentials are missing', async () => {
      delete process.env.APLOS_CLIENT_ID;
      delete process.env.APLOS_PRIVATE_KEY;

      await expect(aplosClient.getFunds()).rejects.toThrow('not configured');
    });

    it('should handle auth endpoint errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      await expect(aplosClient.getFunds()).rejects.toThrow();
    });
  });

  describe('getFunds', () => {
    beforeEach(() => {
      // Mock successful auth
      (crypto.privateDecrypt as jest.Mock).mockReturnValue(Buffer.from('token-123'));
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { token: 'encrypted-token' },
        }),
      });
    });

    it('should fetch funds successfully', async () => {
      const mockFunds = [
        { id: '1', name: 'General Fund', balance: 10000 },
        { id: '2', name: 'Building Fund', balance: 5000 },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { funds: mockFunds },
        }),
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
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { funds: [] },
        }),
      });

      const result = await aplosClient.getFunds();

      expect(result).toEqual([]);
    });

    it('should handle API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Server error',
      });

      await expect(aplosClient.getFunds()).rejects.toThrow();
    });
  });

  describe('getTransactions', () => {
    beforeEach(() => {
      (crypto.privateDecrypt as jest.Mock).mockReturnValue(Buffer.from('token-123'));
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { token: 'encrypted-token' } }),
      });
    });

    it('should fetch transactions with filters', async () => {
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
        json: async () => ({
          data: { transactions: mockTransactions },
        }),
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
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { transactions: [] },
        }),
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
    beforeEach(() => {
      (crypto.privateDecrypt as jest.Mock).mockReturnValue(Buffer.from('token-123'));
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { token: 'encrypted-token' } }),
      });
    });

    it('should compute trial balance from accounts', async () => {
      const mockAccounts = [
        { account_number: '1000', name: 'Cash', type: 'asset', balance: 5000 },
        { account_number: '3000', name: 'Revenue', type: 'revenue', balance: 10000 },
        { account_number: '5000', name: 'Expense', type: 'expense', balance: 3000 },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { accounts: mockAccounts },
        }),
      });

      const result = await aplosClient.getTrialBalance();

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('account_number');
      expect(result[0]).toHaveProperty('debit');
      expect(result[0]).toHaveProperty('credit');
      expect(result[0]).toHaveProperty('net_balance');
    });

    it('should filter out zero balance accounts', async () => {
      const mockAccounts = [
        { account_number: '1000', name: 'Cash', type: 'asset', balance: 0 },
        { account_number: '3000', name: 'Revenue', type: 'revenue', balance: 5000 },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { accounts: mockAccounts },
        }),
      });

      const result = await aplosClient.getTrialBalance();

      expect(result.length).toBe(1);
      expect(result[0].account_number).toBe('3000');
    });
  });

  describe('Error handling', () => {
    beforeEach(() => {
      (crypto.privateDecrypt as jest.Mock).mockReturnValue(Buffer.from('token-123'));
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { token: 'encrypted-token' } }),
      });
    });

    it('should handle network failures', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(aplosClient.getFunds()).rejects.toThrow();
    });

    it('should handle malformed responses', async () => {
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
      (crypto.privateDecrypt as jest.Mock).mockReturnValue(Buffer.from('token-123'));

      // First auth
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { token: 'encrypted-token' } }),
      });

      // First request
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { funds: [] } }),
      });

      // Second request (should reuse token)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { funds: [] } }),
      });

      await aplosClient.getFunds();
      await aplosClient.getFunds();

      // Should only auth once
      const authCalls = (global.fetch as jest.Mock).mock.calls.filter(call =>
        call[0].includes('/auth/')
      );
      expect(authCalls).toHaveLength(1);
    });
  });
});

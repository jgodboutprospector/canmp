import { neonClient } from '@/lib/services/neon';

global.fetch = jest.fn();

describe('Neon CRM Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    neonClient.resetSession();
    process.env.NEON_ORG_ID = 'test-org';
    process.env.NEON_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.NEON_ORG_ID;
    delete process.env.NEON_API_KEY;
  });

  describe('Authentication', () => {
    it('should login successfully and get session ID', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          loginResponse: {
            operationResult: 'SUCCESS',
            userSessionId: 'test-session-123',
          },
        }),
      });

      const result = await neonClient.testConnection();

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/common/login'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
      );
    });

    it('should handle login failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          loginResponse: {
            operationResult: 'FAILURE',
            responseMessage: 'Invalid credentials',
          },
        }),
      });

      const result = await neonClient.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid credentials');
    });

    it('should throw error when credentials are missing', async () => {
      delete process.env.NEON_ORG_ID;
      delete process.env.NEON_API_KEY;

      const result = await neonClient.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('not configured');
    });

    it('should handle network errors during login', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Server Error',
      });

      const result = await neonClient.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('500');
    });
  });

  describe('getDonors', () => {
    beforeEach(() => {
      // Mock login
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          loginResponse: {
            operationResult: 'SUCCESS',
            userSessionId: 'test-session-123',
          },
        }),
      });
    });

    it('should fetch donors successfully', async () => {
      const mockDonors = {
        listAccountsResponse: {
          operationResult: 'SUCCESS',
          searchResults: {
            nameValuePairs: [
              {
                nameValuePair: [
                  { name: 'Account ID', value: '1' },
                  { name: 'First Name', value: 'John' },
                  { name: 'Last Name', value: 'Doe' },
                  { name: 'Email', value: 'john@example.com' },
                ],
              },
            ],
          },
          page: {
            currentPage: 0,
            totalPage: 1,
            totalResults: 1,
          },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDonors,
      });

      const result = await neonClient.getDonors();

      expect(result.data).toHaveLength(1);
      expect(result.data[0].firstName).toBe('John');
      expect(result.data[0].lastName).toBe('Doe');
      expect(result.pagination?.totalResults).toBe(1);
    });

    it('should handle pagination', async () => {
      const mockDonors = {
        listAccountsResponse: {
          operationResult: 'SUCCESS',
          searchResults: {
            nameValuePairs: [],
          },
          page: {
            currentPage: 1,
            totalPage: 5,
            totalResults: 250,
          },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDonors,
      });

      const result = await neonClient.getDonors({ page: 2, pageSize: 50 });

      expect(result.pagination?.currentPage).toBe(2);
      expect(result.pagination?.totalPages).toBe(5);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('page.currentPage=1'), // 0-indexed, so page 2 = index 1
        expect.anything()
      );
    });

    it('should handle errors when fetching donors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      });

      const result = await neonClient.getDonors();

      expect(result.data).toEqual([]);
      expect(result.pagination?.totalResults).toBe(0);
    });

    it('should return empty array on operation failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          listAccountsResponse: {
            operationResult: 'FAILURE',
            responseMessage: 'Invalid query',
          },
        }),
      });

      const result = await neonClient.getDonors();

      expect(result.data).toEqual([]);
    });
  });

  describe('getDonations', () => {
    beforeEach(() => {
      // Mock login
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          loginResponse: {
            operationResult: 'SUCCESS',
            userSessionId: 'test-session-123',
          },
        }),
      });
    });

    it('should fetch donations successfully', async () => {
      const mockDonations = {
        listDonationsResponse: {
          operationResult: 'SUCCESS',
          searchResults: {
            nameValuePairs: [
              {
                nameValuePair: [
                  { name: 'Donation ID', value: '100' },
                  { name: 'Account ID', value: '1' },
                  { name: 'First Name', value: 'John' },
                  { name: 'Last Name', value: 'Doe' },
                  { name: 'Amount', value: '50.00' },
                  { name: 'Date', value: '2024-01-15' },
                ],
              },
            ],
          },
          page: {
            currentPage: 0,
            totalPage: 1,
            totalResults: 1,
          },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDonations,
      });

      const result = await neonClient.getDonations();

      expect(result.data).toHaveLength(1);
      expect(result.data[0].amount).toBe(50);
      expect(result.data[0].donorName).toContain('John');
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network failure'));

      const result = await neonClient.getDonations();

      expect(result.data).toEqual([]);
    });
  });

  describe('Rate limiting', () => {
    it('should handle 429 rate limit response', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            loginResponse: {
              operationResult: 'SUCCESS',
              userSessionId: 'test-session-123',
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: async () => 'Rate limit exceeded',
        });

      const result = await neonClient.getDonors();

      expect(result.data).toEqual([]);
    });
  });

  describe('Session management', () => {
    it('should reuse session if not expired', async () => {
      // First login
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          loginResponse: {
            operationResult: 'SUCCESS',
            userSessionId: 'test-session-123',
          },
        }),
      });

      // First request
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          listAccountsResponse: {
            operationResult: 'SUCCESS',
            searchResults: { nameValuePairs: [] },
            page: { currentPage: 0, totalPage: 1, totalResults: 0 },
          },
        }),
      });

      // Second request (should not login again)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          listAccountsResponse: {
            operationResult: 'SUCCESS',
            searchResults: { nameValuePairs: [] },
            page: { currentPage: 0, totalPage: 1, totalResults: 0 },
          },
        }),
      });

      await neonClient.getDonors();
      await neonClient.getDonors();

      // Should only login once
      const loginCalls = (global.fetch as jest.Mock).mock.calls.filter(call =>
        call[0].includes('/common/login')
      );
      expect(loginCalls).toHaveLength(1);
    });
  });

  describe('Error handling', () => {
    it('should handle malformed JSON responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const result = await neonClient.testConnection();

      expect(result.success).toBe(false);
    });

    it('should sanitize error messages', async () => {
      const longError = 'x'.repeat(1000);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => longError,
      });

      const result = await neonClient.testConnection();

      expect(result.success).toBe(false);
      expect(result.message.length).toBeLessThan(500);
    });
  });
});

/**
 * Aplos Accounting API Integration Service
 *
 * API Documentation: https://www.aplos.com/api
 *
 * Authentication: Public-Key Cryptography
 * - Set APLOS_CLIENT_ID and APLOS_PRIVATE_KEY in .env.local
 * - The API returns an encrypted token that must be decrypted with the private key
 *
 * Features:
 * - Transactions management
 * - Income statements
 * - Trial balance
 * - Funds management
 * - Chart of accounts
 */

import * as crypto from 'crypto';

// ============================================
// Types for Aplos API responses
// ============================================

export interface AplosTransaction {
  id: string;
  date: string;
  amount: number;
  memo: string;
  contact_id?: string;
  contact_name?: string;
  fund_id: string;
  fund_name: string;
  account_number: string;
  account_name: string;
  type: 'debit' | 'credit';
  category?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AplosFund {
  id: string;
  name: string;
  balance: number;
  is_default?: boolean;
  status?: 'active' | 'inactive';
}

export interface AplosAccount {
  account_number: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  category?: string;
  balance: number;
  is_active?: boolean;
}

export interface AplosIncomeStatementLine {
  account_number: string;
  account_name: string;
  category: string;
  current_amount: number;
  ytd_amount: number;
  budget_amount?: number;
  variance?: number;
}

export interface AplosTrialBalanceLine {
  account_number: string;
  account_name: string;
  type: string;
  debit: number;
  credit: number;
  net_balance: number;
}

export interface AplosYoYData {
  month: string;
  currentYear: number;
  previousYear: number;
  percentChange: number;
}

export interface AplosApiResponse<T> {
  data: T;
  pagination?: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
  meta?: {
    period_start?: string;
    period_end?: string;
  };
}

// ============================================
// Aplos API Client
// ============================================

class AplosClient {
  private baseUrl: string;
  private clientId: string;
  private privateKey: string;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    // Note: Aplos uses app.aplos.com for API, not www.aplos.com
    this.baseUrl = process.env.APLOS_API_BASE_URL || 'https://app.aplos.com/hermes/api/v1';
    this.clientId = process.env.APLOS_CLIENT_ID || '';
    // Handle multiline private key from env var
    this.privateKey = (process.env.APLOS_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  }

  /**
   * Decrypt the encrypted token returned by Aplos using RSA private key
   * Aplos encrypts the access token with your public key, so you must decrypt with private key
   */
  private decryptToken(encryptedToken: string): string {
    try {
      // Decode base64 encrypted token
      const encryptedBuffer = Buffer.from(encryptedToken, 'base64');

      // Try OAEP padding first (more secure, used by some APIs)
      // Then fall back to PKCS1 if needed
      const paddingOptions = [
        { padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
        { padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha1' },
        { padding: crypto.constants.RSA_PKCS1_PADDING }, // Legacy - may fail on Node.js 22+
      ];

      for (const options of paddingOptions) {
        try {
          const decrypted = crypto.privateDecrypt(
            {
              key: this.privateKey,
              ...options,
            },
            encryptedBuffer
          );
          return decrypted.toString('utf8');
        } catch {
          // Try next padding option
          continue;
        }
      }

      throw new Error('All decryption methods failed');
    } catch (error) {
      console.error('Token decryption failed:', error);
      throw new Error(`Failed to decrypt Aplos token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getAccessToken(): Promise<string> {
    // Check if we have a valid token (tokens expire after 30 minutes)
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }

    if (!this.clientId || !this.privateKey) {
      throw new Error('Aplos credentials not configured. Set APLOS_CLIENT_ID and APLOS_PRIVATE_KEY.');
    }

    // Request encrypted token from Aplos auth endpoint
    // The clientId is part of the URL path, not a query parameter
    const authUrl = `${this.baseUrl}/auth/${this.clientId}`;

    const response = await fetch(authUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Aplos Auth Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // The response contains an encrypted token that we must decrypt with our private key
    // Response format: { "data": { "token": "base64_encrypted_token", "expires": "..." } }
    const encryptedToken = data.data?.token || data.token;

    if (!encryptedToken) {
      throw new Error('No token in Aplos auth response');
    }

    // Decrypt the token using our private key
    this.accessToken = this.decryptToken(encryptedToken);

    // Set expiry to 25 minutes (tokens expire after 30 minutes)
    this.tokenExpiry = new Date(Date.now() + 25 * 60 * 1000);

    return this.accessToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAccessToken();
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        // Aplos uses "Bearer:" (with colon) per their documentation
        'Authorization': `Bearer: ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Aplos API Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  // ============================================
  // Funds
  // ============================================

  async getFunds(): Promise<AplosFund[]> {
    const response = await this.request<AplosApiResponse<AplosFund[]>>('/funds');
    return response.data;
  }

  async getFund(fundId: string): Promise<AplosFund> {
    const response = await this.request<AplosApiResponse<AplosFund>>(`/funds/${fundId}`);
    return response.data;
  }

  // ============================================
  // Accounts (Chart of Accounts)
  // ============================================

  async getAccounts(): Promise<AplosAccount[]> {
    const response = await this.request<AplosApiResponse<AplosAccount[]>>('/accounts');
    return response.data;
  }

  async getAccount(accountNumber: string): Promise<AplosAccount> {
    const response = await this.request<AplosApiResponse<AplosAccount>>(`/accounts/${accountNumber}`);
    return response.data;
  }

  // ============================================
  // Transactions
  // ============================================

  async getTransactions(params?: {
    fund_id?: string;
    account_number?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    per_page?: number;
  }): Promise<AplosApiResponse<AplosTransaction[]>> {
    const searchParams = new URLSearchParams();

    if (params?.fund_id) searchParams.append('fund_id', params.fund_id);
    if (params?.account_number) searchParams.append('account_number', params.account_number);
    if (params?.start_date) searchParams.append('start_date', params.start_date);
    if (params?.end_date) searchParams.append('end_date', params.end_date);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());

    const query = searchParams.toString();
    return this.request<AplosApiResponse<AplosTransaction[]>>(`/transactions${query ? `?${query}` : ''}`);
  }

  async getTransaction(transactionId: string): Promise<AplosTransaction> {
    const response = await this.request<AplosApiResponse<AplosTransaction>>(`/transactions/${transactionId}`);
    return response.data;
  }

  // ============================================
  // Reports
  // ============================================

  async getIncomeStatement(params?: {
    fund_id?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<AplosIncomeStatementLine[]> {
    const searchParams = new URLSearchParams();

    if (params?.fund_id) searchParams.append('fund_id', params.fund_id);
    if (params?.start_date) searchParams.append('start_date', params.start_date);
    if (params?.end_date) searchParams.append('end_date', params.end_date);

    const query = searchParams.toString();
    const response = await this.request<AplosApiResponse<AplosIncomeStatementLine[]>>(
      `/reports/income-statement${query ? `?${query}` : ''}`
    );
    return response.data;
  }

  async getTrialBalance(params?: {
    fund_id?: string;
    as_of_date?: string;
  }): Promise<AplosTrialBalanceLine[]> {
    const searchParams = new URLSearchParams();

    if (params?.fund_id) searchParams.append('fund_id', params.fund_id);
    if (params?.as_of_date) searchParams.append('as_of_date', params.as_of_date);

    const query = searchParams.toString();
    const response = await this.request<AplosApiResponse<AplosTrialBalanceLine[]>>(
      `/reports/trial-balance${query ? `?${query}` : ''}`
    );
    return response.data;
  }

  async getYearOverYearComparison(params?: {
    fund_id?: string;
    current_year?: number;
  }): Promise<AplosYoYData[]> {
    const searchParams = new URLSearchParams();
    const currentYear = params?.current_year || new Date().getFullYear();

    if (params?.fund_id) searchParams.append('fund_id', params.fund_id);
    searchParams.append('current_year', currentYear.toString());
    searchParams.append('previous_year', (currentYear - 1).toString());

    const query = searchParams.toString();
    const response = await this.request<AplosApiResponse<AplosYoYData[]>>(
      `/reports/year-over-year${query ? `?${query}` : ''}`
    );
    return response.data;
  }

  // ============================================
  // Dashboard Summary
  // ============================================

  async getDashboardSummary(): Promise<{
    totalIncome: number;
    totalExpenses: number;
    netIncome: number;
    cashBalance: number;
    funds: AplosFund[];
    recentTransactions: AplosTransaction[];
  }> {
    // Fetch multiple data points in parallel
    const [funds, transactionsResponse] = await Promise.all([
      this.getFunds(),
      this.getTransactions({ per_page: 10 }),
    ]);

    // Calculate totals from transactions
    const transactions = transactionsResponse.data;
    const totalIncome = transactions
      .filter(t => t.type === 'credit' && ['revenue', 'income'].some(cat =>
        t.category?.toLowerCase().includes(cat) || t.account_name.toLowerCase().includes(cat)
      ))
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
      .filter(t => t.type === 'debit' && ['expense'].some(cat =>
        t.category?.toLowerCase().includes(cat) || t.account_name.toLowerCase().includes(cat)
      ))
      .reduce((sum, t) => sum + t.amount, 0);

    const cashBalance = funds.reduce((sum, f) => sum + f.balance, 0);

    return {
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses,
      cashBalance,
      funds,
      recentTransactions: transactions,
    };
  }
}

// Export singleton instance
export const aplosClient = new AplosClient();

// ============================================
// Helper Functions
// ============================================

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getDateRange(period: 'month' | 'quarter' | 'year' | 'ytd'): {
  start_date: string;
  end_date: string;
} {
  const now = new Date();
  const end_date = now.toISOString().split('T')[0];
  let start_date: string;

  switch (period) {
    case 'month':
      start_date = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      break;
    case 'quarter':
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      start_date = new Date(now.getFullYear(), quarterStart, 1).toISOString().split('T')[0];
      break;
    case 'year':
      start_date = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().split('T')[0];
      break;
    case 'ytd':
    default:
      start_date = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      break;
  }

  return { start_date, end_date };
}

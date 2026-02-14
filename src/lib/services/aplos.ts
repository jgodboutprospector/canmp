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

import { fetchWithTimeout, sanitizeErrorMessage } from '../api-utils';

// ============================================
// Types for Aplos API responses
// ============================================

export interface AplosTransaction {
  id: string | number;
  date: string;
  amount: number;
  memo: string;
  contact?: {
    id: number;
    companyname?: string;
    firstname?: string;
    lastname?: string;
    type: string;
  };
  contact_id?: string;
  contact_name?: string;
  fund_id?: string;
  fund_name?: string;
  account_number?: string;
  account_name?: string;
  type?: 'debit' | 'credit';
  category?: string;
  is_reconciled?: boolean;
  created?: string;
  modified?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AplosFund {
  id: string | number;
  name: string;
  balance?: number;  // Balance may not be provided directly by API
  balance_account_name?: string;
  balance_account_number?: number;
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
  private sidecarUrl: string;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    // Note: Aplos uses app.aplos.com for API, not www.aplos.com
    this.baseUrl = process.env.APLOS_API_BASE_URL || 'https://app.aplos.com/hermes/api/v1';
    this.clientId = process.env.APLOS_CLIENT_ID || '';
    // Sidecar handles RSA decryption so the main app doesn't need CVE-2023-46809 revert
    this.sidecarUrl = process.env.APLOS_SIDECAR_URL || 'http://aplos-sidecar:3001';
  }

  private async getAccessToken(): Promise<string> {
    // Check if we have a valid token (tokens expire after 30 minutes)
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }

    if (!this.clientId) {
      throw new Error('Aplos credentials not configured. Set APLOS_CLIENT_ID and APLOS_PRIVATE_KEY.');
    }

    // Delegate token exchange + RSA decryption to the sidecar service
    // The sidecar runs with --security-revert=CVE-2023-46809 so we don't have to
    const response = await fetchWithTimeout(`${this.sidecarUrl}/auth-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, 30000);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Aplos Auth Error: ${response.status} - ${sanitizeErrorMessage(errorText)}`);
    }

    const data = await response.json();

    if (!data.token) {
      throw new Error('No token returned from Aplos sidecar');
    }

    const token: string = data.token;
    this.accessToken = token;

    // Set expiry to 25 minutes (tokens expire after 30 minutes)
    this.tokenExpiry = new Date(Date.now() + 25 * 60 * 1000);

    return token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAccessToken();
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetchWithTimeout(url, {
      ...options,
      headers: {
        // Aplos uses "Bearer:" (with colon) per their documentation
        'Authorization': `Bearer: ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    }, 30000);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Aplos API Error: ${response.status} - ${sanitizeErrorMessage(errorText)}`);
    }

    return response.json();
  }

  // ============================================
  // Funds
  // ============================================

  async getFunds(): Promise<AplosFund[]> {
    // Aplos returns { data: { funds: [...] } }
    const response = await this.request<{ data: { funds: AplosFund[] } }>('/funds');
    return response.data?.funds || [];
  }

  async getFund(fundId: string): Promise<AplosFund | null> {
    // Aplos returns { data: { fund: {...} } }
    const response = await this.request<{ data: { fund: AplosFund } }>(`/funds/${fundId}`);
    return response.data?.fund || null;
  }

  // ============================================
  // Accounts (Chart of Accounts)
  // ============================================

  async getAccounts(): Promise<AplosAccount[]> {
    // Aplos returns { data: { accounts: [...] } }
    const response = await this.request<{ data: { accounts: AplosAccount[] } }>('/accounts');
    return response.data?.accounts || [];
  }

  async getAccount(accountNumber: string): Promise<AplosAccount | null> {
    // Aplos returns { data: { account: {...} } }
    const response = await this.request<{ data: { account: AplosAccount } }>(`/accounts/${accountNumber}`);
    return response.data?.account || null;
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
  }): Promise<AplosTransaction[]> {
    const searchParams = new URLSearchParams();

    // Aplos API uses f_ prefix for filter parameters
    if (params?.fund_id) searchParams.append('f_fund', params.fund_id);
    if (params?.account_number) searchParams.append('f_accountnumber', params.account_number);
    if (params?.start_date) searchParams.append('f_rangestart', params.start_date);
    if (params?.end_date) searchParams.append('f_rangeend', params.end_date);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());

    const query = searchParams.toString();
    // Aplos returns { data: { transactions: [...] } }
    const response = await this.request<{ data: { transactions: AplosTransaction[] } }>(`/transactions${query ? `?${query}` : ''}`);
    return response.data?.transactions || [];
  }

  async getTransaction(transactionId: string): Promise<AplosTransaction | null> {
    // Aplos returns { data: { transaction: {...} } }
    const response = await this.request<{ data: { transaction: AplosTransaction } }>(`/transactions/${transactionId}`);
    return response.data?.transaction || null;
  }

  // ============================================
  // Reports (computed from transactions and accounts)
  // Note: Aplos API does not have report endpoints, so we compute these from raw data
  // ============================================

  async getIncomeStatement(params?: {
    fund_id?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<AplosIncomeStatementLine[]> {
    // Fetch transactions and accounts to compute income statement
    const [transactions, accounts] = await Promise.all([
      this.getTransactions({
        fund_id: params?.fund_id,
        start_date: params?.start_date || getDateRange('ytd').start_date,
        end_date: params?.end_date || getDateRange('ytd').end_date,
      }),
      this.getAccounts(),
    ]);

    // Group transactions by account and categorize as revenue or expense
    const accountTotals: Record<string, { current: number; ytd: number; type: string }> = {};

    for (const txn of transactions) {
      const accountNum = txn.account_number || 'unknown';
      const account = accounts.find(a => a.account_number === accountNum);
      const accountType = account?.type || 'expense';

      if (!accountTotals[accountNum]) {
        accountTotals[accountNum] = {
          current: 0,
          ytd: 0,
          type: accountType,
        };
      }

      // For income statement, we care about revenue and expense accounts
      if (accountType === 'revenue' || accountType === 'expense') {
        accountTotals[accountNum].current += txn.amount;
        accountTotals[accountNum].ytd += txn.amount;
      }
    }

    // Convert to income statement lines
    const lines: AplosIncomeStatementLine[] = [];

    for (const [accountNum, data] of Object.entries(accountTotals)) {
      const account = accounts.find(a => a.account_number === accountNum);
      if (data.type === 'revenue' || data.type === 'expense') {
        lines.push({
          account_number: accountNum,
          account_name: account?.name || `Account ${accountNum}`,
          category: data.type === 'revenue' ? 'Revenue' : 'Expenses',
          current_amount: Math.abs(data.current),
          ytd_amount: Math.abs(data.ytd),
        });
      }
    }

    return lines.sort((a, b) => {
      // Sort by category (Revenue first), then by amount descending
      if (a.category !== b.category) {
        return a.category === 'Revenue' ? -1 : 1;
      }
      return b.ytd_amount - a.ytd_amount;
    });
  }

  async getTrialBalance(params?: {
    fund_id?: string;
    as_of_date?: string;
  }): Promise<AplosTrialBalanceLine[]> {
    // Fetch accounts to get balances
    const accounts = await this.getAccounts();

    // Convert accounts to trial balance lines
    const lines: AplosTrialBalanceLine[] = accounts.map(account => {
      const balance = account.balance || 0;
      const isDebitAccount = ['asset', 'expense'].includes(account.type);

      return {
        account_number: account.account_number,
        account_name: account.name,
        type: account.type.charAt(0).toUpperCase() + account.type.slice(1),
        debit: isDebitAccount && balance > 0 ? balance : 0,
        credit: !isDebitAccount && balance > 0 ? balance : (isDebitAccount && balance < 0 ? Math.abs(balance) : 0),
        net_balance: balance,
      };
    });

    return lines.filter(l => l.debit > 0 || l.credit > 0 || l.net_balance !== 0);
  }

  async getYearOverYearComparison(params?: {
    fund_id?: string;
    current_year?: number;
  }): Promise<AplosYoYData[]> {
    const currentYear = params?.current_year || new Date().getFullYear();
    const previousYear = currentYear - 1;

    // Fetch transactions for both years
    const [currentYearTxns, previousYearTxns] = await Promise.all([
      this.getTransactions({
        fund_id: params?.fund_id,
        start_date: `${currentYear}-01-01`,
        end_date: `${currentYear}-12-31`,
      }),
      this.getTransactions({
        fund_id: params?.fund_id,
        start_date: `${previousYear}-01-01`,
        end_date: `${previousYear}-12-31`,
      }),
    ]);

    // Group by month
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData: AplosYoYData[] = monthNames.map((month, index) => ({
      month,
      currentYear: 0,
      previousYear: 0,
      percentChange: 0,
    }));

    // Sum transactions by month for current year
    for (const txn of currentYearTxns) {
      const month = new Date(txn.date).getMonth();
      if (txn.amount > 0) { // Only count income/positive amounts
        monthlyData[month].currentYear += txn.amount;
      }
    }

    // Sum transactions by month for previous year
    for (const txn of previousYearTxns) {
      const month = new Date(txn.date).getMonth();
      if (txn.amount > 0) {
        monthlyData[month].previousYear += txn.amount;
      }
    }

    // Calculate percent change
    for (const data of monthlyData) {
      if (data.previousYear > 0) {
        data.percentChange = ((data.currentYear - data.previousYear) / data.previousYear) * 100;
      } else if (data.currentYear > 0) {
        data.percentChange = 100;
      }
    }

    return monthlyData;
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
    const [funds, transactions] = await Promise.all([
      this.getFunds(),
      this.getTransactions({ per_page: 10 }),
    ]);

    // Calculate totals from transactions
    // Note: Real Aplos transactions may not have type/category/account_name fields
    // For now, sum all transaction amounts
    const totalIncome = transactions
      .filter(t => t.type === 'credit' || (!t.type && t.amount > 0))
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
      .filter(t => t.type === 'debit' || (!t.type && t.amount > 0))
      .reduce((sum, t) => sum + t.amount, 0);

    const cashBalance = funds.reduce((sum, f) => sum + (f.balance || 0), 0);

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

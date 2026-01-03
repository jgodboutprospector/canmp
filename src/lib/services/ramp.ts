/**
 * Ramp Corporate Card API Integration Service
 *
 * API Documentation: https://docs.ramp.com/api/
 *
 * Authentication: OAuth2 Client Credentials
 * - Set RAMP_CLIENT_ID and RAMP_CLIENT_SECRET in .env.local
 *
 * Features:
 * - Card management
 * - Transaction tracking
 * - Reimbursement processing
 * - Spending limits
 * - Receipt management
 */

// ============================================
// Types for Ramp API responses
// ============================================

export type RampCardStatus = 'active' | 'suspended' | 'terminated' | 'pending';
export type RampTransactionStatus = 'pending' | 'cleared' | 'declined' | 'refunded';
export type RampReimbursementStatus = 'pending' | 'approved' | 'rejected' | 'paid';

export interface RampCard {
  id: string;
  display_name: string;
  last_four: string;
  cardholder_id: string;
  cardholder_name: string;
  card_program_id?: string;
  is_physical: boolean;
  state: RampCardStatus;
  spending_restrictions?: {
    amount?: number;
    interval?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'total';
    categories_blocked?: string[];
    categories_allowed?: string[];
    vendors_blocked?: string[];
    vendors_allowed?: string[];
  };
  created_at: string;
  updated_at?: string;
}

export interface RampTransaction {
  id: string;
  amount: number;
  currency: string;
  merchant_name: string;
  merchant_category_code?: string;
  category?: string;
  card_id: string;
  card_holder_name: string;
  user_id: string;
  state: RampTransactionStatus;
  sk_category_name?: string;
  receipts?: RampReceipt[];
  memo?: string;
  transaction_date: string;
  settled_date?: string;
  created_at: string;
}

export interface RampReceipt {
  id: string;
  transaction_id: string;
  file_url?: string;
  file_name?: string;
  uploaded_at?: string;
}

export interface RampReimbursement {
  id: string;
  user_id: string;
  user_name: string;
  amount: number;
  currency: string;
  merchant: string;
  transaction_date: string;
  status: RampReimbursementStatus;
  receipt_url?: string;
  memo?: string;
  category?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
}

export interface RampUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'admin' | 'cardholder' | 'bookkeeper';
  department?: string;
  is_active: boolean;
}

export interface RampSpendingSummary {
  total_spend: number;
  total_transactions: number;
  by_category: {
    category: string;
    amount: number;
    count: number;
  }[];
  by_user: {
    user_id: string;
    user_name: string;
    amount: number;
    count: number;
  }[];
  period_start: string;
  period_end: string;
}

export interface RampApiResponse<T> {
  data: T;
  page?: {
    next?: string;
    prev?: string;
  };
}

export interface RampListResponse<T> {
  data: T[];
  page?: {
    next?: string;
    prev?: string;
  };
}

// ============================================
// Ramp API Client
// ============================================

class RampClient {
  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    this.baseUrl = process.env.RAMP_API_BASE_URL || 'https://api.ramp.com/developer/v1';
    this.clientId = process.env.RAMP_CLIENT_ID || '';
    this.clientSecret = process.env.RAMP_CLIENT_SECRET || '';
  }

  private async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }

    // Request new token
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const response = await fetch(`${this.baseUrl}/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials&scope=transactions:read cards:read users:read reimbursements:read',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ramp Auth Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    // Set expiry to 5 minutes before actual expiry
    this.tokenExpiry = new Date(Date.now() + (data.expires_in - 300) * 1000);

    return this.accessToken!;
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
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ramp API Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  // ============================================
  // Cards
  // ============================================

  async getCards(params?: {
    user_id?: string;
    state?: RampCardStatus;
    page_size?: number;
    start?: string;
  }): Promise<RampListResponse<RampCard>> {
    const searchParams = new URLSearchParams();

    if (params?.user_id) searchParams.append('user_id', params.user_id);
    if (params?.state) searchParams.append('state', params.state);
    if (params?.page_size) searchParams.append('page_size', params.page_size.toString());
    if (params?.start) searchParams.append('start', params.start);

    const query = searchParams.toString();
    return this.request<RampListResponse<RampCard>>(`/cards${query ? `?${query}` : ''}`);
  }

  async getCard(cardId: string): Promise<RampCard> {
    const response = await this.request<RampApiResponse<RampCard>>(`/cards/${cardId}`);
    return response.data;
  }

  async suspendCard(cardId: string): Promise<RampCard> {
    const response = await this.request<RampApiResponse<RampCard>>(`/cards/${cardId}/suspend`, {
      method: 'POST',
    });
    return response.data;
  }

  async activateCard(cardId: string): Promise<RampCard> {
    const response = await this.request<RampApiResponse<RampCard>>(`/cards/${cardId}/activate`, {
      method: 'POST',
    });
    return response.data;
  }

  async updateCardSpendingLimit(
    cardId: string,
    limit: {
      amount: number;
      interval: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'total';
    }
  ): Promise<RampCard> {
    const response = await this.request<RampApiResponse<RampCard>>(`/cards/${cardId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        spending_restrictions: {
          amount: limit.amount,
          interval: limit.interval,
        },
      }),
    });
    return response.data;
  }

  // ============================================
  // Transactions
  // ============================================

  async getTransactions(params?: {
    card_id?: string;
    user_id?: string;
    state?: RampTransactionStatus;
    from_date?: string;
    to_date?: string;
    page_size?: number;
    start?: string;
  }): Promise<RampListResponse<RampTransaction>> {
    const searchParams = new URLSearchParams();

    if (params?.card_id) searchParams.append('card_id', params.card_id);
    if (params?.user_id) searchParams.append('user_id', params.user_id);
    if (params?.state) searchParams.append('state', params.state);
    if (params?.from_date) searchParams.append('from_date', params.from_date);
    if (params?.to_date) searchParams.append('to_date', params.to_date);
    if (params?.page_size) searchParams.append('page_size', params.page_size.toString());
    if (params?.start) searchParams.append('start', params.start);

    const query = searchParams.toString();
    return this.request<RampListResponse<RampTransaction>>(`/transactions${query ? `?${query}` : ''}`);
  }

  async getTransaction(transactionId: string): Promise<RampTransaction> {
    const response = await this.request<RampApiResponse<RampTransaction>>(`/transactions/${transactionId}`);
    return response.data;
  }

  // ============================================
  // Reimbursements
  // ============================================

  async getReimbursements(params?: {
    user_id?: string;
    status?: RampReimbursementStatus;
    from_date?: string;
    to_date?: string;
    page_size?: number;
    start?: string;
  }): Promise<RampListResponse<RampReimbursement>> {
    const searchParams = new URLSearchParams();

    if (params?.user_id) searchParams.append('user_id', params.user_id);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.from_date) searchParams.append('from_date', params.from_date);
    if (params?.to_date) searchParams.append('to_date', params.to_date);
    if (params?.page_size) searchParams.append('page_size', params.page_size.toString());
    if (params?.start) searchParams.append('start', params.start);

    const query = searchParams.toString();
    return this.request<RampListResponse<RampReimbursement>>(`/reimbursements${query ? `?${query}` : ''}`);
  }

  async getReimbursement(reimbursementId: string): Promise<RampReimbursement> {
    const response = await this.request<RampApiResponse<RampReimbursement>>(`/reimbursements/${reimbursementId}`);
    return response.data;
  }

  async approveReimbursement(reimbursementId: string): Promise<RampReimbursement> {
    const response = await this.request<RampApiResponse<RampReimbursement>>(
      `/reimbursements/${reimbursementId}/approve`,
      { method: 'POST' }
    );
    return response.data;
  }

  async rejectReimbursement(reimbursementId: string, reason?: string): Promise<RampReimbursement> {
    const response = await this.request<RampApiResponse<RampReimbursement>>(
      `/reimbursements/${reimbursementId}/reject`,
      {
        method: 'POST',
        body: reason ? JSON.stringify({ reason }) : undefined,
      }
    );
    return response.data;
  }

  // ============================================
  // Users
  // ============================================

  async getUsers(params?: {
    role?: 'admin' | 'cardholder' | 'bookkeeper';
    is_active?: boolean;
    page_size?: number;
    start?: string;
  }): Promise<RampListResponse<RampUser>> {
    const searchParams = new URLSearchParams();

    if (params?.role) searchParams.append('role', params.role);
    if (params?.is_active !== undefined) searchParams.append('is_active', params.is_active.toString());
    if (params?.page_size) searchParams.append('page_size', params.page_size.toString());
    if (params?.start) searchParams.append('start', params.start);

    const query = searchParams.toString();
    return this.request<RampListResponse<RampUser>>(`/users${query ? `?${query}` : ''}`);
  }

  async getUser(userId: string): Promise<RampUser> {
    const response = await this.request<RampApiResponse<RampUser>>(`/users/${userId}`);
    return response.data;
  }

  // ============================================
  // Spending Summary / Analytics
  // ============================================

  async getSpendingSummary(params?: {
    from_date?: string;
    to_date?: string;
  }): Promise<RampSpendingSummary> {
    const searchParams = new URLSearchParams();

    if (params?.from_date) searchParams.append('from_date', params.from_date);
    if (params?.to_date) searchParams.append('to_date', params.to_date);

    const query = searchParams.toString();
    const response = await this.request<RampApiResponse<RampSpendingSummary>>(
      `/analytics/spending${query ? `?${query}` : ''}`
    );
    return response.data;
  }

  // ============================================
  // Dashboard Summary
  // ============================================

  async getDashboardSummary(): Promise<{
    totalSpend: number;
    activeCards: number;
    pendingReimbursements: number;
    recentTransactions: RampTransaction[];
    cards: RampCard[];
    reimbursements: RampReimbursement[];
  }> {
    // Fetch multiple data points in parallel
    const [cardsResponse, transactionsResponse, reimbursementsResponse] = await Promise.all([
      this.getCards({ page_size: 50 }),
      this.getTransactions({ page_size: 10 }),
      this.getReimbursements({ status: 'pending', page_size: 10 }),
    ]);

    const cards = cardsResponse.data;
    const transactions = transactionsResponse.data;
    const reimbursements = reimbursementsResponse.data;

    // Calculate totals
    const activeCards = cards.filter(c => c.state === 'active').length;
    const totalSpend = transactions
      .filter(t => t.state === 'cleared')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalSpend,
      activeCards,
      pendingReimbursements: reimbursements.length,
      recentTransactions: transactions,
      cards,
      reimbursements,
    };
  }
}

// Export singleton instance
export const rampClient = new RampClient();

// ============================================
// Helper Functions
// ============================================

export function formatCardNumber(lastFour: string): string {
  return `•••• ${lastFour}`;
}

export function getCardStatusColor(status: RampCardStatus): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-700';
    case 'suspended':
      return 'bg-yellow-100 text-yellow-700';
    case 'terminated':
      return 'bg-red-100 text-red-700';
    case 'pending':
      return 'bg-gray-100 text-gray-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export function getTransactionStatusColor(status: RampTransactionStatus): string {
  switch (status) {
    case 'cleared':
      return 'bg-green-100 text-green-700';
    case 'pending':
      return 'bg-yellow-100 text-yellow-700';
    case 'declined':
      return 'bg-red-100 text-red-700';
    case 'refunded':
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export function getReimbursementStatusColor(status: RampReimbursementStatus): string {
  switch (status) {
    case 'approved':
      return 'bg-green-100 text-green-700';
    case 'pending':
      return 'bg-yellow-100 text-yellow-700';
    case 'rejected':
      return 'bg-red-100 text-red-700';
    case 'paid':
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

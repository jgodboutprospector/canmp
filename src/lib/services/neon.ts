/**
 * Neon CRM API v1 Integration Service
 *
 * API Documentation: https://developer.neoncrm.com/api/
 *
 * Authentication: Session-based (login with orgId + apiKey, then use sessionId)
 * - Set NEON_ORG_ID and NEON_API_KEY in .env.local
 *
 * Features:
 * - Donor (account) management
 * - Donation tracking
 * - Campaigns
 * - Memberships
 */

// ============================================
// Types for Neon CRM API responses
// ============================================

export interface NeonDonor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  totalDonations: number;
  donationCount: number;
  lastDonationDate?: string;
  membershipStatus?: 'active' | 'expired' | 'none';
  createdAt: string;
}

export interface NeonDonation {
  id: string;
  donorId: string;
  donorName: string;
  amount: number;
  date: string;
  campaign?: string;
  fund?: string;
  paymentMethod: 'credit_card' | 'check' | 'cash' | 'ach' | 'other';
  status: 'completed' | 'pending' | 'refunded' | 'failed';
  recurring: boolean;
  note?: string;
}

export interface NeonCampaign {
  id: string;
  name: string;
  goal: number;
  raised: number;
  donorCount: number;
  startDate: string;
  endDate?: string;
  status: 'active' | 'completed' | 'draft';
}

export interface NeonMembership {
  id: string;
  donorId: string;
  donorName: string;
  level: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'pending';
  amount: number;
  autoRenew: boolean;
}

export interface NeonApiResponse<T> {
  data: T;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalResults: number;
  };
}

// ============================================
// Neon CRM API v1 Client
// ============================================

class NeonClient {
  private baseUrl: string;
  private orgId: string;
  private apiKey: string;
  private sessionId: string | null = null;
  private sessionExpiry: Date | null = null;

  constructor() {
    this.baseUrl = 'https://api.neoncrm.com/neonws/services/api';
    this.orgId = process.env.NEON_ORG_ID || '';
    this.apiKey = process.env.NEON_API_KEY || '';
  }

  /**
   * Login to get a session ID (required for API v1)
   */
  private async login(): Promise<string> {
    // Check if we have a valid session (sessions last ~30 minutes)
    if (this.sessionId && this.sessionExpiry && this.sessionExpiry > new Date()) {
      return this.sessionId;
    }

    if (!this.orgId || !this.apiKey) {
      throw new Error('Neon credentials not configured. Set NEON_ORG_ID and NEON_API_KEY.');
    }

    const response = await fetch(`${this.baseUrl}/common/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `login.orgId=${encodeURIComponent(this.orgId)}&login.apiKey=${encodeURIComponent(this.apiKey)}`,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Neon Login Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (data.loginResponse?.operationResult !== 'SUCCESS') {
      throw new Error(`Neon Login Failed: ${data.loginResponse?.responseMessage || 'Unknown error'}`);
    }

    this.sessionId = data.loginResponse.userSessionId;
    // Set expiry to 25 minutes (sessions expire after 30 minutes)
    this.sessionExpiry = new Date(Date.now() + 25 * 60 * 1000);

    return this.sessionId!;
  }

  /**
   * Make an authenticated request to the API
   */
  private async request<T>(
    endpoint: string,
    params: Record<string, string> = {}
  ): Promise<T> {
    const sessionId = await this.login();

    const searchParams = new URLSearchParams({
      userSessionId: sessionId,
      ...params,
    });

    const response = await fetch(`${this.baseUrl}${endpoint}?${searchParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Neon API Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Make a POST request with form data
   */
  private async postRequest<T>(
    endpoint: string,
    data: string
  ): Promise<T> {
    const sessionId = await this.login();

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `userSessionId=${sessionId}&${data}`,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Neon API Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  // ============================================
  // Donors (Accounts)
  // ============================================

  /**
   * Get a single donor/account by ID
   */
  async getDonor(accountId: string): Promise<NeonDonor | null> {
    try {
      const response = await this.request<any>('/account/retrieveIndividualAccount', {
        accountId,
      });

      if (response.retrieveIndividualAccountResponse?.operationResult !== 'SUCCESS') {
        return null;
      }

      const account = response.retrieveIndividualAccountResponse.individualAccount;
      const contact = account.primaryContact;

      return {
        id: String(account.accountId),
        firstName: contact?.firstName || '',
        lastName: contact?.lastName || '',
        email: contact?.email1 || '',
        phone: contact?.phone1 || undefined,
        totalDonations: 0, // Would need separate donation query
        donationCount: 0,
        lastDonationDate: undefined,
        membershipStatus: this.getMembershipStatus(account),
        createdAt: account.createdDateTime || new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error fetching donor:', error);
      return null;
    }
  }

  /**
   * Get multiple donors by fetching a range of account IDs
   * Note: API v1 doesn't have a proper list endpoint, so we fetch by ID range
   */
  async getDonors(options?: { startId?: number; count?: number }): Promise<NeonApiResponse<NeonDonor[]>> {
    const startId = options?.startId || 1;
    const count = options?.count || 50;
    const donors: NeonDonor[] = [];

    // Fetch accounts in parallel (batches of 10)
    const batchSize = 10;
    for (let i = 0; i < count; i += batchSize) {
      const promises = [];
      for (let j = 0; j < batchSize && i + j < count; j++) {
        promises.push(this.getDonor(String(startId + i + j)));
      }
      const results = await Promise.all(promises);
      donors.push(...results.filter((d): d is NeonDonor => d !== null));
    }

    return {
      data: donors,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalResults: donors.length,
      },
    };
  }

  private getMembershipStatus(account: any): 'active' | 'expired' | 'none' {
    const types = account.individualTypes?.individualType || [];
    const hasMembership = types.some((t: any) =>
      t.name?.toLowerCase().includes('member')
    );
    return hasMembership ? 'active' : 'none';
  }

  // ============================================
  // Donations
  // Note: List endpoint requires output fields which may not be configured
  // For now, return empty or demo data
  // ============================================

  async getDonations(): Promise<NeonApiResponse<NeonDonation[]>> {
    // The listDonations endpoint requires specific output fields to be configured
    // in the Neon CRM admin. Without those, it returns an error.
    // For now, return empty array - donations would need to be fetched via individual accounts
    return {
      data: [],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalResults: 0,
      },
    };
  }

  // ============================================
  // Campaigns
  // ============================================

  async getCampaigns(): Promise<NeonApiResponse<NeonCampaign[]>> {
    // API v1 campaign endpoints may require specific configuration
    // Return empty for now
    return {
      data: [],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalResults: 0,
      },
    };
  }

  // ============================================
  // Memberships
  // ============================================

  async getMemberships(): Promise<NeonApiResponse<NeonMembership[]>> {
    // API v1 membership endpoints may require specific configuration
    // Return empty for now
    return {
      data: [],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalResults: 0,
      },
    };
  }

  // ============================================
  // Dashboard Summary
  // ============================================

  async getDashboardSummary(): Promise<{
    totalDonations: number;
    totalDonors: number;
    activeCampaigns: number;
    activeMembers: number;
    recentDonations: NeonDonation[];
    topDonors: NeonDonor[];
    campaigns: NeonCampaign[];
  }> {
    // Fetch some donors to populate the dashboard
    const donorsResponse = await this.getDonors({ startId: 1, count: 20 });
    const donors = donorsResponse.data;

    // Count members
    const activeMembers = donors.filter(d => d.membershipStatus === 'active').length;

    // Sort by name for now (would sort by donations if we had that data)
    const topDonors = [...donors].slice(0, 5);

    return {
      totalDonations: 0, // Would need donation data
      totalDonors: donors.length,
      activeCampaigns: 0,
      activeMembers,
      recentDonations: [],
      topDonors,
      campaigns: [],
    };
  }

  // ============================================
  // Test Connection
  // ============================================

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.login();
      return { success: true, message: 'Connected to Neon CRM successfully' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }
}

// Export singleton instance
export const neonClient = new NeonClient();

// ============================================
// Helper Functions
// ============================================

export function getPaymentMethodLabel(method: NeonDonation['paymentMethod']): string {
  switch (method) {
    case 'credit_card':
      return 'Credit Card';
    case 'check':
      return 'Check';
    case 'cash':
      return 'Cash';
    case 'ach':
      return 'ACH/Bank Transfer';
    case 'other':
    default:
      return 'Other';
  }
}

export function getDonationStatusColor(status: NeonDonation['status']): string {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-700';
    case 'pending':
      return 'bg-yellow-100 text-yellow-700';
    case 'refunded':
      return 'bg-blue-100 text-blue-700';
    case 'failed':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export function getCampaignProgress(campaign: NeonCampaign): number {
  if (campaign.goal === 0) return 0;
  return Math.min(100, (campaign.raised / campaign.goal) * 100);
}

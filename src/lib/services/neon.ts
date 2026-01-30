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

import { fetchWithTimeout, sanitizeErrorMessage } from '../api-utils';

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
  private sessionId: string | null = null;
  private sessionExpiry: Date | null = null;

  constructor() {
    this.baseUrl = 'https://api.neoncrm.com/neonws/services/api';
  }

  /** Get credentials lazily to support test mocking */
  private get orgId(): string {
    return process.env.NEON_ORG_ID || '';
  }

  private get apiKey(): string {
    return process.env.NEON_API_KEY || '';
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

    const response = await fetchWithTimeout(`${this.baseUrl}/common/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `login.orgId=${encodeURIComponent(this.orgId)}&login.apiKey=${encodeURIComponent(this.apiKey)}`,
    }, 30000);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Neon Login Error: ${response.status} - ${sanitizeErrorMessage(errorText)}`);
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

    const response = await fetchWithTimeout(`${this.baseUrl}${endpoint}?${searchParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }, 30000);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Neon API Error: ${response.status} - ${sanitizeErrorMessage(errorText)}`);
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

    const response = await fetchWithTimeout(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `userSessionId=${sessionId}&${data}`,
    }, 30000);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Neon API Error: ${response.status} - ${sanitizeErrorMessage(errorText)}`);
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
   * List accounts using the listAccounts endpoint
   * Note: We fetch without specifying output fields to get default fields,
   * as specific field names vary by Neon installation.
   */
  async getDonors(options?: { page?: number; pageSize?: number }): Promise<NeonApiResponse<NeonDonor[]>> {
    const sessionId = await this.login();
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 50;

    // Build simple request without output fields - Neon will return default fields
    const params = new URLSearchParams();
    params.append('userSessionId', sessionId);
    params.append('responseType', 'json');
    params.append('page.currentPage', String(page - 1)); // Neon uses 0-based pages
    params.append('page.pageSize', String(pageSize));

    try {
      const response = await fetchWithTimeout(`${this.baseUrl}/account/listAccounts?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }, 30000);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Neon listAccounts error:', sanitizeErrorMessage(errorText));
        throw new Error(`Neon API Error: ${response.status}`);
      }

      const data = await response.json();

      // Log the response for debugging (first 200 chars to see field structure)
      if (process.env.NODE_ENV === 'development') {
        console.log('Neon listAccounts response preview:', JSON.stringify(data).substring(0, 200));
      }

      if (data.listAccountsResponse?.operationResult !== 'SUCCESS') {
        console.error('Neon listAccounts failed:', JSON.stringify(data.listAccountsResponse));
        return { data: [], pagination: { currentPage: 1, totalPages: 1, totalResults: 0 } };
      }

      const accounts = data.listAccountsResponse?.searchResults?.nameValuePairs || [];
      const pageInfo = data.listAccountsResponse?.page || {};

      // Transform the accounts to NeonDonor format
      // Field names returned depend on Neon installation configuration
      const donors: NeonDonor[] = accounts.map((account: any) => {
        const fields = account.nameValuePair || [];
        // Helper to get field value by partial name match (case-insensitive)
        const getValue = (patterns: string[]) => {
          for (const pattern of patterns) {
            const found = fields.find((f: any) =>
              f.name?.toLowerCase().includes(pattern.toLowerCase())
            );
            if (found?.value) return found.value;
          }
          return '';
        };

        return {
          id: getValue(['Account ID', 'accountId', 'ID']),
          firstName: getValue(['First Name', 'firstName', 'First']),
          lastName: getValue(['Last Name', 'lastName', 'Last']),
          email: getValue(['Email', 'email1', 'Email 1']),
          phone: getValue(['Phone', 'phone1', 'Phone 1']) || undefined,
          totalDonations: 0,
          donationCount: 0,
          lastDonationDate: undefined,
          membershipStatus: 'none' as const,
          createdAt: getValue(['Created', 'createDate', 'Account Created']) || new Date().toISOString(),
        };
      });

      return {
        data: donors,
        pagination: {
          currentPage: (pageInfo.currentPage || 0) + 1,
          totalPages: pageInfo.totalPage || 1,
          totalResults: pageInfo.totalResults || donors.length,
        },
      };
    } catch (error) {
      console.error('Error listing accounts:', error);
      return { data: [], pagination: { currentPage: 1, totalPages: 1, totalResults: 0 } };
    }
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
  // ============================================

  async getDonations(options?: { page?: number; pageSize?: number }): Promise<NeonApiResponse<NeonDonation[]>> {
    const sessionId = await this.login();
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 50;

    // Build simple request without output fields - Neon will return default fields
    const params = new URLSearchParams();
    params.append('userSessionId', sessionId);
    params.append('responseType', 'json');
    params.append('page.currentPage', String(page - 1));
    params.append('page.pageSize', String(pageSize));

    try {
      const response = await fetchWithTimeout(`${this.baseUrl}/donation/listDonations?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }, 30000);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Neon listDonations error:', sanitizeErrorMessage(errorText));
        return { data: [], pagination: { currentPage: 1, totalPages: 1, totalResults: 0 } };
      }

      const data = await response.json();

      // Log the response for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('Neon listDonations response preview:', JSON.stringify(data).substring(0, 200));
      }

      if (data.listDonationsResponse?.operationResult !== 'SUCCESS') {
        console.error('Neon listDonations failed:', JSON.stringify(data.listDonationsResponse));
        return { data: [], pagination: { currentPage: 1, totalPages: 1, totalResults: 0 } };
      }

      const donations = data.listDonationsResponse?.searchResults?.nameValuePairs || [];
      const pageInfo = data.listDonationsResponse?.page || {};

      const donationList: NeonDonation[] = donations.map((donation: any) => {
        const fields = donation.nameValuePair || [];
        // Helper to get field value by partial name match (case-insensitive)
        const getValue = (patterns: string[]) => {
          for (const pattern of patterns) {
            const found = fields.find((f: any) =>
              f.name?.toLowerCase().includes(pattern.toLowerCase())
            );
            if (found?.value) return found.value;
          }
          return '';
        };

        return {
          id: getValue(['Donation ID', 'donationId', 'ID']),
          donorId: getValue(['Account ID', 'accountId']),
          donorName: `${getValue(['First Name', 'firstName'])} ${getValue(['Last Name', 'lastName'])}`.trim(),
          amount: parseFloat(getValue(['Amount', 'Donation Amount'])) || 0,
          date: getValue(['Date', 'Donation Date']),
          campaign: getValue(['Campaign', 'Campaign Name']) || undefined,
          fund: getValue(['Fund', 'Fund Name']) || undefined,
          paymentMethod: 'other' as const,
          status: getValue(['Status', 'Donation Status'])?.toLowerCase() === 'succeeded' ? 'completed' : 'pending' as const,
          recurring: false,
        };
      });

      return {
        data: donationList,
        pagination: {
          currentPage: (pageInfo.currentPage || 0) + 1,
          totalPages: pageInfo.totalPage || 1,
          totalResults: pageInfo.totalResults || donationList.length,
        },
      };
    } catch (error) {
      console.error('Error listing donations:', error);
      return { data: [], pagination: { currentPage: 1, totalPages: 1, totalResults: 0 } };
    }
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
    // Fetch donors using the listAccounts endpoint
    const donorsResponse = await this.getDonors({ page: 1, pageSize: 50 });
    const donors = donorsResponse.data;

    // Count members
    const activeMembers = donors.filter(d => d.membershipStatus === 'active').length;

    // Top donors (by total donations or just first 5 if no donation data)
    const topDonors = [...donors]
      .sort((a, b) => b.totalDonations - a.totalDonations)
      .slice(0, 5);

    return {
      totalDonations: 0, // Would need donation data
      totalDonors: donorsResponse.pagination?.totalResults || donors.length,
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

  /** Reset session - primarily for testing */
  resetSession(): void {
    this.sessionId = null;
    this.sessionExpiry = null;
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

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
   * List accounts using the listAccounts endpoint
   * Uses output fields to specify which fields to return
   */
  async getDonors(options?: { page?: number; pageSize?: number }): Promise<NeonApiResponse<NeonDonor[]>> {
    const sessionId = await this.login();
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 50;

    // Build the request URL with output fields
    // The listAccounts endpoint requires specific output fields to be defined
    const params = new URLSearchParams();
    params.append('userSessionId', sessionId);
    params.append('responseType', 'json');
    params.append('page.currentPage', String(page - 1)); // Neon uses 0-based pages
    params.append('page.pageSize', String(pageSize));
    params.append('page.sortColumn', 'Account ID');
    params.append('page.sortDirection', 'DESC');

    // Define output fields - these are the fields we want returned
    const outputFields = [
      'Account ID',
      'First Name',
      'Last Name',
      'Email 1',
      'Phone 1',
      'Account Created Date/Time',
    ];

    outputFields.forEach(field => {
      params.append('outputfields.idnamepair.id', '');
      params.append('outputfields.idnamepair.name', field);
    });

    try {
      const response = await fetch(`${this.baseUrl}/account/listAccounts?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Neon listAccounts error:', errorText);
        throw new Error(`Neon API Error: ${response.status}`);
      }

      const data = await response.json();

      if (data.listAccountsResponse?.operationResult !== 'SUCCESS') {
        console.error('Neon listAccounts failed:', data.listAccountsResponse?.responseMessage);
        return { data: [], pagination: { currentPage: 1, totalPages: 1, totalResults: 0 } };
      }

      const accounts = data.listAccountsResponse?.searchResults?.nameValuePairs || [];
      const pageInfo = data.listAccountsResponse?.page || {};

      // Transform the accounts to NeonDonor format
      const donors: NeonDonor[] = accounts.map((account: any) => {
        const fields = account.nameValuePair || [];
        const getValue = (name: string) => fields.find((f: any) => f.name === name)?.value || '';

        return {
          id: getValue('Account ID'),
          firstName: getValue('First Name'),
          lastName: getValue('Last Name'),
          email: getValue('Email 1'),
          phone: getValue('Phone 1') || undefined,
          totalDonations: 0, // Would need separate donation query
          donationCount: 0,
          lastDonationDate: undefined,
          membershipStatus: 'none' as const,
          createdAt: getValue('Account Created Date/Time') || new Date().toISOString(),
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

    const params = new URLSearchParams();
    params.append('userSessionId', sessionId);
    params.append('responseType', 'json');
    params.append('page.currentPage', String(page - 1));
    params.append('page.pageSize', String(pageSize));
    params.append('page.sortColumn', 'Donation Date');
    params.append('page.sortDirection', 'DESC');

    // Define output fields for donations
    const outputFields = [
      'Donation ID',
      'Account ID',
      'First Name',
      'Last Name',
      'Donation Amount',
      'Donation Date',
      'Campaign Name',
      'Fund Name',
      'Donation Status',
    ];

    outputFields.forEach(field => {
      params.append('outputfields.idnamepair.id', '');
      params.append('outputfields.idnamepair.name', field);
    });

    try {
      const response = await fetch(`${this.baseUrl}/donation/listDonations?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Neon listDonations error:', errorText);
        return { data: [], pagination: { currentPage: 1, totalPages: 1, totalResults: 0 } };
      }

      const data = await response.json();

      if (data.listDonationsResponse?.operationResult !== 'SUCCESS') {
        console.error('Neon listDonations failed:', data.listDonationsResponse?.responseMessage);
        return { data: [], pagination: { currentPage: 1, totalPages: 1, totalResults: 0 } };
      }

      const donations = data.listDonationsResponse?.searchResults?.nameValuePairs || [];
      const pageInfo = data.listDonationsResponse?.page || {};

      const donationList: NeonDonation[] = donations.map((donation: any) => {
        const fields = donation.nameValuePair || [];
        const getValue = (name: string) => fields.find((f: any) => f.name === name)?.value || '';

        return {
          id: getValue('Donation ID'),
          donorId: getValue('Account ID'),
          donorName: `${getValue('First Name')} ${getValue('Last Name')}`.trim(),
          amount: parseFloat(getValue('Donation Amount')) || 0,
          date: getValue('Donation Date'),
          campaign: getValue('Campaign Name') || undefined,
          fund: getValue('Fund Name') || undefined,
          paymentMethod: 'other' as const,
          status: getValue('Donation Status')?.toLowerCase() === 'succeeded' ? 'completed' : 'pending' as const,
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

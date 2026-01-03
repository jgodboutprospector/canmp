/**
 * Neon CRM API Integration Service
 *
 * API Documentation: https://developer.neoncrm.com/
 *
 * Authentication: API Key
 * - Set NEON_API_KEY and NEON_ORG_ID in .env.local
 *
 * Features:
 * - Donor management
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
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
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
// Neon CRM API Client
// ============================================

class NeonClient {
  private baseUrl: string;
  private apiKey: string;
  private orgId: string;

  constructor() {
    this.baseUrl = process.env.NEON_API_BASE_URL || 'https://api.neoncrm.com/v2';
    this.apiKey = process.env.NEON_API_KEY || '';
    this.orgId = process.env.NEON_ORG_ID || '';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'NEON-API-VERSION': '2.8',
        'Content-Type': 'application/json',
        ...options.headers,
      },
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

  async getDonors(params?: {
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<NeonApiResponse<NeonDonor[]>> {
    const searchParams = new URLSearchParams();

    if (params?.search) searchParams.append('search', params.search);
    if (params?.page) searchParams.append('currentPage', params.page.toString());
    if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());

    const query = searchParams.toString();
    return this.request<NeonApiResponse<NeonDonor[]>>(`/accounts${query ? `?${query}` : ''}`);
  }

  async getDonor(donorId: string): Promise<NeonDonor> {
    const response = await this.request<NeonApiResponse<NeonDonor>>(`/accounts/${donorId}`);
    return response.data;
  }

  // ============================================
  // Donations
  // ============================================

  async getDonations(params?: {
    donorId?: string;
    campaign?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }): Promise<NeonApiResponse<NeonDonation[]>> {
    const searchParams = new URLSearchParams();

    if (params?.donorId) searchParams.append('accountId', params.donorId);
    if (params?.campaign) searchParams.append('campaign', params.campaign);
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.page) searchParams.append('currentPage', params.page.toString());
    if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());

    const query = searchParams.toString();
    return this.request<NeonApiResponse<NeonDonation[]>>(`/donations${query ? `?${query}` : ''}`);
  }

  async getDonation(donationId: string): Promise<NeonDonation> {
    const response = await this.request<NeonApiResponse<NeonDonation>>(`/donations/${donationId}`);
    return response.data;
  }

  // ============================================
  // Campaigns
  // ============================================

  async getCampaigns(params?: {
    status?: 'active' | 'completed' | 'draft';
    page?: number;
    pageSize?: number;
  }): Promise<NeonApiResponse<NeonCampaign[]>> {
    const searchParams = new URLSearchParams();

    if (params?.status) searchParams.append('status', params.status);
    if (params?.page) searchParams.append('currentPage', params.page.toString());
    if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());

    const query = searchParams.toString();
    return this.request<NeonApiResponse<NeonCampaign[]>>(`/campaigns${query ? `?${query}` : ''}`);
  }

  async getCampaign(campaignId: string): Promise<NeonCampaign> {
    const response = await this.request<NeonApiResponse<NeonCampaign>>(`/campaigns/${campaignId}`);
    return response.data;
  }

  // ============================================
  // Memberships
  // ============================================

  async getMemberships(params?: {
    status?: 'active' | 'expired' | 'pending';
    page?: number;
    pageSize?: number;
  }): Promise<NeonApiResponse<NeonMembership[]>> {
    const searchParams = new URLSearchParams();

    if (params?.status) searchParams.append('status', params.status);
    if (params?.page) searchParams.append('currentPage', params.page.toString());
    if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());

    const query = searchParams.toString();
    return this.request<NeonApiResponse<NeonMembership[]>>(`/memberships${query ? `?${query}` : ''}`);
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
    // Fetch multiple data points in parallel
    const [donationsResponse, donorsResponse, campaignsResponse, membershipsResponse] = await Promise.all([
      this.getDonations({ pageSize: 10 }),
      this.getDonors({ pageSize: 10 }),
      this.getCampaigns({ status: 'active' }),
      this.getMemberships({ status: 'active' }),
    ]);

    const donations = donationsResponse.data;
    const donors = donorsResponse.data;
    const campaigns = campaignsResponse.data;
    const memberships = membershipsResponse.data;

    // Calculate totals
    const totalDonations = donations.reduce((sum, d) => sum + d.amount, 0);

    // Sort donors by total donations
    const topDonors = [...donors].sort((a, b) => b.totalDonations - a.totalDonations).slice(0, 5);

    return {
      totalDonations,
      totalDonors: donorsResponse.pagination?.totalResults || donors.length,
      activeCampaigns: campaigns.length,
      activeMembers: membershipsResponse.pagination?.totalResults || memberships.length,
      recentDonations: donations,
      topDonors,
      campaigns,
    };
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

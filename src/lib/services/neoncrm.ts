/**
 * Neon CRM API Integration Service
 *
 * API Documentation: https://developer.neoncrm.com/api-v2/
 *
 * Authentication: HTTP Basic Auth
 * - Username: Organization ID
 * - Password: API Key
 *
 * Base URL: https://api.neoncrm.com/v2
 *
 * Syncs data to Supabase tables:
 * - neon_accounts (individuals)
 * - neon_companies (organizations)
 * - neon_events
 * - neon_volunteer_opportunities
 */

import { supabase as supabaseClient } from '@/lib/supabase';
import { fetchWithTimeout, sanitizeErrorMessage } from '../api-utils';

// Use untyped supabase client for neon tables not in Database interface
const supabase = supabaseClient as any;

// ============================================
// Types for Neon CRM API responses
// ============================================

export interface NeonAccount {
  accountId: string;
  userType: 'INDIVIDUAL' | 'COMPANY';
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  address?: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    stateProvince?: { code: string; name: string };
    zipCode?: string;
    country?: { id: string; name: string };
  };
  accountCustomFields?: Array<{
    id: string;
    name: string;
    value: string;
  }>;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
}

export interface NeonVolunteerInfo {
  accountId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  volunteerStatus?: string;
  skills?: string[];
  languages?: string[];
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
}

export interface NeonVolunteerOpportunity {
  id: string;
  name: string;
  description?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  maxParticipants?: number;
  currentParticipants?: number;
  category?: string;
  skillsRequired?: string[];
  status?: string;
}

export interface NeonEvent {
  id: string;
  name: string;
  summary?: string;
  description?: string;
  location?: {
    name?: string;
    addressLine1?: string;
    city?: string;
    stateProvince?: { code: string };
    zipCode?: string;
  };
  isVirtual?: boolean;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  timezone?: string;
  registrationOpen?: boolean;
  registrationDeadline?: string;
  maxAttendees?: number;
  currentAttendees?: number;
  isFree?: boolean;
  price?: number;
  status?: string;
  eventType?: string;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
}

export interface NeonApiResponse<T> {
  pagination?: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalResults: number;
  };
  searchResults?: T[];
  accounts?: T[];
  events?: T[];
  opportunities?: T[];
}

// ============================================
// Neon CRM API Client
// ============================================

class NeonCRMClient {
  private baseUrl: string;
  private orgId: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.NEON_CRM_BASE_URL || 'https://api.neoncrm.com/v2';
    this.orgId = process.env.NEON_CRM_ORG_ID || '';
    this.apiKey = process.env.NEON_CRM_API_KEY || '';
  }

  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.orgId}:${this.apiKey}`).toString('base64');
    return `Basic ${credentials}`;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetchWithTimeout(url, {
      ...options,
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
        'NEON-API-VERSION': '2.11',
        ...options.headers,
      },
    }, 30000);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Neon CRM API Error: ${response.status} - ${sanitizeErrorMessage(errorText)}`);
    }

    return response.json();
  }

  // ============================================
  // Accounts
  // ============================================

  async getAccounts(params?: {
    userType?: 'INDIVIDUAL' | 'COMPANY';
    pageSize?: number;
    currentPage?: number;
  }): Promise<NeonApiResponse<NeonAccount>> {
    const searchParams = new URLSearchParams();

    if (params?.userType) searchParams.append('userType', params.userType);
    if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());
    if (params?.currentPage) searchParams.append('currentPage', params.currentPage.toString());

    const query = searchParams.toString();
    return this.request<NeonApiResponse<NeonAccount>>(`/accounts${query ? `?${query}` : ''}`);
  }

  async getAccount(accountId: string): Promise<NeonAccount> {
    return this.request<NeonAccount>(`/accounts/${accountId}`);
  }

  // ============================================
  // Events
  // ============================================

  async getEvents(params?: {
    pageSize?: number;
    currentPage?: number;
  }): Promise<NeonApiResponse<NeonEvent>> {
    const searchParams = new URLSearchParams();

    if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());
    if (params?.currentPage) searchParams.append('currentPage', params.currentPage.toString());

    const query = searchParams.toString();
    return this.request<NeonApiResponse<NeonEvent>>(`/events${query ? `?${query}` : ''}`);
  }

  // ============================================
  // Volunteer Opportunities
  // ============================================

  async getVolunteerOpportunities(params?: {
    pageSize?: number;
    currentPage?: number;
  }): Promise<NeonApiResponse<NeonVolunteerOpportunity>> {
    const searchParams = new URLSearchParams();

    if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());
    if (params?.currentPage) searchParams.append('currentPage', params.currentPage.toString());

    const query = searchParams.toString();
    return this.request<NeonApiResponse<NeonVolunteerOpportunity>>(`/volunteer-opportunities${query ? `?${query}` : ''}`);
  }
}

// Export singleton instance
export const neonCRM = new NeonCRMClient();

// ============================================
// Sync Result Type
// ============================================

export interface SyncResult {
  type: string;
  fetched: number;
  created: number;
  updated: number;
  failed: number;
  errors: string[];
}

// ============================================
// Sync Functions
// ============================================

export async function syncAccountsFromNeon(): Promise<SyncResult> {
  const result: SyncResult = {
    type: 'accounts',
    fetched: 0,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  };

  try {
    let currentPage = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await neonCRM.getAccounts({
        userType: 'INDIVIDUAL',
        pageSize: 100,
        currentPage,
      });

      const accounts = response.accounts || response.searchResults || [];
      result.fetched += accounts.length;

      for (const account of accounts) {
        try {
          const { data: existing } = await supabase
            .from('neon_accounts')
            .select('id')
            .eq('neon_account_id', account.accountId)
            .single();

          const accountData = {
            neon_account_id: account.accountId,
            account_type: account.userType,
            first_name: account.firstName || null,
            last_name: account.lastName || null,
            email: account.email || null,
            phone: account.phone || null,
            address_line1: account.address?.addressLine1 || null,
            address_line2: account.address?.addressLine2 || null,
            city: account.address?.city || null,
            state: account.address?.stateProvince?.code || null,
            zip_code: account.address?.zipCode || null,
            country: account.address?.country?.name || null,
            neon_created_date: account.createdDateTime || null,
            neon_modified_date: account.lastModifiedDateTime || null,
            last_synced_at: new Date().toISOString(),
            sync_status: 'synced',
          };

          if (existing) {
            await supabase.from('neon_accounts').update(accountData).eq('id', existing.id);
            result.updated++;
          } else {
            await supabase.from('neon_accounts').insert(accountData);
            result.created++;
          }
        } catch (err) {
          result.failed++;
          result.errors.push(`Account ${account.accountId}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      hasMore = response.pagination
        ? currentPage < response.pagination.totalPages - 1
        : false;
      currentPage++;
    }
  } catch (err) {
    result.errors.push(`Fetch error: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  return result;
}

export async function syncCompaniesFromNeon(): Promise<SyncResult> {
  const result: SyncResult = {
    type: 'companies',
    fetched: 0,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  };

  try {
    let currentPage = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await neonCRM.getAccounts({
        userType: 'COMPANY',
        pageSize: 100,
        currentPage,
      });

      const companies = response.accounts || response.searchResults || [];
      result.fetched += companies.length;

      for (const company of companies) {
        try {
          const { data: existing } = await supabase
            .from('neon_companies')
            .select('id')
            .eq('neon_account_id', company.accountId)
            .single();

          const companyData = {
            neon_account_id: company.accountId,
            company_name: company.companyName || 'Unknown Company',
            email: company.email || null,
            phone: company.phone || null,
            address_line1: company.address?.addressLine1 || null,
            address_line2: company.address?.addressLine2 || null,
            city: company.address?.city || null,
            state: company.address?.stateProvince?.code || null,
            zip_code: company.address?.zipCode || null,
            country: company.address?.country?.name || null,
            neon_created_date: company.createdDateTime || null,
            neon_modified_date: company.lastModifiedDateTime || null,
            last_synced_at: new Date().toISOString(),
            sync_status: 'synced',
          };

          if (existing) {
            await supabase.from('neon_companies').update(companyData).eq('id', existing.id);
            result.updated++;
          } else {
            await supabase.from('neon_companies').insert(companyData);
            result.created++;
          }
        } catch (err) {
          result.failed++;
          result.errors.push(`Company ${company.accountId}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      hasMore = response.pagination
        ? currentPage < response.pagination.totalPages - 1
        : false;
      currentPage++;
    }
  } catch (err) {
    result.errors.push(`Fetch error: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  return result;
}

export async function syncEventsFromNeon(): Promise<SyncResult> {
  const result: SyncResult = {
    type: 'events',
    fetched: 0,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  };

  try {
    let currentPage = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await neonCRM.getEvents({
        pageSize: 100,
        currentPage,
      });

      const events = response.events || response.searchResults || [];
      result.fetched += events.length;

      for (const event of events) {
        try {
          const { data: existing } = await supabase
            .from('neon_events')
            .select('id')
            .eq('neon_event_id', event.id)
            .single();

          const eventData = {
            neon_event_id: event.id,
            name: event.name,
            summary: event.summary || null,
            description: event.description || null,
            location_name: event.location?.name || null,
            address_line1: event.location?.addressLine1 || null,
            city: event.location?.city || null,
            state: event.location?.stateProvince?.code || null,
            zip_code: event.location?.zipCode || null,
            is_virtual: event.isVirtual || false,
            start_date: event.startDate || null,
            end_date: event.endDate || null,
            start_time: event.startTime || null,
            end_time: event.endTime || null,
            timezone: event.timezone || null,
            registration_open: event.registrationOpen ?? true,
            registration_deadline: event.registrationDeadline || null,
            max_attendees: event.maxAttendees || null,
            current_attendees: event.currentAttendees || 0,
            is_free: event.isFree ?? true,
            price: event.price || null,
            status: event.status || 'published',
            event_type: event.eventType || null,
            neon_created_date: event.createdDateTime || null,
            neon_modified_date: event.lastModifiedDateTime || null,
            last_synced_at: new Date().toISOString(),
            sync_status: 'synced',
          };

          if (existing) {
            await supabase.from('neon_events').update(eventData).eq('id', existing.id);
            result.updated++;
          } else {
            await supabase.from('neon_events').insert(eventData);
            result.created++;
          }
        } catch (err) {
          result.failed++;
          result.errors.push(`Event ${event.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      hasMore = response.pagination
        ? currentPage < response.pagination.totalPages - 1
        : false;
      currentPage++;
    }
  } catch (err) {
    result.errors.push(`Fetch error: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  return result;
}

export async function syncVolunteerOpportunitiesFromNeon(): Promise<SyncResult> {
  const result: SyncResult = {
    type: 'opportunities',
    fetched: 0,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  };

  try {
    let currentPage = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await neonCRM.getVolunteerOpportunities({
        pageSize: 100,
        currentPage,
      });

      const opportunities = response.opportunities || response.searchResults || [];
      result.fetched += opportunities.length;

      for (const opp of opportunities) {
        try {
          const { data: existing } = await supabase
            .from('neon_volunteer_opportunities')
            .select('id')
            .eq('neon_opportunity_id', opp.id)
            .single();

          const oppData = {
            neon_opportunity_id: opp.id,
            name: opp.name,
            description: opp.description || null,
            location: opp.location || null,
            start_date: opp.startDate || null,
            end_date: opp.endDate || null,
            start_time: opp.startTime || null,
            end_time: opp.endTime || null,
            max_participants: opp.maxParticipants || null,
            current_participants: opp.currentParticipants || 0,
            status: opp.status || 'active',
            category: opp.category || null,
            skills_required: opp.skillsRequired || [],
            last_synced_at: new Date().toISOString(),
            sync_status: 'synced',
          };

          if (existing) {
            await supabase.from('neon_volunteer_opportunities').update(oppData).eq('id', existing.id);
            result.updated++;
          } else {
            await supabase.from('neon_volunteer_opportunities').insert(oppData);
            result.created++;
          }
        } catch (err) {
          result.failed++;
          result.errors.push(`Opportunity ${opp.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      hasMore = response.pagination
        ? currentPage < response.pagination.totalPages - 1
        : false;
      currentPage++;
    }
  } catch (err) {
    result.errors.push(`Fetch error: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  return result;
}

// ============================================
// Full Sync Function
// ============================================

export interface FullSyncResult {
  accounts: SyncResult;
  companies: SyncResult;
  events: SyncResult;
  opportunities: SyncResult;
  totalFetched: number;
  totalCreated: number;
  totalUpdated: number;
  totalFailed: number;
  duration: number;
}

export async function syncAllFromNeon(): Promise<FullSyncResult> {
  const startTime = Date.now();

  // Create sync log entry
  const { data: syncLog } = await supabase
    .from('neon_sync_log')
    .insert({
      sync_type: 'full',
      status: 'running',
      trigger_type: 'manual',
    })
    .select()
    .single();

  // Run all syncs
  const [accounts, companies, events, opportunities] = await Promise.all([
    syncAccountsFromNeon(),
    syncCompaniesFromNeon(),
    syncEventsFromNeon(),
    syncVolunteerOpportunitiesFromNeon(),
  ]);

  const result: FullSyncResult = {
    accounts,
    companies,
    events,
    opportunities,
    totalFetched: accounts.fetched + companies.fetched + events.fetched + opportunities.fetched,
    totalCreated: accounts.created + companies.created + events.created + opportunities.created,
    totalUpdated: accounts.updated + companies.updated + events.updated + opportunities.updated,
    totalFailed: accounts.failed + companies.failed + events.failed + opportunities.failed,
    duration: Date.now() - startTime,
  };

  // Update sync log
  if (syncLog) {
    const allErrors = [
      ...accounts.errors,
      ...companies.errors,
      ...events.errors,
      ...opportunities.errors,
    ];

    await supabase
      .from('neon_sync_log')
      .update({
        completed_at: new Date().toISOString(),
        status: allErrors.length > 0 ? 'completed' : 'completed',
        records_fetched: result.totalFetched,
        records_created: result.totalCreated,
        records_updated: result.totalUpdated,
        records_failed: result.totalFailed,
        errors: allErrors,
      })
      .eq('id', syncLog.id);
  }

  return result;
}

// ============================================
// Link Neon data to local records
// ============================================

export async function linkNeonAccountToVolunteer(
  neonAccountId: string,
  volunteerId: string
): Promise<void> {
  await supabase
    .from('neon_accounts')
    .update({ volunteer_id: volunteerId })
    .eq('neon_account_id', neonAccountId);
}

export async function linkNeonEventToLocalEvent(
  neonEventId: string,
  localEventId: string
): Promise<void> {
  await supabase
    .from('neon_events')
    .update({ local_event_id: localEventId })
    .eq('neon_event_id', neonEventId);
}

export async function linkNeonOpportunityToEvent(
  neonOpportunityId: string,
  eventId: string
): Promise<void> {
  await supabase
    .from('neon_volunteer_opportunities')
    .update({ event_id: eventId })
    .eq('neon_opportunity_id', neonOpportunityId);
}

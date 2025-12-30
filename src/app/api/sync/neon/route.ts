import { NextResponse } from 'next/server';
import {
  syncAllFromNeon,
  syncAccountsFromNeon,
  syncCompaniesFromNeon,
  syncEventsFromNeon,
  syncVolunteerOpportunitiesFromNeon,
} from '@/lib/services/neoncrm';

export async function POST(request: Request) {
  try {
    // Verify API key for security
    const authHeader = request.headers.get('authorization');
    const expectedKey = process.env.SYNC_API_KEY;

    if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get sync type from request body
    const body = await request.json().catch(() => ({}));
    const syncType = body.type || 'full';

    let result;

    switch (syncType) {
      case 'accounts':
        result = await syncAccountsFromNeon();
        break;
      case 'companies':
        result = await syncCompaniesFromNeon();
        break;
      case 'events':
        result = await syncEventsFromNeon();
        break;
      case 'opportunities':
        result = await syncVolunteerOpportunitiesFromNeon();
        break;
      case 'full':
      default:
        result = await syncAllFromNeon();
        break;
    }

    return NextResponse.json({
      success: true,
      message: `Sync completed: ${syncType}`,
      result,
    });
  } catch (error) {
    console.error('Neon CRM sync error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/sync/neon',
    methods: ['POST'],
    description: 'Sync data from Neon CRM to Supabase',
    headers: {
      'Authorization': 'Bearer <SYNC_API_KEY>',
      'Content-Type': 'application/json',
    },
    body: {
      type: 'full | accounts | companies | events | opportunities',
    },
    syncTypes: {
      full: 'Sync all data (accounts, companies, events, opportunities)',
      accounts: 'Sync individual accounts only',
      companies: 'Sync company accounts only',
      events: 'Sync events from Neon CRM',
      opportunities: 'Sync volunteer opportunities',
    },
    tables: {
      neon_accounts: 'Individual accounts from Neon CRM',
      neon_companies: 'Company/organization accounts',
      neon_events: 'Events from Neon CRM',
      neon_volunteer_opportunities: 'Volunteer opportunities',
      neon_sync_log: 'Sync operation logs',
    },
  });
}

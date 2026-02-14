import { NextResponse } from 'next/server';
import {
  syncAllFromNeon,
  syncAccountsFromNeon,
  syncCompaniesFromNeon,
  syncEventsFromNeon,
  syncVolunteerOpportunitiesFromNeon,
} from '@/lib/services/neoncrm';
import { secureCompare } from '@/lib/auth-server';
import { handleApiError } from '@/lib/api-error';
import { parseJsonBody } from '@/lib/api-server-utils';

export async function POST(request: Request) {
  try {
    // Verify API key for security using timing-safe comparison
    const authHeader = request.headers.get('authorization');
    const expectedKey = process.env.SYNC_API_KEY;

    if (!expectedKey) {
      // Fail closed: if SYNC_API_KEY is not configured, reject all requests
      console.error('SYNC_API_KEY not configured — rejecting sync request');
      return NextResponse.json(
        { error: 'Sync endpoint not configured' },
        { status: 503 }
      );
    }

    const providedKey = authHeader?.replace('Bearer ', '');
    if (!secureCompare(providedKey, expectedKey)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get sync type from request body
    const body = await parseJsonBody(request).catch(() => ({}));
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
    return handleApiError(error);
  }
}

export async function GET() {
  // Don't expose internal API documentation to unauthenticated users
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

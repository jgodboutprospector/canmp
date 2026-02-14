import { NextResponse } from 'next/server';
import { rampClient, RampCard, RampTransaction, RampReimbursement } from '@/lib/services/ramp';
import { requireRole } from '@/lib/auth-server';
import { handleApiError } from '@/lib/api-error';
import { parseJsonBody } from '@/lib/api-server-utils';

// Demo data - fallback when API is not configured or fails
const demoCards = [
  { id: '1', display_name: 'Operations Card', last_four: '4521', cardholder_name: 'Katya Shevchenko', state: 'active', is_physical: true, spending_limit: 5000, current_spend: 2340 },
  { id: '2', display_name: 'Program Expenses', last_four: '7892', cardholder_name: 'Nour Iskandafi', state: 'active', is_physical: false, spending_limit: 3000, current_spend: 1850 },
  { id: '3', display_name: 'Travel Card', last_four: '3156', cardholder_name: 'Jon Godbout', state: 'suspended', is_physical: true, spending_limit: 2000, current_spend: 0 },
];

const demoTransactions = [
  { id: '1', amount: 245.50, merchant_name: 'Office Depot', category: 'Office Supplies', card_holder_name: 'Katya Shevchenko', state: 'cleared', transaction_date: '2025-12-28' },
  { id: '2', amount: 89.99, merchant_name: 'Amazon', category: 'Program Supplies', card_holder_name: 'Nour Iskandafi', state: 'cleared', transaction_date: '2025-12-27' },
  { id: '3', amount: 156.00, merchant_name: 'Staples', category: 'Office Supplies', card_holder_name: 'Katya Shevchenko', state: 'pending', transaction_date: '2025-12-27' },
  { id: '4', amount: 42.50, merchant_name: "Dunkin'", category: 'Meals', card_holder_name: 'Jon Godbout', state: 'cleared', transaction_date: '2025-12-26' },
  { id: '5', amount: 325.00, merchant_name: 'Zoom', category: 'Software', card_holder_name: 'Katya Shevchenko', state: 'cleared', transaction_date: '2025-12-25' },
];

const demoReimbursements = [
  { id: '1', user_name: 'Steve Knight', amount: 125.00, merchant: 'Walmart', status: 'pending', transaction_date: '2025-12-27', category: 'Program Supplies' },
  { id: '2', user_name: 'Karen Kusiak', amount: 45.50, merchant: 'Hannaford', status: 'approved', transaction_date: '2025-12-26', category: 'Food & Refreshments' },
  { id: '3', user_name: 'Isabelle Mehrhoff', amount: 78.00, merchant: 'CVS', status: 'pending', transaction_date: '2025-12-25', category: 'Medical Supplies' },
];

// Helper to check if Ramp is configured
function isRampConfigured(): boolean {
  return !!(process.env.RAMP_CLIENT_ID && process.env.RAMP_CLIENT_SECRET);
}

// Transform Ramp API card to our format
function transformCard(card: RampCard) {
  return {
    id: card.id,
    display_name: card.display_name,
    last_four: card.last_four,
    cardholder_name: card.cardholder_name,
    state: card.state,
    is_physical: card.is_physical,
    spending_limit: card.spending_restrictions?.amount || 0,
    current_spend: 0, // Would need separate API call to get current spend
  };
}

// Transform Ramp API transaction to our format
function transformTransaction(tx: RampTransaction) {
  return {
    id: tx.id,
    amount: tx.amount,
    merchant_name: tx.merchant_name,
    category: tx.category || tx.sk_category_name || 'Uncategorized',
    card_holder_name: tx.card_holder_name,
    state: tx.state,
    transaction_date: tx.transaction_date,
    memo: tx.memo,
  };
}

// Transform Ramp API reimbursement to our format
function transformReimbursement(reimb: RampReimbursement) {
  return {
    id: reimb.id,
    user_name: reimb.user_name,
    amount: reimb.amount,
    merchant: reimb.merchant,
    status: reimb.status,
    transaction_date: reimb.transaction_date,
    category: reimb.category || 'Uncategorized',
  };
}

export async function GET(request: Request) {
  try {
    // Require admin, coordinator, or board_member role
    await requireRole(['admin', 'coordinator', 'board_member']);

    const { searchParams } = new URL(request.url);
    const dataType = searchParams.get('type') || 'cards';

    const hasRampCredentials = isRampConfigured();
    // Try to fetch from real API if configured
    if (hasRampCredentials) {
      try {
        switch (dataType) {
          case 'cards': {
            const response = await rampClient.getCards();
            return NextResponse.json({
              success: true,
              data: response.data.map(transformCard),
              isDemo: false,
            });
          }

          case 'transactions': {
            const response = await rampClient.getTransactions();
            return NextResponse.json({
              success: true,
              data: response.data.map(transformTransaction),
              isDemo: false,
            });
          }

          case 'reimbursements': {
            const response = await rampClient.getReimbursements();
            return NextResponse.json({
              success: true,
              data: response.data.map(transformReimbursement),
              isDemo: false,
            });
          }

          case 'dashboard': {
            const dashboardData = await rampClient.getDashboardSummary();
            return NextResponse.json({
              success: true,
              data: {
                cards: dashboardData.cards.map(transformCard),
                transactions: dashboardData.recentTransactions.map(transformTransaction),
                reimbursements: dashboardData.reimbursements.map(transformReimbursement),
                totalSpend: dashboardData.totalSpend,
                activeCards: dashboardData.activeCards,
                pendingReimbursements: dashboardData.pendingReimbursements,
              },
              isDemo: false,
            });
          }

          default:
            return NextResponse.json(
              { success: false, error: 'Invalid data type' },
              { status: 400 }
            );
        }
      } catch (apiError) {
        console.error('Ramp API call failed, falling back to demo data:', apiError);
        // Fall through to demo data
      }
    }

    // Return demo data if API not configured or failed
    switch (dataType) {
      case 'cards':
        return NextResponse.json({
          success: true,
          data: demoCards,
          isDemo: true,
        });

      case 'transactions':
        return NextResponse.json({
          success: true,
          data: demoTransactions,
          isDemo: true,
        });

      case 'reimbursements':
        return NextResponse.json({
          success: true,
          data: demoReimbursements,
          isDemo: true,
        });

      case 'dashboard':
        return NextResponse.json({
          success: true,
          data: {
            cards: demoCards,
            transactions: demoTransactions,
            reimbursements: demoReimbursements,
          },
          isDemo: true,
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid data type' },
          { status: 400 }
        );
    }
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    // Require admin, coordinator, or board_member role
    await requireRole(['admin', 'coordinator', 'board_member']);

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    const hasRampCredentials = isRampConfigured();

    if (!hasRampCredentials) {
      return NextResponse.json({
        success: false,
        error: 'Ramp API not configured. Please set RAMP_CLIENT_ID and RAMP_CLIENT_SECRET.',
        isDemo: true,
      }, { status: 400 });
    }
    const body = await parseJsonBody(request);

    switch (action) {
      case 'approve-reimbursement': {
        const result = await rampClient.approveReimbursement(body.id);
        return NextResponse.json({
          success: true,
          message: `Reimbursement ${body.id} approved`,
          data: transformReimbursement(result),
        });
      }

      case 'reject-reimbursement': {
        const result = await rampClient.rejectReimbursement(body.id, body.reason);
        return NextResponse.json({
          success: true,
          message: `Reimbursement ${body.id} rejected`,
          data: transformReimbursement(result),
        });
      }

      case 'suspend-card': {
        const result = await rampClient.suspendCard(body.id);
        return NextResponse.json({
          success: true,
          message: `Card ${body.id} suspended`,
          data: transformCard(result),
        });
      }

      case 'activate-card': {
        const result = await rampClient.activateCard(body.id);
        return NextResponse.json({
          success: true,
          message: `Card ${body.id} activated`,
          data: transformCard(result),
        });
      }

      case 'update-spending-limit': {
        const result = await rampClient.updateCardSpendingLimit(body.id, {
          amount: body.amount,
          interval: body.interval || 'monthly',
        });
        return NextResponse.json({
          success: true,
          message: `Card ${body.id} spending limit updated`,
          data: transformCard(result),
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    return handleApiError(error);
  }
}

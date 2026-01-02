import { NextResponse } from 'next/server';

// Demo data - will be replaced with real API calls when credentials are configured
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dataType = searchParams.get('type') || 'cards';

  // Check if Ramp credentials are configured
  const hasRampCredentials = process.env.RAMP_CLIENT_ID && process.env.RAMP_CLIENT_SECRET;

  // TODO: When Ramp API is properly configured, fetch real data here
  // For now, return demo data

  try {
    switch (dataType) {
      case 'cards':
        return NextResponse.json({
          success: true,
          data: demoCards,
          isDemo: !hasRampCredentials,
        });

      case 'transactions':
        return NextResponse.json({
          success: true,
          data: demoTransactions,
          isDemo: !hasRampCredentials,
        });

      case 'reimbursements':
        return NextResponse.json({
          success: true,
          data: demoReimbursements,
          isDemo: !hasRampCredentials,
        });

      case 'dashboard':
        return NextResponse.json({
          success: true,
          data: {
            cards: demoCards,
            transactions: demoTransactions,
            reimbursements: demoReimbursements,
          },
          isDemo: !hasRampCredentials,
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid data type' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Ramp API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  // Check if Ramp credentials are configured
  const hasRampCredentials = process.env.RAMP_CLIENT_ID && process.env.RAMP_CLIENT_SECRET;

  if (!hasRampCredentials) {
    return NextResponse.json({
      success: false,
      error: 'Ramp API not configured. Please set RAMP_CLIENT_ID and RAMP_CLIENT_SECRET.',
      isDemo: true,
    }, { status: 400 });
  }

  try {
    const body = await request.json();

    switch (action) {
      case 'approve-reimbursement':
        // TODO: Call Ramp API to approve reimbursement
        return NextResponse.json({
          success: true,
          message: `Reimbursement ${body.id} approved`,
        });

      case 'reject-reimbursement':
        // TODO: Call Ramp API to reject reimbursement
        return NextResponse.json({
          success: true,
          message: `Reimbursement ${body.id} rejected`,
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Ramp API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

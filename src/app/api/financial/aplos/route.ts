import { NextResponse } from 'next/server';
import { aplosClient } from '@/lib/services/aplos';

// Demo data - fallback when API is not configured or fails
const demoFunds = [
  { id: '1', name: 'General Fund', balance: 125000, is_default: true },
  { id: '2', name: 'Housing Fund', balance: 45000, is_default: false },
  { id: '3', name: 'Education Fund', balance: 32000, is_default: false },
  { id: '4', name: 'Emergency Fund', balance: 18500, is_default: false },
];

const demoTransactions = [
  { id: '1', date: '2025-12-28', amount: 5000, memo: 'Grant from Maine Community Foundation', fund_name: 'General Fund', account_name: 'Grant Revenue', type: 'credit' },
  { id: '2', date: '2025-12-27', amount: 1200, memo: 'Monthly rent - 18 Union St', fund_name: 'Housing Fund', account_name: 'Rent Expense', type: 'debit' },
  { id: '3', date: '2025-12-26', amount: 2500, memo: 'Individual donation - Smith family', fund_name: 'General Fund', account_name: 'Donations', type: 'credit' },
  { id: '4', date: '2025-12-25', amount: 450, memo: 'Office supplies', fund_name: 'General Fund', account_name: 'Office Expense', type: 'debit' },
  { id: '5', date: '2025-12-24', amount: 800, memo: 'ESL classroom materials', fund_name: 'Education Fund', account_name: 'Program Expense', type: 'debit' },
];

const demoIncomeStatement = [
  { category: 'Revenue', account_name: 'Grant Revenue', current_amount: 45000, ytd_amount: 180000 },
  { category: 'Revenue', account_name: 'Donations', current_amount: 12500, ytd_amount: 85000 },
  { category: 'Revenue', account_name: 'Program Fees', current_amount: 3200, ytd_amount: 24000 },
  { category: 'Expenses', account_name: 'Salaries', current_amount: 28000, ytd_amount: 112000 },
  { category: 'Expenses', account_name: 'Rent', current_amount: 8500, ytd_amount: 34000 },
  { category: 'Expenses', account_name: 'Program Expenses', current_amount: 5200, ytd_amount: 21000 },
  { category: 'Expenses', account_name: 'Utilities', current_amount: 1800, ytd_amount: 7200 },
];

const demoTrialBalance = [
  { account_name: 'Cash', type: 'Asset', debit: 125000, credit: 0, net_balance: 125000 },
  { account_name: 'Accounts Receivable', type: 'Asset', debit: 15000, credit: 0, net_balance: 15000 },
  { account_name: 'Property', type: 'Asset', debit: 450000, credit: 0, net_balance: 450000 },
  { account_name: 'Accounts Payable', type: 'Liability', debit: 0, credit: 8500, net_balance: -8500 },
  { account_name: 'Net Assets', type: 'Equity', debit: 0, credit: 520000, net_balance: -520000 },
];

const demoYoYData = [
  { month: 'Jan', currentYear: 45000, previousYear: 38000 },
  { month: 'Feb', currentYear: 52000, previousYear: 42000 },
  { month: 'Mar', currentYear: 48000, previousYear: 45000 },
  { month: 'Apr', currentYear: 61000, previousYear: 51000 },
  { month: 'May', currentYear: 55000, previousYear: 48000 },
  { month: 'Jun', currentYear: 67000, previousYear: 54000 },
  { month: 'Jul', currentYear: 72000, previousYear: 58000 },
  { month: 'Aug', currentYear: 68000, previousYear: 62000 },
  { month: 'Sep', currentYear: 75000, previousYear: 65000 },
  { month: 'Oct', currentYear: 82000, previousYear: 70000 },
  { month: 'Nov', currentYear: 78000, previousYear: 68000 },
  { month: 'Dec', currentYear: 85000, previousYear: 72000 },
];

// Helper to check if Aplos is configured
function isAplosConfigured(): boolean {
  return !!(process.env.APLOS_CLIENT_ID && process.env.APLOS_PRIVATE_KEY);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dataType = searchParams.get('type') || 'funds';
  const fundId = searchParams.get('fund_id');
  const accountNumber = searchParams.get('account_number');

  const hasAplosCredentials = isAplosConfigured();

  try {
    // Try to fetch from real API if configured
    if (hasAplosCredentials) {
      try {
        switch (dataType) {
          case 'funds': {
            const funds = await aplosClient.getFunds();
            return NextResponse.json({
              success: true,
              data: funds,
              isDemo: false,
            });
          }

          case 'accounts': {
            const accounts = await aplosClient.getAccounts();
            return NextResponse.json({
              success: true,
              data: accounts,
              isDemo: false,
            });
          }

          case 'transactions': {
            const params: { fund_id?: string; account_number?: string } = {};
            if (fundId && fundId !== 'all') {
              params.fund_id = fundId;
            }
            if (accountNumber && accountNumber !== 'all') {
              params.account_number = accountNumber;
            }
            const transactions = await aplosClient.getTransactions(params);
            return NextResponse.json({
              success: true,
              data: transactions,
              isDemo: false,
            });
          }

          case 'income-statement': {
            const incomeStatement = await aplosClient.getIncomeStatement({
              fund_id: fundId && fundId !== 'all' ? fundId : undefined,
            });
            return NextResponse.json({
              success: true,
              data: incomeStatement,
              isDemo: false,
            });
          }

          case 'trial-balance': {
            const trialBalance = await aplosClient.getTrialBalance({
              fund_id: fundId && fundId !== 'all' ? fundId : undefined,
            });
            return NextResponse.json({
              success: true,
              data: trialBalance,
              isDemo: false,
            });
          }

          case 'yoy': {
            const yoyData = await aplosClient.getYearOverYearComparison({
              fund_id: fundId && fundId !== 'all' ? fundId : undefined,
            });
            return NextResponse.json({
              success: true,
              data: yoyData,
              isDemo: false,
            });
          }

          case 'dashboard': {
            const dashboardData = await aplosClient.getDashboardSummary();
            return NextResponse.json({
              success: true,
              data: {
                funds: dashboardData.funds,
                transactions: dashboardData.recentTransactions,
                incomeStatement: [], // Would need to fetch separately
                totalIncome: dashboardData.totalIncome,
                totalExpenses: dashboardData.totalExpenses,
                netIncome: dashboardData.netIncome,
                cashBalance: dashboardData.cashBalance,
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
        console.error('Aplos API call failed, falling back to demo data:', apiError);
        // Fall through to demo data
      }
    }

    // Demo accounts for fallback
    const demoAccounts = [
      { account_number: '1000', name: 'Checking - Main', type: 'asset', balance: 125000 },
      { account_number: '1010', name: 'Checking - Operations', type: 'asset', balance: 45000 },
      { account_number: '1020', name: 'Savings', type: 'asset', balance: 32000 },
      { account_number: '1100', name: 'Accounts Receivable', type: 'asset', balance: 15000 },
      { account_number: '2000', name: 'Accounts Payable', type: 'liability', balance: 8500 },
      { account_number: '4000', name: 'Grant Revenue', type: 'revenue', balance: 180000 },
      { account_number: '4100', name: 'Donations', type: 'revenue', balance: 85000 },
      { account_number: '5000', name: 'Salaries', type: 'expense', balance: 112000 },
      { account_number: '5100', name: 'Rent', type: 'expense', balance: 34000 },
    ];

    // Return demo data if API not configured or failed
    switch (dataType) {
      case 'funds':
        return NextResponse.json({
          success: true,
          data: demoFunds,
          isDemo: true,
        });

      case 'accounts':
        return NextResponse.json({
          success: true,
          data: demoAccounts,
          isDemo: true,
        });

      case 'transactions':
        let transactions = demoTransactions;
        if (fundId && fundId !== 'all') {
          const fund = demoFunds.find(f => f.id === fundId);
          if (fund) {
            transactions = transactions.filter(t => t.fund_name === fund.name);
          }
        }
        return NextResponse.json({
          success: true,
          data: transactions,
          isDemo: true,
        });

      case 'income-statement':
        return NextResponse.json({
          success: true,
          data: demoIncomeStatement,
          isDemo: true,
        });

      case 'trial-balance':
        return NextResponse.json({
          success: true,
          data: demoTrialBalance,
          isDemo: true,
        });

      case 'yoy':
        return NextResponse.json({
          success: true,
          data: demoYoYData,
          isDemo: true,
        });

      case 'dashboard':
        return NextResponse.json({
          success: true,
          data: {
            funds: demoFunds,
            transactions: demoTransactions,
            incomeStatement: demoIncomeStatement,
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
    console.error('Aplos API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}

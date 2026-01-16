/**
 * Demo/sample data for financial section
 * Used when API credentials are not configured
 */

import type {
  AplosFund,
  AplosTransaction,
  AplosIncomeStatementLine,
  AplosTrialBalanceLine,
  AplosYoYData,
  RampCard,
  RampTransaction,
  RampReimbursement,
  NeonDonor,
  NeonDonation,
  NeonCampaign,
  NeonMembership,
} from '@/lib/hooks/useFinancialData';

// Sample data for Aplos
export const sampleFunds: AplosFund[] = [
  { id: '1', name: 'General Fund', balance: 125000, is_default: true },
  { id: '2', name: 'Housing Fund', balance: 45000, is_default: false },
  { id: '3', name: 'Education Fund', balance: 32000, is_default: false },
  { id: '4', name: 'Emergency Fund', balance: 18500, is_default: false },
];

export const sampleAplosTransactions: AplosTransaction[] = [
  { id: '1', date: '2025-12-28', amount: 5000, memo: 'Grant from Maine Community Foundation', fund_name: 'General Fund', account_name: 'Grant Revenue', type: 'credit' },
  { id: '2', date: '2025-12-27', amount: 1200, memo: 'Monthly rent - 18 Union St', fund_name: 'Housing Fund', account_name: 'Rent Expense', type: 'debit' },
  { id: '3', date: '2025-12-26', amount: 2500, memo: 'Individual donation - Smith family', fund_name: 'General Fund', account_name: 'Donations', type: 'credit' },
  { id: '4', date: '2025-12-25', amount: 450, memo: 'Office supplies', fund_name: 'General Fund', account_name: 'Office Expense', type: 'debit' },
  { id: '5', date: '2025-12-24', amount: 800, memo: 'ESL classroom materials', fund_name: 'Education Fund', account_name: 'Program Expense', type: 'debit' },
];

export const sampleIncomeStatement: AplosIncomeStatementLine[] = [
  { category: 'Revenue', account_name: 'Grant Revenue', current_amount: 45000, ytd_amount: 180000 },
  { category: 'Revenue', account_name: 'Donations', current_amount: 12500, ytd_amount: 85000 },
  { category: 'Revenue', account_name: 'Program Fees', current_amount: 3200, ytd_amount: 24000 },
  { category: 'Expenses', account_name: 'Salaries', current_amount: 28000, ytd_amount: 112000 },
  { category: 'Expenses', account_name: 'Rent', current_amount: 8500, ytd_amount: 34000 },
  { category: 'Expenses', account_name: 'Program Expenses', current_amount: 5200, ytd_amount: 21000 },
  { category: 'Expenses', account_name: 'Utilities', current_amount: 1800, ytd_amount: 7200 },
];

export const sampleTrialBalance: AplosTrialBalanceLine[] = [
  { account_name: 'Cash', type: 'Asset', debit: 125000, credit: 0, net_balance: 125000 },
  { account_name: 'Accounts Receivable', type: 'Asset', debit: 15000, credit: 0, net_balance: 15000 },
  { account_name: 'Property', type: 'Asset', debit: 450000, credit: 0, net_balance: 450000 },
  { account_name: 'Accounts Payable', type: 'Liability', debit: 0, credit: 8500, net_balance: -8500 },
  { account_name: 'Net Assets', type: 'Equity', debit: 0, credit: 520000, net_balance: -520000 },
];

export const sampleYoYData: AplosYoYData[] = [
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

// Sample data for Ramp
export const sampleRampCards: RampCard[] = [
  { id: '1', display_name: 'Operations Card', last_four: '4521', cardholder_name: 'Katya Shevchenko', state: 'active', is_physical: true, spending_limit: 5000, current_spend: 2340 },
  { id: '2', display_name: 'Program Expenses', last_four: '7892', cardholder_name: 'Nour Iskandafi', state: 'active', is_physical: false, spending_limit: 3000, current_spend: 1850 },
  { id: '3', display_name: 'Travel Card', last_four: '3156', cardholder_name: 'Jon Godbout', state: 'suspended', is_physical: true, spending_limit: 2000, current_spend: 0 },
];

export const sampleRampTransactions: RampTransaction[] = [
  { id: '1', amount: 245.50, merchant_name: 'Office Depot', category: 'Office Supplies', card_holder_name: 'Katya Shevchenko', state: 'cleared', transaction_date: '2025-12-28' },
  { id: '2', amount: 89.99, merchant_name: 'Amazon', category: 'Program Supplies', card_holder_name: 'Nour Iskandafi', state: 'cleared', transaction_date: '2025-12-27' },
  { id: '3', amount: 156.00, merchant_name: 'Staples', category: 'Office Supplies', card_holder_name: 'Katya Shevchenko', state: 'pending', transaction_date: '2025-12-27' },
  { id: '4', amount: 42.50, merchant_name: "Dunkin'", category: 'Meals', card_holder_name: 'Jon Godbout', state: 'cleared', transaction_date: '2025-12-26' },
  { id: '5', amount: 325.00, merchant_name: 'Zoom', category: 'Software', card_holder_name: 'Katya Shevchenko', state: 'cleared', transaction_date: '2025-12-25' },
];

export const sampleReimbursements: RampReimbursement[] = [
  { id: '1', user_name: 'Steve Knight', amount: 125.00, merchant: 'Walmart', status: 'pending', transaction_date: '2025-12-27', category: 'Program Supplies' },
  { id: '2', user_name: 'Karen Kusiak', amount: 45.50, merchant: 'Hannaford', status: 'approved', transaction_date: '2025-12-26', category: 'Food & Refreshments' },
  { id: '3', user_name: 'Isabelle Mehrhoff', amount: 78.00, merchant: 'CVS', status: 'pending', transaction_date: '2025-12-25', category: 'Medical Supplies' },
];

// Sample data for Neon CRM
export const sampleNeonDonors: NeonDonor[] = [
  { id: '1', firstName: 'Robert', lastName: 'Anderson', email: 'robert.anderson@example.com', totalDonations: 15000, donationCount: 12, lastDonationDate: '2025-12-15', membershipStatus: 'active', createdAt: '2020-03-15' },
  { id: '2', firstName: 'Susan', lastName: 'Williams', email: 'susan.williams@example.com', totalDonations: 8500, donationCount: 8, lastDonationDate: '2025-12-20', membershipStatus: 'active', createdAt: '2021-06-10' },
  { id: '3', firstName: 'Michael', lastName: 'Brown', email: 'michael.brown@example.com', totalDonations: 5200, donationCount: 5, lastDonationDate: '2025-11-30', membershipStatus: 'none', createdAt: '2022-01-20' },
  { id: '4', firstName: 'Jennifer', lastName: 'Davis', email: 'jennifer.davis@example.com', totalDonations: 3800, donationCount: 4, lastDonationDate: '2025-12-10', membershipStatus: 'expired', createdAt: '2021-09-05' },
  { id: '5', firstName: 'David', lastName: 'Miller', email: 'david.miller@example.com', totalDonations: 2500, donationCount: 3, lastDonationDate: '2025-12-22', membershipStatus: 'active', createdAt: '2023-04-12' },
];

export const sampleNeonDonations: NeonDonation[] = [
  { id: '1', donorId: '5', donorName: 'David Miller', amount: 500, date: '2025-12-22', campaign: 'Year-End Giving', fund: 'General Fund', paymentMethod: 'credit_card', status: 'completed', recurring: false },
  { id: '2', donorId: '2', donorName: 'Susan Williams', amount: 1000, date: '2025-12-20', campaign: 'Year-End Giving', fund: 'Housing Fund', paymentMethod: 'ach', status: 'completed', recurring: true },
  { id: '3', donorId: '1', donorName: 'Robert Anderson', amount: 2500, date: '2025-12-15', campaign: 'Capital Campaign', fund: 'Building Fund', paymentMethod: 'check', status: 'completed', recurring: false },
  { id: '4', donorId: '4', donorName: 'Jennifer Davis', amount: 250, date: '2025-12-10', campaign: 'Year-End Giving', fund: 'General Fund', paymentMethod: 'credit_card', status: 'completed', recurring: false },
  { id: '5', donorId: '3', donorName: 'Michael Brown', amount: 750, date: '2025-11-30', campaign: 'Education Initiative', fund: 'Education Fund', paymentMethod: 'credit_card', status: 'completed', recurring: false },
];

export const sampleNeonCampaigns: NeonCampaign[] = [
  { id: '1', name: 'Year-End Giving 2025', goal: 50000, raised: 32500, donorCount: 45, startDate: '2025-11-01', endDate: '2025-12-31', status: 'active' },
  { id: '2', name: 'Capital Campaign', goal: 250000, raised: 125000, donorCount: 28, startDate: '2025-01-01', endDate: '2026-12-31', status: 'active' },
  { id: '3', name: 'Education Initiative', goal: 25000, raised: 18500, donorCount: 35, startDate: '2025-09-01', endDate: '2025-12-15', status: 'completed' },
];

export const sampleNeonMemberships: NeonMembership[] = [
  { id: '1', donorId: '1', donorName: 'Robert Anderson', level: 'Patron', startDate: '2025-01-01', endDate: '2025-12-31', status: 'active', amount: 500, autoRenew: true },
  { id: '2', donorId: '2', donorName: 'Susan Williams', level: 'Supporter', startDate: '2025-03-15', endDate: '2026-03-14', status: 'active', amount: 250, autoRenew: true },
  { id: '3', donorId: '5', donorName: 'David Miller', level: 'Friend', startDate: '2025-06-01', endDate: '2026-05-31', status: 'active', amount: 100, autoRenew: false },
  { id: '4', donorId: '4', donorName: 'Jennifer Davis', level: 'Supporter', startDate: '2024-06-01', endDate: '2025-05-31', status: 'expired', amount: 250, autoRenew: false },
];

export const CHART_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

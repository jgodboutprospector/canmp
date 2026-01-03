'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  DollarSign,
  CreditCard,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Building2,
  Receipt,
  FileText,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  ChevronRight,
  ChevronDown,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Info,
  Hash,
  Tag,
  User,
  MapPin,
  Heart,
  Users,
  Target,
  Award,
  Repeat,
  Mail,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import { StatCard } from '@/components/ui/StatCard';
import {
  useFinancialDashboard,
  useAplosData,
  useRampData,
  useNeonData,
  type AplosFund,
  type AplosTransaction,
  type AplosIncomeStatementLine,
  type AplosTrialBalanceLine,
  type AplosYoYData,
  type RampCard,
  type RampTransaction,
  type RampReimbursement,
  type NeonDonor,
  type NeonDonation,
  type NeonCampaign,
  type NeonMembership,
} from '@/lib/hooks/useFinancialData';

// Types
type TabType = 'overview' | 'aplos' | 'ramp' | 'neon';
type AplosViewType = 'transactions' | 'income' | 'trial-balance' | 'yoy';
type RampViewType = 'cards' | 'transactions' | 'reimbursements';
type NeonViewType = 'donations' | 'donors' | 'campaigns' | 'memberships';
type DateRangeType = 'month' | 'quarter' | 'ytd' | 'year';

// Sample data for Aplos
const sampleFunds = [
  { id: '1', name: 'General Fund', balance: 125000, is_default: true },
  { id: '2', name: 'Housing Fund', balance: 45000, is_default: false },
  { id: '3', name: 'Education Fund', balance: 32000, is_default: false },
  { id: '4', name: 'Emergency Fund', balance: 18500, is_default: false },
];

const sampleAplosTransactions = [
  { id: '1', date: '2025-12-28', amount: 5000, memo: 'Grant from Maine Community Foundation', fund_name: 'General Fund', account_name: 'Grant Revenue', type: 'credit' as const },
  { id: '2', date: '2025-12-27', amount: 1200, memo: 'Monthly rent - 18 Union St', fund_name: 'Housing Fund', account_name: 'Rent Expense', type: 'debit' as const },
  { id: '3', date: '2025-12-26', amount: 2500, memo: 'Individual donation - Smith family', fund_name: 'General Fund', account_name: 'Donations', type: 'credit' as const },
  { id: '4', date: '2025-12-25', amount: 450, memo: 'Office supplies', fund_name: 'General Fund', account_name: 'Office Expense', type: 'debit' as const },
  { id: '5', date: '2025-12-24', amount: 800, memo: 'ESL classroom materials', fund_name: 'Education Fund', account_name: 'Program Expense', type: 'debit' as const },
];

const sampleIncomeStatement = [
  { category: 'Revenue', account_name: 'Grant Revenue', current_amount: 45000, ytd_amount: 180000 },
  { category: 'Revenue', account_name: 'Donations', current_amount: 12500, ytd_amount: 85000 },
  { category: 'Revenue', account_name: 'Program Fees', current_amount: 3200, ytd_amount: 24000 },
  { category: 'Expenses', account_name: 'Salaries', current_amount: 28000, ytd_amount: 112000 },
  { category: 'Expenses', account_name: 'Rent', current_amount: 8500, ytd_amount: 34000 },
  { category: 'Expenses', account_name: 'Program Expenses', current_amount: 5200, ytd_amount: 21000 },
  { category: 'Expenses', account_name: 'Utilities', current_amount: 1800, ytd_amount: 7200 },
];

const sampleTrialBalance = [
  { account_name: 'Cash', type: 'Asset', debit: 125000, credit: 0, net_balance: 125000 },
  { account_name: 'Accounts Receivable', type: 'Asset', debit: 15000, credit: 0, net_balance: 15000 },
  { account_name: 'Property', type: 'Asset', debit: 450000, credit: 0, net_balance: 450000 },
  { account_name: 'Accounts Payable', type: 'Liability', debit: 0, credit: 8500, net_balance: -8500 },
  { account_name: 'Net Assets', type: 'Equity', debit: 0, credit: 520000, net_balance: -520000 },
];

const sampleYoYData = [
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
const sampleRampCards = [
  { id: '1', display_name: 'Operations Card', last_four: '4521', cardholder_name: 'Katya Shevchenko', state: 'active' as const, is_physical: true, spending_limit: 5000, current_spend: 2340 },
  { id: '2', display_name: 'Program Expenses', last_four: '7892', cardholder_name: 'Nour Iskandafi', state: 'active' as const, is_physical: false, spending_limit: 3000, current_spend: 1850 },
  { id: '3', display_name: 'Travel Card', last_four: '3156', cardholder_name: 'Jon Godbout', state: 'suspended' as const, is_physical: true, spending_limit: 2000, current_spend: 0 },
];

const sampleRampTransactions = [
  { id: '1', amount: 245.50, merchant_name: 'Office Depot', category: 'Office Supplies', card_holder_name: 'Katya Shevchenko', state: 'cleared' as const, transaction_date: '2025-12-28' },
  { id: '2', amount: 89.99, merchant_name: 'Amazon', category: 'Program Supplies', card_holder_name: 'Nour Iskandafi', state: 'cleared' as const, transaction_date: '2025-12-27' },
  { id: '3', amount: 156.00, merchant_name: 'Staples', category: 'Office Supplies', card_holder_name: 'Katya Shevchenko', state: 'pending' as const, transaction_date: '2025-12-27' },
  { id: '4', amount: 42.50, merchant_name: "Dunkin'", category: 'Meals', card_holder_name: 'Jon Godbout', state: 'cleared' as const, transaction_date: '2025-12-26' },
  { id: '5', amount: 325.00, merchant_name: 'Zoom', category: 'Software', card_holder_name: 'Katya Shevchenko', state: 'cleared' as const, transaction_date: '2025-12-25' },
];

const sampleReimbursements = [
  { id: '1', user_name: 'Steve Knight', amount: 125.00, merchant: 'Walmart', status: 'pending' as const, transaction_date: '2025-12-27', category: 'Program Supplies' },
  { id: '2', user_name: 'Karen Kusiak', amount: 45.50, merchant: 'Hannaford', status: 'approved' as const, transaction_date: '2025-12-26', category: 'Food & Refreshments' },
  { id: '3', user_name: 'Isabelle Mehrhoff', amount: 78.00, merchant: 'CVS', status: 'pending' as const, transaction_date: '2025-12-25', category: 'Medical Supplies' },
];

// Sample data for Neon CRM
const sampleNeonDonors = [
  { id: '1', firstName: 'Robert', lastName: 'Anderson', email: 'robert.anderson@example.com', totalDonations: 15000, donationCount: 12, lastDonationDate: '2025-12-15', membershipStatus: 'active' as const, createdAt: '2020-03-15' },
  { id: '2', firstName: 'Susan', lastName: 'Williams', email: 'susan.williams@example.com', totalDonations: 8500, donationCount: 8, lastDonationDate: '2025-12-20', membershipStatus: 'active' as const, createdAt: '2021-06-10' },
  { id: '3', firstName: 'Michael', lastName: 'Brown', email: 'michael.brown@example.com', totalDonations: 5200, donationCount: 5, lastDonationDate: '2025-11-30', membershipStatus: 'none' as const, createdAt: '2022-01-20' },
  { id: '4', firstName: 'Jennifer', lastName: 'Davis', email: 'jennifer.davis@example.com', totalDonations: 3800, donationCount: 4, lastDonationDate: '2025-12-10', membershipStatus: 'expired' as const, createdAt: '2021-09-05' },
  { id: '5', firstName: 'David', lastName: 'Miller', email: 'david.miller@example.com', totalDonations: 2500, donationCount: 3, lastDonationDate: '2025-12-22', membershipStatus: 'active' as const, createdAt: '2023-04-12' },
];

const sampleNeonDonations = [
  { id: '1', donorId: '5', donorName: 'David Miller', amount: 500, date: '2025-12-22', campaign: 'Year-End Giving', fund: 'General Fund', paymentMethod: 'credit_card' as const, status: 'completed' as const, recurring: false },
  { id: '2', donorId: '2', donorName: 'Susan Williams', amount: 1000, date: '2025-12-20', campaign: 'Year-End Giving', fund: 'Housing Fund', paymentMethod: 'ach' as const, status: 'completed' as const, recurring: true },
  { id: '3', donorId: '1', donorName: 'Robert Anderson', amount: 2500, date: '2025-12-15', campaign: 'Capital Campaign', fund: 'Building Fund', paymentMethod: 'check' as const, status: 'completed' as const, recurring: false },
  { id: '4', donorId: '4', donorName: 'Jennifer Davis', amount: 250, date: '2025-12-10', campaign: 'Year-End Giving', fund: 'General Fund', paymentMethod: 'credit_card' as const, status: 'completed' as const, recurring: false },
  { id: '5', donorId: '3', donorName: 'Michael Brown', amount: 750, date: '2025-11-30', campaign: 'Education Initiative', fund: 'Education Fund', paymentMethod: 'credit_card' as const, status: 'completed' as const, recurring: false },
];

const sampleNeonCampaigns = [
  { id: '1', name: 'Year-End Giving 2025', goal: 50000, raised: 32500, donorCount: 45, startDate: '2025-11-01', endDate: '2025-12-31', status: 'active' as const },
  { id: '2', name: 'Capital Campaign', goal: 250000, raised: 125000, donorCount: 28, startDate: '2025-01-01', endDate: '2026-12-31', status: 'active' as const },
  { id: '3', name: 'Education Initiative', goal: 25000, raised: 18500, donorCount: 35, startDate: '2025-09-01', endDate: '2025-12-15', status: 'completed' as const },
];

const sampleNeonMemberships = [
  { id: '1', donorId: '1', donorName: 'Robert Anderson', level: 'Patron', startDate: '2025-01-01', endDate: '2025-12-31', status: 'active' as const, amount: 500, autoRenew: true },
  { id: '2', donorId: '2', donorName: 'Susan Williams', level: 'Supporter', startDate: '2025-03-15', endDate: '2026-03-14', status: 'active' as const, amount: 250, autoRenew: true },
  { id: '3', donorId: '5', donorName: 'David Miller', level: 'Friend', startDate: '2025-06-01', endDate: '2026-05-31', status: 'active' as const, amount: 100, autoRenew: false },
  { id: '4', donorId: '4', donorName: 'Jennifer Davis', level: 'Supporter', startDate: '2024-06-01', endDate: '2025-05-31', status: 'expired' as const, amount: 250, autoRenew: false },
];

const CHART_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function FinancialPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [aplosView, setAplosView] = useState<AplosViewType>('transactions');
  const [rampView, setRampView] = useState<RampViewType>('cards');
  const [neonView, setNeonView] = useState<NeonViewType>('donations');
  const [dateRange, setDateRange] = useState<DateRangeType>('month');
  const [selectedFund, setSelectedFund] = useState<string>('all');
  const [syncing, setSyncing] = useState(false);
  const [expandedAplosRows, setExpandedAplosRows] = useState<Set<string>>(new Set());
  const [expandedRampRows, setExpandedRampRows] = useState<Set<string>>(new Set());

  const toggleAplosRow = (id: string) => {
    setExpandedAplosRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleRampRow = (id: string) => {
    setExpandedRampRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Fetch data using hooks
  const { aplosData, rampData, loading: dashboardLoading, isDemo, refresh: refreshDashboard } = useFinancialDashboard();
  const { data: fundsData, refresh: refreshFunds } = useAplosData('funds');
  const { data: transactionsData, refresh: refreshTransactions } = useAplosData('transactions', selectedFund);
  const { data: incomeData } = useAplosData('income-statement');
  const { data: trialBalanceData } = useAplosData('trial-balance');
  const { data: yoyData } = useAplosData('yoy');
  const { data: cardsData, refresh: refreshCards } = useRampData('cards');
  const { data: rampTransactionsData, refresh: refreshRampTransactions } = useRampData('transactions');
  const { data: reimbursementsData, refresh: refreshReimbursements } = useRampData('reimbursements');
  const { data: neonDonorsData, refresh: refreshDonors } = useNeonData('donors');
  const { data: neonDonationsData, refresh: refreshDonations } = useNeonData('donations');
  const { data: neonCampaignsData, refresh: refreshCampaigns } = useNeonData('campaigns');
  const { data: neonMembershipsData, refresh: refreshMemberships } = useNeonData('memberships');

  // Use data from hooks or fallback to sample data
  const funds: AplosFund[] = fundsData || sampleFunds;
  const aplosTransactions: AplosTransaction[] = transactionsData || sampleAplosTransactions;
  const incomeStatement: AplosIncomeStatementLine[] = incomeData || sampleIncomeStatement;
  const trialBalance: AplosTrialBalanceLine[] = trialBalanceData || sampleTrialBalance;
  const yoyChartData: AplosYoYData[] = yoyData || sampleYoYData;
  const rampCards: RampCard[] = cardsData || sampleRampCards;
  const rampTransactionsList: RampTransaction[] = rampTransactionsData || sampleRampTransactions;
  const reimbursements: RampReimbursement[] = reimbursementsData || sampleReimbursements;
  const neonDonors: NeonDonor[] = neonDonorsData || sampleNeonDonors;
  const neonDonations: NeonDonation[] = neonDonationsData || sampleNeonDonations;
  const neonCampaigns: NeonCampaign[] = neonCampaignsData || sampleNeonCampaigns;
  const neonMemberships: NeonMembership[] = neonMembershipsData || sampleNeonMemberships;

  // Memoized calculations
  const fundTotals = useMemo(() => {
    return funds.reduce((sum, f) => sum + (f.balance || 0), 0);
  }, [funds]);

  const incomeTotal = useMemo(() => {
    return incomeStatement
      .filter(line => line.category === 'Revenue')
      .reduce((sum, line) => sum + line.current_amount, 0);
  }, [incomeStatement]);

  const expenseTotal = useMemo(() => {
    return incomeStatement
      .filter(line => line.category === 'Expenses')
      .reduce((sum, line) => sum + line.current_amount, 0);
  }, [incomeStatement]);

  const rampSpendTotal = useMemo(() => {
    return rampTransactionsList
      .filter(t => t.state === 'cleared')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [rampTransactionsList]);

  const pendingReimbursements = useMemo(() => {
    return reimbursements.filter(r => r.status === 'pending');
  }, [reimbursements]);

  const spendingByCategory = useMemo(() => {
    const categories: Record<string, number> = {};
    rampTransactionsList
      .filter(t => t.state === 'cleared')
      .forEach(t => {
        categories[t.category] = (categories[t.category] || 0) + t.amount;
      });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [rampTransactionsList]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await Promise.all([
        refreshDashboard(),
        refreshFunds(),
        refreshTransactions(),
        refreshCards(),
        refreshRampTransactions(),
        refreshReimbursements(),
        refreshDonors(),
        refreshDonations(),
        refreshCampaigns(),
        refreshMemberships(),
      ]);
    } finally {
      setSyncing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'cleared':
      case 'approved':
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'declined':
      case 'rejected':
      case 'suspended':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'cleared':
      case 'approved':
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'declined':
      case 'rejected':
      case 'suspended':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-full p-6">
      {/* Demo Data Banner */}
      {isDemo && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
          <Info className="w-4 h-4" />
          <span>
            Showing demo data. Configure Aplos and Ramp API credentials in environment variables to see live data.
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Financial Management
          </h1>
          <p className="text-sm text-gray-500">
            Aplos accounting and Ramp card management
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing || dashboardLoading}
          className="btn-primary"
        >
          {syncing || dashboardLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {syncing ? 'Syncing...' : dashboardLoading ? 'Loading...' : 'Refresh Data'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit mb-6">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'aplos', label: 'Aplos Accounting', icon: Building2 },
          { id: 'ramp', label: 'Ramp Cards', icon: CreditCard },
          { id: 'neon', label: 'Neon CRM', icon: Heart },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard
              label="Total Fund Balance"
              value={formatCurrency(fundTotals)}
              icon={<DollarSign className="w-5 h-5" />}
              variant="green"
            />
            <StatCard
              label="Monthly Income"
              value={formatCurrency(incomeTotal)}
              icon={<TrendingUp className="w-5 h-5" />}
              variant="blue"
            />
            <StatCard
              label="Monthly Expenses"
              value={formatCurrency(expenseTotal)}
              icon={<TrendingDown className="w-5 h-5" />}
              variant="red"
            />
            <StatCard
              label="Card Spend (MTD)"
              value={formatCurrency(rampSpendTotal)}
              icon={<CreditCard className="w-5 h-5" />}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-2 gap-6">
            {/* Year over Year Comparison */}
            <div className="card p-6">
              <h3 className="font-medium text-gray-900 mb-4">Revenue: Year over Year</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={yoyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#6b7280" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" tickFormatter={(v) => `$${v/1000}k`} />
                    <Tooltip
                      formatter={(value) => formatCurrency(value as number)}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="currentYear"
                      stroke="#22c55e"
                      strokeWidth={2}
                      name="2025"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="previousYear"
                      stroke="#94a3b8"
                      strokeWidth={2}
                      name="2024"
                      dot={false}
                      strokeDasharray="5 5"
                    />
                    <Legend />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Spending by Category */}
            <div className="card p-6">
              <h3 className="font-medium text-gray-900 mb-4">Card Spending by Category</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={spendingByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                    >
                      {spendingByCategory.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-2 gap-6">
            {/* Recent Aplos Transactions */}
            <div className="card">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-medium text-gray-900">Recent Accounting Entries</h3>
                <button
                  onClick={() => setActiveTab('aplos')}
                  className="text-sm text-canmp-green-600 hover:text-canmp-green-700"
                >
                  View All
                </button>
              </div>
              <div className="divide-y divide-gray-100">
                {aplosTransactions.slice(0, 4).map(txn => {
                  const contactName = txn.contact?.companyname ||
                    (txn.contact?.firstname && txn.contact?.lastname
                      ? `${txn.contact.firstname} ${txn.contact.lastname}`
                      : txn.fund_name || 'Unknown');

                  return (
                    <div key={String(txn.id)} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100">
                          <Receipt className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{txn.memo || contactName}</p>
                          <p className="text-xs text-gray-500">{contactName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(txn.amount)}
                        </p>
                        <p className="text-xs text-gray-500">{formatDate(txn.date)}</p>
                      </div>
                    </div>
                  );
                })}
                {aplosTransactions.length === 0 && (
                  <div className="p-8 text-center text-gray-400">
                    No transactions found
                  </div>
                )}
              </div>
            </div>

            {/* Pending Reimbursements */}
            <div className="card">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-medium text-gray-900">Pending Reimbursements</h3>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                  {pendingReimbursements.length} pending
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {pendingReimbursements.map(reimb => (
                  <div key={reimb.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
                        <Receipt className="w-4 h-4 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{reimb.user_name}</p>
                        <p className="text-xs text-gray-500">{reimb.merchant} - {reimb.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(reimb.amount)}
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(reimb.transaction_date)}</p>
                    </div>
                  </div>
                ))}
                {pendingReimbursements.length === 0 && (
                  <div className="p-8 text-center text-gray-400">
                    No pending reimbursements
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Funds Overview */}
          <div className="card">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-medium text-gray-900">Funds ({funds.length})</h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-4 gap-4">
                {funds.slice(0, 8).map(fund => (
                  <div key={String(fund.id)} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-900 truncate" title={fund.name}>{fund.name}</p>
                      {fund.is_default && (
                        <span className="text-xs px-2 py-0.5 bg-canmp-green-100 text-canmp-green-700 rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                    {fund.balance !== undefined ? (
                      <p className="text-xl font-semibold text-gray-900">
                        {formatCurrency(fund.balance)}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500">
                        Account: {fund.balance_account_number || 'N/A'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              {funds.length > 8 && (
                <p className="mt-3 text-sm text-gray-500 text-center">
                  + {funds.length - 8} more funds
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Aplos Tab */}
      {activeTab === 'aplos' && (
        <div className="space-y-6">
          {/* Aplos Sub-navigation */}
          <div className="flex gap-2">
            {[
              { id: 'transactions', label: 'Transactions', icon: Receipt },
              { id: 'income', label: 'Income Statement', icon: FileText },
              { id: 'trial-balance', label: 'Trial Balance', icon: BarChart3 },
              { id: 'yoy', label: 'Year over Year', icon: TrendingUp },
            ].map(view => (
              <button
                key={view.id}
                onClick={() => setAplosView(view.id as AplosViewType)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  aplosView === view.id
                    ? 'bg-canmp-green-50 text-canmp-green-700'
                    : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                <view.icon className="w-4 h-4" />
                {view.label}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="card p-4 flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Fund:</label>
              <select
                value={selectedFund}
                onChange={(e) => setSelectedFund(e.target.value)}
                className="input w-64"
              >
                <option value="all">All Funds ({funds.length})</option>
                {funds.map(fund => (
                  <option key={String(fund.id)} value={String(fund.id)}>{fund.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Period:</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRangeType)}
                className="input w-40"
              >
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="ytd">Year to Date</option>
                <option value="year">Last 12 Months</option>
              </select>
            </div>
            <button
              onClick={() => refreshTransactions()}
              className="btn-secondary ml-auto"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {/* Transactions View */}
          {aplosView === 'transactions' && (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="w-8 px-2"></th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {aplosTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        No transactions found
                      </td>
                    </tr>
                  ) : aplosTransactions.map(txn => {
                    const contactName = txn.contact?.companyname ||
                      (txn.contact?.firstname && txn.contact?.lastname
                        ? `${txn.contact.firstname} ${txn.contact.lastname}`
                        : txn.fund_name || 'Unknown');
                    const description = txn.memo || contactName;

                    return (
                    <React.Fragment key={String(txn.id)}>
                      <tr
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => toggleAplosRow(String(txn.id))}
                      >
                        <td className="px-2 py-3">
                          {expandedAplosRows.has(String(txn.id)) ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(txn.date)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded flex items-center justify-center bg-gray-100">
                              <Receipt className="w-3 h-3 text-gray-600" />
                            </div>
                            <span className="text-sm font-medium text-gray-900 truncate max-w-xs" title={description}>
                              {description || 'No description'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 truncate max-w-[150px]" title={contactName}>
                          {contactName}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full',
                            txn.is_reconciled ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          )}>
                            {txn.is_reconciled ? 'Reconciled' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-right text-gray-900">
                          {formatCurrency(txn.amount)}
                        </td>
                      </tr>
                      {expandedAplosRows.has(String(txn.id)) && (
                        <tr className="bg-gray-50">
                          <td colSpan={6} className="px-4 py-4">
                            <div className="ml-6 grid grid-cols-4 gap-6">
                              <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Transaction ID</p>
                                <div className="flex items-center gap-2">
                                  <Hash className="w-4 h-4 text-gray-400" />
                                  <p className="text-sm font-medium text-gray-900">{txn.id}</p>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Full Date</p>
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-gray-400" />
                                  <p className="text-sm font-medium text-gray-900">
                                    {new Date(txn.date).toLocaleDateString('en-US', {
                                      weekday: 'long',
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}
                                  </p>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Contact</p>
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-gray-400" />
                                  <p className="text-sm font-medium text-gray-900">{contactName}</p>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</p>
                                <span className={cn(
                                  'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full',
                                  txn.is_reconciled ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                )}>
                                  {txn.is_reconciled ? 'Reconciled' : 'Pending'}
                                </span>
                              </div>
                              {txn.memo && (
                                <div className="col-span-4">
                                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Memo</p>
                                  <p className="text-sm text-gray-700">{txn.memo}</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )})}
                </tbody>
              </table>
            </div>
          )}

          {/* Income Statement View */}
          {aplosView === 'income' && (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Current Period</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Year to Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr className="bg-green-50">
                    <td colSpan={3} className="px-4 py-2 text-sm font-semibold text-green-700">Revenue</td>
                  </tr>
                  {incomeStatement.filter(l => l.category === 'Revenue').map((line, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 pl-8">{line.account_name}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(line.current_amount)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(line.ytd_amount)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-medium">
                    <td className="px-4 py-2 text-sm text-gray-900">Total Revenue</td>
                    <td className="px-4 py-2 text-sm text-right text-green-600">{formatCurrency(incomeTotal)}</td>
                    <td className="px-4 py-2 text-sm text-right text-green-600">{formatCurrency(289000)}</td>
                  </tr>
                  <tr className="bg-red-50">
                    <td colSpan={3} className="px-4 py-2 text-sm font-semibold text-red-700">Expenses</td>
                  </tr>
                  {incomeStatement.filter(l => l.category === 'Expenses').map((line, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 pl-8">{line.account_name}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(line.current_amount)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(line.ytd_amount)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-medium">
                    <td className="px-4 py-2 text-sm text-gray-900">Total Expenses</td>
                    <td className="px-4 py-2 text-sm text-right text-red-600">{formatCurrency(expenseTotal)}</td>
                    <td className="px-4 py-2 text-sm text-right text-red-600">{formatCurrency(174200)}</td>
                  </tr>
                  <tr className="bg-canmp-green-50 font-semibold">
                    <td className="px-4 py-3 text-sm text-canmp-green-800">Net Income</td>
                    <td className="px-4 py-3 text-sm text-right text-canmp-green-700">{formatCurrency(incomeTotal - expenseTotal)}</td>
                    <td className="px-4 py-3 text-sm text-right text-canmp-green-700">{formatCurrency(114800)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Trial Balance View */}
          {aplosView === 'trial-balance' && (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {trialBalance.map((line, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{line.account_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{line.type}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {line.debit > 0 ? formatCurrency(line.debit) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {line.credit > 0 ? formatCurrency(line.credit) : '-'}
                      </td>
                      <td className={cn(
                        'px-4 py-3 text-sm text-right font-medium',
                        line.net_balance >= 0 ? 'text-gray-900' : 'text-red-600'
                      )}>
                        {formatCurrency(Math.abs(line.net_balance))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t font-medium">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-sm text-gray-900">Totals</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(590000)}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(528500)}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(61500)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Year over Year View */}
          {aplosView === 'yoy' && (
            <div className="card p-6">
              <h3 className="font-medium text-gray-900 mb-4">Revenue Comparison: 2025 vs 2024</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={yoyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#6b7280" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" tickFormatter={(v) => `$${v/1000}k`} />
                    <Tooltip
                      formatter={(value) => formatCurrency(value as number)}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    />
                    <Legend />
                    <Bar dataKey="currentYear" fill="#22c55e" name="2025" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="previousYear" fill="#94a3b8" name="2024" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ramp Tab */}
      {activeTab === 'ramp' && (
        <div className="space-y-6">
          {/* Ramp Sub-navigation */}
          <div className="flex gap-2">
            {[
              { id: 'cards', label: 'Cards', icon: CreditCard },
              { id: 'transactions', label: 'Transactions', icon: Receipt },
              { id: 'reimbursements', label: 'Reimbursements', icon: DollarSign },
            ].map(view => (
              <button
                key={view.id}
                onClick={() => setRampView(view.id as RampViewType)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  rampView === view.id
                    ? 'bg-canmp-green-50 text-canmp-green-700'
                    : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                <view.icon className="w-4 h-4" />
                {view.label}
              </button>
            ))}
          </div>

          {/* Cards View */}
          {rampView === 'cards' && (
            <div className="grid grid-cols-3 gap-4">
              {rampCards.map(card => (
                <div key={card.id} className="card p-5 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center',
                        card.state === 'active' ? 'bg-canmp-green-100' : 'bg-gray-100'
                      )}>
                        <CreditCard className={cn(
                          'w-5 h-5',
                          card.state === 'active' ? 'text-canmp-green-600' : 'text-gray-500'
                        )} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{card.display_name}</p>
                        <p className="text-sm text-gray-500">**** {card.last_four}</p>
                      </div>
                    </div>
                    <span className={cn(
                      'px-2 py-1 text-xs font-medium rounded-full capitalize',
                      getStatusColor(card.state)
                    )}>
                      {card.state}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>{card.cardholder_name}</span>
                      {card.is_physical && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">Physical</span>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">Spending</span>
                        <span className="font-medium">
                          {formatCurrency(card.current_spend)} / {formatCurrency(card.spending_limit)}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            (card.current_spend / card.spending_limit) > 0.8
                              ? 'bg-red-500'
                              : (card.current_spend / card.spending_limit) > 0.5
                              ? 'bg-yellow-500'
                              : 'bg-canmp-green-500'
                          )}
                          style={{ width: `${(card.current_spend / card.spending_limit) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Transactions View */}
          {rampView === 'transactions' && (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="w-8 px-2"></th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Merchant</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cardholder</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rampTransactionsList.map(txn => (
                    <>
                      <tr
                        key={txn.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => toggleRampRow(txn.id)}
                      >
                        <td className="px-2 py-3">
                          {expandedRampRows.has(txn.id) ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(txn.transaction_date)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{txn.merchant_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{txn.category}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{txn.card_holder_name}</td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full capitalize',
                            getStatusColor(txn.state)
                          )}>
                            {getStatusIcon(txn.state)}
                            {txn.state}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-right text-gray-900">
                          {formatCurrency(txn.amount)}
                        </td>
                      </tr>
                      {expandedRampRows.has(txn.id) && (
                        <tr key={`${txn.id}-details`} className="bg-gray-50">
                          <td colSpan={7} className="px-4 py-4">
                            <div className="ml-6 grid grid-cols-4 gap-6">
                              <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Transaction ID</p>
                                <div className="flex items-center gap-2">
                                  <Hash className="w-4 h-4 text-gray-400" />
                                  <p className="text-sm font-medium text-gray-900">{txn.id}</p>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Full Date</p>
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-gray-400" />
                                  <p className="text-sm font-medium text-gray-900">
                                    {new Date(txn.transaction_date).toLocaleDateString('en-US', {
                                      weekday: 'long',
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}
                                  </p>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Category</p>
                                <div className="flex items-center gap-2">
                                  <Tag className="w-4 h-4 text-gray-400" />
                                  <p className="text-sm font-medium text-gray-900">{txn.category}</p>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Cardholder</p>
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-gray-400" />
                                  <p className="text-sm font-medium text-gray-900">{txn.card_holder_name}</p>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Merchant</p>
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-gray-400" />
                                  <p className="text-sm font-medium text-gray-900">{txn.merchant_name}</p>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</p>
                                <span className={cn(
                                  'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full capitalize',
                                  getStatusColor(txn.state)
                                )}>
                                  {getStatusIcon(txn.state)}
                                  {txn.state}
                                </span>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Amount</p>
                                <p className="text-sm font-semibold text-gray-900">{formatCurrency(txn.amount)}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Reimbursements View */}
          {rampView === 'reimbursements' && (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requester</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Merchant</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reimbursements.map(reimb => (
                    <tr key={reimb.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(reimb.transaction_date)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{reimb.user_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{reimb.merchant}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{reimb.category}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full capitalize',
                          getStatusColor(reimb.status)
                        )}>
                          {getStatusIcon(reimb.status)}
                          {reimb.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-right text-gray-900">
                        {formatCurrency(reimb.amount)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {reimb.status === 'pending' && (
                          <div className="flex gap-2 justify-end">
                            <button className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200">
                              Approve
                            </button>
                            <button className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200">
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Neon CRM Tab */}
      {activeTab === 'neon' && (
        <div className="space-y-6">
          {/* Neon Sub-navigation */}
          <div className="flex gap-2">
            {[
              { id: 'donations', label: 'Donations', icon: Heart },
              { id: 'donors', label: 'Donors', icon: Users },
              { id: 'campaigns', label: 'Campaigns', icon: Target },
              { id: 'memberships', label: 'Memberships', icon: Award },
            ].map(view => (
              <button
                key={view.id}
                onClick={() => setNeonView(view.id as NeonViewType)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  neonView === view.id
                    ? 'bg-canmp-green-50 text-canmp-green-700'
                    : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                <view.icon className="w-4 h-4" />
                {view.label}
              </button>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard
              label="Total Donations"
              value={formatCurrency(neonDonations.reduce((sum, d) => sum + d.amount, 0))}
              icon={<Heart className="w-5 h-5" />}
              variant="green"
            />
            <StatCard
              label="Active Donors"
              value={neonDonors.length.toString()}
              icon={<Users className="w-5 h-5" />}
              variant="blue"
            />
            <StatCard
              label="Active Campaigns"
              value={neonCampaigns.filter(c => c.status === 'active').length.toString()}
              icon={<Target className="w-5 h-5" />}
            />
            <StatCard
              label="Active Members"
              value={neonMemberships.filter(m => m.status === 'active').length.toString()}
              icon={<Award className="w-5 h-5" />}
            />
          </div>

          {/* Donations View */}
          {neonView === 'donations' && (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Donor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fund</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {neonDonations.map(donation => (
                    <tr key={donation.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(donation.date)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          {donation.donorName}
                          {donation.recurring && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                              <Repeat className="w-3 h-3" />
                              Recurring
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{donation.campaign || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{donation.fund || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 capitalize">
                        {donation.paymentMethod.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full capitalize',
                          getStatusColor(donation.status)
                        )}>
                          {getStatusIcon(donation.status)}
                          {donation.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-right text-green-600">
                        +{formatCurrency(donation.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Donors View */}
          {neonView === 'donors' && (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Donor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Membership</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Donations</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Given</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Gift</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {neonDonors.map(donor => (
                    <tr key={donor.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-canmp-green-100 flex items-center justify-center text-canmp-green-700 font-medium">
                            {donor.firstName[0]}{donor.lastName[0]}
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {donor.firstName} {donor.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {donor.email}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {donor.membershipStatus && donor.membershipStatus !== 'none' ? (
                          <span className={cn(
                            'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full capitalize',
                            getStatusColor(donor.membershipStatus)
                          )}>
                            {getStatusIcon(donor.membershipStatus)}
                            {donor.membershipStatus}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">{donor.donationCount}</td>
                      <td className="px-4 py-3 text-sm font-medium text-right text-green-600">
                        {formatCurrency(donor.totalDonations)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {donor.lastDonationDate ? formatDate(donor.lastDonationDate) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Campaigns View */}
          {neonView === 'campaigns' && (
            <div className="grid grid-cols-2 gap-4">
              {neonCampaigns.map(campaign => {
                const progress = campaign.goal > 0 ? (campaign.raised / campaign.goal) * 100 : 0;
                return (
                  <div key={campaign.id} className="card p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-medium text-gray-900">{campaign.name}</h3>
                        <p className="text-sm text-gray-500">
                          {formatDate(campaign.startDate)} - {campaign.endDate ? formatDate(campaign.endDate) : 'Ongoing'}
                        </p>
                      </div>
                      <span className={cn(
                        'px-2 py-1 text-xs font-medium rounded-full capitalize',
                        campaign.status === 'active' ? 'bg-green-100 text-green-700' :
                        campaign.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      )}>
                        {campaign.status}
                      </span>
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">Progress</span>
                        <span className="font-medium">
                          {formatCurrency(campaign.raised)} / {formatCurrency(campaign.goal)}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            progress >= 100 ? 'bg-green-500' :
                            progress >= 75 ? 'bg-canmp-green-500' :
                            progress >= 50 ? 'bg-yellow-500' :
                            'bg-red-500'
                          )}
                          style={{ width: `${Math.min(100, progress)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{Math.round(progress)}% of goal</p>
                    </div>

                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-1 text-gray-500">
                        <Users className="w-4 h-4" />
                        {campaign.donorCount} donors
                      </div>
                      <div className="font-medium text-green-600">
                        {formatCurrency(campaign.goal - campaign.raised)} to go
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Memberships View */}
          {neonView === 'memberships' && (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiration</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Auto-Renew</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {neonMemberships.map(membership => (
                    <tr key={membership.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{membership.donorName}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                          {membership.level}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(membership.startDate)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(membership.endDate)}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full capitalize',
                          getStatusColor(membership.status)
                        )}>
                          {getStatusIcon(membership.status)}
                          {membership.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {membership.autoRenew ? (
                          <span className="flex items-center gap-1 text-green-600 text-sm">
                            <CheckCircle className="w-4 h-4" />
                            Yes
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-right text-gray-900">
                        {formatCurrency(membership.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

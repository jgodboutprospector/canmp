'use client';

import { useState, useMemo } from 'react';
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
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
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

// Types
type TabType = 'overview' | 'aplos' | 'ramp';
type AplosViewType = 'transactions' | 'income' | 'trial-balance' | 'yoy';
type RampViewType = 'cards' | 'transactions' | 'reimbursements';
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

const CHART_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function FinancialPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [aplosView, setAplosView] = useState<AplosViewType>('transactions');
  const [rampView, setRampView] = useState<RampViewType>('cards');
  const [dateRange, setDateRange] = useState<DateRangeType>('month');
  const [selectedFund, setSelectedFund] = useState<string>('all');
  const [syncing, setSyncing] = useState(false);

  // Memoized calculations
  const fundTotals = useMemo(() => {
    return sampleFunds.reduce((sum, f) => sum + f.balance, 0);
  }, []);

  const incomeTotal = useMemo(() => {
    return sampleIncomeStatement
      .filter(line => line.category === 'Revenue')
      .reduce((sum, line) => sum + line.current_amount, 0);
  }, []);

  const expenseTotal = useMemo(() => {
    return sampleIncomeStatement
      .filter(line => line.category === 'Expenses')
      .reduce((sum, line) => sum + line.current_amount, 0);
  }, []);

  const rampSpendTotal = useMemo(() => {
    return sampleRampTransactions
      .filter(t => t.state === 'cleared')
      .reduce((sum, t) => sum + t.amount, 0);
  }, []);

  const pendingReimbursements = useMemo(() => {
    return sampleReimbursements.filter(r => r.status === 'pending');
  }, []);

  const spendingByCategory = useMemo(() => {
    const categories: Record<string, number> = {};
    sampleRampTransactions
      .filter(t => t.state === 'cleared')
      .forEach(t => {
        categories[t.category] = (categories[t.category] || 0) + t.amount;
      });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    // Simulate sync
    await new Promise(resolve => setTimeout(resolve, 2000));
    setSyncing(false);
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
          disabled={syncing}
          className="btn-primary"
        >
          {syncing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {syncing ? 'Syncing...' : 'Sync All'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit mb-6">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'aplos', label: 'Aplos Accounting', icon: Building2 },
          { id: 'ramp', label: 'Ramp Cards', icon: CreditCard },
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
                  <LineChart data={sampleYoYData}>
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
                {sampleAplosTransactions.slice(0, 4).map(txn => (
                  <div key={txn.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        txn.type === 'credit' ? 'bg-green-100' : 'bg-red-100'
                      )}>
                        {txn.type === 'credit' ? (
                          <ArrowUpRight className="w-4 h-4 text-green-600" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{txn.memo}</p>
                        <p className="text-xs text-gray-500">{txn.fund_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        'text-sm font-medium',
                        txn.type === 'credit' ? 'text-green-600' : 'text-red-600'
                      )}>
                        {txn.type === 'credit' ? '+' : '-'}{formatCurrency(txn.amount)}
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(txn.date)}</p>
                    </div>
                  </div>
                ))}
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
              <h3 className="font-medium text-gray-900">Fund Balances</h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-4 gap-4">
                {sampleFunds.map(fund => (
                  <div key={fund.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-900">{fund.name}</p>
                      {fund.is_default && (
                        <span className="text-xs px-2 py-0.5 bg-canmp-green-100 text-canmp-green-700 rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xl font-semibold text-gray-900">
                      {formatCurrency(fund.balance)}
                    </p>
                  </div>
                ))}
              </div>
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
          <div className="card p-4 flex gap-4">
            <select
              value={selectedFund}
              onChange={(e) => setSelectedFund(e.target.value)}
              className="input w-48"
            >
              <option value="all">All Funds</option>
              {sampleFunds.map(fund => (
                <option key={fund.id} value={fund.id}>{fund.name}</option>
              ))}
            </select>
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

          {/* Transactions View */}
          {aplosView === 'transactions' && (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fund</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sampleAplosTransactions.map(txn => (
                    <tr key={txn.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(txn.date)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'w-6 h-6 rounded flex items-center justify-center',
                            txn.type === 'credit' ? 'bg-green-100' : 'bg-red-100'
                          )}>
                            {txn.type === 'credit' ? (
                              <ArrowUpRight className="w-3 h-3 text-green-600" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3 text-red-600" />
                            )}
                          </div>
                          <span className="text-sm font-medium text-gray-900">{txn.memo}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{txn.fund_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{txn.account_name}</td>
                      <td className={cn(
                        'px-4 py-3 text-sm font-medium text-right',
                        txn.type === 'credit' ? 'text-green-600' : 'text-red-600'
                      )}>
                        {txn.type === 'credit' ? '+' : '-'}{formatCurrency(txn.amount)}
                      </td>
                    </tr>
                  ))}
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
                  {sampleIncomeStatement.filter(l => l.category === 'Revenue').map((line, i) => (
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
                  {sampleIncomeStatement.filter(l => l.category === 'Expenses').map((line, i) => (
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
                  {sampleTrialBalance.map((line, i) => (
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
                  <BarChart data={sampleYoYData}>
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
              {sampleRampCards.map(card => (
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Merchant</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cardholder</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sampleRampTransactions.map(txn => (
                    <tr key={txn.id} className="hover:bg-gray-50">
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
                  {sampleReimbursements.map(reimb => (
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
    </div>
  );
}

'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  CreditCard,
  TrendingUp,
  RefreshCw,
  Building2,
  Receipt,
  FileText,
  BarChart3,
  ChevronRight,
  ChevronDown,
  Loader2,
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
  Download,
  Calendar,
  DollarSign,
  CheckCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import { StatCard } from '@/components/ui/StatCard';
import {
  exportToCSV,
  aplosTransactionsExportConfig,
  aplosIncomeStatementExportConfig,
  aplosTrialBalanceExportConfig,
  rampTransactionsExportConfig,
  rampCardsExportConfig,
  rampReimbursementsExportConfig,
  neonDonationsExportConfig,
  neonDonorsExportConfig,
  neonCampaignsExportConfig,
  neonMembershipsExportConfig,
} from '@/lib/utils/export';
import {
  formatCurrency,
  formatDate,
  getStatusColor,
  getStatusIcon,
} from '@/lib/utils/financial';
import {
  sampleFunds,
  sampleAplosTransactions,
  sampleIncomeStatement,
  sampleTrialBalance,
  sampleYoYData,
  sampleRampCards,
  sampleRampTransactions,
  sampleReimbursements,
  sampleNeonDonors,
  sampleNeonDonations,
  sampleNeonCampaigns,
  sampleNeonMemberships,
  CHART_COLORS,
} from '@/lib/demo-data/financial';
import { OverviewTab } from '@/components/modules/financial';
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

  // Export handlers
  const handleExport = useCallback(() => {
    const dateStr = new Date().toISOString().split('T')[0];

    switch (activeTab) {
      case 'aplos':
        switch (aplosView) {
          case 'transactions':
            exportToCSV(aplosTransactions, {
              filename: `aplos-transactions-${dateStr}`,
              ...aplosTransactionsExportConfig,
            });
            break;
          case 'income':
            exportToCSV(incomeStatement, {
              filename: `aplos-income-statement-${dateStr}`,
              ...aplosIncomeStatementExportConfig,
            });
            break;
          case 'trial-balance':
            exportToCSV(trialBalance, {
              filename: `aplos-trial-balance-${dateStr}`,
              ...aplosTrialBalanceExportConfig,
            });
            break;
        }
        break;
      case 'ramp':
        switch (rampView) {
          case 'cards':
            exportToCSV(rampCards, {
              filename: `ramp-cards-${dateStr}`,
              ...rampCardsExportConfig,
            });
            break;
          case 'transactions':
            exportToCSV(rampTransactionsList, {
              filename: `ramp-transactions-${dateStr}`,
              ...rampTransactionsExportConfig,
            });
            break;
          case 'reimbursements':
            exportToCSV(reimbursements, {
              filename: `ramp-reimbursements-${dateStr}`,
              ...rampReimbursementsExportConfig,
            });
            break;
        }
        break;
      case 'neon':
        switch (neonView) {
          case 'donations':
            exportToCSV(neonDonations, {
              filename: `neon-donations-${dateStr}`,
              ...neonDonationsExportConfig,
            });
            break;
          case 'donors':
            exportToCSV(neonDonors, {
              filename: `neon-donors-${dateStr}`,
              ...neonDonorsExportConfig,
            });
            break;
          case 'campaigns':
            exportToCSV(neonCampaigns, {
              filename: `neon-campaigns-${dateStr}`,
              ...neonCampaignsExportConfig,
            });
            break;
          case 'memberships':
            exportToCSV(neonMemberships, {
              filename: `neon-memberships-${dateStr}`,
              ...neonMembershipsExportConfig,
            });
            break;
        }
        break;
    }
  }, [activeTab, aplosView, rampView, neonView, aplosTransactions, incomeStatement, trialBalance, rampCards, rampTransactionsList, reimbursements, neonDonations, neonDonors, neonCampaigns, neonMemberships]);

  const getExportLabel = () => {
    switch (activeTab) {
      case 'aplos':
        return aplosView === 'yoy' ? null : `Export ${aplosView === 'transactions' ? 'Transactions' : aplosView === 'income' ? 'Income Statement' : 'Trial Balance'}`;
      case 'ramp':
        return `Export ${rampView === 'cards' ? 'Cards' : rampView === 'transactions' ? 'Transactions' : 'Reimbursements'}`;
      case 'neon':
        return `Export ${neonView === 'donations' ? 'Donations' : neonView === 'donors' ? 'Donors' : neonView === 'campaigns' ? 'Campaigns' : 'Memberships'}`;
      default:
        return null;
    }
  };

  const exportLabel = getExportLabel();

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
        <div className="flex items-center gap-2">
          {exportLabel && (
            <button
              onClick={handleExport}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              {exportLabel}
            </button>
          )}
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
        <OverviewTab
          fundTotals={fundTotals}
          incomeTotal={incomeTotal}
          expenseTotal={expenseTotal}
          rampSpendTotal={rampSpendTotal}
          yoyChartData={yoyChartData}
          spendingByCategory={spendingByCategory}
          aplosTransactions={aplosTransactions}
          pendingReimbursements={pendingReimbursements}
          funds={funds}
          onNavigateToAplos={() => setActiveTab('aplos')}
        />
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

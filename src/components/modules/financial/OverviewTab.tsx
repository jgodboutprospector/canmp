'use client';

import React from 'react';
import {
  DollarSign,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Receipt,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { StatCard } from '@/components/ui/StatCard';
import { formatCurrency, formatDate } from '@/lib/utils/financial';
import { CHART_COLORS } from '@/lib/demo-data/financial';
import type {
  AplosFund,
  AplosTransaction,
  AplosYoYData,
  RampReimbursement,
} from '@/lib/hooks/useFinancialData';

interface OverviewTabProps {
  fundTotals: number;
  incomeTotal: number;
  expenseTotal: number;
  rampSpendTotal: number;
  yoyChartData: AplosYoYData[];
  spendingByCategory: { name: string; value: number }[];
  aplosTransactions: AplosTransaction[];
  pendingReimbursements: RampReimbursement[];
  funds: AplosFund[];
  onNavigateToAplos: () => void;
}

export function OverviewTab({
  fundTotals,
  incomeTotal,
  expenseTotal,
  rampSpendTotal,
  yoyChartData,
  spendingByCategory,
  aplosTransactions,
  pendingReimbursements,
  funds,
  onNavigateToAplos,
}: OverviewTabProps) {
  return (
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
              onClick={onNavigateToAplos}
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
  );
}

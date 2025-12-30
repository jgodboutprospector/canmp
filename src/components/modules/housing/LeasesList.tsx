'use client';

import { useState } from 'react';
import { Plus, Search, Users, ChevronRight, FileText, TrendingUp, DollarSign, CheckCircle } from 'lucide-react';
import { cn, formatCurrency, getLeaseTypeLabel, getLeaseTypeBadgeVariant, calculateProgress } from '@/lib/utils';

// Mock data - will be replaced with Supabase query
const leases = [
  {
    id: '1',
    household: 'Aldeek Family',
    memberCount: 3,
    property: '18 Union Street',
    unit: 'Unit 1',
    type: 'canmp_direct',
    status: 'active',
    tenantPays: 1600,
    subsidyAmount: 0,
  },
  {
    id: '2',
    household: 'Bozan Family',
    memberCount: 2,
    property: '12 Chapel Street',
    unit: 'Unit 1',
    type: 'canmp_direct',
    status: 'active',
    tenantPays: 1800,
    subsidyAmount: 0,
  },
  {
    id: '3',
    household: 'Posso Family',
    memberCount: 3,
    property: '37 Pearl Street',
    unit: 'Unit A',
    type: 'master_sublease',
    status: 'active',
    tenantPays: 1200,
    subsidyAmount: 0,
  },
  {
    id: '4',
    household: 'Okonkwo Family',
    memberCount: 4,
    property: '20 Union Street',
    unit: 'Unit 2',
    type: 'bridge',
    status: 'active',
    tenantPays: 900,
    subsidyAmount: 400,
    programMonth: 8,
    totalProgramMonths: 24,
  },
];

export default function LeasesList() {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  const filtered = leases.filter((l) => {
    const matchesSearch =
      l.household.toLowerCase().includes(search.toLowerCase()) ||
      l.property.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || l.type === filterType;
    return matchesSearch && matchesType;
  });

  const activeCount = leases.filter((l) => l.status === 'active').length;
  const bridgeCount = leases.filter((l) => l.type === 'bridge').length;
  const monthlyRevenue = leases.reduce((sum, l) => sum + l.tenantPays, 0);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>Leases</h1>
          <p className="text-sm text-gray-500">Manage tenant leases and bridge program progress</p>
        </div>
        <button className="btn-primary">
          <Plus className="w-4 h-4" />
          New Lease
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Leases</p>
              <p className="text-2xl font-semibold">{activeCount}</p>
            </div>
            <FileText className="w-8 h-8 text-canmp-green-200" />
          </div>
        </div>
        <div className="card p-4">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Bridge Program</p>
              <p className="text-2xl font-semibold">{bridgeCount}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-200" />
          </div>
        </div>
        <div className="card p-4">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Transitions</p>
              <p className="text-2xl font-semibold">4</p>
            </div>
            <CheckCircle className="w-8 h-8 text-canmp-green-200" />
          </div>
        </div>
        <div className="card p-4">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Monthly Revenue</p>
              <p className="text-2xl font-semibold">{formatCurrency(monthlyRevenue)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-canmp-sage-200" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search households or properties..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="input w-48"
          >
            <option value="all">All Types</option>
            <option value="canmp_direct">CANMP Direct</option>
            <option value="master_sublease">Master Sublease</option>
            <option value="bridge">Bridge Program</option>
          </select>
        </div>
      </div>

      {/* Leases Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="table-header">Household</th>
              <th className="table-header">Property</th>
              <th className="table-header">Type</th>
              <th className="table-header">Rent</th>
              <th className="table-header">Progress</th>
              <th className="table-header"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((lease) => (
              <tr key={lease.id} className="table-row cursor-pointer">
                <td className="table-cell">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-canmp-green-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-canmp-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{lease.household}</p>
                      <p className="text-sm text-gray-500">{lease.memberCount} members</p>
                    </div>
                  </div>
                </td>
                <td className="table-cell">
                  <p className="font-medium text-gray-900">{lease.property}</p>
                  <p className="text-sm text-gray-500">{lease.unit}</p>
                </td>
                <td className="table-cell">
                  <span className={`badge badge-${getLeaseTypeBadgeVariant(lease.type)}`}>
                    {getLeaseTypeLabel(lease.type)}
                  </span>
                </td>
                <td className="table-cell">
                  <p className="font-medium text-gray-900">{formatCurrency(lease.tenantPays)}/mo</p>
                  {lease.subsidyAmount > 0 && (
                    <p className="text-sm text-gray-500">+{formatCurrency(lease.subsidyAmount)} subsidy</p>
                  )}
                </td>
                <td className="table-cell w-44">
                  {lease.type === 'bridge' && lease.programMonth && (
                    <div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${calculateProgress(lease.programMonth, lease.totalProgramMonths!)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {calculateProgress(lease.programMonth, lease.totalProgramMonths!)}% ({lease.programMonth}/{lease.totalProgramMonths} mo)
                      </p>
                    </div>
                  )}
                </td>
                <td className="table-cell text-right">
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

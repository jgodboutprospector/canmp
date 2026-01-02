'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Users,
  ChevronRight,
  FileText,
  TrendingUp,
  DollarSign,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import {
  cn,
  formatCurrency,
  getLeaseTypeLabel,
  getLeaseTypeBadgeVariant,
  calculateProgress,
} from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { LeaseDetailModal } from './LeaseDetailModal';
import { AddLeaseModal } from './AddLeaseModal';

interface Lease {
  id: string;
  status: string;
  lease_type: string;
  monthly_rent: number;
  tenant_pays: number;
  subsidy_amount: number;
  program_month: number | null;
  total_program_months: number | null;
  household: {
    id: string;
    name: string;
    beneficiaries: { id: string }[];
  } | null;
  unit: {
    id: string;
    unit_number: string;
    property: {
      id: string;
      name: string;
    } | null;
  } | null;
}

export default function LeasesList() {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedLeaseId, setSelectedLeaseId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchLeases();
  }, []);

  async function fetchLeases() {
    try {
      const { data, error } = await (supabase as any)
        .from('leases')
        .select(
          `
          id, status, lease_type, monthly_rent, tenant_pays, subsidy_amount,
          program_month, total_program_months,
          household:households(id, name, beneficiaries:beneficiaries(id)),
          unit:units(id, unit_number, property:properties(id, name))
        `
        )
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeases(data || []);
    } catch (err) {
      console.error('Error fetching leases:', err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = leases.filter((l) => {
    const matchesSearch =
      l.household?.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.unit?.property?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || l.lease_type === filterType;
    return matchesSearch && matchesType;
  });

  const activeCount = leases.length;
  const bridgeCount = leases.filter((l) => l.lease_type === 'bridge').length;
  const monthlyRevenue = leases.reduce((sum, l) => sum + (l.tenant_pays || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-canmp-green-500" />
        <span className="ml-2 text-gray-500">Loading leases...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1
            className="text-xl font-semibold text-gray-900"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            Leases
          </h1>
          <p className="text-sm text-gray-500">
            Manage tenant leases and bridge program progress
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
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
              <p className="text-2xl font-semibold">
                {leases.filter((l) => l.status === 'completed').length}
              </p>
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
              <tr
                key={lease.id}
                onClick={() => setSelectedLeaseId(lease.id)}
                className="table-row cursor-pointer"
              >
                <td className="table-cell">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-canmp-green-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-canmp-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {lease.household?.name || 'Unknown'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {lease.household?.beneficiaries?.length || 0} members
                      </p>
                    </div>
                  </div>
                </td>
                <td className="table-cell">
                  <p className="font-medium text-gray-900">
                    {lease.unit?.property?.name || 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-500">{lease.unit?.unit_number}</p>
                </td>
                <td className="table-cell">
                  <span className={`badge badge-${getLeaseTypeBadgeVariant(lease.lease_type)}`}>
                    {getLeaseTypeLabel(lease.lease_type)}
                  </span>
                </td>
                <td className="table-cell">
                  <p className="font-medium text-gray-900">
                    {formatCurrency(lease.tenant_pays || 0)}/mo
                  </p>
                  {(lease.subsidy_amount || 0) > 0 && (
                    <p className="text-sm text-gray-500">
                      +{formatCurrency(lease.subsidy_amount)} subsidy
                    </p>
                  )}
                </td>
                <td className="table-cell w-44">
                  {lease.lease_type === 'bridge' && lease.program_month && (
                    <div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{
                            width: `${calculateProgress(
                              lease.program_month,
                              lease.total_program_months || 24
                            )}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {calculateProgress(
                          lease.program_month,
                          lease.total_program_months || 24
                        )}
                        % ({lease.program_month}/{lease.total_program_months || 24} mo)
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

        {filtered.length === 0 && (
          <div className="p-12 text-center text-gray-400">
            No leases found matching your criteria.
          </div>
        )}
      </div>

      {/* Add Lease Modal */}
      <AddLeaseModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchLeases}
      />

      {/* Lease Detail Modal */}
      {selectedLeaseId && (
        <LeaseDetailModal
          isOpen={!!selectedLeaseId}
          onClose={() => setSelectedLeaseId(null)}
          leaseId={selectedLeaseId}
        />
      )}
    </div>
  );
}

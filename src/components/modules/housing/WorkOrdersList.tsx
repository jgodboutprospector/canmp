'use client';

import { useState } from 'react';
import { Plus, Search, ChevronRight, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { cn, formatDate, getWorkOrderStatusLabel, getStatusBadgeVariant, getPriorityBadgeVariant, getCategoryEmoji } from '@/lib/utils';
import { AddWorkOrderModal } from './AddWorkOrderModal';

// Mock data - will be replaced with Supabase query
const workOrders = [
  {
    id: '1',
    title: 'Leaking faucet in kitchen',
    property: '18 Union Street',
    unit: 'Unit 1',
    household: 'Aldeek Family',
    category: 'plumbing',
    priority: 'medium',
    status: 'in_progress',
    reportedDate: '2025-12-10',
    assignedTo: 'Jim Godbout Plumbing',
    scheduledDate: '2025-12-14',
  },
  {
    id: '2',
    title: 'Furnace not heating properly',
    property: '12 Chapel Street',
    unit: 'Unit 1',
    household: 'Bozan Family',
    category: 'hvac',
    priority: 'urgent',
    status: 'open',
    reportedDate: '2025-12-13',
  },
  {
    id: '3',
    title: 'Smoke detector batteries',
    property: '37 Pearl Street',
    unit: 'Unit A',
    household: 'Posso Family',
    category: 'safety',
    priority: 'low',
    status: 'open',
    reportedDate: '2025-12-08',
  },
  {
    id: '4',
    title: 'Dishwasher not draining',
    property: '20 Union Street',
    unit: 'Unit 2',
    household: 'Okonkwo Family',
    category: 'appliance',
    priority: 'medium',
    status: 'completed',
    reportedDate: '2025-12-01',
    completedDate: '2025-12-03',
    cost: 175,
  },
];

export default function WorkOrdersList() {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  const filtered = workOrders.filter((wo) => {
    const matchesSearch =
      wo.title.toLowerCase().includes(search.toLowerCase()) ||
      wo.property.toLowerCase().includes(search.toLowerCase()) ||
      wo.household.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || wo.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const openCount = workOrders.filter((wo) => wo.status === 'open').length;
  const inProgressCount = workOrders.filter((wo) => wo.status === 'in_progress' || wo.status === 'scheduled').length;
  const urgentCount = workOrders.filter((wo) => wo.priority === 'urgent' && wo.status !== 'completed').length;
  const completedCount = workOrders.filter((wo) => wo.status === 'completed').length;

  // Kanban columns
  const kanbanColumns = [
    { id: 'open', label: 'Open', color: 'yellow' },
    { id: 'in_progress', label: 'In Progress', color: 'purple' },
    { id: 'completed', label: 'Completed', color: 'green' },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>Work Orders</h1>
          <p className="text-sm text-gray-500">Track and manage maintenance requests</p>
        </div>
        <div className="flex gap-2">
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              )}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                viewMode === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              )}
            >
              Kanban
            </button>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            New Work Order
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Open</p>
              <p className="text-2xl font-semibold">{openCount}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-200" />
          </div>
        </div>
        <div className="card p-4">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">In Progress</p>
              <p className="text-2xl font-semibold">{inProgressCount}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-200" />
          </div>
        </div>
        <div className="card p-4">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Urgent</p>
              <p className="text-2xl font-semibold text-canmp-red-600">{urgentCount}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-canmp-red-200" />
          </div>
        </div>
        <div className="card p-4">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Completed (30d)</p>
              <p className="text-2xl font-semibold">{completedCount}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-canmp-green-200" />
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
              placeholder="Search work orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input w-40"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="table-header">Issue</th>
                <th className="table-header">Property</th>
                <th className="table-header">Priority</th>
                <th className="table-header">Status</th>
                <th className="table-header">Reported</th>
                <th className="table-header">Assigned To</th>
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((wo) => (
                <tr key={wo.id} className="table-row cursor-pointer">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{getCategoryEmoji(wo.category)}</span>
                      <div>
                        <p className="font-medium text-gray-900">{wo.title}</p>
                        <p className="text-sm text-gray-500">{wo.household}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <p className="font-medium text-gray-900">{wo.property}</p>
                    <p className="text-sm text-gray-500">{wo.unit}</p>
                  </td>
                  <td className="table-cell">
                    <span className={`badge badge-${getPriorityBadgeVariant(wo.priority)}`}>
                      {wo.priority.charAt(0).toUpperCase() + wo.priority.slice(1)}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className={`badge badge-${getStatusBadgeVariant(wo.status)}`}>
                      {getWorkOrderStatusLabel(wo.status)}
                    </span>
                  </td>
                  <td className="table-cell text-gray-500">
                    {formatDate(wo.reportedDate)}
                  </td>
                  <td className="table-cell text-gray-700">
                    {wo.assignedTo || '-'}
                  </td>
                  <td className="table-cell text-right">
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-3 gap-4">
          {kanbanColumns.map((column) => {
            const columnOrders = filtered.filter((wo) => wo.status === column.id);
            return (
              <div key={column.id}>
                <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-${column.color}-50`}>
                  <span className={`w-2 h-2 rounded-full bg-${column.color}-500`} />
                  <span className={`font-semibold text-sm text-${column.color}-700`}>{column.label}</span>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full bg-${column.color}-100 text-${column.color}-600`}>
                    {columnOrders.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {columnOrders.map((wo) => (
                    <div
                      key={wo.id}
                      className="card p-4 cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <span className="text-xl">{getCategoryEmoji(wo.category)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{wo.title}</p>
                          <p className="text-xs text-gray-500">{wo.property}</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`badge badge-${getPriorityBadgeVariant(wo.priority)}`}>
                          {wo.priority}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDate(wo.reportedDate, 'MMM d')}
                        </span>
                      </div>
                    </div>
                  ))}
                  {columnOrders.length === 0 && (
                    <div className="card p-8 text-center text-gray-400 text-sm">
                      No work orders
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Work Order Modal */}
      <AddWorkOrderModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          // TODO: Refetch work orders when connected to Supabase
          setShowAddModal(false);
        }}
      />
    </div>
  );
}

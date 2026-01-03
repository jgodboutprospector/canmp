'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, ChevronRight, AlertTriangle, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { cn, formatDate, getWorkOrderStatusLabel, getStatusBadgeVariant, getPriorityBadgeVariant, getCategoryEmoji } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { AddWorkOrderModal } from './AddWorkOrderModal';
import { WorkOrderDetailModal } from './WorkOrderDetailModal';
import type { WorkOrderCategory, WorkOrderPriority, WorkOrderStatus } from '@/types/database';

interface WorkOrder {
  id: string;
  title: string;
  description: string | null;
  category: WorkOrderCategory;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  reported_date: string;
  scheduled_date: string | null;
  completed_date: string | null;
  assigned_to: string | null;
  cost: number | null;
  property: {
    id: string;
    name: string;
  } | null;
  unit: {
    id: string;
    unit_number: string;
  } | null;
}

export default function WorkOrdersList() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  async function fetchWorkOrders() {
    try {
      const { data, error } = await (supabase as any)
        .from('work_orders')
        .select(`
          id, title, description, category, priority, status,
          reported_date, scheduled_date, completed_date, assigned_to, cost,
          property:properties(id, name),
          unit:units(id, unit_number)
        `)
        .order('reported_date', { ascending: false });

      if (error) throw error;
      setWorkOrders(data || []);
    } catch (err) {
      console.error('Error fetching work orders:', err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = workOrders.filter((wo) => {
    const matchesSearch =
      wo.title.toLowerCase().includes(search.toLowerCase()) ||
      (wo.property?.name?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesStatus = filterStatus === 'all' || wo.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const openCount = workOrders.filter((wo) => wo.status === 'open').length;
  const inProgressCount = workOrders.filter((wo) => wo.status === 'in_progress' || wo.status === 'scheduled').length;
  const urgentCount = workOrders.filter((wo) => wo.priority === 'urgent' && wo.status !== 'completed').length;
  const completedCount = workOrders.filter((wo) => wo.status === 'completed').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-canmp-green-500" />
        <span className="ml-2 text-gray-500">Loading work orders...</span>
      </div>
    );
  }

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
                <tr
                  key={wo.id}
                  onClick={() => setSelectedWorkOrderId(wo.id)}
                  className="table-row cursor-pointer"
                >
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{getCategoryEmoji(wo.category)}</span>
                      <div>
                        <p className="font-medium text-gray-900">{wo.title}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <p className="font-medium text-gray-900">{wo.property?.name || '-'}</p>
                    <p className="text-sm text-gray-500">{wo.unit ? `Unit ${wo.unit.unit_number}` : ''}</p>
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
                    {formatDate(wo.reported_date)}
                  </td>
                  <td className="table-cell text-gray-700">
                    {wo.assigned_to || '-'}
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
                      onClick={() => setSelectedWorkOrderId(wo.id)}
                      className="card p-4 cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <span className="text-xl">{getCategoryEmoji(wo.category)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{wo.title}</p>
                          <p className="text-xs text-gray-500">{wo.property?.name || '-'}</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`badge badge-${getPriorityBadgeVariant(wo.priority)}`}>
                          {wo.priority}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDate(wo.reported_date, 'MMM d')}
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
          fetchWorkOrders();
          setShowAddModal(false);
        }}
      />

      {/* Work Order Detail Modal */}
      {selectedWorkOrderId && (
        <WorkOrderDetailModal
          isOpen={!!selectedWorkOrderId}
          onClose={() => setSelectedWorkOrderId(null)}
          workOrderId={selectedWorkOrderId}
          onDelete={fetchWorkOrders}
          onUpdate={fetchWorkOrders}
        />
      )}
    </div>
  );
}

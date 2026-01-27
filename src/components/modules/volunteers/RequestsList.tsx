'use client';

import { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  Loader2,
  Calendar,
  Clock,
  User,
  Home,
  AlertCircle,
  CheckCircle,
  XCircle,
  Users,
} from 'lucide-react';
import { useVolunteerRequests } from '@/lib/hooks/useVolunteers';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import CreateRequestModal from './CreateRequestModal';
import RequestDetailModal from './RequestDetailModal';

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  matched: { label: 'Matched', color: 'bg-blue-100 text-blue-800', icon: Users },
  in_progress: { label: 'In Progress', color: 'bg-purple-100 text-purple-800', icon: Loader2 },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800', icon: XCircle },
};

const urgencyConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: 'text-gray-500' },
  medium: { label: 'Medium', color: 'text-blue-600' },
  high: { label: 'High', color: 'text-orange-600' },
  urgent: { label: 'Urgent', color: 'text-red-600' },
};

export default function RequestsList() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const { requests, loading, error, refetch } = useVolunteerRequests({
    status: statusFilter || undefined,
  });

  // Filter by search query
  const filteredRequests = requests.filter((request) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      request.title.toLowerCase().includes(query) ||
      request.household?.name?.toLowerCase().includes(query) ||
      request.beneficiary?.first_name?.toLowerCase().includes(query) ||
      request.beneficiary?.last_name?.toLowerCase().includes(query) ||
      request.request_type?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-canmp-green-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Volunteer Requests</h2>
          <p className="text-sm text-gray-500">
            Match family needs with volunteer opportunities
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Request
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="matched">Matched</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { status: 'pending', label: 'Pending', color: 'bg-yellow-50 border-yellow-200' },
          { status: 'matched', label: 'Matched', color: 'bg-blue-50 border-blue-200' },
          { status: 'in_progress', label: 'In Progress', color: 'bg-purple-50 border-purple-200' },
          { status: 'completed', label: 'Completed', color: 'bg-green-50 border-green-200' },
        ].map((stat) => {
          const count = requests.filter((r) => r.status === stat.status).length;
          return (
            <button
              key={stat.status}
              onClick={() => setStatusFilter(statusFilter === stat.status ? '' : stat.status)}
              className={cn(
                'p-4 rounded-lg border text-left transition-all',
                stat.color,
                statusFilter === stat.status && 'ring-2 ring-offset-2 ring-canmp-green-500'
              )}
            >
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-sm text-gray-600">{stat.label}</p>
            </button>
          );
        })}
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No requests found</p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-canmp-green-600 hover:underline text-sm mt-2"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((request) => {
            const status = statusConfig[request.status] || statusConfig.pending;
            const urgency = urgencyConfig[request.urgency] || urgencyConfig.medium;
            const StatusIcon = status.icon;

            return (
              <button
                key={request.id}
                onClick={() => setSelectedRequestId(request.id)}
                className="w-full bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow text-left"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900 truncate">{request.title}</h3>
                      <span className={cn('text-xs font-medium', urgency.color)}>
                        {urgency.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                      {request.request_type && (
                        <span className="inline-flex items-center gap-1">
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                            {request.request_type}
                          </span>
                        </span>
                      )}
                      {request.household && (
                        <span className="inline-flex items-center gap-1">
                          <Home className="w-3 h-3" />
                          {request.household.name}
                        </span>
                      )}
                      {request.beneficiary && (
                        <span className="inline-flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {request.beneficiary.first_name} {request.beneficiary.last_name}
                        </span>
                      )}
                      {request.preferred_date && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(request.preferred_date), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                    {request.assigned_volunteer && (
                      <div className="mt-2 text-sm text-canmp-green-600">
                        Assigned to: {request.assigned_volunteer.first_name}{' '}
                        {request.assigned_volunteer.last_name}
                      </div>
                    )}
                  </div>
                  <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', status.color)}>
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Create Request Modal */}
      <CreateRequestModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => {
          refetch();
          setShowCreateModal(false);
        }}
      />

      {/* Request Detail Modal */}
      {selectedRequestId && (
        <RequestDetailModal
          requestId={selectedRequestId}
          isOpen={true}
          onClose={() => setSelectedRequestId(null)}
          onUpdate={refetch}
        />
      )}
    </div>
  );
}

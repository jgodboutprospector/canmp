'use client';

import { useState } from 'react';
import {
  Plus,
  Search,
  Car,
  Calendar,
  MapPin,
  User,
  Clock,
  ChevronRight,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useTransportationRequests } from '@/lib/hooks/useMutualAid';
import { AddTransportationModal } from './AddTransportationModal';
import { TransportationDetailModal } from './TransportationDetailModal';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { TransportationRequestStatus } from '@/types/database';

const statusConfig: Record<TransportationRequestStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
  in_progress: { label: 'In Progress', color: 'bg-purple-100 text-purple-800' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800' },
};

const urgencyConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: 'text-gray-500' },
  medium: { label: 'Medium', color: 'text-blue-500' },
  high: { label: 'High', color: 'text-orange-500' },
  urgent: { label: 'Urgent', color: 'text-red-500' },
};

export default function TransportationList() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TransportationRequestStatus | ''>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const { requests, loading, error, refetch } = useTransportationRequests(
    statusFilter ? { status: statusFilter } : {}
  );

  // Filter by search term
  const filtered = requests.filter((req) => {
    const searchLower = search.toLowerCase();
    return (
      req.title.toLowerCase().includes(searchLower) ||
      req.household?.name?.toLowerCase().includes(searchLower) ||
      req.beneficiary?.first_name?.toLowerCase().includes(searchLower) ||
      req.beneficiary?.last_name?.toLowerCase().includes(searchLower) ||
      req.pickup_address_street?.toLowerCase().includes(searchLower) ||
      req.dropoff_address_street?.toLowerCase().includes(searchLower)
    );
  });

  // Calculate stats
  const stats = {
    pending: requests.filter((r) => r.status === 'pending').length,
    scheduled: requests.filter((r) => r.status === 'scheduled').length,
    in_progress: requests.filter((r) => r.status === 'in_progress').length,
    completed: requests.filter((r) => r.status === 'completed').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-canmp-green-500" />
        <span className="ml-2 text-gray-500">Loading transportation requests...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="card p-6 bg-red-50 border-red-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-600 font-medium">Error loading transportation requests</p>
          </div>
          <p className="text-red-500 text-sm mt-1">{error}</p>
          <button
            onClick={refetch}
            className="mt-3 flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Transportation Requests
          </h1>
          <p className="text-sm text-gray-500">Manage transportation assistance for families</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          New Request
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-2xl font-semibold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Scheduled</p>
          <p className="text-2xl font-semibold text-blue-600">{stats.scheduled}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">In Progress</p>
          <p className="text-2xl font-semibold text-purple-600">{stats.in_progress}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Completed</p>
          <p className="text-2xl font-semibold text-green-600">{stats.completed}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card p-4 mb-6">
        <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search requests, families, addresses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TransportationRequestStatus | '')}
            className="input w-40"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {filtered.map((request) => {
          const status = statusConfig[request.status];
          const urgency = urgencyConfig[request.urgency];

          return (
            <div
              key={request.id}
              onClick={() => setSelectedRequestId(request.id)}
              className="card p-5 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Car className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900 text-lg">{request.title}</h3>
                      {request.is_recurring && (
                        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                          <RefreshCw className="w-3 h-3 inline mr-1" />
                          {request.recurrence_pattern}
                        </span>
                      )}
                    </div>

                    {request.household && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        {request.household.name}
                        {request.beneficiary && (
                          <span className="text-gray-400">
                            {' '}
                            • {request.beneficiary.first_name} {request.beneficiary.last_name}
                          </span>
                        )}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>
                          {request.pickup_address_city || 'Pickup'} → {request.dropoff_address_city || 'Dropoff'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{format(new Date(request.request_date), 'MMM d, yyyy')}</span>
                      </div>
                      {request.pickup_time && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span>{request.pickup_time.slice(0, 5)}</span>
                        </div>
                      )}
                    </div>

                    {request.assigned_volunteer ? (
                      <div className="flex items-center gap-2 mt-2 text-sm text-canmp-green-600">
                        <User className="w-4 h-4" />
                        <span>
                          {request.assigned_volunteer.first_name} {request.assigned_volunteer.last_name}
                        </span>
                      </div>
                    ) : (
                      request.status === 'pending' && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-gray-400">
                          <User className="w-4 h-4" />
                          <span>Unassigned</span>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', status.color)}>
                    {status.label}
                  </span>
                  {request.urgency !== 'medium' && (
                    <span className={cn('text-xs font-medium', urgency.color)}>{urgency.label} Priority</span>
                  )}
                  <ChevronRight className="w-5 h-5 text-gray-400 mt-2" />
                </div>
              </div>

              {/* Special Requirements */}
              {(request.needs_wheelchair_access || request.needs_car_seat || request.passenger_count > 1) && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex gap-3">
                  {request.needs_wheelchair_access && (
                    <span className="text-xs px-2 py-1 bg-orange-50 text-orange-700 rounded">
                      Wheelchair Access
                    </span>
                  )}
                  {request.needs_car_seat && (
                    <span className="text-xs px-2 py-1 bg-orange-50 text-orange-700 rounded">Car Seat</span>
                  )}
                  {request.passenger_count > 1 && (
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                      {request.passenger_count} passengers
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="card p-12 text-center text-gray-400">
            {search || statusFilter ? (
              <p>No transportation requests found matching your filters.</p>
            ) : (
              <div>
                <Car className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No transportation requests yet.</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="text-canmp-green-600 hover:underline mt-2"
                >
                  Create the first request
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Transportation Modal */}
      <AddTransportationModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={refetch}
      />

      {/* Transportation Detail Modal */}
      {selectedRequestId && (
        <TransportationDetailModal
          requestId={selectedRequestId}
          isOpen={true}
          onClose={() => setSelectedRequestId(null)}
          onUpdate={refetch}
        />
      )}
    </div>
  );
}

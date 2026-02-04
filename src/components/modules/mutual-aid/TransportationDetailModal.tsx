'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { DeleteConfirmation } from '@/components/ui/DeleteConfirmation';
import { supabase } from '@/lib/supabase';
import { authFetch } from '@/lib/api-client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Loader2,
  Car,
  Calendar,
  Clock,
  MapPin,
  User,
  Users,
  Phone,
  Mail,
  Heart,
  CheckCircle,
  XCircle,
  Play,
  RefreshCw,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import type { TransportationRequestWithRelations, Volunteer } from '@/types/database';
import type { ApiResponse } from '@/lib/api-server-utils';

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-800', icon: Calendar },
  in_progress: { label: 'In Progress', color: 'bg-purple-100 text-purple-800', icon: Play },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800', icon: XCircle },
};

const urgencyConfig = {
  low: { label: 'Low', color: 'text-gray-600 bg-gray-100' },
  medium: { label: 'Medium', color: 'text-blue-600 bg-blue-100' },
  high: { label: 'High', color: 'text-orange-600 bg-orange-100' },
  urgent: { label: 'Urgent', color: 'text-red-600 bg-red-100' },
};

interface TransportationDetailModalProps {
  requestId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export function TransportationDetailModal({
  requestId,
  isOpen,
  onClose,
  onUpdate,
}: TransportationDetailModalProps) {
  const [request, setRequest] = useState<TransportationRequestWithRelations | null>(null);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'assign'>('details');
  const [saving, setSaving] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [completeForm, setCompleteForm] = useState({
    completion_notes: '',
    actual_pickup_time: '',
    actual_dropoff_time: '',
  });

  useEffect(() => {
    if (isOpen && requestId) {
      fetchRequest();
      fetchVolunteers();
    }
  }, [isOpen, requestId]);

  async function fetchRequest() {
    try {
      setLoading(true);
      const response = await authFetch(`/api/mutual-aid?id=${requestId}`);
      const result: ApiResponse<TransportationRequestWithRelations> = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch request');
      }

      setRequest(result.data || null);
    } catch (err) {
      console.error('Error fetching request:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchVolunteers() {
    try {
      const { data, error } = await supabase
        .from('volunteers')
        .select('*')
        .eq('is_active', true)
        .order('last_name');

      if (error) throw error;
      setVolunteers(data || []);
    } catch (err) {
      console.error('Error fetching volunteers:', err);
    }
  }

  async function handleAssignVolunteer(volunteerId: string) {
    setSaving(true);
    try {
      const response = await authFetch('/api/mutual-aid?action=assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, volunteer_id: volunteerId }),
      });

      const result: ApiResponse = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to assign volunteer');
      }

      await fetchRequest();
      onUpdate?.();
      setActiveTab('details');
    } catch (err) {
      console.error('Error assigning volunteer:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleStartProgress() {
    setSaving(true);
    try {
      const response = await authFetch('/api/mutual-aid', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: requestId, status: 'in_progress' }),
      });

      const result: ApiResponse = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to update status');
      }

      await fetchRequest();
      onUpdate?.();
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete() {
    setSaving(true);
    try {
      const response = await authFetch('/api/mutual-aid?action=complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: requestId,
          completion_notes: completeForm.completion_notes || null,
          actual_pickup_time: completeForm.actual_pickup_time || null,
          actual_dropoff_time: completeForm.actual_dropoff_time || null,
        }),
      });

      const result: ApiResponse = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to complete request');
      }

      await fetchRequest();
      onUpdate?.();
      setShowCompleteForm(false);
    } catch (err) {
      console.error('Error completing request:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    setSaving(true);
    try {
      const response = await authFetch(`/api/mutual-aid?id=${requestId}`, {
        method: 'DELETE',
      });

      const result: ApiResponse = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to cancel request');
      }

      onUpdate?.();
      onClose();
    } catch (err) {
      console.error('Error cancelling request:', err);
    } finally {
      setSaving(false);
      setShowCancelConfirm(false);
    }
  }

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Transportation Request" size="lg">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-canmp-green-500" />
        </div>
      </Modal>
    );
  }

  if (!request) return null;

  const status = statusConfig[request.status];
  const urgency = urgencyConfig[request.urgency];
  const StatusIcon = status.icon;

  const formatAddress = (street?: string | null, city?: string | null, state?: string | null, zip?: string | null) => {
    const parts = [street, city, state].filter(Boolean);
    if (zip) parts.push(zip);
    return parts.join(', ') || 'Not specified';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={request.title}
      size="lg"
    >
      {/* Header with status */}
      <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-canmp-green-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center">
              <Car className="w-7 h-7 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1', status.color)}>
                  <StatusIcon className="w-3 h-3" />
                  {status.label}
                </span>
                <span className={cn('px-2 py-0.5 rounded text-xs font-medium', urgency.color)}>
                  {urgency.label} Priority
                </span>
                {request.is_recurring && (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" />
                    {request.recurrence_pattern}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(request.request_date), 'EEEE, MMMM d, yyyy')}
                </span>
                {request.pickup_time && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {request.pickup_time.slice(0, 5)}
                    {request.estimated_return_time && ` - ${request.estimated_return_time.slice(0, 5)}`}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 px-6">
        <nav className="flex gap-0 -mb-px">
          {[
            { id: 'details', label: 'Details' },
            { id: 'assign', label: 'Assign Volunteer', disabled: request.status === 'completed' || request.status === 'cancelled' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id as typeof activeTab)}
              disabled={tab.disabled}
              className={cn(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-canmp-green-500 text-canmp-green-600'
                  : tab.disabled
                  ? 'border-transparent text-gray-300 cursor-not-allowed'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="px-6 py-4 max-h-[55vh] overflow-y-auto">
        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="space-y-6">
            {/* Family & Beneficiary Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Family Information
              </h4>
              <div className="space-y-2 text-sm">
                {request.household && (
                  <p>
                    <span className="text-gray-500">Household:</span>{' '}
                    <span className="font-medium">{request.household.name}</span>
                    {request.household.primary_language && (
                      <span className="text-gray-400 ml-2">({request.household.primary_language})</span>
                    )}
                  </p>
                )}
                {request.beneficiary && (
                  <p>
                    <span className="text-gray-500">Beneficiary:</span>{' '}
                    <span className="font-medium">
                      {request.beneficiary.first_name} {request.beneficiary.last_name}
                    </span>
                  </p>
                )}
                {request.mentor_team && (
                  <p className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-pink-500" />
                    <span className="text-gray-500">Mentor Team:</span>{' '}
                    <span className="font-medium">{request.mentor_team.name}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Locations */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Pickup Location
                </h4>
                <p className="text-sm text-gray-700">
                  {formatAddress(
                    request.pickup_address_street,
                    request.pickup_address_city,
                    request.pickup_address_state,
                    request.pickup_address_zip
                  )}
                </p>
                {request.pickup_notes && (
                  <p className="text-xs text-gray-500 mt-2 italic">{request.pickup_notes}</p>
                )}
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-green-900 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Dropoff Location
                </h4>
                <p className="text-sm text-gray-700">
                  {formatAddress(
                    request.dropoff_address_street,
                    request.dropoff_address_city,
                    request.dropoff_address_state,
                    request.dropoff_address_zip
                  )}
                </p>
                {request.dropoff_notes && (
                  <p className="text-xs text-gray-500 mt-2 italic">{request.dropoff_notes}</p>
                )}
              </div>
            </div>

            {/* Special Requirements */}
            {(request.needs_wheelchair_access || request.needs_car_seat || request.passenger_count > 1 || request.special_instructions) && (
              <div className="bg-orange-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-orange-900 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Special Requirements
                </h4>
                <div className="flex flex-wrap gap-2 mb-2">
                  {request.needs_wheelchair_access && (
                    <span className="px-2 py-1 bg-white rounded text-xs font-medium text-orange-700">
                      Wheelchair Access
                    </span>
                  )}
                  {request.needs_car_seat && (
                    <span className="px-2 py-1 bg-white rounded text-xs font-medium text-orange-700">
                      Car Seat Required
                    </span>
                  )}
                  {request.passenger_count > 1 && (
                    <span className="px-2 py-1 bg-white rounded text-xs font-medium text-orange-700">
                      {request.passenger_count} Passengers
                    </span>
                  )}
                </div>
                {request.special_instructions && (
                  <p className="text-sm text-gray-700">{request.special_instructions}</p>
                )}
              </div>
            )}

            {/* Assigned Volunteer */}
            {request.assigned_volunteer && (
              <div className="bg-canmp-green-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-canmp-green-900 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Assigned Volunteer
                </h4>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {request.assigned_volunteer.first_name} {request.assigned_volunteer.last_name}
                    </p>
                    <div className="flex gap-4 mt-1">
                      {request.assigned_volunteer.email && (
                        <a
                          href={`mailto:${request.assigned_volunteer.email}`}
                          className="flex items-center gap-1 text-sm text-canmp-green-600 hover:underline"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          {request.assigned_volunteer.email}
                        </a>
                      )}
                      {request.assigned_volunteer.phone && (
                        <a
                          href={`tel:${request.assigned_volunteer.phone}`}
                          className="flex items-center gap-1 text-sm text-canmp-green-600 hover:underline"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          {request.assigned_volunteer.phone}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                {request.assigned_at && (
                  <p className="text-xs text-gray-500 mt-2">
                    Assigned {format(new Date(request.assigned_at), 'MMM d, yyyy \'at\' h:mm a')}
                    {request.assigned_by && ` by ${request.assigned_by.first_name} ${request.assigned_by.last_name}`}
                  </p>
                )}
              </div>
            )}

            {/* Completion Info */}
            {request.status === 'completed' && request.completed_at && (
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-green-900 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Completed
                </h4>
                <p className="text-sm text-gray-700">
                  {format(new Date(request.completed_at), 'MMM d, yyyy \'at\' h:mm a')}
                  {request.completed_by && ` by ${request.completed_by.first_name} ${request.completed_by.last_name}`}
                </p>
                {request.completion_notes && (
                  <p className="text-sm text-gray-600 mt-2">{request.completion_notes}</p>
                )}
                {(request.actual_pickup_time || request.actual_dropoff_time) && (
                  <p className="text-xs text-gray-500 mt-2">
                    Actual times: {request.actual_pickup_time?.slice(0, 5) || '?'} - {request.actual_dropoff_time?.slice(0, 5) || '?'}
                  </p>
                )}
              </div>
            )}

            {/* Complete Form */}
            {showCompleteForm && (
              <div className="bg-green-50 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-medium text-green-900">Complete Transportation Request</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Actual Pickup Time</label>
                    <input
                      type="time"
                      value={completeForm.actual_pickup_time}
                      onChange={(e) => setCompleteForm({ ...completeForm, actual_pickup_time: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Actual Dropoff Time</label>
                    <input
                      type="time"
                      value={completeForm.actual_dropoff_time}
                      onChange={(e) => setCompleteForm({ ...completeForm, actual_dropoff_time: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={completeForm.completion_notes}
                    onChange={(e) => setCompleteForm({ ...completeForm, completion_notes: e.target.value })}
                    placeholder="Any notes about the trip..."
                    className="input"
                    rows={2}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCompleteForm(false)}
                    className="btn-secondary text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleComplete}
                    disabled={saving}
                    className="btn-primary text-sm"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Mark Complete
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {request.status !== 'completed' && request.status !== 'cancelled' && !showCompleteForm && (
              <div className="flex flex-wrap gap-2">
                {request.status === 'pending' && !request.assigned_volunteer_id && (
                  <button
                    onClick={() => setActiveTab('assign')}
                    className="btn-primary text-sm"
                  >
                    <User className="w-4 h-4" />
                    Assign Volunteer
                  </button>
                )}
                {request.status === 'scheduled' && (
                  <button
                    onClick={handleStartProgress}
                    disabled={saving}
                    className="btn-primary text-sm"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    Start Trip
                  </button>
                )}
                {request.status === 'in_progress' && (
                  <button
                    onClick={() => setShowCompleteForm(true)}
                    className="btn-primary text-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Complete Trip
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Assign Volunteer Tab */}
        {activeTab === 'assign' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Select a volunteer to assign to this transportation request.
            </p>

            <div className="space-y-2">
              {volunteers.map((volunteer) => {
                const isAssigned = request.assigned_volunteer_id === volunteer.id;
                const hasTransportSkill = volunteer.skills?.includes('Transportation');

                return (
                  <div
                    key={volunteer.id}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border',
                      isAssigned
                        ? 'bg-canmp-green-50 border-canmp-green-200'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                        {volunteer.first_name[0]}{volunteer.last_name[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {volunteer.first_name} {volunteer.last_name}
                          {hasTransportSkill && (
                            <span className="ml-2 text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                              Transportation
                            </span>
                          )}
                        </p>
                        <div className="flex gap-3 text-sm text-gray-500">
                          {volunteer.email && <span>{volunteer.email}</span>}
                          {volunteer.phone && <span>{volunteer.phone}</span>}
                        </div>
                      </div>
                    </div>
                    {isAssigned ? (
                      <span className="text-sm text-canmp-green-600 font-medium flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        Assigned
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAssignVolunteer(volunteer.id)}
                        disabled={saving}
                        className="btn-primary text-sm"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Assign'}
                      </button>
                    )}
                  </div>
                );
              })}

              {volunteers.length === 0 && (
                <p className="text-center py-8 text-gray-400">No active volunteers found.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Cancel Confirmation */}
      {showCancelConfirm && (
        <div className="px-6 pb-4">
          <DeleteConfirmation
            title="Cancel Transportation Request"
            message="Are you sure you want to cancel this transportation request?"
            onConfirm={handleCancel}
            onCancel={() => setShowCancelConfirm(false)}
            isDeleting={saving}
            confirmLabel="Cancel Request"
          />
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
        {request.status !== 'completed' && request.status !== 'cancelled' && !showCancelConfirm ? (
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Cancel Request
          </button>
        ) : (
          <div />
        )}
        <button onClick={onClose} className="btn-secondary">
          Close
        </button>
      </div>
    </Modal>
  );
}

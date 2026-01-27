'use client';

import { useState, useEffect } from 'react';
import {
  Loader2,
  X,
  Calendar,
  Clock,
  MapPin,
  User,
  Home,
  Languages,
  CheckCircle,
  XCircle,
  Users,
  Phone,
  Mail,
  Award,
  AlertCircle,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { useMatchingVolunteers, useVolunteerRequests } from '@/lib/hooks/useVolunteers';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { VolunteerRequestWithRelations } from '@/types/database';

interface Props {
  requestId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Pending', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  matched: { label: 'Matched', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  in_progress: { label: 'In Progress', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  completed: { label: 'Completed', color: 'text-green-700', bgColor: 'bg-green-100' },
  cancelled: { label: 'Cancelled', color: 'text-gray-700', bgColor: 'bg-gray-100' },
};

export default function RequestDetailModal({ requestId, isOpen, onClose, onUpdate }: Props) {
  const [request, setRequest] = useState<VolunteerRequestWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'matching'>('details');
  const [assigning, setAssigning] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [completeForm, setCompleteForm] = useState({ notes: '', hours_spent: '' });

  const { matches, loading: matchesLoading, refetch: refetchMatches } = useMatchingVolunteers(
    activeTab === 'matching' ? requestId : null
  );

  const { assignVolunteer, completeRequest } = useVolunteerRequests();

  useEffect(() => {
    if (isOpen && requestId) {
      fetchRequest();
    }
  }, [isOpen, requestId]);

  async function fetchRequest() {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('volunteer_requests')
        .select(`
          *,
          household:households(id, name),
          beneficiary:beneficiaries(id, first_name, last_name),
          assigned_volunteer:volunteers(id, first_name, last_name, email, phone),
          created_by:users!volunteer_requests_created_by_id_fkey(id, first_name, last_name)
        `)
        .eq('id', requestId)
        .single();

      if (error) throw error;
      setRequest(data);
    } catch (err) {
      console.error('Error fetching request:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignVolunteer(volunteerId: string) {
    setAssigning(true);
    try {
      const result = await assignVolunteer(requestId, volunteerId);
      if (result.error) throw new Error(result.error);
      await fetchRequest();
      onUpdate();
      setActiveTab('details');
    } catch (err) {
      console.error('Error assigning volunteer:', err);
    } finally {
      setAssigning(false);
    }
  }

  async function handleCompleteRequest() {
    if (!completeForm.hours_spent) return;
    setCompleting(true);
    try {
      const result = await completeRequest(
        requestId,
        completeForm.notes,
        parseFloat(completeForm.hours_spent)
      );
      if (result.error) throw new Error(result.error);
      await fetchRequest();
      onUpdate();
      setShowCompleteForm(false);
    } catch (err) {
      console.error('Error completing request:', err);
    } finally {
      setCompleting(false);
    }
  }

  async function updateStatus(status: string) {
    try {
      const { error } = await (supabase as any)
        .from('volunteer_requests')
        .update({ status })
        .eq('id', requestId);

      if (error) throw error;
      await fetchRequest();
      onUpdate();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  }

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Request Details" size="lg">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-canmp-green-500" />
        </div>
      </Modal>
    );
  }

  if (!request) return null;

  const status = statusConfig[request.status] || statusConfig.pending;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={request.title} size="lg">
      {/* Tabs */}
      <div className="border-b border-gray-200 px-6">
        <nav className="flex gap-0 -mb-px">
          <button
            onClick={() => setActiveTab('details')}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'details'
                ? 'border-canmp-green-500 text-canmp-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <Calendar className="w-4 h-4" />
            Details
          </button>
          <button
            onClick={() => setActiveTab('matching')}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'matching'
                ? 'border-canmp-green-500 text-canmp-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <Users className="w-4 h-4" />
            Find Volunteers
            {matches.length > 0 && (
              <span className="text-xs bg-canmp-green-100 text-canmp-green-700 px-1.5 py-0.5 rounded">
                {matches.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
        {activeTab === 'details' && (
          <div className="space-y-6">
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <span className={cn('px-3 py-1 rounded-full text-sm font-medium', status.bgColor, status.color)}>
                {status.label}
              </span>
              {request.urgency && (
                <span className={cn(
                  'text-sm font-medium',
                  request.urgency === 'urgent' && 'text-red-600',
                  request.urgency === 'high' && 'text-orange-600',
                  request.urgency === 'medium' && 'text-blue-600',
                  request.urgency === 'low' && 'text-gray-500'
                )}>
                  {request.urgency.charAt(0).toUpperCase() + request.urgency.slice(1)} Priority
                </span>
              )}
            </div>

            {/* Description */}
            {request.description && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Description</h4>
                <p className="text-gray-600">{request.description}</p>
              </div>
            )}

            {/* Request Type */}
            {request.request_type && (
              <div className="inline-block px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">
                {request.request_type}
              </div>
            )}

            {/* Household & Beneficiary */}
            <div className="grid grid-cols-2 gap-4">
              {request.household && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <Home className="w-3 h-3" />
                    Household
                  </div>
                  <p className="font-medium text-gray-900">{request.household.name}</p>
                </div>
              )}
              {request.beneficiary && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <User className="w-3 h-3" />
                    Beneficiary
                  </div>
                  <p className="font-medium text-gray-900">
                    {request.beneficiary.first_name} {request.beneficiary.last_name}
                  </p>
                </div>
              )}
            </div>

            {/* Scheduling */}
            {(request.preferred_date || request.preferred_time_start) && (
              <div className="border rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Schedule
                </h4>
                <div className="space-y-2 text-sm">
                  {request.preferred_date && (
                    <p>
                      <span className="text-gray-500">Date:</span>{' '}
                      {format(new Date(request.preferred_date), 'EEEE, MMMM d, yyyy')}
                    </p>
                  )}
                  {request.preferred_time_start && (
                    <p>
                      <span className="text-gray-500">Time:</span>{' '}
                      {request.preferred_time_start}
                      {request.preferred_time_end && ` - ${request.preferred_time_end}`}
                    </p>
                  )}
                  {request.is_recurring && (
                    <p className="text-canmp-green-600">
                      Recurring: {request.recurrence_pattern}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Location */}
            {(request.location_address || request.location_notes) && (
              <div className="border rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location
                </h4>
                {request.location_address && (
                  <p className="text-gray-900">{request.location_address}</p>
                )}
                {request.location_notes && (
                  <p className="text-sm text-gray-500 mt-1">{request.location_notes}</p>
                )}
              </div>
            )}

            {/* Languages Needed */}
            {request.languages_needed && request.languages_needed.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Languages className="w-4 h-4" />
                  Languages Needed
                </h4>
                <div className="flex flex-wrap gap-2">
                  {request.languages_needed.map((lang) => (
                    <span
                      key={lang}
                      className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Assigned Volunteer */}
            {request.assigned_volunteer && (
              <div className="bg-canmp-green-50 border border-canmp-green-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-canmp-green-700 mb-2">
                  Assigned Volunteer
                </h4>
                <p className="font-medium text-gray-900">
                  {request.assigned_volunteer.first_name} {request.assigned_volunteer.last_name}
                </p>
                <div className="flex gap-4 mt-2 text-sm">
                  {request.assigned_volunteer.email && (
                    <a
                      href={`mailto:${request.assigned_volunteer.email}`}
                      className="text-canmp-green-600 hover:underline flex items-center gap-1"
                    >
                      <Mail className="w-3 h-3" />
                      {request.assigned_volunteer.email}
                    </a>
                  )}
                  {request.assigned_volunteer.phone && (
                    <a
                      href={`tel:${request.assigned_volunteer.phone}`}
                      className="text-canmp-green-600 hover:underline flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      {request.assigned_volunteer.phone}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Completion Info */}
            {request.status === 'completed' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700 mb-2">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Completed</span>
                </div>
                {request.completed_at && (
                  <p className="text-sm text-gray-600">
                    {format(new Date(request.completed_at), 'MMMM d, yyyy')}
                  </p>
                )}
                {request.hours_spent && (
                  <p className="text-sm text-gray-600">Hours: {request.hours_spent}</p>
                )}
                {request.completion_notes && (
                  <p className="text-sm text-gray-600 mt-2">{request.completion_notes}</p>
                )}
              </div>
            )}

            {/* Complete Request Form */}
            {showCompleteForm && request.status !== 'completed' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-blue-800">Complete Request</h4>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Hours Spent *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={completeForm.hours_spent}
                    onChange={(e) => setCompleteForm({ ...completeForm, hours_spent: e.target.value })}
                    className="input w-full"
                    placeholder="e.g., 2.5"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={completeForm.notes}
                    onChange={(e) => setCompleteForm({ ...completeForm, notes: e.target.value })}
                    className="input w-full"
                    rows={2}
                    placeholder="Add any notes about this visit..."
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCompleteRequest}
                    disabled={!completeForm.hours_spent || completing}
                    className="btn-primary flex items-center gap-2"
                  >
                    {completing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Mark Complete
                  </button>
                  <button
                    onClick={() => setShowCompleteForm(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
              {request.status === 'pending' && (
                <button
                  onClick={() => setActiveTab('matching')}
                  className="btn-primary flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  Find Volunteer
                </button>
              )}
              {request.status === 'matched' && (
                <button
                  onClick={() => updateStatus('in_progress')}
                  className="btn-primary flex items-center gap-2"
                >
                  <Clock className="w-4 h-4" />
                  Start Work
                </button>
              )}
              {(request.status === 'matched' || request.status === 'in_progress') && (
                <button
                  onClick={() => setShowCompleteForm(true)}
                  className="btn-primary flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Complete
                </button>
              )}
              {request.status !== 'completed' && request.status !== 'cancelled' && (
                <button
                  onClick={() => updateStatus('cancelled')}
                  className="text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg font-medium flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Cancel Request
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === 'matching' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Volunteers are ranked by match score based on skills, language, and availability.
            </p>

            {matchesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-canmp-green-500" />
              </div>
            ) : matches.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No matching volunteers found</p>
                <p className="text-sm text-gray-400 mt-1">
                  Try adjusting the request requirements
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {matches.map((match) => (
                  <div
                    key={match.volunteer_id}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {match.first_name} {match.last_name}
                        </h4>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {match.has_required_skills && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Has Skills
                            </span>
                          )}
                          {match.speaks_required_language && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs flex items-center gap-1">
                              <Languages className="w-3 h-3" />
                              Speaks Language
                            </span>
                          )}
                          {match.is_available_on_day && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Available
                            </span>
                          )}
                        </div>
                        <div className="flex gap-4 mt-2 text-sm text-gray-500">
                          {match.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {match.email}
                            </span>
                          )}
                          {match.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {match.phone}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-1 text-canmp-green-600">
                          <Award className="w-4 h-4" />
                          <span className="font-bold">{match.match_score}</span>
                          <span className="text-xs text-gray-500">score</span>
                        </div>
                        <button
                          onClick={() => handleAssignVolunteer(match.volunteer_id)}
                          disabled={assigning}
                          className="btn-primary text-sm px-3 py-1"
                        >
                          {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Assign'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
        <button onClick={onClose} className="btn-secondary">
          Close
        </button>
      </div>
    </Modal>
  );
}

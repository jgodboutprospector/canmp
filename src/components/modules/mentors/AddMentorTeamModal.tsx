'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { authFetch } from '@/lib/api-client';
import { Loader2, X, UserPlus } from 'lucide-react';
import type { Household, Volunteer } from '@/types/database';
import type { ApiResponse } from '@/lib/api-server-utils';

interface AddMentorTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddMentorTeamModal({ isOpen, onClose, onSuccess }: AddMentorTeamModalProps) {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    household_id: '',
    lead_volunteer_id: '',
    member_ids: [] as string[],
  });

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  async function fetchData() {
    setLoadingData(true);
    try {
      const [householdsRes, volunteersRes] = await Promise.all([
        supabase
          .from('households')
          .select('*')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('volunteers')
          .select('*')
          .eq('is_active', true)
          .order('last_name'),
      ]);

      if (householdsRes.error) throw householdsRes.error;
      if (volunteersRes.error) throw volunteersRes.error;

      setHouseholds(householdsRes.data || []);
      setVolunteers(volunteersRes.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoadingData(false);
    }
  }

  function resetForm() {
    setForm({
      name: '',
      household_id: '',
      lead_volunteer_id: '',
      member_ids: [],
    });
    setError('');
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function addMember(volunteerId: string) {
    if (volunteerId && !form.member_ids.includes(volunteerId) && volunteerId !== form.lead_volunteer_id) {
      setForm({ ...form, member_ids: [...form.member_ids, volunteerId] });
    }
  }

  function removeMember(volunteerId: string) {
    setForm({
      ...form,
      member_ids: form.member_ids.filter((id) => id !== volunteerId),
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authFetch('/api/mentors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          household_id: form.household_id,
          lead_volunteer_id: form.lead_volunteer_id,
          member_ids: form.member_ids,
        }),
      });

      const result: ApiResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create mentor team');
      }

      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create mentor team');
    } finally {
      setLoading(false);
    }
  }

  const getVolunteerName = (id: string) => {
    const volunteer = volunteers.find((v) => v.id === id);
    return volunteer ? `${volunteer.first_name} ${volunteer.last_name}` : '';
  };

  const availableVolunteers = volunteers.filter(
    (v) => v.id !== form.lead_volunteer_id && !form.member_ids.includes(v.id)
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Mentor Team" size="lg">
      <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-canmp-green-500" />
          </div>
        ) : (
          <>
            {/* Team Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Team Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Team Alpha"
                className="input"
                required
              />
            </div>

            {/* Household */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assigned Household <span className="text-red-500">*</span>
              </label>
              <select
                value={form.household_id}
                onChange={(e) => setForm({ ...form, household_id: e.target.value })}
                className="input"
                required
              >
                <option value="">Select household...</option>
                {households.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>

            {/* Lead Volunteer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Team Lead <span className="text-red-500">*</span>
              </label>
              <select
                value={form.lead_volunteer_id}
                onChange={(e) => {
                  // If the new lead was a member, remove them from members
                  const newLeadId = e.target.value;
                  setForm({
                    ...form,
                    lead_volunteer_id: newLeadId,
                    member_ids: form.member_ids.filter((id) => id !== newLeadId),
                  });
                }}
                className="input"
                required
              >
                <option value="">Select team lead...</option>
                {volunteers.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.first_name} {v.last_name}
                    {v.skills.length > 0 && ` - ${v.skills.slice(0, 2).join(', ')}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Team Members */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Team Members
              </label>
              <div className="flex gap-2 mb-2">
                <select
                  onChange={(e) => {
                    addMember(e.target.value);
                    e.target.value = '';
                  }}
                  className="input flex-1"
                  disabled={availableVolunteers.length === 0}
                >
                  <option value="">Add a team member...</option>
                  {availableVolunteers.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.first_name} {v.last_name}
                    </option>
                  ))}
                </select>
              </div>

              {form.member_ids.length > 0 && (
                <div className="space-y-2">
                  {form.member_ids.map((id) => (
                    <div
                      key={id}
                      className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{getVolunteerName(id)}</span>
                        <span className="text-xs text-gray-500">Member</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMember(id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary */}
            {form.lead_volunteer_id && (
              <div className="bg-canmp-green-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-canmp-green-900 mb-2">Team Summary</h4>
                <ul className="text-sm text-canmp-green-700 space-y-1">
                  <li>
                    <strong>Lead:</strong> {getVolunteerName(form.lead_volunteer_id)}
                  </li>
                  <li>
                    <strong>Members:</strong>{' '}
                    {form.member_ids.length > 0
                      ? form.member_ids.map((id) => getVolunteerName(id)).join(', ')
                      : 'None added'}
                  </li>
                  <li>
                    <strong>Total Team Size:</strong> {1 + form.member_ids.length}
                  </li>
                </ul>
              </div>
            )}
          </>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || loadingData || !form.name.trim() || !form.household_id || !form.lead_volunteer_id}
            className="btn-primary"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Team'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

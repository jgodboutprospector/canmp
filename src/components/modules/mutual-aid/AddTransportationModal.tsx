'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { authFetch } from '@/lib/api-client';
import { Loader2, MapPin, Calendar, Users, AlertCircle } from 'lucide-react';
import type { HouseholdWithRelations, Beneficiary } from '@/types/database';
import type { ApiResponse } from '@/lib/api-server-utils';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

interface MentorTeam {
  id: string;
  name: string | null;
  household_id: string | null;
}

interface AddTransportationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddTransportationModal({ isOpen, onClose, onSuccess }: AddTransportationModalProps) {
  const [households, setHouseholds] = useState<HouseholdWithRelations[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [mentorTeams, setMentorTeams] = useState<MentorTeam[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    household_id: '',
    beneficiary_id: '',
    mentor_team_id: '',

    // Pickup
    pickup_address_street: '',
    pickup_address_city: '',
    pickup_address_state: 'ME',
    pickup_address_zip: '',
    pickup_notes: '',

    // Dropoff
    dropoff_address_street: '',
    dropoff_address_city: '',
    dropoff_address_state: 'ME',
    dropoff_address_zip: '',
    dropoff_notes: '',

    // Schedule
    request_date: '',
    pickup_time: '',
    estimated_return_time: '',
    is_recurring: false,
    recurrence_pattern: '' as '' | 'weekly' | 'bi-weekly' | 'monthly',
    recurrence_end_date: '',

    // Requirements
    urgency: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    needs_wheelchair_access: false,
    needs_car_seat: false,
    passenger_count: 1,
    special_instructions: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  async function fetchData() {
    setLoadingData(true);
    try {
      const [householdsRes, mentorTeamsRes] = await Promise.all([
        supabase
          .from('households')
          .select('*, beneficiaries(*)')
          .eq('is_active', true)
          .order('name'),
        (supabase as any)
          .from('mentor_teams')
          .select('id, name, household_id')
          .eq('is_active', true)
          .order('name'),
      ]);

      if (householdsRes.error) throw householdsRes.error;
      if (mentorTeamsRes.error) throw mentorTeamsRes.error;

      setHouseholds(householdsRes.data || []);
      setMentorTeams(mentorTeamsRes.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoadingData(false);
    }
  }

  // Update beneficiaries when household changes
  useEffect(() => {
    if (form.household_id) {
      const household = households.find((h) => h.id === form.household_id);
      setBeneficiaries(household?.beneficiaries || []);

      // Auto-select mentor team if one is linked to this household
      const linkedTeam = mentorTeams.find((t) => t.household_id === form.household_id);
      if (linkedTeam && !form.mentor_team_id) {
        setForm((prev) => ({ ...prev, mentor_team_id: linkedTeam.id }));
      }
    } else {
      setBeneficiaries([]);
    }
  }, [form.household_id, households, mentorTeams]);

  function resetForm() {
    setForm({
      title: '',
      description: '',
      household_id: '',
      beneficiary_id: '',
      mentor_team_id: '',
      pickup_address_street: '',
      pickup_address_city: '',
      pickup_address_state: 'ME',
      pickup_address_zip: '',
      pickup_notes: '',
      dropoff_address_street: '',
      dropoff_address_city: '',
      dropoff_address_state: 'ME',
      dropoff_address_zip: '',
      dropoff_notes: '',
      request_date: '',
      pickup_time: '',
      estimated_return_time: '',
      is_recurring: false,
      recurrence_pattern: '',
      recurrence_end_date: '',
      urgency: 'medium',
      needs_wheelchair_access: false,
      needs_car_seat: false,
      passenger_count: 1,
      special_instructions: '',
    });
    setError('');
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authFetch('/api/mutual-aid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          household_id: form.household_id,
          beneficiary_id: form.beneficiary_id || null,
          mentor_team_id: form.mentor_team_id || null,

          pickup_address_street: form.pickup_address_street.trim() || null,
          pickup_address_city: form.pickup_address_city.trim() || null,
          pickup_address_state: form.pickup_address_state || null,
          pickup_address_zip: form.pickup_address_zip.trim() || null,
          pickup_notes: form.pickup_notes.trim() || null,

          dropoff_address_street: form.dropoff_address_street.trim() || null,
          dropoff_address_city: form.dropoff_address_city.trim() || null,
          dropoff_address_state: form.dropoff_address_state || null,
          dropoff_address_zip: form.dropoff_address_zip.trim() || null,
          dropoff_notes: form.dropoff_notes.trim() || null,

          request_date: form.request_date,
          pickup_time: form.pickup_time || null,
          estimated_return_time: form.estimated_return_time || null,
          is_recurring: form.is_recurring,
          recurrence_pattern: form.is_recurring ? form.recurrence_pattern || null : null,
          recurrence_end_date: form.is_recurring ? form.recurrence_end_date || null : null,

          urgency: form.urgency,
          needs_wheelchair_access: form.needs_wheelchair_access,
          needs_car_seat: form.needs_car_seat,
          passenger_count: form.passenger_count,
          special_instructions: form.special_instructions.trim() || null,
        }),
      });

      const result: ApiResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create transportation request');
      }

      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create transportation request');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New Transportation Request" size="lg">
      <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5 max-h-[75vh] overflow-y-auto">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-canmp-green-500" />
          </div>
        ) : (
          <>
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Request Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., Medical Appointment, Grocery Shopping"
                className="input"
                required
              />
            </div>

            {/* Link To Section */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Link To
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Household <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.household_id}
                    onChange={(e) =>
                      setForm({ ...form, household_id: e.target.value, beneficiary_id: '' })
                    }
                    className="input"
                    required
                  >
                    <option value="">Select household...</option>
                    {households.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Beneficiary</label>
                  <select
                    value={form.beneficiary_id}
                    onChange={(e) => setForm({ ...form, beneficiary_id: e.target.value })}
                    className="input"
                    disabled={!form.household_id}
                  >
                    <option value="">Entire household</option>
                    {beneficiaries.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.first_name} {b.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mentor Team</label>
                <select
                  value={form.mentor_team_id}
                  onChange={(e) => setForm({ ...form, mentor_team_id: e.target.value })}
                  className="input"
                >
                  <option value="">No mentor team</option>
                  {mentorTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name || 'Unnamed Team'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pickup Location */}
            <div className="bg-blue-50 rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-medium text-blue-900 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Pickup Location
              </h4>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                <input
                  type="text"
                  value={form.pickup_address_street}
                  onChange={(e) => setForm({ ...form, pickup_address_street: e.target.value })}
                  placeholder="123 Main Street"
                  className="input"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={form.pickup_address_city}
                    onChange={(e) => setForm({ ...form, pickup_address_city: e.target.value })}
                    placeholder="Waterville"
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <select
                    value={form.pickup_address_state}
                    onChange={(e) => setForm({ ...form, pickup_address_state: e.target.value })}
                    className="input"
                  >
                    {US_STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                  <input
                    type="text"
                    value={form.pickup_address_zip}
                    onChange={(e) => setForm({ ...form, pickup_address_zip: e.target.value })}
                    placeholder="04901"
                    maxLength={10}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Notes</label>
                <input
                  type="text"
                  value={form.pickup_notes}
                  onChange={(e) => setForm({ ...form, pickup_notes: e.target.value })}
                  placeholder="e.g., Ring doorbell, wait for assistance"
                  className="input"
                />
              </div>
            </div>

            {/* Dropoff Location */}
            <div className="bg-green-50 rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-medium text-green-900 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Dropoff Location
              </h4>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                <input
                  type="text"
                  value={form.dropoff_address_street}
                  onChange={(e) => setForm({ ...form, dropoff_address_street: e.target.value })}
                  placeholder="149 North Street"
                  className="input"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={form.dropoff_address_city}
                    onChange={(e) => setForm({ ...form, dropoff_address_city: e.target.value })}
                    placeholder="Waterville"
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <select
                    value={form.dropoff_address_state}
                    onChange={(e) => setForm({ ...form, dropoff_address_state: e.target.value })}
                    className="input"
                  >
                    {US_STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                  <input
                    type="text"
                    value={form.dropoff_address_zip}
                    onChange={(e) => setForm({ ...form, dropoff_address_zip: e.target.value })}
                    placeholder="04901"
                    maxLength={10}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dropoff Notes</label>
                <input
                  type="text"
                  value={form.dropoff_notes}
                  onChange={(e) => setForm({ ...form, dropoff_notes: e.target.value })}
                  placeholder="e.g., Drop at main entrance"
                  className="input"
                />
              </div>
            </div>

            {/* Schedule */}
            <div className="bg-purple-50 rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-medium text-purple-900 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Schedule
              </h4>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.request_date}
                    onChange={(e) => setForm({ ...form, request_date: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Time</label>
                  <input
                    type="time"
                    value={form.pickup_time}
                    onChange={(e) => setForm({ ...form, pickup_time: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Est. Return</label>
                  <input
                    type="time"
                    value={form.estimated_return_time}
                    onChange={(e) => setForm({ ...form, estimated_return_time: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_recurring}
                    onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })}
                    className="rounded border-gray-300 text-canmp-green-600 focus:ring-canmp-green-500"
                  />
                  <span className="text-sm text-gray-700">Recurring</span>
                </label>

                {form.is_recurring && (
                  <>
                    <select
                      value={form.recurrence_pattern}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          recurrence_pattern: e.target.value as 'weekly' | 'bi-weekly' | 'monthly',
                        })
                      }
                      className="input w-32"
                    >
                      <option value="">Pattern...</option>
                      <option value="weekly">Weekly</option>
                      <option value="bi-weekly">Bi-weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Until:</span>
                      <input
                        type="date"
                        value={form.recurrence_end_date}
                        onChange={(e) => setForm({ ...form, recurrence_end_date: e.target.value })}
                        className="input w-36"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Requirements */}
            <div className="bg-orange-50 rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-medium text-orange-900">Requirements</h4>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700">Passengers:</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={form.passenger_count}
                    onChange={(e) => setForm({ ...form, passenger_count: parseInt(e.target.value) || 1 })}
                    className="input w-16 text-center"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.needs_wheelchair_access}
                    onChange={(e) => setForm({ ...form, needs_wheelchair_access: e.target.checked })}
                    className="rounded border-gray-300 text-canmp-green-600 focus:ring-canmp-green-500"
                  />
                  <span className="text-sm text-gray-700">Wheelchair Access</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.needs_car_seat}
                    onChange={(e) => setForm({ ...form, needs_car_seat: e.target.checked })}
                    className="rounded border-gray-300 text-canmp-green-600 focus:ring-canmp-green-500"
                  />
                  <span className="text-sm text-gray-700">Car Seat</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high', 'urgent'] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setForm({ ...form, urgency: level })}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        form.urgency === level
                          ? level === 'urgent'
                            ? 'bg-red-600 text-white'
                            : level === 'high'
                            ? 'bg-orange-500 text-white'
                            : level === 'medium'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes / Special Instructions
              </label>
              <textarea
                value={form.special_instructions}
                onChange={(e) => setForm({ ...form, special_instructions: e.target.value })}
                placeholder="Any additional information for the volunteer..."
                className="input"
                rows={3}
              />
            </div>
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
            disabled={loading || loadingData || !form.title.trim() || !form.household_id || !form.request_date}
            className="btn-primary"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Request'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

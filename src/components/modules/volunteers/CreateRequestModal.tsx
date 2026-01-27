'use client';

import { useState, useEffect } from 'react';
import { Loader2, X, Home, User, Calendar, Clock, MapPin, Languages } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { useRequestTypes } from '@/lib/hooks/useVolunteers';

interface Household {
  id: string;
  name: string;
}

interface Beneficiary {
  id: string;
  first_name: string;
  last_name: string;
  household_id: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  preselectedHouseholdId?: string;
  preselectedBeneficiaryId?: string;
}

const LANGUAGES = [
  'Arabic', 'Burmese', 'Chinese (Mandarin)', 'Chinese (Cantonese)', 'Dari',
  'English', 'Farsi', 'French', 'Hindi', 'Karen', 'Kinyarwanda', 'Korean',
  'Nepali', 'Pashto', 'Portuguese', 'Russian', 'Somali', 'Spanish',
  'Swahili', 'Tigrinya', 'Ukrainian', 'Urdu', 'Vietnamese'
];

export default function CreateRequestModal({
  isOpen,
  onClose,
  onCreated,
  preselectedHouseholdId,
  preselectedBeneficiaryId,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [filteredBeneficiaries, setFilteredBeneficiaries] = useState<Beneficiary[]>([]);

  const { requestTypes, loading: typesLoading } = useRequestTypes();

  const [form, setForm] = useState({
    title: '',
    description: '',
    request_type: '',
    urgency: 'medium',
    household_id: preselectedHouseholdId || '',
    beneficiary_id: preselectedBeneficiaryId || '',
    preferred_date: '',
    preferred_time_start: '',
    preferred_time_end: '',
    is_recurring: false,
    recurrence_pattern: '',
    location_address: '',
    location_notes: '',
    languages_needed: [] as string[],
  });

  useEffect(() => {
    if (isOpen) {
      fetchHouseholds();
      fetchBeneficiaries();
    }
  }, [isOpen]);

  useEffect(() => {
    if (form.household_id) {
      setFilteredBeneficiaries(
        beneficiaries.filter((b) => b.household_id === form.household_id)
      );
    } else {
      setFilteredBeneficiaries(beneficiaries);
    }
  }, [form.household_id, beneficiaries]);

  async function fetchHouseholds() {
    try {
      const { data, error } = await supabase
        .from('households')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setHouseholds(data || []);
    } catch (err) {
      console.error('Error fetching households:', err);
    }
  }

  async function fetchBeneficiaries() {
    try {
      const { data, error } = await supabase
        .from('beneficiaries')
        .select('id, first_name, last_name, household_id')
        .eq('is_active', true)
        .order('last_name');

      if (error) throw error;
      setBeneficiaries(data || []);
    } catch (err) {
      console.error('Error fetching beneficiaries:', err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const requestData: Record<string, unknown> = {
        title: form.title,
        description: form.description || null,
        request_type: form.request_type || null,
        urgency: form.urgency,
        household_id: form.household_id || null,
        beneficiary_id: form.beneficiary_id || null,
        preferred_date: form.preferred_date || null,
        preferred_time_start: form.preferred_time_start || null,
        preferred_time_end: form.preferred_time_end || null,
        is_recurring: form.is_recurring,
        recurrence_pattern: form.is_recurring ? form.recurrence_pattern : null,
        location_address: form.location_address || null,
        location_notes: form.location_notes || null,
        languages_needed: form.languages_needed.length > 0 ? form.languages_needed : null,
        status: 'pending',
      };

      const { error: insertError } = await (supabase as any)
        .from('volunteer_requests')
        .insert(requestData);

      if (insertError) throw insertError;

      onCreated();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create request');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm({
      title: '',
      description: '',
      request_type: '',
      urgency: 'medium',
      household_id: preselectedHouseholdId || '',
      beneficiary_id: preselectedBeneficiaryId || '',
      preferred_date: '',
      preferred_time_start: '',
      preferred_time_end: '',
      is_recurring: false,
      recurrence_pattern: '',
      location_address: '',
      location_notes: '',
      languages_needed: [],
    });
  }

  function toggleLanguage(lang: string) {
    setForm((prev) => ({
      ...prev,
      languages_needed: prev.languages_needed.includes(lang)
        ? prev.languages_needed.filter((l) => l !== lang)
        : [...prev.languages_needed, lang],
    }));
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Volunteer Request" size="lg">
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>
        )}

        {/* Title and Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Request Title *
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input w-full"
              placeholder="e.g., Transportation to medical appointment"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Request Type
            </label>
            <select
              value={form.request_type}
              onChange={(e) => setForm({ ...form, request_type: e.target.value })}
              className="input w-full"
              disabled={typesLoading}
            >
              <option value="">Select type...</option>
              {requestTypes.map((type) => (
                <option key={type.id} value={type.name}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input w-full"
            rows={3}
            placeholder="Describe what help is needed..."
          />
        </div>

        {/* Household and Beneficiary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Home className="w-4 h-4 inline mr-1" />
              Household
            </label>
            <select
              value={form.household_id}
              onChange={(e) => setForm({ ...form, household_id: e.target.value, beneficiary_id: '' })}
              className="input w-full"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <User className="w-4 h-4 inline mr-1" />
              Beneficiary
            </label>
            <select
              value={form.beneficiary_id}
              onChange={(e) => setForm({ ...form, beneficiary_id: e.target.value })}
              className="input w-full"
            >
              <option value="">Select beneficiary...</option>
              {filteredBeneficiaries.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.first_name} {b.last_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Urgency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
          <div className="flex gap-2">
            {['low', 'medium', 'high', 'urgent'].map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setForm({ ...form, urgency: level })}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  form.urgency === level
                    ? level === 'urgent'
                      ? 'bg-red-100 text-red-700 ring-2 ring-red-500'
                      : level === 'high'
                      ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-500'
                      : level === 'medium'
                      ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500'
                      : 'bg-gray-100 text-gray-700 ring-2 ring-gray-500'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Scheduling */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Scheduling
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Preferred Date</label>
              <input
                type="date"
                value={form.preferred_date}
                onChange={(e) => setForm({ ...form, preferred_date: e.target.value })}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Start Time</label>
              <input
                type="time"
                value={form.preferred_time_start}
                onChange={(e) => setForm({ ...form, preferred_time_start: e.target.value })}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">End Time</label>
              <input
                type="time"
                value={form.preferred_time_end}
                onChange={(e) => setForm({ ...form, preferred_time_end: e.target.value })}
                className="input w-full"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.is_recurring}
                onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })}
                className="rounded border-gray-300 text-canmp-green-600 focus:ring-canmp-green-500"
              />
              Recurring request
            </label>
            {form.is_recurring && (
              <select
                value={form.recurrence_pattern}
                onChange={(e) => setForm({ ...form, recurrence_pattern: e.target.value })}
                className="input"
              >
                <option value="">Select pattern...</option>
                <option value="weekly">Weekly</option>
                <option value="bi-weekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            )}
          </div>
        </div>

        {/* Location */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Location
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Address</label>
              <input
                type="text"
                value={form.location_address}
                onChange={(e) => setForm({ ...form, location_address: e.target.value })}
                className="input w-full"
                placeholder="Street address"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Location Notes</label>
              <input
                type="text"
                value={form.location_notes}
                onChange={(e) => setForm({ ...form, location_notes: e.target.value })}
                className="input w-full"
                placeholder="e.g., Apartment #, parking info"
              />
            </div>
          </div>
        </div>

        {/* Languages */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Languages className="w-4 h-4" />
            Languages Needed
          </h4>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => toggleLanguage(lang)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  form.languages_needed.includes(lang)
                    ? 'bg-canmp-green-100 text-canmp-green-700 ring-1 ring-canmp-green-500'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
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

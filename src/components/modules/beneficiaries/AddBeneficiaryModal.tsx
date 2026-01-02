'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import { logCreate } from '@/lib/audit';
import type { Household, RelationshipType, Gender, LanguageProficiency } from '@/types/database';

interface AddBeneficiaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedHouseholdId?: string;
}

const RELATIONSHIP_TYPES: { value: RelationshipType; label: string }[] = [
  { value: 'head_of_household', label: 'Head of Household' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'child', label: 'Child' },
  { value: 'parent', label: 'Parent' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'other_relative', label: 'Other Relative' },
  { value: 'other', label: 'Other' },
];

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const ENGLISH_PROFICIENCY: { value: LanguageProficiency; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'basic', label: 'Basic' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'fluent', label: 'Fluent' },
  { value: 'native', label: 'Native Speaker' },
];

const EDUCATION_LEVELS = [
  'None',
  'Elementary',
  'Middle School',
  'High School',
  'Some College',
  'Associate Degree',
  'Bachelor\'s Degree',
  'Master\'s Degree',
  'Doctorate',
  'Other',
];

export function AddBeneficiaryModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedHouseholdId,
}: AddBeneficiaryModalProps) {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHouseholds, setLoadingHouseholds] = useState(true);
  const [error, setError] = useState('');
  const [existingHeadCount, setExistingHeadCount] = useState(0);

  const [form, setForm] = useState({
    household_id: preselectedHouseholdId || '',
    first_name: '',
    last_name: '',
    relationship_type: 'other' as RelationshipType,
    date_of_birth: '',
    gender: '' as Gender | '',
    phone: '',
    email: '',
    english_proficiency: 'none' as LanguageProficiency,
    education_level: '',
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchHouseholds();
      setForm((prev) => ({
        ...prev,
        household_id: preselectedHouseholdId || '',
      }));
    }
  }, [isOpen, preselectedHouseholdId]);

  useEffect(() => {
    if (form.household_id) {
      checkExistingHead(form.household_id);
    }
  }, [form.household_id]);

  async function fetchHouseholds() {
    setLoadingHouseholds(true);
    try {
      const { data, error } = await (supabase as any)
        .from('households')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setHouseholds(data || []);
    } catch (err) {
      console.error('Error fetching households:', err);
    } finally {
      setLoadingHouseholds(false);
    }
  }

  async function checkExistingHead(householdId: string) {
    try {
      const { count, error } = await (supabase as any)
        .from('beneficiaries')
        .select('*', { count: 'exact', head: true })
        .eq('household_id', householdId)
        .eq('relationship_type', 'head_of_household')
        .eq('is_active', true);

      if (error) throw error;
      setExistingHeadCount(count || 0);
    } catch (err) {
      console.error('Error checking head of household:', err);
    }
  }

  function resetForm() {
    setForm({
      household_id: '',
      first_name: '',
      last_name: '',
      relationship_type: 'other',
      date_of_birth: '',
      gender: '',
      phone: '',
      email: '',
      english_proficiency: 'none',
      education_level: '',
      notes: '',
    });
    setError('');
    setExistingHeadCount(0);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate head of household uniqueness
    if (form.relationship_type === 'head_of_household' && existingHeadCount > 0) {
      setError('This household already has a head of household. Please select a different relationship type.');
      setLoading(false);
      return;
    }

    try {
      const insertData = {
        household_id: form.household_id,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        relationship_type: form.relationship_type,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        english_proficiency: form.english_proficiency,
        education_level: form.education_level || null,
        is_active: true,
        is_employed: false,
      };

      const { data, error } = await (supabase as any)
        .from('beneficiaries')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // Log audit entry
      await logCreate(
        'beneficiary',
        data.id,
        `${form.first_name} ${form.last_name}`,
        insertData
      );

      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add individual');
    } finally {
      setLoading(false);
    }
  }

  const showHeadWarning = form.relationship_type === 'head_of_household' && existingHeadCount > 0;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Individual" size="lg">
      <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Household Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Household <span className="text-red-500">*</span>
          </label>
          {loadingHouseholds ? (
            <div className="input flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            </div>
          ) : (
            <select
              value={form.household_id}
              onChange={(e) => setForm({ ...form, household_id: e.target.value })}
              className="input"
              required
            >
              <option value="">Select household...</option>
              {households.map((household) => (
                <option key={household.id} value={household.id}>
                  {household.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              placeholder="First name"
              className="input"
              required
            />
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              placeholder="Last name"
              className="input"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Relationship Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Relationship <span className="text-red-500">*</span>
            </label>
            <select
              value={form.relationship_type}
              onChange={(e) => setForm({ ...form, relationship_type: e.target.value as RelationshipType })}
              className="input"
              required
            >
              {RELATIONSHIP_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {showHeadWarning && (
              <p className="text-xs text-amber-600 mt-1">
                This household already has a head of household
              </p>
            )}
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date of Birth
            </label>
            <input
              type="date"
              value={form.date_of_birth}
              onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
              className="input"
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value as Gender })}
              className="input"
            >
              <option value="">Select...</option>
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          {/* English Proficiency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              English Proficiency
            </label>
            <select
              value={form.english_proficiency}
              onChange={(e) => setForm({ ...form, english_proficiency: e.target.value as LanguageProficiency })}
              className="input"
            >
              {ENGLISH_PROFICIENCY.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="(xxx) xxx-xxxx"
              className="input"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@example.com"
              className="input"
            />
          </div>
        </div>

        {/* Education Level */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Education Level
          </label>
          <select
            value={form.education_level}
            onChange={(e) => setForm({ ...form, education_level: e.target.value })}
            className="input"
          >
            <option value="">Select...</option>
            {EDUCATION_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

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
            disabled={loading || !form.household_id || !form.first_name.trim() || !form.last_name.trim() || showHeadWarning}
            className="btn-primary"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Individual'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

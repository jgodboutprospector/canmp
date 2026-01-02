'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import type { Household, Beneficiary } from '@/types/database';

interface AddCaseNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedHouseholdId?: string;
  preselectedBeneficiaryId?: string;
}

interface HouseholdOption extends Household {
  beneficiaries?: Beneficiary[];
}

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'housing', label: 'Housing' },
  { value: 'employment', label: 'Employment' },
  { value: 'education', label: 'Education' },
  { value: 'health', label: 'Health' },
  { value: 'legal', label: 'Legal' },
  { value: 'financial', label: 'Financial' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'childcare', label: 'Childcare' },
];

const VISIBILITY_OPTIONS = [
  { value: 'all_staff', label: 'All Staff' },
  { value: 'coordinators_only', label: 'Coordinators Only' },
  { value: 'private', label: 'Private (Only Me)' },
];

export function AddCaseNoteModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedHouseholdId,
  preselectedBeneficiaryId,
}: AddCaseNoteModalProps) {
  const [households, setHouseholds] = useState<HouseholdOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHouseholds, setLoadingHouseholds] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    household_id: preselectedHouseholdId || '',
    beneficiary_id: preselectedBeneficiaryId || '',
    content: '',
    category: 'general',
    visibility: 'all_staff',
    is_followup_required: false,
    followup_date: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchHouseholds();
      // Reset form with preselected values
      setForm({
        household_id: preselectedHouseholdId || '',
        beneficiary_id: preselectedBeneficiaryId || '',
        content: '',
        category: 'general',
        visibility: 'all_staff',
        is_followup_required: false,
        followup_date: '',
      });
    }
  }, [isOpen, preselectedHouseholdId, preselectedBeneficiaryId]);

  async function fetchHouseholds() {
    setLoadingHouseholds(true);
    try {
      const { data, error } = await supabase
        .from('households')
        .select(`
          *,
          beneficiaries(id, first_name, last_name)
        `)
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

  function resetForm() {
    setForm({
      household_id: '',
      beneficiary_id: '',
      content: '',
      category: 'general',
      visibility: 'all_staff',
      is_followup_required: false,
      followup_date: '',
    });
    setError('');
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function handleHouseholdChange(householdId: string) {
    setForm({
      ...form,
      household_id: householdId,
      beneficiary_id: '', // Reset beneficiary when household changes
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await (supabase as any).from('case_notes').insert({
        household_id: form.household_id,
        beneficiary_id: form.beneficiary_id || null,
        content: form.content.trim(),
        category: form.category,
        visibility: form.visibility,
        is_followup_required: form.is_followup_required,
        followup_date: form.is_followup_required && form.followup_date ? form.followup_date : null,
        followup_completed: false,
      });

      if (error) throw error;

      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create case note');
    } finally {
      setLoading(false);
    }
  }

  const selectedHousehold = households.find((h) => h.id === form.household_id);
  const beneficiaries = selectedHousehold?.beneficiaries || [];

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Case Note" size="lg">
      <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* Household */}
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
                onChange={(e) => handleHouseholdChange(e.target.value)}
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

          {/* Beneficiary (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Specific Individual (Optional)
            </label>
            <select
              value={form.beneficiary_id}
              onChange={(e) => setForm({ ...form, beneficiary_id: e.target.value })}
              className="input"
              disabled={!form.household_id || beneficiaries.length === 0}
            >
              <option value="">All household members</option>
              {beneficiaries.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.first_name} {b.last_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="input"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
            <select
              value={form.visibility}
              onChange={(e) => setForm({ ...form, visibility: e.target.value })}
              className="input"
            >
              {VISIBILITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Note Content <span className="text-red-500">*</span>
          </label>
          <textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder="Enter the case note details..."
            className="input"
            rows={5}
            required
          />
        </div>

        {/* Follow-up Section */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_followup_required}
              onChange={(e) =>
                setForm({
                  ...form,
                  is_followup_required: e.target.checked,
                  followup_date: e.target.checked ? form.followup_date : '',
                })
              }
              className="rounded border-gray-300 text-canmp-green-600 focus:ring-canmp-green-500"
            />
            <span className="text-sm font-medium text-gray-700">Follow-up required</span>
          </label>

          {form.is_followup_required && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Follow-up Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.followup_date}
                onChange={(e) => setForm({ ...form, followup_date: e.target.value })}
                className="input max-w-xs"
                required={form.is_followup_required}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          )}
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
            disabled={loading || !form.household_id || !form.content.trim()}
            className="btn-primary"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Note'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

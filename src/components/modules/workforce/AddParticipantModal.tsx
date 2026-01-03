'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

interface AddParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Beneficiary {
  id: string;
  first_name: string;
  last_name: string;
  household?: {
    name: string;
  } | null;
}

const JOB_STATUSES = [
  { value: 'intake', label: 'Intake' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'searching', label: 'Job Searching' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'placed', label: 'Placed' },
  { value: 'employed', label: 'Employed 90+ Days' },
];

const SCHEDULE_OPTIONS = [
  'Full-time',
  'Part-time',
  'Flexible',
  'Weekdays only',
  'Weekends available',
  'Nights available',
];

const INDUSTRY_OPTIONS = [
  'Healthcare',
  'Manufacturing',
  'Retail',
  'Hospitality',
  'Food Service',
  'Construction',
  'Transportation',
  'Warehouse/Logistics',
  'Cleaning/Janitorial',
  'Childcare',
  'Office/Administrative',
  'Technology',
  'Agriculture',
  'Other',
];

export function AddParticipantModal({ isOpen, onClose, onSuccess }: AddParticipantModalProps) {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingBeneficiaries, setLoadingBeneficiaries] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    beneficiary_id: '',
    status: 'intake',
    target_occupation: '',
    current_employer: '',
    current_job_title: '',
    current_hourly_wage: '',
    career_summary: '',
    preferred_schedule: '',
    preferred_industries: [] as string[],
    strengths: '',
    areas_for_growth: '',
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchBeneficiaries();
    }
  }, [isOpen]);

  async function fetchBeneficiaries() {
    setLoadingBeneficiaries(true);
    try {
      // Get beneficiaries who are not already workforce participants
      const { data: existingParticipants } = await (supabase as any)
        .from('workforce_participants')
        .select('beneficiary_id')
        .eq('is_active', true);

      const existingIds = existingParticipants?.map((p: any) => p.beneficiary_id) || [];

      let query = (supabase as any)
        .from('beneficiaries')
        .select(`
          id, first_name, last_name,
          household:households(name)
        `)
        .eq('is_active', true)
        .order('first_name');

      // Filter out existing participants if there are any
      if (existingIds.length > 0) {
        query = query.not('id', 'in', `(${existingIds.join(',')})`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setBeneficiaries(data || []);
    } catch (err) {
      console.error('Error fetching beneficiaries:', err);
    } finally {
      setLoadingBeneficiaries(false);
    }
  }

  function resetForm() {
    setForm({
      beneficiary_id: '',
      status: 'intake',
      target_occupation: '',
      current_employer: '',
      current_job_title: '',
      current_hourly_wage: '',
      career_summary: '',
      preferred_schedule: '',
      preferred_industries: [],
      strengths: '',
      areas_for_growth: '',
      notes: '',
    });
    setError('');
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function toggleIndustry(industry: string) {
    setForm(prev => ({
      ...prev,
      preferred_industries: prev.preferred_industries.includes(industry)
        ? prev.preferred_industries.filter(i => i !== industry)
        : [...prev.preferred_industries, industry],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await (supabase as any).from('workforce_participants').insert({
        beneficiary_id: form.beneficiary_id,
        status: form.status,
        target_occupation: form.target_occupation.trim() || null,
        current_employer: form.current_employer.trim() || null,
        current_job_title: form.current_job_title.trim() || null,
        current_hourly_wage: form.current_hourly_wage ? parseFloat(form.current_hourly_wage) : null,
        career_summary: form.career_summary.trim() || null,
        preferred_schedule: form.preferred_schedule || null,
        preferred_industries: form.preferred_industries.length > 0 ? form.preferred_industries : null,
        strengths: form.strengths.trim() ? form.strengths.split(',').map(s => s.trim()) : null,
        areas_for_growth: form.areas_for_growth.trim() ? form.areas_for_growth.split(',').map(s => s.trim()) : null,
        notes: form.notes.trim() || null,
        is_active: true,
      });

      if (error) throw error;

      // Add initial status note
      const { data: participant } = await (supabase as any)
        .from('workforce_participants')
        .select('id')
        .eq('beneficiary_id', form.beneficiary_id)
        .single();

      if (participant) {
        await (supabase as any).from('workforce_notes').insert({
          participant_id: participant.id,
          content: `Participant enrolled in workforce program with status: ${JOB_STATUSES.find(s => s.value === form.status)?.label}`,
          note_type: 'enrollment',
        });
      }

      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add participant');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Workforce Participant" size="lg">
      <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4 max-h-[70vh] overflow-y-auto">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Beneficiary Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Beneficiary <span className="text-red-500">*</span>
          </label>
          {loadingBeneficiaries ? (
            <div className="input flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            </div>
          ) : beneficiaries.length === 0 ? (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
              No available beneficiaries. All beneficiaries are already enrolled in the workforce program.
            </div>
          ) : (
            <select
              value={form.beneficiary_id}
              onChange={(e) => setForm({ ...form, beneficiary_id: e.target.value })}
              className="input"
              required
            >
              <option value="">Select a beneficiary...</option>
              {beneficiaries.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.first_name} {b.last_name}
                  {b.household?.name ? ` (${b.household.name})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Initial Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Initial Status <span className="text-red-500">*</span>
            </label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="input"
              required
            >
              {JOB_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {/* Target Occupation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Occupation
            </label>
            <input
              type="text"
              value={form.target_occupation}
              onChange={(e) => setForm({ ...form, target_occupation: e.target.value })}
              placeholder="e.g., CNA, Warehouse Worker"
              className="input"
            />
          </div>
        </div>

        {/* Career Summary */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Career Summary / Background
          </label>
          <textarea
            value={form.career_summary}
            onChange={(e) => setForm({ ...form, career_summary: e.target.value })}
            placeholder="Previous work experience, education, certifications..."
            className="input"
            rows={2}
          />
        </div>

        {/* Current Employment (if any) */}
        <div className="bg-blue-50 rounded-lg p-4 space-y-4">
          <h4 className="text-sm font-medium text-blue-900">Current Employment (if applicable)</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employer
              </label>
              <input
                type="text"
                value={form.current_employer}
                onChange={(e) => setForm({ ...form, current_employer: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Title
              </label>
              <input
                type="text"
                value={form.current_job_title}
                onChange={(e) => setForm({ ...form, current_job_title: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hourly Wage
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={form.current_hourly_wage}
                  onChange={(e) => setForm({ ...form, current_hourly_wage: e.target.value })}
                  className="input pl-7"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Preferred Schedule */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Preferred Schedule
          </label>
          <select
            value={form.preferred_schedule}
            onChange={(e) => setForm({ ...form, preferred_schedule: e.target.value })}
            className="input"
          >
            <option value="">Select schedule preference...</option>
            {SCHEDULE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {/* Preferred Industries */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preferred Industries
          </label>
          <div className="flex flex-wrap gap-2">
            {INDUSTRY_OPTIONS.map((industry) => (
              <button
                key={industry}
                type="button"
                onClick={() => toggleIndustry(industry)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  form.preferred_industries.includes(industry)
                    ? 'bg-canmp-green-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {industry}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Strengths */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Strengths
            </label>
            <input
              type="text"
              value={form.strengths}
              onChange={(e) => setForm({ ...form, strengths: e.target.value })}
              placeholder="Comma-separated: reliable, bilingual, fast learner"
              className="input"
            />
            <p className="text-xs text-gray-500 mt-1">Separate with commas</p>
          </div>

          {/* Areas for Growth */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Areas for Growth
            </label>
            <input
              type="text"
              value={form.areas_for_growth}
              onChange={(e) => setForm({ ...form, areas_for_growth: e.target.value })}
              placeholder="Comma-separated: English skills, computer skills"
              className="input"
            />
            <p className="text-xs text-gray-500 mt-1">Separate with commas</p>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Any additional notes about this participant..."
            className="input"
            rows={2}
          />
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
            disabled={loading || !form.beneficiary_id || beneficiaries.length === 0}
            className="btn-primary"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Participant'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

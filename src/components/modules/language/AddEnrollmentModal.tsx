'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { Loader2, Search } from 'lucide-react';

interface AddEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ClassSection {
  id: string;
  name: string;
  level: string;
  teacher: { first_name: string; last_name: string } | null;
}

interface Beneficiary {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
}

export function AddEnrollmentModal({ isOpen, onClose, onSuccess }: AddEnrollmentModalProps) {
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [searchBeneficiary, setSearchBeneficiary] = useState('');

  const [form, setForm] = useState({
    section_id: '',
    beneficiary_id: '',
    needs_transportation: false,
    needs_childcare: false,
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  async function fetchData() {
    setLoadingData(true);
    try {
      const [classesRes, beneficiariesRes] = await Promise.all([
        (supabase as any)
          .from('class_sections')
          .select('id, name, level, teacher:teachers(first_name, last_name)')
          .eq('is_active', true)
          .order('name'),
        (supabase as any)
          .from('beneficiaries')
          .select('id, first_name, last_name, email')
          .eq('is_active', true)
          .order('last_name'),
      ]);

      if (classesRes.error) throw classesRes.error;
      if (beneficiariesRes.error) throw beneficiariesRes.error;

      setClasses(classesRes.data || []);
      setBeneficiaries(beneficiariesRes.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setLoadingData(false);
    }
  }

  function resetForm() {
    setForm({
      section_id: '',
      beneficiary_id: '',
      needs_transportation: false,
      needs_childcare: false,
      notes: '',
    });
    setSearchBeneficiary('');
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
      // Check if already enrolled
      const { data: existing } = await (supabase as any)
        .from('class_enrollments')
        .select('id')
        .eq('section_id', form.section_id)
        .eq('beneficiary_id', form.beneficiary_id)
        .single();

      if (existing) {
        setError('This student is already enrolled in this class');
        setLoading(false);
        return;
      }

      const { error } = await (supabase as any).from('class_enrollments').insert({
        section_id: form.section_id,
        beneficiary_id: form.beneficiary_id,
        enrolled_date: new Date().toISOString().split('T')[0],
        status: 'active',
        needs_transportation: form.needs_transportation,
        needs_childcare: form.needs_childcare,
        notes: form.notes.trim() || null,
      });

      if (error) throw error;

      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create enrollment');
    } finally {
      setLoading(false);
    }
  }

  const filteredBeneficiaries = beneficiaries.filter(
    (b) =>
      b.first_name.toLowerCase().includes(searchBeneficiary.toLowerCase()) ||
      b.last_name.toLowerCase().includes(searchBeneficiary.toLowerCase()) ||
      b.email?.toLowerCase().includes(searchBeneficiary.toLowerCase())
  );

  const selectedBeneficiary = beneficiaries.find((b) => b.id === form.beneficiary_id);
  const selectedClass = classes.find((c) => c.id === form.section_id);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New Enrollment" size="md">
      <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-canmp-green-500" />
            <span className="ml-2 text-gray-500">Loading...</span>
          </div>
        ) : (
          <>
            {/* Select Class */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Class <span className="text-red-500">*</span>
              </label>
              <select
                value={form.section_id}
                onChange={(e) => setForm({ ...form, section_id: e.target.value })}
                className="input"
                required
              >
                <option value="">Select a class...</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.level})
                    {cls.teacher && ` - ${cls.teacher.first_name} ${cls.teacher.last_name}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Search and Select Student */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Student <span className="text-red-500">*</span>
              </label>

              {selectedBeneficiary ? (
                <div className="flex items-center justify-between p-3 bg-canmp-green-50 border border-canmp-green-200 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">
                      {selectedBeneficiary.first_name} {selectedBeneficiary.last_name}
                    </p>
                    <p className="text-sm text-gray-500">{selectedBeneficiary.email || 'No email'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, beneficiary_id: '' })}
                    className="text-sm text-canmp-green-600 hover:text-canmp-green-700"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchBeneficiary}
                      onChange={(e) => setSearchBeneficiary(e.target.value)}
                      placeholder="Search students..."
                      className="input pl-10"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {filteredBeneficiaries.length === 0 ? (
                      <div className="p-3 text-center text-gray-500 text-sm">
                        No students found
                      </div>
                    ) : (
                      filteredBeneficiaries.slice(0, 10).map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setForm({ ...form, beneficiary_id: b.id })}
                          className="w-full p-3 text-left hover:bg-gray-50 transition-colors"
                        >
                          <p className="font-medium text-gray-900">
                            {b.first_name} {b.last_name}
                          </p>
                          <p className="text-sm text-gray-500">{b.email || 'No email'}</p>
                        </button>
                      ))
                    )}
                    {filteredBeneficiaries.length > 10 && (
                      <div className="p-2 text-center text-gray-400 text-xs">
                        Showing 10 of {filteredBeneficiaries.length} results
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Support Needs */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Support Needs</h4>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.needs_transportation}
                    onChange={(e) => setForm({ ...form, needs_transportation: e.target.checked })}
                    className="rounded border-gray-300 text-canmp-green-600 focus:ring-canmp-green-500"
                  />
                  <span className="text-sm text-gray-700">Needs Transportation</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.needs_childcare}
                    onChange={(e) => setForm({ ...form, needs_childcare: e.target.checked })}
                    className="rounded border-gray-300 text-canmp-green-600 focus:ring-canmp-green-500"
                  />
                  <span className="text-sm text-gray-700">Needs Childcare</span>
                </label>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="input"
                rows={2}
                placeholder="Optional notes about this enrollment..."
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
                disabled={loading || !form.section_id || !form.beneficiary_id}
                className="btn-primary"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Enrollment'
                )}
              </button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}

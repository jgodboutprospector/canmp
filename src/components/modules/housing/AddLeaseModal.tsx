'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import type { LeaseType, LeaseStatus, Property, Unit, Household } from '@/types/database';

interface AddLeaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface PropertyWithUnits extends Property {
  units: Unit[];
}

export function AddLeaseModal({ isOpen, onClose, onSuccess }: AddLeaseModalProps) {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [properties, setProperties] = useState<PropertyWithUnits[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    household_id: '',
    property_id: '',
    unit_id: '',
    lease_type: 'canmp_direct' as LeaseType,
    status: 'pending' as LeaseStatus,
    start_date: '',
    end_date: '',
    monthly_rent: '',
    subsidy_amount: '',
    security_deposit: '',
    total_program_months: 24,
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
      const [householdsRes, propertiesRes] = await Promise.all([
        supabase
          .from('households')
          .select('*')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('properties')
          .select('*, units(*)')
          .eq('is_active', true)
          .order('name'),
      ]);

      if (householdsRes.error) throw householdsRes.error;
      if (propertiesRes.error) throw propertiesRes.error;

      setHouseholds(householdsRes.data || []);
      setProperties(propertiesRes.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoadingData(false);
    }
  }

  function resetForm() {
    setForm({
      household_id: '',
      property_id: '',
      unit_id: '',
      lease_type: 'canmp_direct',
      status: 'pending',
      start_date: '',
      end_date: '',
      monthly_rent: '',
      subsidy_amount: '',
      security_deposit: '',
      total_program_months: 24,
      notes: '',
    });
    setError('');
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function handlePropertyChange(propertyId: string) {
    setForm({ ...form, property_id: propertyId, unit_id: '' });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const monthlyRent = parseFloat(form.monthly_rent) || 0;
    const subsidyAmount = parseFloat(form.subsidy_amount) || 0;

    try {
      const { error } = await (supabase as any).from('leases').insert({
        household_id: form.household_id,
        unit_id: form.unit_id,
        lease_type: form.lease_type,
        status: form.status,
        start_date: form.start_date,
        end_date: form.end_date || null,
        monthly_rent: monthlyRent,
        subsidy_amount: subsidyAmount,
        security_deposit: form.security_deposit ? parseFloat(form.security_deposit) : null,
        program_month: 1,
        total_program_months: form.lease_type === 'bridge' ? form.total_program_months : 24,
        program_start_date: form.lease_type === 'bridge' ? form.start_date : null,
        notes: form.notes.trim() || null,
      });

      if (error) throw error;

      // Update unit status to occupied
      if (form.unit_id && form.status === 'active') {
        await (supabase as any)
          .from('units')
          .update({ status: 'occupied' })
          .eq('id', form.unit_id);
      }

      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create lease');
    } finally {
      setLoading(false);
    }
  }

  const selectedProperty = properties.find((p) => p.id === form.property_id);
  const availableUnits = selectedProperty?.units.filter((u) => u.status === 'available') || [];
  const isBridge = form.lease_type === 'bridge';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Lease" size="lg">
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
            <div className="grid grid-cols-2 gap-4">
              {/* Lease Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lease Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.lease_type}
                  onChange={(e) => setForm({ ...form, lease_type: e.target.value as LeaseType })}
                  className="input"
                  required
                >
                  <option value="canmp_direct">CANMP Direct</option>
                  <option value="master_sublease">Master Sublease</option>
                  <option value="bridge">Bridge Program</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as LeaseStatus })}
                  className="input"
                  required
                >
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                </select>
              </div>
            </div>

            {/* Household */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Household <span className="text-red-500">*</span>
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

            <div className="grid grid-cols-2 gap-4">
              {/* Property */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.property_id}
                  onChange={(e) => handlePropertyChange(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">Select property...</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Unit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.unit_id}
                  onChange={(e) => setForm({ ...form, unit_id: e.target.value })}
                  className="input"
                  required
                  disabled={!form.property_id}
                >
                  <option value="">Select unit...</option>
                  {availableUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                      Unit {u.unit_number} ({u.bedrooms}BR)
                    </option>
                  ))}
                </select>
                {form.property_id && availableUnits.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">No available units in this property</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="input"
                  required
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className="input"
                  min={form.start_date}
                />
              </div>
            </div>

            {/* Rent Section */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <h4 className="text-sm font-medium text-gray-900">Rent Details</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Rent <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={form.monthly_rent}
                      onChange={(e) => setForm({ ...form, monthly_rent: e.target.value })}
                      className="input pl-7"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subsidy Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={form.subsidy_amount}
                      onChange={(e) => setForm({ ...form, subsidy_amount: e.target.value })}
                      className="input pl-7"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Security Deposit
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={form.security_deposit}
                      onChange={(e) => setForm({ ...form, security_deposit: e.target.value })}
                      className="input pl-7"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
              </div>
              {form.monthly_rent && form.subsidy_amount && (
                <p className="text-sm text-gray-600">
                  Tenant pays: <span className="font-medium text-gray-900">
                    ${(parseFloat(form.monthly_rent) - parseFloat(form.subsidy_amount)).toFixed(2)}/mo
                  </span>
                </p>
              )}
            </div>

            {/* Bridge Program Section */}
            {isBridge && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-3">Bridge Program Details</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Program Months
                  </label>
                  <select
                    value={form.total_program_months}
                    onChange={(e) => setForm({ ...form, total_program_months: parseInt(e.target.value) })}
                    className="input max-w-xs"
                  >
                    <option value={12}>12 months</option>
                    <option value={18}>18 months</option>
                    <option value={24}>24 months</option>
                  </select>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Any additional notes about this lease..."
                className="input"
                rows={2}
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
            disabled={loading || loadingData || !form.household_id || !form.unit_id || !form.start_date}
            className="btn-primary"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Lease'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

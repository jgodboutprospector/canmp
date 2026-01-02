'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import type { Site, PropertyType } from '@/types/database';

interface AddPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

export function AddPropertyModal({ isOpen, onClose, onSuccess }: AddPropertyModalProps) {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSites, setLoadingSites] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    address_street: '',
    address_city: '',
    address_state: 'ME',
    address_zip: '',
    property_type: 'canmp_owned' as PropertyType,
    total_units: 1,
    site_id: '',
    landlord_name: '',
    landlord_phone: '',
    landlord_email: '',
    master_lease_rent: '',
    master_lease_start: '',
    master_lease_end: '',
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchSites();
    }
  }, [isOpen]);

  async function fetchSites() {
    try {
      const { data, error } = await supabase.from('sites').select('*').order('name');
      if (error) throw error;
      setSites(data || []);
    } catch (err) {
      console.error('Error fetching sites:', err);
    } finally {
      setLoadingSites(false);
    }
  }

  function resetForm() {
    setForm({
      name: '',
      address_street: '',
      address_city: '',
      address_state: 'ME',
      address_zip: '',
      property_type: 'canmp_owned',
      total_units: 1,
      site_id: '',
      landlord_name: '',
      landlord_phone: '',
      landlord_email: '',
      master_lease_rent: '',
      master_lease_start: '',
      master_lease_end: '',
      notes: '',
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
      const { error } = await (supabase as any).from('properties').insert({
        name: form.name.trim(),
        address_street: form.address_street.trim(),
        address_city: form.address_city.trim(),
        address_state: form.address_state,
        address_zip: form.address_zip.trim() || null,
        property_type: form.property_type,
        total_units: form.total_units,
        site_id: form.site_id || null,
        landlord_name: form.property_type === 'master_lease' ? form.landlord_name.trim() || null : null,
        landlord_phone: form.property_type === 'master_lease' ? form.landlord_phone.trim() || null : null,
        landlord_email: form.property_type === 'master_lease' ? form.landlord_email.trim() || null : null,
        master_lease_rent: form.property_type === 'master_lease' && form.master_lease_rent
          ? parseFloat(form.master_lease_rent)
          : null,
        master_lease_start: form.property_type === 'master_lease' && form.master_lease_start
          ? form.master_lease_start
          : null,
        master_lease_end: form.property_type === 'master_lease' && form.master_lease_end
          ? form.master_lease_end
          : null,
        notes: form.notes.trim() || null,
        is_active: true,
      });

      if (error) throw error;

      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create property');
    } finally {
      setLoading(false);
    }
  }

  const isMasterLease = form.property_type === 'master_lease';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New Property" size="lg">
      <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* Property Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Property Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Elm Street Apartments"
              className="input"
              required
            />
          </div>

          {/* Property Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Property Type <span className="text-red-500">*</span>
            </label>
            <select
              value={form.property_type}
              onChange={(e) => setForm({ ...form, property_type: e.target.value as PropertyType })}
              className="input"
              required
            >
              <option value="canmp_owned">CANMP Owned</option>
              <option value="master_lease">Master Lease</option>
            </select>
          </div>
        </div>

        {/* Street Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Street Address <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.address_street}
            onChange={(e) => setForm({ ...form, address_street: e.target.value })}
            placeholder="123 Main Street"
            className="input"
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* City */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.address_city}
              onChange={(e) => setForm({ ...form, address_city: e.target.value })}
              placeholder="Waterville"
              className="input"
              required
            />
          </div>

          {/* State */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State <span className="text-red-500">*</span>
            </label>
            <select
              value={form.address_state}
              onChange={(e) => setForm({ ...form, address_state: e.target.value })}
              className="input"
              required
            >
              {US_STATES.map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>

          {/* ZIP */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
            <input
              type="text"
              value={form.address_zip}
              onChange={(e) => setForm({ ...form, address_zip: e.target.value })}
              placeholder="04901"
              className="input"
              maxLength={10}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Total Units */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Units <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={form.total_units}
              onChange={(e) => setForm({ ...form, total_units: parseInt(e.target.value) || 1 })}
              min={1}
              className="input"
              required
            />
          </div>

          {/* Site Assignment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Site Assignment
            </label>
            {loadingSites ? (
              <div className="input flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            ) : (
              <select
                value={form.site_id}
                onChange={(e) => setForm({ ...form, site_id: e.target.value })}
                className="input"
              >
                <option value="">Select site...</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>{site.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Master Lease Fields */}
        {isMasterLease && (
          <div className="bg-purple-50 rounded-lg p-4 space-y-4">
            <h4 className="text-sm font-medium text-purple-900">Landlord Information</h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Landlord Name
                </label>
                <input
                  type="text"
                  value={form.landlord_name}
                  onChange={(e) => setForm({ ...form, landlord_name: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Landlord Phone
                </label>
                <input
                  type="tel"
                  value={form.landlord_phone}
                  onChange={(e) => setForm({ ...form, landlord_phone: e.target.value })}
                  className="input"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Landlord Email
              </label>
              <input
                type="email"
                value={form.landlord_email}
                onChange={(e) => setForm({ ...form, landlord_email: e.target.value })}
                className="input"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Master Lease Rent
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={form.master_lease_rent}
                    onChange={(e) => setForm({ ...form, master_lease_rent: e.target.value })}
                    className="input pl-7"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lease Start
                </label>
                <input
                  type="date"
                  value={form.master_lease_start}
                  onChange={(e) => setForm({ ...form, master_lease_start: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lease End
                </label>
                <input
                  type="date"
                  value={form.master_lease_end}
                  onChange={(e) => setForm({ ...form, master_lease_end: e.target.value })}
                  className="input"
                />
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Any additional notes about the property..."
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
            disabled={loading || !form.name.trim() || !form.address_street.trim() || !form.address_city.trim()}
            className="btn-primary"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Property'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

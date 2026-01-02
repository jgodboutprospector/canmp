'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

interface AddDonationItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  { value: 'furniture', label: 'Furniture' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'bedding', label: 'Bedding' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'baby', label: 'Baby Items' },
  { value: 'household', label: 'Household' },
  { value: 'other', label: 'Other' },
];

const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
];

export function AddDonationItemModal({ isOpen, onClose, onSuccess }: AddDonationItemModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'household',
    condition: 'good',
    quantity: 1,
    location: '',
    bin_number: '',
    donor_name: '',
    donor_phone: '',
    donor_email: '',
  });

  function resetForm() {
    setForm({
      name: '',
      description: '',
      category: 'household',
      condition: 'good',
      quantity: 1,
      location: '',
      bin_number: '',
      donor_name: '',
      donor_phone: '',
      donor_email: '',
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
      const { error } = await (supabase as any).from('donation_items').insert({
        name: form.name.trim(),
        description: form.description.trim() || null,
        category: form.category,
        condition: form.condition,
        quantity: form.quantity,
        location: form.location.trim() || null,
        bin_number: form.bin_number.trim() || null,
        donor_name: form.donor_name.trim() || null,
        donor_phone: form.donor_phone.trim() || null,
        donor_email: form.donor_email.trim() || null,
        status: 'available',
        donated_date: new Date().toISOString().split('T')[0],
      });

      if (error) throw error;

      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add donation item');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Donation Item" size="lg">
      <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Item Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Item Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., Queen Size Bed Frame"
            className="input"
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="input"
              required
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* Condition */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Condition <span className="text-red-500">*</span>
            </label>
            <select
              value={form.condition}
              onChange={(e) => setForm({ ...form, condition: e.target.value })}
              className="input"
              required
            >
              {CONDITIONS.map((cond) => (
                <option key={cond.value} value={cond.value}>{cond.label}</option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })}
              min={1}
              className="input"
              required
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Describe the item (color, size, brand, etc.)"
            className="input"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Storage Location</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g., Warehouse A"
              className="input"
            />
          </div>

          {/* Bin Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bin/Shelf Number</label>
            <input
              type="text"
              value={form.bin_number}
              onChange={(e) => setForm({ ...form, bin_number: e.target.value })}
              placeholder="e.g., A-12"
              className="input"
            />
          </div>
        </div>

        {/* Donor Information */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <h4 className="text-sm font-medium text-gray-900">Donor Information (Optional)</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Donor Name</label>
              <input
                type="text"
                value={form.donor_name}
                onChange={(e) => setForm({ ...form, donor_name: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={form.donor_phone}
                onChange={(e) => setForm({ ...form, donor_phone: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.donor_email}
                onChange={(e) => setForm({ ...form, donor_email: e.target.value })}
                className="input"
              />
            </div>
          </div>
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
            disabled={loading || !form.name.trim()}
            className="btn-primary"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Item'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

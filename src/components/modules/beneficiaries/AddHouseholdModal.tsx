'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import type { Site } from '@/types/database';

interface AddHouseholdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const COUNTRIES = [
  'Afghanistan',
  'Angola',
  'Burundi',
  'Cameroon',
  'Central African Republic',
  'Chad',
  'Colombia',
  'Congo (DRC)',
  'Eritrea',
  'Ethiopia',
  'Guatemala',
  'Haiti',
  'Honduras',
  'Iraq',
  'Myanmar',
  'Rwanda',
  'Somalia',
  'South Sudan',
  'Sudan',
  'Syria',
  'Uganda',
  'Ukraine',
  'Venezuela',
  'Yemen',
  'Other',
];

const LANGUAGES = [
  'Amharic',
  'Arabic',
  'Burmese',
  'Dari',
  'English',
  'French',
  'Haitian Creole',
  'Karen',
  'Kinyarwanda',
  'Kirundi',
  'Lingala',
  'Nepali',
  'Pashto',
  'Portuguese',
  'Somali',
  'Spanish',
  'Swahili',
  'Tigrinya',
  'Ukrainian',
  'Other',
];

export function AddHouseholdModal({ isOpen, onClose, onSuccess }: AddHouseholdModalProps) {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSites, setLoadingSites] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    country_of_origin: '',
    primary_language: '',
    secondary_language: '',
    date_arrived_maine: '',
    date_arrived_us: '',
    site_id: '',
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
      country_of_origin: '',
      primary_language: '',
      secondary_language: '',
      date_arrived_maine: '',
      date_arrived_us: '',
      site_id: '',
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
      const { error } = await (supabase as any).from('households').insert({
        name: form.name.trim(),
        country_of_origin: form.country_of_origin || null,
        primary_language: form.primary_language || null,
        secondary_language: form.secondary_language || null,
        date_arrived_maine: form.date_arrived_maine || null,
        date_arrived_us: form.date_arrived_us || null,
        site_id: form.site_id || null,
        notes: form.notes.trim() || null,
        is_active: true,
      });

      if (error) throw error;

      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create household');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New Household" size="lg">
      <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Household Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Household Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., Smith Family"
            className="input"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Country of Origin */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country of Origin
            </label>
            <select
              value={form.country_of_origin}
              onChange={(e) => setForm({ ...form, country_of_origin: e.target.value })}
              className="input"
            >
              <option value="">Select country...</option>
              {COUNTRIES.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
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
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Primary Language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Primary Language
            </label>
            <select
              value={form.primary_language}
              onChange={(e) => setForm({ ...form, primary_language: e.target.value })}
              className="input"
            >
              <option value="">Select language...</option>
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>

          {/* Secondary Language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Secondary Language
            </label>
            <select
              value={form.secondary_language}
              onChange={(e) => setForm({ ...form, secondary_language: e.target.value })}
              className="input"
            >
              <option value="">Select language...</option>
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Date Arrived in US */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Arrived in US
            </label>
            <input
              type="date"
              value={form.date_arrived_us}
              onChange={(e) => setForm({ ...form, date_arrived_us: e.target.value })}
              className="input"
            />
          </div>

          {/* Date Arrived in Maine */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Arrived in Maine
            </label>
            <input
              type="date"
              value={form.date_arrived_maine}
              onChange={(e) => setForm({ ...form, date_arrived_maine: e.target.value })}
              className="input"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Any additional notes about the household..."
            className="input"
            rows={3}
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
            disabled={loading || !form.name.trim()}
            className="btn-primary"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Household'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { Loader2, X, Trash2 } from 'lucide-react';
import type { Site, Teacher } from '@/types/database';

interface EditTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  teacher: Teacher | null;
}

const COMMON_LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'Arabic',
  'Somali',
  'Swahili',
  'Portuguese',
  'Amharic',
  'Tigrinya',
];

export function EditTeacherModal({ isOpen, onClose, onSuccess, teacher }: EditTeacherModalProps) {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSites, setLoadingSites] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    is_volunteer: true,
    site_id: '',
    languages_taught: [] as string[],
    is_active: true,
  });

  const [languageInput, setLanguageInput] = useState('');

  useEffect(() => {
    if (isOpen && teacher) {
      setForm({
        first_name: teacher.first_name || '',
        last_name: teacher.last_name || '',
        email: teacher.email || '',
        phone: teacher.phone || '',
        is_volunteer: teacher.is_volunteer ?? true,
        site_id: teacher.site_id || '',
        languages_taught: teacher.languages_taught || [],
        is_active: teacher.is_active ?? true,
      });
      fetchSites();
    }
  }, [isOpen, teacher]);

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

  function handleClose() {
    setError('');
    setShowDeleteConfirm(false);
    onClose();
  }

  function addLanguage(language: string) {
    const trimmed = language.trim();
    if (trimmed && !form.languages_taught.includes(trimmed)) {
      setForm({ ...form, languages_taught: [...form.languages_taught, trimmed] });
    }
    setLanguageInput('');
  }

  function removeLanguage(language: string) {
    setForm({
      ...form,
      languages_taught: form.languages_taught.filter((l) => l !== language),
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!teacher) return;

    setLoading(true);
    setError('');

    try {
      const { error } = await (supabase as any)
        .from('teachers')
        .update({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          is_volunteer: form.is_volunteer,
          site_id: form.site_id || null,
          languages_taught: form.languages_taught,
          is_active: form.is_active,
        })
        .eq('id', teacher.id);

      if (error) throw error;

      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update teacher');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!teacher) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/language?type=teachers&id=${teacher.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete teacher');
      }

      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete teacher');
    } finally {
      setLoading(false);
    }
  }

  if (!teacher) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit Teacher" size="md">
      <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              className="input"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="input"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={form.is_volunteer ? 'volunteer' : 'staff'}
              onChange={(e) => setForm({ ...form, is_volunteer: e.target.value === 'volunteer' })}
              className="input"
            >
              <option value="volunteer">Volunteer</option>
              <option value="staff">Staff</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
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

        {/* Status */}
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="rounded border-gray-300 text-canmp-green-600 focus:ring-canmp-green-500"
            />
            <span className="text-sm text-gray-700">Active Teacher</span>
          </label>
        </div>

        {/* Languages Taught */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Languages Taught
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={languageInput}
              onChange={(e) => setLanguageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addLanguage(languageInput);
                }
              }}
              placeholder="Add a language..."
              className="input flex-1"
            />
            <button
              type="button"
              onClick={() => addLanguage(languageInput)}
              disabled={!languageInput.trim()}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-1 mb-2">
            {COMMON_LANGUAGES.filter((l) => !form.languages_taught.includes(l)).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => addLanguage(lang)}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
              >
                + {lang}
              </button>
            ))}
          </div>

          {form.languages_taught.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.languages_taught.map((lang) => (
                <span
                  key={lang}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-canmp-green-100 text-canmp-green-700 rounded-full text-sm"
                >
                  {lang}
                  <button
                    type="button"
                    onClick={() => removeLanguage(lang)}
                    className="hover:text-canmp-green-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 mb-3">
              Are you sure you want to deactivate this teacher? This will hide them from the active teachers list.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
              >
                {loading ? 'Deleting...' : 'Yes, Deactivate'}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !form.first_name.trim() || !form.last_name.trim()}
              className="btn-primary"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

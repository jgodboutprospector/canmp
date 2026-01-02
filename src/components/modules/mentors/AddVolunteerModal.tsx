'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { Loader2, X } from 'lucide-react';

interface AddVolunteerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
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

const COMMON_SKILLS = [
  'Tutoring',
  'Transportation',
  'Translation',
  'Mentoring',
  'Job Coaching',
  'Childcare',
  'Administrative',
  'Event Planning',
];

export function AddVolunteerModal({ isOpen, onClose, onSuccess }: AddVolunteerModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    languages_spoken: [] as string[],
    skills: [] as string[],
    background_check_date: '',
    orientation_date: '',
    availability_notes: '',
  });

  const [languageInput, setLanguageInput] = useState('');
  const [skillInput, setSkillInput] = useState('');

  function resetForm() {
    setForm({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      languages_spoken: [],
      skills: [],
      background_check_date: '',
      orientation_date: '',
      availability_notes: '',
    });
    setLanguageInput('');
    setSkillInput('');
    setError('');
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function addLanguage(language: string) {
    const trimmed = language.trim();
    if (trimmed && !form.languages_spoken.includes(trimmed)) {
      setForm({ ...form, languages_spoken: [...form.languages_spoken, trimmed] });
    }
    setLanguageInput('');
  }

  function removeLanguage(language: string) {
    setForm({
      ...form,
      languages_spoken: form.languages_spoken.filter((l) => l !== language),
    });
  }

  function addSkill(skill: string) {
    const trimmed = skill.trim();
    if (trimmed && !form.skills.includes(trimmed)) {
      setForm({ ...form, skills: [...form.skills, trimmed] });
    }
    setSkillInput('');
  }

  function removeSkill(skill: string) {
    setForm({
      ...form,
      skills: form.skills.filter((s) => s !== skill),
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await (supabase as any).from('volunteers').insert({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        languages_spoken: form.languages_spoken,
        skills: form.skills,
        background_check_date: form.background_check_date || null,
        orientation_date: form.orientation_date || null,
        availability_notes: form.availability_notes.trim() || null,
        is_active: true,
      });

      if (error) throw error;

      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add volunteer');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New Volunteer" size="lg">
      <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

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
              className="input"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input"
            />
          </div>

          {/* Phone */}
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

        {/* Languages Spoken */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Languages Spoken
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
            {COMMON_LANGUAGES.filter((l) => !form.languages_spoken.includes(l)).slice(0, 5).map((lang) => (
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
          {form.languages_spoken.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.languages_spoken.map((lang) => (
                <span
                  key={lang}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                >
                  {lang}
                  <button type="button" onClick={() => removeLanguage(lang)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Skills */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Skills</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSkill(skillInput);
                }
              }}
              placeholder="Add a skill..."
              className="input flex-1"
            />
            <button
              type="button"
              onClick={() => addSkill(skillInput)}
              disabled={!skillInput.trim()}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-1 mb-2">
            {COMMON_SKILLS.filter((s) => !form.skills.includes(s)).slice(0, 5).map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => addSkill(skill)}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
              >
                + {skill}
              </button>
            ))}
          </div>
          {form.skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-canmp-green-100 text-canmp-green-700 rounded-full text-sm"
                >
                  {skill}
                  <button type="button" onClick={() => removeSkill(skill)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Background Check Date
            </label>
            <input
              type="date"
              value={form.background_check_date}
              onChange={(e) => setForm({ ...form, background_check_date: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Orientation Date
            </label>
            <input
              type="date"
              value={form.orientation_date}
              onChange={(e) => setForm({ ...form, orientation_date: e.target.value })}
              className="input"
            />
          </div>
        </div>

        {/* Availability Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Availability Notes
          </label>
          <textarea
            value={form.availability_notes}
            onChange={(e) => setForm({ ...form, availability_notes: e.target.value })}
            placeholder="e.g., Available weekday evenings and Saturday mornings"
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
            disabled={loading || !form.first_name.trim() || !form.last_name.trim()}
            className="btn-primary"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Volunteer'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import type { ClassLevel, Teacher, Site } from '@/types/database';

interface AddClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const LEVELS: { value: ClassLevel; label: string }[] = [
  { value: 'basic', label: 'Basic' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'lets_talk', label: "Let's Talk" },
];

export function AddClassModal({ isOpen, onClose, onSuccess }: AddClassModalProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    level: 'beginner' as ClassLevel,
    teacher_id: '',
    site_id: '',
    day_of_week: '',
    start_time: '',
    end_time: '',
    location: '',
    max_students: 15,
    term_start: '',
    term_end: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  async function fetchData() {
    setLoadingData(true);
    try {
      const [teachersRes, sitesRes] = await Promise.all([
        supabase
          .from('teachers')
          .select('*')
          .eq('is_active', true)
          .order('last_name'),
        supabase
          .from('sites')
          .select('*')
          .order('name'),
      ]);

      if (teachersRes.error) throw teachersRes.error;
      if (sitesRes.error) throw sitesRes.error;

      setTeachers(teachersRes.data || []);
      setSites(sitesRes.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoadingData(false);
    }
  }

  function resetForm() {
    setForm({
      name: '',
      level: 'beginner',
      teacher_id: '',
      site_id: '',
      day_of_week: '',
      start_time: '',
      end_time: '',
      location: '',
      max_students: 15,
      term_start: '',
      term_end: '',
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
      const { error } = await (supabase as any).from('class_sections').insert({
        name: form.name.trim(),
        level: form.level,
        teacher_id: form.teacher_id || null,
        site_id: form.site_id || null,
        day_of_week: form.day_of_week ? parseInt(form.day_of_week) : null,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        location: form.location.trim() || null,
        max_students: form.max_students,
        current_enrollment: 0,
        term_start: form.term_start || null,
        term_end: form.term_end || null,
        is_active: true,
      });

      if (error) throw error;

      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create class');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New Class" size="lg">
      <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* Class Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Class Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., ESL Beginner A"
              className="input"
              required
            />
          </div>

          {/* Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Level <span className="text-red-500">*</span>
            </label>
            <select
              value={form.level}
              onChange={(e) => setForm({ ...form, level: e.target.value as ClassLevel })}
              className="input"
              required
            >
              {LEVELS.map((level) => (
                <option key={level.value} value={level.value}>{level.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Teacher */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
            {loadingData ? (
              <div className="input flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            ) : (
              <select
                value={form.teacher_id}
                onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
                className="input"
              >
                <option value="">Select teacher...</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.first_name} {t.last_name}
                    {t.is_volunteer && ' (Volunteer)'}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Site */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
            {loadingData ? (
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
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Schedule */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <h4 className="text-sm font-medium text-gray-900">Schedule</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
              <select
                value={form.day_of_week}
                onChange={(e) => setForm({ ...form, day_of_week: e.target.value })}
                className="input"
              >
                <option value="">Select day...</option>
                {DAYS_OF_WEEK.map((day) => (
                  <option key={day.value} value={day.value}>{day.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                className="input"
                min={form.start_time}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g., Room 101"
              className="input"
            />
          </div>

          {/* Max Students */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Students <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={form.max_students}
              onChange={(e) => setForm({ ...form, max_students: parseInt(e.target.value) || 15 })}
              className="input"
              min={1}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Term Start */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Term Start</label>
            <input
              type="date"
              value={form.term_start}
              onChange={(e) => setForm({ ...form, term_start: e.target.value })}
              className="input"
            />
          </div>

          {/* Term End */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Term End</label>
            <input
              type="date"
              value={form.term_end}
              onChange={(e) => setForm({ ...form, term_end: e.target.value })}
              className="input"
              min={form.term_start}
            />
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
                Creating...
              </>
            ) : (
              'Create Class'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

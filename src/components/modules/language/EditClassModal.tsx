'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { Loader2, Trash2 } from 'lucide-react';
import type { ClassLevel, Teacher, Site } from '@/types/database';

interface ClassSection {
  id: string;
  name: string;
  level: ClassLevel;
  teacher_id: string | null;
  site_id: string | null;
  day_of_week: number | null;
  schedule_days: number[] | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  max_students: number;
  term_start: string | null;
  term_end: string | null;
  is_active: boolean;
}

interface EditClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  classSection: ClassSection | null;
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

export function EditClassModal({ isOpen, onClose, onSuccess, classSection }: EditClassModalProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [enrollmentCount, setEnrollmentCount] = useState(0);

  const [form, setForm] = useState({
    name: '',
    level: 'beginner' as ClassLevel,
    teacher_id: '',
    site_id: '',
    schedule_days: [] as number[],
    start_time: '',
    end_time: '',
    location: '',
    max_students: 15,
    term_start: '',
    term_end: '',
    is_active: true,
  });

  useEffect(() => {
    if (isOpen && classSection) {
      setForm({
        name: classSection.name || '',
        level: classSection.level || 'beginner',
        teacher_id: classSection.teacher_id || '',
        site_id: classSection.site_id || '',
        schedule_days: classSection.schedule_days || (classSection.day_of_week !== null ? [classSection.day_of_week] : []),
        start_time: classSection.start_time || '',
        end_time: classSection.end_time || '',
        location: classSection.location || '',
        max_students: classSection.max_students || 15,
        term_start: classSection.term_start || '',
        term_end: classSection.term_end || '',
        is_active: classSection.is_active ?? true,
      });
      fetchData();
    }
  }, [isOpen, classSection]);

  async function fetchData() {
    setLoadingData(true);
    try {
      const [teachersRes, sitesRes, enrollmentsRes] = await Promise.all([
        supabase
          .from('teachers')
          .select('*')
          .eq('is_active', true)
          .order('last_name'),
        supabase
          .from('sites')
          .select('*')
          .order('name'),
        classSection ? supabase
          .from('class_enrollments')
          .select('id', { count: 'exact', head: true })
          .eq('section_id', classSection.id)
          .eq('status', 'active') : Promise.resolve({ count: 0 }),
      ]);

      if (teachersRes.error) throw teachersRes.error;
      if (sitesRes.error) throw sitesRes.error;

      setTeachers(teachersRes.data || []);
      setSites(sitesRes.data || []);
      setEnrollmentCount((enrollmentsRes as { count: number | null }).count || 0);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoadingData(false);
    }
  }

  function handleClose() {
    setError('');
    setShowDeleteConfirm(false);
    onClose();
  }

  function toggleDay(dayValue: number) {
    setForm(prev => ({
      ...prev,
      schedule_days: prev.schedule_days.includes(dayValue)
        ? prev.schedule_days.filter(d => d !== dayValue)
        : [...prev.schedule_days, dayValue].sort((a, b) => a - b)
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!classSection) return;

    setLoading(true);
    setError('');

    try {
      const { error } = await (supabase as any)
        .from('class_sections')
        .update({
          name: form.name.trim(),
          level: form.level,
          teacher_id: form.teacher_id || null,
          site_id: form.site_id || null,
          day_of_week: form.schedule_days.length > 0 ? form.schedule_days[0] : null,
          schedule_days: form.schedule_days,
          start_time: form.start_time || null,
          end_time: form.end_time || null,
          location: form.location.trim() || null,
          max_students: form.max_students,
          term_start: form.term_start || null,
          term_end: form.term_end || null,
          is_active: form.is_active,
        })
        .eq('id', classSection.id);

      if (error) throw error;

      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update class');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!classSection) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/language?type=classes&id=${classSection.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete class');
      }

      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete class');
    } finally {
      setLoading(false);
    }
  }

  if (!classSection) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit Class" size="lg">
      <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Days of Week</label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.filter(d => d.value >= 1 && d.value <= 5).map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    form.schedule_days.includes(day.value)
                      ? 'bg-canmp-green-500 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {day.label.slice(0, 3)}
                </button>
              ))}
            </div>
            {form.schedule_days.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Selected: {form.schedule_days.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label).join(', ')}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Term Start</label>
            <input
              type="date"
              value={form.term_start}
              onChange={(e) => setForm({ ...form, term_start: e.target.value })}
              className="input"
            />
          </div>
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

        {/* Status */}
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="rounded border-gray-300 text-canmp-green-600 focus:ring-canmp-green-500"
            />
            <span className="text-sm text-gray-700">Active Class</span>
          </label>
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 mb-2">
              Are you sure you want to deactivate this class? The class will be hidden from active lists.
            </p>
            {enrollmentCount > 0 && (
              <div className="p-2 bg-red-100 rounded text-sm mb-3">
                <p className="font-medium text-red-800">This will also affect:</p>
                <p className="text-red-700">{enrollmentCount} active enrollment{enrollmentCount !== 1 ? 's' : ''}</p>
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Yes, Deactivate'}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loading}
                className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm disabled:opacity-50"
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
              disabled={loading || !form.name.trim()}
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

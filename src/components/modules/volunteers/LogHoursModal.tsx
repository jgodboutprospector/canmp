'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useActivityTypes } from '@/lib/hooks/useVolunteers';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

interface LogHoursModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  volunteerId: string;
  volunteerName: string;
}

interface Event {
  id: string;
  title: string;
  start_date: string;
}

export function LogHoursModal({
  isOpen,
  onClose,
  onSuccess,
  volunteerId,
  volunteerName,
}: LogHoursModalProps) {
  const { activityTypes, loading: loadingTypes } = useActivityTypes();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    hours: '',
    activity_type: '',
    description: '',
    event_id: '',
  });

  // Fetch recent events for dropdown
  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoadingEvents(true);
        const { data, error } = await (supabase as any)
          .from('events')
          .select('id, title, start_date')
          .gte('start_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .order('start_date', { ascending: false })
          .limit(50);

        if (error) throw error;
        setEvents(data || []);
      } catch (err) {
        console.error('Error fetching events:', err);
      } finally {
        setLoadingEvents(false);
      }
    }

    if (isOpen) {
      fetchEvents();
    }
  }, [isOpen]);

  function resetForm() {
    setForm({
      date: new Date().toISOString().split('T')[0],
      hours: '',
      activity_type: '',
      description: '',
      event_id: '',
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

    const hours = parseFloat(form.hours);
    if (isNaN(hours) || hours <= 0 || hours > 24) {
      setError('Please enter a valid number of hours (between 0.25 and 24)');
      setLoading(false);
      return;
    }

    try {
      const { error } = await (supabase as any).from('volunteer_hours').insert({
        volunteer_id: volunteerId,
        date: form.date,
        hours: hours,
        activity_type: form.activity_type || null,
        description: form.description.trim() || null,
        event_id: form.event_id || null,
      });

      if (error) throw error;

      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log hours');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Log Volunteer Hours" size="md">
      <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Volunteer Info */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500">Logging hours for:</p>
          <p className="font-medium text-gray-900">{volunteerName}</p>
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="input"
            required
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        {/* Hours */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hours <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={form.hours}
            onChange={(e) => setForm({ ...form, hours: e.target.value })}
            className="input"
            placeholder="e.g., 2.5"
            step="0.25"
            min="0.25"
            max="24"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Enter in 15-minute increments (0.25, 0.5, 0.75, 1, etc.)</p>
        </div>

        {/* Activity Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Activity Type
          </label>
          {loadingTypes ? (
            <div className="flex items-center gap-2 py-2 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading activity types...
            </div>
          ) : (
            <select
              value={form.activity_type}
              onChange={(e) => setForm({ ...form, activity_type: e.target.value })}
              className="input"
            >
              <option value="">Select activity type...</option>
              {activityTypes.map((type) => (
                <option key={type.id} value={type.name}>
                  {type.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Related Event */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Related Event (optional)
          </label>
          {loadingEvents ? (
            <div className="flex items-center gap-2 py-2 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading events...
            </div>
          ) : (
            <select
              value={form.event_id}
              onChange={(e) => setForm({ ...form, event_id: e.target.value })}
              className="input"
            >
              <option value="">Not related to an event</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title} ({new Date(event.start_date).toLocaleDateString()})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input"
            placeholder="What did you do during this time?"
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
            disabled={loading || !form.date || !form.hours}
            className="btn-primary"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Logging...
              </>
            ) : (
              'Log Hours'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

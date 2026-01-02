'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EVENT_TYPES = [
  { value: 'class', label: 'Class' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'community', label: 'Community Event' },
  { value: 'orientation', label: 'Orientation' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'celebration', label: 'Celebration' },
  { value: 'other', label: 'Other' },
];

export function AddEventModal({ isOpen, onClose, onSuccess }: AddEventModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    event_type: 'community',
    start_date: '',
    start_time: '',
    end_time: '',
    location: '',
    is_virtual: false,
    virtual_link: '',
    max_attendees: '',
    requires_registration: false,
  });

  function resetForm() {
    setForm({
      title: '',
      description: '',
      event_type: 'community',
      start_date: '',
      start_time: '',
      end_time: '',
      location: '',
      is_virtual: false,
      virtual_link: '',
      max_attendees: '',
      requires_registration: false,
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
      const { error } = await (supabase as any).from('events').insert({
        title: form.title.trim(),
        description: form.description.trim() || null,
        event_type: form.event_type,
        start_date: form.start_date,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        location: form.is_virtual ? form.virtual_link : form.location.trim() || null,
        is_virtual: form.is_virtual,
        max_attendees: form.max_attendees ? parseInt(form.max_attendees) : null,
        requires_registration: form.requires_registration,
        status: 'scheduled',
      });

      if (error) throw error;

      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Event" size="lg">
      <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Event Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g., Community Potluck Dinner"
            className="input"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Type <span className="text-red-500">*</span>
            </label>
            <select
              value={form.event_type}
              onChange={(e) => setForm({ ...form, event_type: e.target.value })}
              className="input"
              required
            >
              {EVENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              className="input"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <input
              type="time"
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              className="input"
            />
          </div>

          {/* End Time */}
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

        {/* Virtual Toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_virtual"
            checked={form.is_virtual}
            onChange={(e) => setForm({ ...form, is_virtual: e.target.checked })}
            className="rounded border-gray-300 text-canmp-green-600 focus:ring-canmp-green-500"
          />
          <label htmlFor="is_virtual" className="text-sm font-medium text-gray-700">
            This is a virtual event
          </label>
        </div>

        {/* Location / Virtual Link */}
        {form.is_virtual ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Virtual Meeting Link
            </label>
            <input
              type="url"
              value={form.virtual_link}
              onChange={(e) => setForm({ ...form, virtual_link: e.target.value })}
              placeholder="https://zoom.us/j/..."
              className="input"
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g., Community Center, Room 101"
              className="input"
            />
          </div>
        )}

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Describe the event..."
            className="input"
            rows={3}
          />
        </div>

        {/* Registration Options */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="requires_registration"
              checked={form.requires_registration}
              onChange={(e) => setForm({ ...form, requires_registration: e.target.checked })}
              className="rounded border-gray-300 text-canmp-green-600 focus:ring-canmp-green-500"
            />
            <label htmlFor="requires_registration" className="text-sm font-medium text-gray-700">
              Requires registration
            </label>
          </div>

          {form.requires_registration && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Attendees
              </label>
              <input
                type="number"
                value={form.max_attendees}
                onChange={(e) => setForm({ ...form, max_attendees: e.target.value })}
                placeholder="Leave empty for unlimited"
                className="input max-w-xs"
                min="1"
              />
            </div>
          )}
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
            disabled={loading || !form.title.trim() || !form.start_date}
            className="btn-primary"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Event'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

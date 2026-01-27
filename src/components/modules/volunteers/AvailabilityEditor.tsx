'use client';

import { useState, useEffect } from 'react';
import { useVolunteerAvailability } from '@/lib/hooks/useVolunteers';
import { Loader2, Save, Check, X } from 'lucide-react';

interface AvailabilityEditorProps {
  volunteerId: string;
  onUpdate?: () => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

interface DayAvailability {
  day_of_week: number;
  is_available: boolean;
  start_time: string;
  end_time: string;
  notes: string;
}

export function AvailabilityEditor({ volunteerId, onUpdate }: AvailabilityEditorProps) {
  const { availability, loading, error, updateAvailability } = useVolunteerAvailability(volunteerId);
  const [localAvailability, setLocalAvailability] = useState<DayAvailability[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local state from fetched availability
  useEffect(() => {
    if (!loading && availability) {
      const initialState = DAYS_OF_WEEK.map((day) => {
        const existing = availability.find((a) => a.day_of_week === day.value);
        return {
          day_of_week: day.value,
          is_available: existing?.is_available ?? false,
          start_time: existing?.start_time ?? '09:00',
          end_time: existing?.end_time ?? '17:00',
          notes: existing?.notes ?? '',
        };
      });
      setLocalAvailability(initialState);
    }
  }, [availability, loading]);

  function handleToggleDay(dayOfWeek: number) {
    setLocalAvailability((prev) =>
      prev.map((day) =>
        day.day_of_week === dayOfWeek
          ? { ...day, is_available: !day.is_available }
          : day
      )
    );
    setHasChanges(true);
  }

  function handleTimeChange(dayOfWeek: number, field: 'start_time' | 'end_time', value: string) {
    setLocalAvailability((prev) =>
      prev.map((day) =>
        day.day_of_week === dayOfWeek
          ? { ...day, [field]: value }
          : day
      )
    );
    setHasChanges(true);
  }

  function handleNotesChange(dayOfWeek: number, value: string) {
    setLocalAvailability((prev) =>
      prev.map((day) =>
        day.day_of_week === dayOfWeek
          ? { ...day, notes: value }
          : day
      )
    );
    setHasChanges(true);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError('');

    try {
      // Only save days that are available
      const availableData = localAvailability
        .filter((day) => day.is_available)
        .map((day) => ({
          day_of_week: day.day_of_week,
          is_available: day.is_available,
          start_time: day.start_time || null,
          end_time: day.end_time || null,
          notes: day.notes || null,
        }));

      const result = await updateAvailability(availableData);

      if (result.error) {
        setSaveError(result.error);
      } else {
        setHasChanges(false);
        onUpdate?.();
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save availability');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading availability...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {saveError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {saveError}
        </div>
      )}

      <div className="space-y-3">
        {DAYS_OF_WEEK.map((day) => {
          const dayAvail = localAvailability.find((a) => a.day_of_week === day.value);
          if (!dayAvail) return null;

          return (
            <div
              key={day.value}
              className={`p-4 rounded-lg border transition-colors ${
                dayAvail.is_available
                  ? 'bg-canmp-green-50 border-canmp-green-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggleDay(day.value)}
                    className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                      dayAvail.is_available
                        ? 'bg-canmp-green-500 text-white'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {dayAvail.is_available ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </button>
                  <span className={`font-medium ${dayAvail.is_available ? 'text-gray-900' : 'text-gray-500'}`}>
                    {day.label}
                  </span>
                </div>

                {dayAvail.is_available && (
                  <div className="flex items-center gap-2 text-sm">
                    <input
                      type="time"
                      value={dayAvail.start_time}
                      onChange={(e) => handleTimeChange(day.value, 'start_time', e.target.value)}
                      className="px-2 py-1 border border-gray-200 rounded"
                    />
                    <span className="text-gray-400">to</span>
                    <input
                      type="time"
                      value={dayAvail.end_time}
                      onChange={(e) => handleTimeChange(day.value, 'end_time', e.target.value)}
                      className="px-2 py-1 border border-gray-200 rounded"
                    />
                  </div>
                )}
              </div>

              {dayAvail.is_available && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={dayAvail.notes}
                    onChange={(e) => handleNotesChange(day.value, e.target.value)}
                    placeholder="Notes (e.g., every other week, afternoons only)"
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className={`btn-primary ${!hasChanges ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Availability
            </>
          )}
        </button>
      </div>
    </div>
  );
}

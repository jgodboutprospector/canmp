'use client';

import { useState } from 'react';
import { useVolunteerHours } from '@/lib/hooks/useVolunteers';
import {
  Loader2,
  Clock,
  Calendar,
  CheckCircle,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase';

interface VolunteerHoursTableProps {
  volunteerId: string;
  onUpdate?: () => void;
}

export function VolunteerHoursTable({ volunteerId, onUpdate }: VolunteerHoursTableProps) {
  const { hours, totalHours, loading, error, refetch, deleteHours } = useVolunteerHours(volunteerId);
  const { isAdmin, isCoordinator } = useAuth();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  async function handleDelete(hoursId: string) {
    if (!confirm('Are you sure you want to delete this hours entry?')) return;

    setDeletingId(hoursId);
    try {
      const result = await deleteHours(hoursId);
      if (!result.error) {
        onUpdate?.();
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function handleVerify(hoursId: string) {
    setVerifyingId(hoursId);
    try {
      const { error } = await (supabase as any)
        .from('volunteer_hours')
        .update({
          verified_at: new Date().toISOString(),
        })
        .eq('id', hoursId);

      if (!error) {
        await refetch();
        onUpdate?.();
      }
    } catch (err) {
      console.error('Error verifying hours:', err);
    } finally {
      setVerifyingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading hours...</span>
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

  if (hours.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400">
        <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No hours logged yet.</p>
        <p className="text-sm mt-1">Click &quot;Log Hours&quot; to add the first entry.</p>
      </div>
    );
  }

  // Calculate summary stats
  const verifiedHours = hours
    .filter((h) => h.verified_at)
    .reduce((sum, h) => sum + Number(h.hours), 0);
  const unverifiedHours = totalHours - verifiedHours;

  // Group by month
  const hoursByMonth: Record<string, typeof hours> = {};
  hours.forEach((h) => {
    const monthKey = new Date(h.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    if (!hoursByMonth[monthKey]) {
      hoursByMonth[monthKey] = [];
    }
    hoursByMonth[monthKey].push(h);
  });

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500">Total Hours</p>
          <p className="text-2xl font-semibold">{totalHours.toFixed(1)}</p>
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-gray-500">Verified</p>
          <p className="text-2xl font-semibold text-green-600">{verifiedHours.toFixed(1)}</p>
        </div>
        <div className="p-4 bg-amber-50 rounded-lg">
          <p className="text-sm text-gray-500">Pending Verification</p>
          <p className="text-2xl font-semibold text-amber-600">{unverifiedHours.toFixed(1)}</p>
        </div>
      </div>

      {/* Hours List by Month */}
      <div className="space-y-6">
        {Object.entries(hoursByMonth).map(([month, monthHours]) => (
          <div key={month}>
            <h4 className="text-sm font-medium text-gray-500 mb-2">{month}</h4>
            <div className="space-y-2">
              {monthHours.map((entry) => (
                <div
                  key={entry.id}
                  className={`p-4 rounded-lg border ${
                    entry.verified_at
                      ? 'bg-green-50 border-green-200'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Calendar className="w-4 h-4" />
                          {new Date(entry.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        <div className="flex items-center gap-1 font-medium">
                          <Clock className="w-4 h-4 text-gray-400" />
                          {Number(entry.hours).toFixed(1)} hours
                        </div>
                        {entry.activity_type && (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                            {entry.activity_type}
                          </span>
                        )}
                        {entry.verified_at && (
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Verified
                          </span>
                        )}
                      </div>

                      {entry.description && (
                        <p className="text-sm text-gray-600 mt-2">{entry.description}</p>
                      )}

                      {entry.event && (
                        <p className="text-xs text-blue-600 mt-1">
                          Event: {entry.event.title}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Verify Button (admin/coordinator only, unverified only) */}
                      {(isAdmin || isCoordinator) && !entry.verified_at && (
                        <button
                          onClick={() => handleVerify(entry.id)}
                          disabled={verifyingId === entry.id}
                          className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                          title="Verify hours"
                        >
                          {verifyingId === entry.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </button>
                      )}

                      {/* Delete Button (admin only) */}
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(entry.id)}
                          disabled={deletingId === entry.id}
                          className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                          title="Delete entry"
                        >
                          {deletingId === entry.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

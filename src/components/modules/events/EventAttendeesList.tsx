'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  User,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Users,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface EventAttendee {
  id: string;
  status: string;
  checked_in_at: string | null;
  created_at: string;
  event: {
    id: string;
    title: string;
    start_date: string;
    event_type: string;
  } | null;
  beneficiary: {
    id: string;
    first_name: string;
    last_name: string;
    household: {
      id: string;
      name: string;
    } | null;
  } | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  registered: { label: 'Registered', color: 'bg-blue-100 text-blue-700', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  attended: { label: 'Attended', color: 'bg-canmp-green-100 text-canmp-green-700', icon: CheckCircle },
  no_show: { label: 'No Show', color: 'bg-red-100 text-red-700', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-700', icon: XCircle },
};

export default function EventAttendeesList() {
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchAttendees();
  }, []);

  async function fetchAttendees() {
    try {
      const { data, error } = await (supabase as any)
        .from('event_attendees')
        .select(
          `
          id, status, checked_in_at, created_at,
          event:events(id, title, start_date, event_type),
          beneficiary:beneficiaries(id, first_name, last_name, household:households(id, name))
        `
        )
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setAttendees(data || []);
    } catch (err) {
      console.error('Error fetching attendees:', err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = attendees.filter((a) => {
    const matchesSearch =
      a.event?.title?.toLowerCase().includes(search.toLowerCase()) ||
      `${a.beneficiary?.first_name} ${a.beneficiary?.last_name}`
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      a.beneficiary?.household?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Group by event
  const groupedByEvent = filtered.reduce(
    (acc, attendee) => {
      const eventId = attendee.event?.id || 'unknown';
      if (!acc[eventId]) {
        acc[eventId] = {
          event: attendee.event,
          attendees: [],
        };
      }
      acc[eventId].attendees.push(attendee);
      return acc;
    },
    {} as Record<string, { event: EventAttendee['event']; attendees: EventAttendee[] }>
  );

  const attendedCount = attendees.filter((a) => a.status === 'attended').length;
  const noShowCount = attendees.filter((a) => a.status === 'no_show').length;
  const uniqueBeneficiaries = new Set(attendees.map((a) => a.beneficiary?.id)).size;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-canmp-green-500" />
        <span className="ml-2 text-gray-500">Loading attendees...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-xl font-semibold text-gray-900"
          style={{ fontFamily: 'DM Sans, sans-serif' }}
        >
          Event Attendees
        </h1>
        <p className="text-sm text-gray-500">Track attendance across all events</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-sm text-gray-500">Total Registrations</p>
          <p className="text-2xl font-semibold">{attendees.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Attended</p>
          <p className="text-2xl font-semibold text-canmp-green-600">{attendedCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">No Shows</p>
          <p className="text-2xl font-semibold text-red-600">{noShowCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Unique Attendees</p>
          <p className="text-2xl font-semibold text-blue-600">{uniqueBeneficiaries}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search events, names, households..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-40"
          >
            <option value="all">All Statuses</option>
            <option value="registered">Registered</option>
            <option value="confirmed">Confirmed</option>
            <option value="attended">Attended</option>
            <option value="no_show">No Show</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Grouped by Event */}
      <div className="space-y-6">
        {Object.entries(groupedByEvent).map(([eventId, { event, attendees: eventAttendees }]) => (
          <div key={eventId} className="card overflow-hidden">
            <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <h3 className="font-medium text-gray-900">{event?.title || 'Unknown Event'}</h3>
                    <p className="text-sm text-gray-500">
                      {event?.start_date &&
                        new Date(event.start_date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-600">
                    {eventAttendees.length} attendee{eventAttendees.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {eventAttendees.map((attendee) => {
                const status = statusConfig[attendee.status] || statusConfig.registered;
                const StatusIcon = status.icon;

                return (
                  <div key={attendee.id} className="px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-canmp-green-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-canmp-green-700">
                          {attendee.beneficiary?.first_name?.[0]}
                          {attendee.beneficiary?.last_name?.[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {attendee.beneficiary?.first_name} {attendee.beneficiary?.last_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {attendee.beneficiary?.household?.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {attendee.checked_in_at && (
                        <span className="text-xs text-gray-500">
                          Checked in{' '}
                          {new Date(attendee.checked_in_at).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                      <span
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${status.color}`}
                      >
                        <StatusIcon className="w-3.5 h-3.5" />
                        {status.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {Object.keys(groupedByEvent).length === 0 && (
          <div className="card p-12 text-center text-gray-400">
            {search || statusFilter !== 'all'
              ? 'No attendees found matching your filters.'
              : 'No event registrations yet.'}
          </div>
        )}
      </div>
    </div>
  );
}

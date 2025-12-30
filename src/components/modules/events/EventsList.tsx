'use client';

import { useState } from 'react';
import {
  Plus,
  Search,
  Calendar,
  MapPin,
  Users,
  Clock,
  Video,
  Loader2,
  ChevronRight,
  PartyPopper,
  GraduationCap,
  Handshake,
  Compass,
  MessageSquare,
} from 'lucide-react';
import { useEvents, EventType, EventStatus } from '@/lib/hooks/useEvents';

const eventTypeConfig: Record<EventType, { label: string; icon: typeof Calendar; color: string }> = {
  class: { label: 'Class', icon: GraduationCap, color: 'bg-blue-100 text-blue-600' },
  workshop: { label: 'Workshop', icon: Handshake, color: 'bg-purple-100 text-purple-600' },
  community: { label: 'Community', icon: Users, color: 'bg-green-100 text-green-600' },
  orientation: { label: 'Orientation', icon: Compass, color: 'bg-yellow-100 text-yellow-700' },
  meeting: { label: 'Meeting', icon: MessageSquare, color: 'bg-gray-100 text-gray-600' },
  celebration: { label: 'Celebration', icon: PartyPopper, color: 'bg-pink-100 text-pink-600' },
  other: { label: 'Other', icon: Calendar, color: 'bg-gray-100 text-gray-600' },
};

const statusConfig: Record<EventStatus, { label: string; color: string }> = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-50 text-blue-600' },
  in_progress: { label: 'In Progress', color: 'bg-green-50 text-green-600' },
  completed: { label: 'Completed', color: 'bg-gray-50 text-gray-600' },
  cancelled: { label: 'Cancelled', color: 'bg-red-50 text-red-600' },
};

export default function EventsList() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<EventType | 'all'>('all');
  const { events, loading, error } = useEvents();

  const filtered = events.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.location?.toLowerCase().includes(search.toLowerCase()) ||
      e.description?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || e.event_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const upcomingCount = events.filter(
    (e) => new Date(e.start_date) >= new Date() && e.status === 'scheduled'
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-canmp-green-500" />
        <span className="ml-2 text-gray-500">Loading events...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="card p-6 bg-red-50 border-red-200">
          <p className="text-red-600 font-medium">Error loading events</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1
            className="text-xl font-semibold text-gray-900"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            Events Calendar
          </h1>
          <p className="text-sm text-gray-500">
            Manage classes, workshops, and community events
          </p>
        </div>
        <button className="btn-primary">
          <Plus className="w-4 h-4" />
          Create Event
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-sm text-gray-500">Total Events</p>
          <p className="text-2xl font-semibold">{events.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Upcoming</p>
          <p className="text-2xl font-semibold text-blue-600">{upcomingCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">This Month</p>
          <p className="text-2xl font-semibold text-canmp-green-600">
            {
              events.filter((e) => {
                const eventDate = new Date(e.start_date);
                const now = new Date();
                return (
                  eventDate.getMonth() === now.getMonth() &&
                  eventDate.getFullYear() === now.getFullYear()
                );
              }).length
            }
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Virtual Events</p>
          <p className="text-2xl font-semibold text-purple-600">
            {events.filter((e) => e.is_virtual).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as EventType | 'all')}
            className="input w-48"
          >
            <option value="all">All Types</option>
            {Object.entries(eventTypeConfig).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-4">
        {filtered.map((event) => {
          const typeConfig = eventTypeConfig[event.event_type];
          const status = statusConfig[event.status];
          const TypeIcon = typeConfig.icon;
          const attendeeCount = event.attendees?.length || 0;
          const volunteerCount = event.volunteers?.length || 0;

          return (
            <div
              key={event.id}
              className="card p-5 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${typeConfig.color}`}
                  >
                    <TypeIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900 text-lg">{event.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                        {event.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(event.start_date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      {event.start_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {event.start_time.slice(0, 5)}
                          {event.end_time && ` - ${event.end_time.slice(0, 5)}`}
                        </span>
                      )}
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {event.location}
                        </span>
                      )}
                      {event.is_virtual && (
                        <span className="flex items-center gap-1 text-purple-600">
                          <Video className="w-3.5 h-3.5" />
                          Virtual
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>

              {/* Attendance & Volunteers Info */}
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {attendeeCount} attendee{attendeeCount !== 1 ? 's' : ''}
                    {event.max_attendees && (
                      <span className="text-gray-400"> / {event.max_attendees} max</span>
                    )}
                  </span>
                </div>
                {volunteerCount > 0 && (
                  <div className="flex items-center gap-2">
                    <Handshake className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {volunteerCount} volunteer{volunteerCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
                {event.requires_registration && (
                  <span className="text-xs px-2 py-1 bg-yellow-50 text-yellow-700 rounded">
                    Registration Required
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="card p-12 text-center text-gray-400">
            No events found matching your search.
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import {
  Calendar,
  Users,
  TrendingUp,
  BarChart3,
  PieChart,
  Loader2,
  Download,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface EventStats {
  totalEvents: number;
  totalAttendees: number;
  avgAttendance: number;
  attendanceRate: number;
  byType: Record<string, number>;
  byMonth: { month: string; count: number }[];
  topEvents: { title: string; attendees: number; date: string }[];
}

const eventTypeLabels: Record<string, string> = {
  class: 'Class',
  workshop: 'Workshop',
  community: 'Community',
  orientation: 'Orientation',
  meeting: 'Meeting',
  celebration: 'Celebration',
  other: 'Other',
};

const eventTypeColors: Record<string, string> = {
  class: 'bg-blue-500',
  workshop: 'bg-purple-500',
  community: 'bg-green-500',
  orientation: 'bg-yellow-500',
  meeting: 'bg-gray-500',
  celebration: 'bg-pink-500',
  other: 'bg-gray-400',
};

export default function EventReports() {
  const [stats, setStats] = useState<EventStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('all');

  useEffect(() => {
    fetchStats();
  }, [timeRange]);

  async function fetchStats() {
    try {
      setLoading(true);

      // Fetch events with attendee counts
      let query = (supabase as any).from('events').select(`
        id, title, start_date, event_type, max_attendees,
        attendees:event_attendees(id, status)
      `);

      if (timeRange === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        query = query.gte('start_date', monthAgo.toISOString());
      } else if (timeRange === 'quarter') {
        const quarterAgo = new Date();
        quarterAgo.setMonth(quarterAgo.getMonth() - 3);
        query = query.gte('start_date', quarterAgo.toISOString());
      } else if (timeRange === 'year') {
        const yearAgo = new Date();
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        query = query.gte('start_date', yearAgo.toISOString());
      }

      const { data: events, error } = await query.order('start_date', { ascending: false });

      if (error) throw error;

      // Calculate statistics
      const totalEvents = events?.length || 0;
      let totalAttendees = 0;
      let totalRegistered = 0;
      let totalAttended = 0;
      const byType: Record<string, number> = {};
      const byMonthMap: Record<string, number> = {};

      events?.forEach((event: any) => {
        const attendeeCount = event.attendees?.length || 0;
        const attendedCount = event.attendees?.filter((a: any) => a.status === 'attended').length || 0;
        totalAttendees += attendeeCount;
        totalRegistered += attendeeCount;
        totalAttended += attendedCount;

        // By type
        byType[event.event_type] = (byType[event.event_type] || 0) + 1;

        // By month
        if (event.start_date) {
          const monthKey = new Date(event.start_date).toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
          });
          byMonthMap[monthKey] = (byMonthMap[monthKey] || 0) + 1;
        }
      });

      // Top events by attendance
      const topEvents = (events || [])
        .map((e: any) => ({
          title: e.title,
          attendees: e.attendees?.filter((a: any) => a.status === 'attended').length || 0,
          date: e.start_date,
        }))
        .sort((a: any, b: any) => b.attendees - a.attendees)
        .slice(0, 5);

      // Convert byMonth to array
      const byMonth = Object.entries(byMonthMap)
        .map(([month, count]) => ({ month, count }))
        .slice(0, 6)
        .reverse();

      setStats({
        totalEvents,
        totalAttendees,
        avgAttendance: totalEvents > 0 ? Math.round(totalAttendees / totalEvents) : 0,
        attendanceRate: totalRegistered > 0 ? Math.round((totalAttended / totalRegistered) * 100) : 0,
        byType,
        byMonth,
        topEvents,
      });
    } catch (err) {
      console.error('Error fetching event stats:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-canmp-green-500" />
        <span className="ml-2 text-gray-500">Loading reports...</span>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6">
        <div className="card p-12 text-center text-gray-400">
          Unable to load event statistics.
        </div>
      </div>
    );
  }

  const maxTypeCount = Math.max(...Object.values(stats.byType), 1);
  const maxMonthCount = Math.max(...stats.byMonth.map((m) => m.count), 1);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1
            className="text-xl font-semibold text-gray-900"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            Event Reports
          </h1>
          <p className="text-sm text-gray-500">Analytics and insights from events</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="input w-40"
          >
            <option value="all">All Time</option>
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
            <option value="year">Last Year</option>
          </select>
          <button className="btn-secondary">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Events</p>
              <p className="text-2xl font-semibold">{stats.totalEvents}</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Registrations</p>
              <p className="text-2xl font-semibold">{stats.totalAttendees}</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg Attendance</p>
              <p className="text-2xl font-semibold">{stats.avgAttendance}</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-canmp-green-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-canmp-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Attendance Rate</p>
              <p className="text-2xl font-semibold">{stats.attendanceRate}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Events by Type */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold text-gray-900">Events by Type</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(stats.byType).map(([type, count]) => (
              <div key={type} className="flex items-center gap-3">
                <div className="w-24 text-sm text-gray-600">
                  {eventTypeLabels[type] || type}
                </div>
                <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${eventTypeColors[type] || 'bg-gray-400'} rounded-full`}
                    style={{ width: `${(count / maxTypeCount) * 100}%` }}
                  />
                </div>
                <div className="w-12 text-sm font-medium text-gray-900 text-right">{count}</div>
              </div>
            ))}
            {Object.keys(stats.byType).length === 0 && (
              <p className="text-gray-400 text-sm">No events in this period</p>
            )}
          </div>
        </div>

        {/* Events by Month */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold text-gray-900">Events by Month</h3>
          </div>
          <div className="flex items-end justify-between gap-2 h-40">
            {stats.byMonth.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-canmp-green-500 rounded-t"
                  style={{
                    height: `${(m.count / maxMonthCount) * 100}%`,
                    minHeight: m.count > 0 ? '8px' : '0',
                  }}
                />
                <span className="text-xs text-gray-500 font-medium">{m.count}</span>
                <span className="text-xs text-gray-400">{m.month.split(' ')[0]}</span>
              </div>
            ))}
            {stats.byMonth.length === 0 && (
              <p className="text-gray-400 text-sm w-full text-center">No data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Top Events */}
      <div className="card p-5 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold text-gray-900">Top Events by Attendance</h3>
        </div>
        <div className="space-y-3">
          {stats.topEvents.map((event, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-500">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium text-gray-900">{event.title}</p>
                  <p className="text-xs text-gray-500">
                    {event.date &&
                      new Date(event.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                  </p>
                </div>
              </div>
              <div className="text-lg font-semibold text-canmp-green-600">
                {event.attendees} <span className="text-sm font-normal text-gray-400">attended</span>
              </div>
            </div>
          ))}
          {stats.topEvents.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-4">No events with attendees yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

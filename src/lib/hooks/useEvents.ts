'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Site, Beneficiary, Volunteer } from '@/types/database';

// ============================================
// Event Types
// ============================================

export type EventType = 'class' | 'workshop' | 'community' | 'orientation' | 'meeting' | 'celebration' | 'other';
export type EventStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface Event {
  id: string;
  title: string;
  description: string | null;
  event_type: EventType;
  status: EventStatus;
  site_id: string | null;
  location: string | null;
  is_virtual: boolean;
  virtual_link: string | null;
  start_date: string;
  start_time: string | null;
  end_date: string | null;
  end_time: string | null;
  is_all_day: boolean;
  is_recurring: boolean;
  recurrence_rule: string | null;
  max_attendees: number | null;
  requires_registration: boolean;
  registration_deadline: string | null;
  organizer_id: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EventAttendee {
  id: string;
  event_id: string;
  beneficiary_id: string;
  registration_date: string;
  attended: boolean;
  attendance_time: string | null;
  needs_transportation: boolean;
  needs_childcare: boolean;
  needs_interpreter: boolean;
  interpreter_language: string | null;
  notes: string | null;
  beneficiary?: Beneficiary;
}

export interface EventVolunteer {
  id: string;
  event_id: string;
  volunteer_id: string;
  role: string;
  confirmed: boolean;
  notes: string | null;
  volunteer?: Volunteer;
}

export interface EventWithRelations extends Event {
  site?: Site;
  attendees?: EventAttendee[];
  volunteers?: EventVolunteer[];
}

// ============================================
// Events Hook
// ============================================

export function useEvents() {
  const [events, setEvents] = useState<EventWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          site:sites(*),
          attendees:event_attendees(
            *,
            beneficiary:beneficiaries(*)
          ),
          volunteers:event_volunteers(
            *,
            volunteer:volunteers(*)
          )
        `)
        .eq('is_active', true)
        .order('start_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  }

  return { events, loading, error, refetch: fetchEvents };
}

export function useEvent(id: string) {
  const [event, setEvent] = useState<EventWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchEvent();
  }, [id]);

  async function fetchEvent() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          site:sites(*),
          attendees:event_attendees(
            *,
            beneficiary:beneficiaries(*)
          ),
          volunteers:event_volunteers(
            *,
            volunteer:volunteers(*)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setEvent(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch event');
    } finally {
      setLoading(false);
    }
  }

  return { event, loading, error, refetch: fetchEvent };
}

export function useUpcomingEvents(limit = 5) {
  const [events, setEvents] = useState<EventWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUpcomingEvents();
  }, [limit]);

  async function fetchUpcomingEvents() {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          site:sites(*),
          attendees:event_attendees(count)
        `)
        .eq('is_active', true)
        .gte('start_date', today)
        .order('start_date', { ascending: true })
        .limit(limit);

      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch upcoming events');
    } finally {
      setLoading(false);
    }
  }

  return { events, loading, error, refetch: fetchUpcomingEvents };
}

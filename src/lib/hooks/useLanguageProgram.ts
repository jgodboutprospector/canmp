'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Teacher, ClassSection, Beneficiary, Site } from '@/types/database';

// ============================================
// Teachers Hook
// ============================================

interface TeacherWithRelations extends Teacher {
  site?: Site | null;
}

export function useTeachers() {
  const [teachers, setTeachers] = useState<TeacherWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTeachers();
  }, []);

  async function fetchTeachers() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('teachers')
        .select(`
          *,
          site:sites(*)
        `)
        .eq('is_active', true)
        .order('last_name');

      if (error) throw error;
      setTeachers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch teachers');
    } finally {
      setLoading(false);
    }
  }

  return { teachers, loading, error, refetch: fetchTeachers };
}

// ============================================
// Class Sections Hook
// ============================================

interface ClassSectionWithRelations extends ClassSection {
  teacher?: Teacher | null;
  site?: Site | null;
  enrollments?: ClassEnrollmentWithStudent[];
}

interface ClassEnrollmentWithStudent {
  id: string;
  beneficiary_id: string;
  enrolled_date: string;
  status: string;
  pre_test_score: number | null;
  post_test_score: number | null;
  needs_transportation: boolean;
  needs_childcare: boolean;
  beneficiary?: Beneficiary;
}

export function useClassSections() {
  const [classes, setClasses] = useState<ClassSectionWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClasses();
  }, []);

  async function fetchClasses() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('class_sections')
        .select(`
          *,
          teacher:teachers(*),
          site:sites(*),
          enrollments:class_enrollments(
            *,
            beneficiary:beneficiaries(*)
          )
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setClasses(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch classes');
    } finally {
      setLoading(false);
    }
  }

  return { classes, loading, error, refetch: fetchClasses };
}

export function useClassSection(id: string) {
  const [classSection, setClassSection] = useState<ClassSectionWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchClass();
  }, [id]);

  async function fetchClass() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('class_sections')
        .select(`
          *,
          teacher:teachers(*),
          site:sites(*),
          enrollments:class_enrollments(
            *,
            beneficiary:beneficiaries(*)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setClassSection(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch class');
    } finally {
      setLoading(false);
    }
  }

  return { classSection, loading, error, refetch: fetchClass };
}

// ============================================
// Class Attendance Hook
// ============================================

interface AttendanceRecord {
  id: string;
  enrollment_id: string;
  class_date: string;
  is_present: boolean;
  notes: string | null;
}

export function useClassAttendance(sectionId: string, date?: string) {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sectionId) fetchAttendance();
  }, [sectionId, date]);

  async function fetchAttendance() {
    try {
      setLoading(true);

      // First get enrollments for this class
      const { data: enrollments, error: enrollError } = await supabase
        .from('class_enrollments')
        .select('id')
        .eq('section_id', sectionId)
        .eq('status', 'active');

      if (enrollError) throw enrollError;

      if (enrollments && enrollments.length > 0) {
        const enrollmentIds = enrollments.map(e => e.id);

        let query = supabase
          .from('class_attendance')
          .select('*')
          .in('enrollment_id', enrollmentIds);

        if (date) {
          query = query.eq('class_date', date);
        }

        const { data, error } = await query.order('class_date', { ascending: false });

        if (error) throw error;
        setAttendance(data || []);
      } else {
        setAttendance([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch attendance');
    } finally {
      setLoading(false);
    }
  }

  async function markAttendance(enrollmentId: string, classDate: string, isPresent: boolean) {
    try {
      const { error } = await supabase
        .from('class_attendance')
        .upsert({
          enrollment_id: enrollmentId,
          class_date: classDate,
          is_present: isPresent,
        }, {
          onConflict: 'enrollment_id,class_date'
        });

      if (error) throw error;
      await fetchAttendance();
    } catch (err) {
      throw err;
    }
  }

  return { attendance, loading, error, refetch: fetchAttendance, markAttendance };
}

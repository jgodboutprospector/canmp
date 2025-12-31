'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { Loader2, Check, X, Clock, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

type AttendanceStatus = 'present' | 'absent' | 'excused';

interface Student {
  id: string;
  enrollment_id: string;
  first_name: string;
  last_name: string;
  status: AttendanceStatus | null;
  notes: string | null;
}

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  className: string;
  date: Date;
}

export function AttendanceModal({
  isOpen,
  onClose,
  classId,
  className,
  date,
}: AttendanceModalProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && classId) {
      fetchStudents();
    }
  }, [isOpen, classId, date]);

  async function fetchStudents() {
    setLoading(true);
    try {
      // Fetch enrollments for this class
      const { data: enrollments, error: enrollError } = await (supabase as any)
        .from('class_enrollments')
        .select(`
          id,
          beneficiary:beneficiaries(id, first_name, last_name)
        `)
        .eq('section_id', classId)
        .eq('status', 'active');

      if (enrollError) throw enrollError;

      // Fetch attendance records for this date
      const dateStr = format(date, 'yyyy-MM-dd');
      const enrollmentIds = enrollments?.map((e: any) => e.id) || [];

      const { data: attendanceRecords, error: attError } = await (supabase as any)
        .from('class_attendance')
        .select('*')
        .in('enrollment_id', enrollmentIds)
        .eq('class_date', dateStr);

      if (attError) throw attError;

      // Merge data
      const studentList: Student[] = (enrollments || []).map((e: any) => {
        const record = attendanceRecords?.find((a: any) => a.enrollment_id === e.id);
        return {
          id: e.beneficiary?.id || e.id,
          enrollment_id: e.id,
          first_name: e.beneficiary?.first_name || 'Unknown',
          last_name: e.beneficiary?.last_name || '',
          status: record?.status || null,
          notes: record?.notes || null,
        };
      });

      setStudents(studentList.sort((a, b) => a.last_name.localeCompare(b.last_name)));
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  }

  async function updateAttendance(enrollmentId: string, status: AttendanceStatus) {
    setSaving(enrollmentId);
    const dateStr = format(date, 'yyyy-MM-dd');

    try {
      // Check if record exists
      const { data: existing } = await (supabase as any)
        .from('class_attendance')
        .select('id')
        .eq('enrollment_id', enrollmentId)
        .eq('class_date', dateStr)
        .single();

      if (existing) {
        // Update existing record
        await (supabase as any)
          .from('class_attendance')
          .update({ status, is_present: status === 'present' })
          .eq('id', existing.id);
      } else {
        // Insert new record
        await (supabase as any)
          .from('class_attendance')
          .insert({
            enrollment_id: enrollmentId,
            class_date: dateStr,
            status,
            is_present: status === 'present',
          });
      }

      // Update local state
      setStudents((prev) =>
        prev.map((s) =>
          s.enrollment_id === enrollmentId ? { ...s, status } : s
        )
      );
    } catch (err) {
      console.error('Error updating attendance:', err);
    } finally {
      setSaving(null);
    }
  }

  const presentCount = students.filter((s) => s.status === 'present').length;
  const absentCount = students.filter((s) => s.status === 'absent').length;
  const excusedCount = students.filter((s) => s.status === 'excused').length;
  const unmarkedCount = students.filter((s) => s.status === null).length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Attendance - ${className}`} size="lg">
      <div className="px-6 pb-6">
        {/* Date Display */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <Calendar className="w-4 h-4" />
          {format(date, 'EEEE, MMMM d, yyyy')}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-xl font-semibold text-green-700">{presentCount}</p>
            <p className="text-xs text-green-600">Present</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <p className="text-xl font-semibold text-red-700">{absentCount}</p>
            <p className="text-xs text-red-600">Absent</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 text-center">
            <p className="text-xl font-semibold text-yellow-700">{excusedCount}</p>
            <p className="text-xs text-yellow-600">Excused</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xl font-semibold text-gray-700">{unmarkedCount}</p>
            <p className="text-xs text-gray-600">Unmarked</p>
          </div>
        </div>

        {/* Student List */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-canmp-green-500" />
            <span className="ml-2 text-gray-500">Loading students...</span>
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No students enrolled in this class.
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
            {students.map((student) => {
              const isSaving = saving === student.enrollment_id;

              return (
                <div
                  key={student.enrollment_id}
                  className="py-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-canmp-green-100 flex items-center justify-center">
                      <span className="text-xs font-semibold text-canmp-green-700">
                        {student.first_name[0]}
                        {student.last_name[0]}
                      </span>
                    </div>
                    <span className="font-medium text-gray-900">
                      {student.first_name} {student.last_name}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => updateAttendance(student.enrollment_id, 'present')}
                      disabled={isSaving}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1',
                        student.status === 'present'
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700'
                      )}
                    >
                      {isSaving ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                      Present
                    </button>
                    <button
                      onClick={() => updateAttendance(student.enrollment_id, 'absent')}
                      disabled={isSaving}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1',
                        student.status === 'absent'
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-700'
                      )}
                    >
                      {isSaving ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <X className="w-3 h-3" />
                      )}
                      Absent
                    </button>
                    <button
                      onClick={() => updateAttendance(student.enrollment_id, 'excused')}
                      disabled={isSaving}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1',
                        student.status === 'excused'
                          ? 'bg-yellow-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-yellow-100 hover:text-yellow-700'
                      )}
                    >
                      {isSaving ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                      Excused
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

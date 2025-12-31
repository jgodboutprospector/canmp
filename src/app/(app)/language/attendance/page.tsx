'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  Users,
  GraduationCap,
  ClipboardCheck,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { AttendanceModal } from '@/components/modules/language/AttendanceModal';

const tabs = [
  { name: 'Classes', href: '/language', icon: BookOpen },
  { name: 'Teachers', href: '/language/teachers', icon: GraduationCap },
  { name: 'Enrollments', href: '/language/enrollments', icon: Users },
  { name: 'Attendance', href: '/language/attendance', icon: ClipboardCheck },
];

interface ClassSection {
  id: string;
  name: string;
  level: string;
  day_of_week: number | null;
  start_time: string | null;
  teacher: {
    first_name: string;
    last_name: string;
  } | null;
  enrollment_count?: number;
}

export default function AttendancePage() {
  const pathname = usePathname();
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassSection | null>(null);

  useEffect(() => {
    fetchClasses();
  }, []);

  async function fetchClasses() {
    try {
      const { data, error } = await (supabase as any)
        .from('class_sections')
        .select(`
          id, name, level, day_of_week, start_time,
          teacher:teachers(first_name, last_name)
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      // Get enrollment counts for each class
      const classesWithCounts = await Promise.all(
        (data || []).map(async (cls: ClassSection) => {
          const { count } = await (supabase as any)
            .from('class_enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('section_id', cls.id)
            .eq('status', 'active');
          return { ...cls, enrollment_count: count || 0 };
        })
      );

      setClasses(classesWithCounts);
    } catch (err) {
      console.error('Error fetching classes:', err);
    } finally {
      setLoading(false);
    }
  }

  function openAttendanceModal(cls: ClassSection) {
    setSelectedClass(cls);
    setModalOpen(true);
  }

  function getDayName(dayNum: number | null): string {
    if (dayNum === null) return 'TBD';
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNum] || 'TBD';
  }

  function formatTime(time: string | null): string {
    if (!time) return 'TBD';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  }

  // Get days of the current week
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="min-h-full">
      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 px-6">
        <nav className="flex gap-0">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={cn(
                  'flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-colors',
                  isActive
                    ? 'border-canmp-green-500 text-canmp-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Class Attendance</h1>
            <p className="text-sm text-gray-500">Select a class to take attendance</p>
          </div>
        </div>

        {/* Date Selector */}
        <div className="card p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setSelectedDate(addDays(selectedDate, -7))}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="font-medium text-gray-900">
              Week of {format(weekStart, 'MMM d, yyyy')}
            </h3>
            <button
              onClick={() => setSelectedDate(addDays(selectedDate, 7))}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  'p-2 rounded-lg text-center transition-colors',
                  isSameDay(day, selectedDate)
                    ? 'bg-canmp-green-500 text-white'
                    : isSameDay(day, new Date())
                    ? 'bg-canmp-green-50 text-canmp-green-700'
                    : 'hover:bg-gray-100'
                )}
              >
                <p className="text-xs font-medium">{format(day, 'EEE')}</p>
                <p className="text-lg font-semibold">{format(day, 'd')}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Date */}
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-canmp-green-600" />
          <span className="font-medium text-gray-900">
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </span>
        </div>

        {/* Classes Grid */}
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-canmp-green-500" />
            <span className="ml-2 text-gray-500">Loading classes...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls) => (
              <button
                key={cls.id}
                onClick={() => openAttendanceModal(cls)}
                className="card p-4 text-left hover:ring-2 hover:ring-canmp-green-500 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{cls.name}</h3>
                    <p className="text-sm text-gray-500 capitalize">{cls.level}</p>
                  </div>
                  <span className="bg-canmp-green-100 text-canmp-green-700 text-xs font-medium px-2 py-1 rounded-full">
                    {cls.enrollment_count} students
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>{getDayName(cls.day_of_week)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>{formatTime(cls.start_time)}</span>
                  </div>
                  {cls.teacher && (
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-gray-400" />
                      <span>
                        {cls.teacher.first_name} {cls.teacher.last_name}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100">
                  <span className="text-canmp-green-600 text-sm font-medium">
                    Take Attendance →
                  </span>
                </div>
              </button>
            ))}

            {classes.length === 0 && (
              <div className="col-span-3 text-center py-12 text-gray-400">
                No active classes found.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Attendance Modal */}
      {selectedClass && (
        <AttendanceModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedClass(null);
          }}
          classId={selectedClass.id}
          className={selectedClass.name}
          date={selectedDate}
        />
      )}
    </div>
  );
}

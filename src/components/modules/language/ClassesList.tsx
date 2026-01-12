'use client';

import { useState } from 'react';
import { Plus, Search, BookOpen, Clock, MapPin, Users, Loader2, ChevronRight } from 'lucide-react';
import { useClassSections } from '@/lib/hooks/useLanguageProgram';
import { AddClassModal } from './AddClassModal';

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const shortDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatScheduleDays(scheduleDays: number[] | null, dayOfWeek: number | null): string {
  // Use schedule_days array if available, otherwise fall back to day_of_week
  if (scheduleDays && scheduleDays.length > 0) {
    if (scheduleDays.length === 1) {
      return dayNames[scheduleDays[0]] + 's';
    }
    return scheduleDays.map(d => shortDayNames[d]).join('/');
  }
  if (dayOfWeek !== null) {
    return dayNames[dayOfWeek] + 's';
  }
  return '';
}

const levelColors: Record<string, string> = {
  basic: 'bg-green-100 text-green-700',
  beginner: 'bg-blue-100 text-blue-700',
  intermediate: 'bg-purple-100 text-purple-700',
  lets_talk: 'bg-orange-100 text-orange-700',
};

export default function ClassesList() {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const { classes, loading, error, refetch } = useClassSections();

  const filtered = classes.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.teacher?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.teacher?.last_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.location?.toLowerCase().includes(search.toLowerCase())
  );

  const totalEnrollments = classes.reduce(
    (sum, c) => sum + (c.enrollments?.length || 0),
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-canmp-green-500" />
        <span className="ml-2 text-gray-500">Loading classes...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="card p-6 bg-red-50 border-red-200">
          <p className="text-red-600 font-medium">Error loading classes</p>
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
          <h1 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Classes
          </h1>
          <p className="text-sm text-gray-500">Manage ESL class sections and schedules</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Class
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-sm text-gray-500">Total Classes</p>
          <p className="text-2xl font-semibold">{classes.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Total Enrollments</p>
          <p className="text-2xl font-semibold">{totalEnrollments}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Basic/Beginner</p>
          <p className="text-2xl font-semibold text-canmp-green-600">
            {classes.filter((c) => c.level === 'basic' || c.level === 'beginner').length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Intermediate+</p>
          <p className="text-2xl font-semibold text-purple-600">
            {classes.filter((c) => c.level === 'intermediate' || c.level === 'lets_talk').length}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="card p-4 mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search classes, teachers, locations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-2 gap-4">
        {filtered.map((classSection) => (
          <div
            key={classSection.id}
            className="card p-5 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{classSection.name}</h3>
                  <p className="text-sm text-gray-500">
                    {classSection.teacher
                      ? `${classSection.teacher.first_name} ${classSection.teacher.last_name}`
                      : 'No teacher assigned'}
                  </p>
                </div>
              </div>
              <span className={`badge ${levelColors[classSection.level] || 'badge-default'}`}>
                {classSection.level.replace('_', ' ')}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              {((classSection.schedule_days?.length ?? 0) > 0 || classSection.day_of_week !== null) && classSection.start_time && classSection.end_time && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>
                    {formatScheduleDays(classSection.schedule_days, classSection.day_of_week)}, {classSection.start_time} - {classSection.end_time}
                  </span>
                </div>
              )}
              {classSection.location && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{classSection.location}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-sm">
                  <span className="font-medium text-gray-900">{classSection.enrollments?.length || 0}</span>
                  <span className="text-gray-500"> / {classSection.max_students} enrolled</span>
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>

            {/* Enrollment Progress Bar */}
            <div className="mt-3">
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-canmp-green-500 rounded-full"
                  style={{
                    width: `${Math.min(
                      ((classSection.enrollments?.length || 0) / classSection.max_students) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-2 card p-12 text-center text-gray-400">
            No classes found matching your search.
          </div>
        )}
      </div>

      {/* Add Class Modal */}
      <AddClassModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={refetch}
      />
    </div>
  );
}

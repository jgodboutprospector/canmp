'use client';

import { useState } from 'react';
import { Plus, Search, GraduationCap, Mail, Phone, MapPin, Loader2 } from 'lucide-react';
import { useTeachers } from '@/lib/hooks/useLanguageProgram';
import { AddTeacherModal } from './AddTeacherModal';

export default function TeachersList() {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const { teachers, loading, error, refetch } = useTeachers();

  const filtered = teachers.filter(
    (t) =>
      t.first_name.toLowerCase().includes(search.toLowerCase()) ||
      t.last_name.toLowerCase().includes(search.toLowerCase()) ||
      t.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-canmp-green-500" />
        <span className="ml-2 text-gray-500">Loading teachers...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="card p-6 bg-red-50 border-red-200">
          <p className="text-red-600 font-medium">Error loading teachers</p>
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
            Teachers
          </h1>
          <p className="text-sm text-gray-500">Manage ESL teachers and volunteers</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Teacher
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-sm text-gray-500">Total Teachers</p>
          <p className="text-2xl font-semibold">{teachers.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Staff Teachers</p>
          <p className="text-2xl font-semibold text-canmp-green-600">
            {teachers.filter((t) => !t.is_volunteer).length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Volunteer Teachers</p>
          <p className="text-2xl font-semibold text-blue-600">
            {teachers.filter((t) => t.is_volunteer).length}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="card p-4 mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search teachers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Teachers Grid */}
      <div className="grid grid-cols-3 gap-4">
        {filtered.map((teacher) => (
          <div
            key={teacher.id}
            className="card p-5 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-canmp-green-100 flex items-center justify-center">
                <span className="text-lg font-semibold text-canmp-green-700">
                  {teacher.first_name[0]}{teacher.last_name[0]}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">
                    {teacher.first_name} {teacher.last_name}
                  </h3>
                  <span className={`badge ${teacher.is_volunteer ? 'badge-info' : 'badge-success'}`}>
                    {teacher.is_volunteer ? 'Volunteer' : 'Staff'}
                  </span>
                </div>

                <div className="mt-2 space-y-1">
                  {teacher.email && (
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5" />
                      {teacher.email}
                    </p>
                  )}
                  {teacher.phone && (
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5" />
                      {teacher.phone}
                    </p>
                  )}
                  {teacher.site && (
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5" />
                      {teacher.site.name}
                    </p>
                  )}
                </div>

                {teacher.languages_taught && teacher.languages_taught.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {teacher.languages_taught.map((lang) => (
                      <span key={lang} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                        {lang}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-3 card p-12 text-center text-gray-400">
            No teachers found matching your search.
          </div>
        )}
      </div>

      {/* Add Teacher Modal */}
      <AddTeacherModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={refetch}
      />
    </div>
  );
}

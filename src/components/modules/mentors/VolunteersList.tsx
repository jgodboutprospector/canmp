'use client';

import { useState } from 'react';
import {
  Plus,
  Search,
  User,
  Phone,
  Mail,
  Languages,
  Calendar,
  CheckCircle,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { useVolunteers } from '@/lib/hooks/useMentorTeams';
import { AddVolunteerModal } from './AddVolunteerModal';
import { VolunteerDetailModal } from './VolunteerDetailModal';
import type { Volunteer } from '@/types/database';

export default function VolunteersList() {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null);
  const { volunteers, loading, error, refetch } = useVolunteers();

  const filtered = volunteers.filter((v) => {
    const fullName = `${v.first_name} ${v.last_name}`.toLowerCase();
    return (
      fullName.includes(search.toLowerCase()) ||
      v.email?.toLowerCase().includes(search.toLowerCase()) ||
      v.skills?.some((s) => s.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const activeCount = volunteers.filter((v) => v.is_active).length;
  const bgCheckCount = volunteers.filter((v) => v.background_check_date).length;
  const orientedCount = volunteers.filter((v) => v.orientation_date).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-canmp-green-500" />
        <span className="ml-2 text-gray-500">Loading volunteers...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="card p-6 bg-red-50 border-red-200">
          <p className="text-red-600 font-medium">Error loading volunteers</p>
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
            Volunteers
          </h1>
          <p className="text-sm text-gray-500">
            Manage volunteers supporting refugee families
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Volunteer
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-sm text-gray-500">Total Volunteers</p>
          <p className="text-2xl font-semibold">{volunteers.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-2xl font-semibold text-canmp-green-600">{activeCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Background Checked</p>
          <p className="text-2xl font-semibold text-blue-600">{bgCheckCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Oriented</p>
          <p className="text-2xl font-semibold text-purple-600">{orientedCount}</p>
        </div>
      </div>

      {/* Search */}
      <div className="card p-4 mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Volunteers Grid */}
      <div className="grid grid-cols-2 gap-4">
        {filtered.map((volunteer) => (
          <div
            key={volunteer.id}
            onClick={() => setSelectedVolunteer(volunteer)}
            className="card p-5 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-canmp-green-100 flex items-center justify-center">
                <span className="text-lg font-semibold text-canmp-green-700">
                  {volunteer.first_name[0]}
                  {volunteer.last_name[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">
                    {volunteer.first_name} {volunteer.last_name}
                  </h3>
                  {volunteer.is_active && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      Active
                    </span>
                  )}
                </div>

                <div className="mt-2 space-y-1">
                  {volunteer.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Mail className="w-3.5 h-3.5" />
                      <span className="truncate">{volunteer.email}</span>
                    </div>
                  )}
                  {volunteer.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Phone className="w-3.5 h-3.5" />
                      {volunteer.phone}
                    </div>
                  )}
                </div>

                {volunteer.languages_spoken && volunteer.languages_spoken.length > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <Languages className="w-3.5 h-3.5 text-gray-400" />
                    <div className="flex flex-wrap gap-1">
                      {volunteer.languages_spoken.map((lang) => (
                        <span
                          key={lang}
                          className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded"
                        >
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {volunteer.skills && volunteer.skills.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {volunteer.skills.slice(0, 3).map((skill) => (
                      <span
                        key={skill}
                        className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
                      >
                        {skill}
                      </span>
                    ))}
                    {volunteer.skills.length > 3 && (
                      <span className="text-xs text-gray-400">
                        +{volunteer.skills.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-xs">
                  {volunteer.background_check_date && (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="w-3.5 h-3.5" />
                      BG Check{' '}
                      {new Date(volunteer.background_check_date).toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  )}
                  {volunteer.orientation_date && (
                    <div className="flex items-center gap-1 text-blue-600">
                      <Calendar className="w-3.5 h-3.5" />
                      Oriented{' '}
                      {new Date(volunteer.orientation_date).toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  )}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card p-12 text-center text-gray-400">
          {search
            ? 'No volunteers found matching your search.'
            : 'No volunteers registered yet. Add your first volunteer to get started.'}
        </div>
      )}

      {/* Add Volunteer Modal */}
      <AddVolunteerModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={refetch}
      />

      {/* Volunteer Detail Modal */}
      {selectedVolunteer && (
        <VolunteerDetailModal
          volunteer={selectedVolunteer}
          onClose={() => setSelectedVolunteer(null)}
          onUpdate={() => {
            refetch();
            setSelectedVolunteer(null);
          }}
        />
      )}
    </div>
  );
}

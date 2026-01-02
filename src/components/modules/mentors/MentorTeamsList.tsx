'use client';

import { useState } from 'react';
import { Plus, Search, Users, Heart, UserPlus, Calendar, Loader2, ChevronRight } from 'lucide-react';
import { useMentorTeams } from '@/lib/hooks/useMentorTeams';
import { AddMentorTeamModal } from './AddMentorTeamModal';

export default function MentorTeamsList() {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const { teams, loading, error, refetch } = useMentorTeams();

  const filtered = teams.filter(
    (t) =>
      t.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.household?.name.toLowerCase().includes(search.toLowerCase()) ||
      t.members?.some(
        (m) =>
          m.volunteer?.first_name.toLowerCase().includes(search.toLowerCase()) ||
          m.volunteer?.last_name.toLowerCase().includes(search.toLowerCase())
      )
  );

  const totalVolunteers = new Set(
    teams.flatMap((t) => t.members?.map((m) => m.volunteer_id) || [])
  ).size;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-canmp-green-500" />
        <span className="ml-2 text-gray-500">Loading mentor teams...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="card p-6 bg-red-50 border-red-200">
          <p className="text-red-600 font-medium">Error loading mentor teams</p>
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
            Family Mentor Teams
          </h1>
          <p className="text-sm text-gray-500">Volunteer teams supporting refugee families</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Create Team
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-sm text-gray-500">Active Teams</p>
          <p className="text-2xl font-semibold">{teams.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Total Volunteers</p>
          <p className="text-2xl font-semibold text-canmp-green-600">{totalVolunteers}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Families Supported</p>
          <p className="text-2xl font-semibold text-blue-600">
            {teams.filter((t) => t.household).length}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="card p-4 mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search teams, families, volunteers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Teams List */}
      <div className="space-y-4">
        {filtered.map((team) => (
          <div
            key={team.id}
            className="card p-5 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center">
                  <Heart className="w-6 h-6 text-pink-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 text-lg">
                    {team.name || `Team for ${team.household?.name}`}
                  </h3>
                  {team.household && (
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                      <Users className="w-3.5 h-3.5" />
                      Supporting: {team.household.name}
                      <span className="text-gray-400 ml-1">
                        ({team.household.beneficiaries?.length || 0} members)
                      </span>
                    </p>
                  )}
                  {team.assigned_date && (
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3" />
                      Assigned {new Date(team.assigned_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>

            {/* Team Members */}
            {team.members && team.members.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Team Members
                </p>
                <div className="flex flex-wrap gap-2">
                  {team.members.map((member) => (
                    <div
                      key={member.id}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
                        member.role === 'lead'
                          ? 'bg-canmp-green-100 text-canmp-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-medium">
                        {member.volunteer?.first_name?.[0]}
                        {member.volunteer?.last_name?.[0]}
                      </div>
                      <span className="text-sm">
                        {member.volunteer?.first_name} {member.volunteer?.last_name}
                      </span>
                      {member.role === 'lead' && (
                        <span className="text-xs bg-canmp-green-600 text-white px-1.5 py-0.5 rounded">
                          Lead
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Volunteer Skills */}
            {team.members && team.members.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {Array.from(
                  new Set(team.members.flatMap((m) => m.volunteer?.skills || []))
                ).slice(0, 5).map((skill) => (
                  <span
                    key={skill}
                    className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="card p-12 text-center text-gray-400">
            No mentor teams found matching your search.
          </div>
        )}
      </div>

      {/* Add Mentor Team Modal */}
      <AddMentorTeamModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={refetch}
      />
    </div>
  );
}

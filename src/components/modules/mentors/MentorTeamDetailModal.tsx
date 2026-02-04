'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  Heart,
  Users,
  User,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Plus,
  X,
  FileText,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Trash2,
  UserPlus,
  UserMinus,
  Globe,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useVolunteerRequests, useRequestTypes, useVolunteers } from '@/lib/hooks/useVolunteers';
import type { Volunteer, Beneficiary } from '@/types/database';
import type { ApiResponse } from '@/lib/api-server-utils';

interface MentorTeamMember {
  id: string;
  team_id: string;
  volunteer_id: string;
  role: string;
  joined_date: string;
  is_active: boolean;
  volunteer?: Volunteer;
}

interface Household {
  id: string;
  name: string;
  primary_language?: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  phone?: string;
  email?: string;
  beneficiaries?: Beneficiary[];
}

interface MentorTeam {
  id: string;
  name: string | null;
  household_id: string | null;
  assigned_date: string | null;
  is_active: boolean;
  notes: string | null;
  household?: Household;
  members?: MentorTeamMember[];
}

interface TeamNote {
  id: string;
  team_id: string;
  content: string;
  note_type: string;
  created_by_id: string | null;
  created_at: string;
  created_by?: { first_name: string; last_name: string } | null;
}

interface Props {
  teamId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  matched: { label: 'Matched', color: 'bg-blue-100 text-blue-800' },
  in_progress: { label: 'In Progress', color: 'bg-purple-100 text-purple-800' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800' },
};

export function MentorTeamDetailModal({ teamId, isOpen, onClose, onUpdate }: Props) {
  const [team, setTeam] = useState<MentorTeam | null>(null);
  const [notes, setNotes] = useState<TeamNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'family' | 'volunteers' | 'notes' | 'requests'>('family');
  const [showAddVolunteerModal, setShowAddVolunteerModal] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showAddRequestModal, setShowAddRequestModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const { volunteers: allVolunteers } = useVolunteers();
  const { requests, refetch: refetchRequests } = useVolunteerRequests({
    householdId: team?.household_id || undefined,
  });
  const { requestTypes } = useRequestTypes();

  // Filter requests for this team's household
  const teamRequests = requests.filter((r) => r.household_id === team?.household_id);

  useEffect(() => {
    if (isOpen && teamId) {
      fetchTeam();
      fetchNotes();
    }
  }, [isOpen, teamId]);

  async function fetchTeam() {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('mentor_teams')
        .select(`
          *,
          household:households(
            *,
            beneficiaries(*)
          ),
          members:mentor_team_members(
            *,
            volunteer:volunteers(*)
          )
        `)
        .eq('id', teamId)
        .single();

      if (error) throw error;
      setTeam(data);
    } catch (err) {
      console.error('Error fetching team:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchNotes() {
    try {
      const { data, error } = await (supabase as any)
        .from('mentor_team_notes')
        .select(`
          *,
          created_by:users!mentor_team_notes_created_by_id_fkey(first_name, last_name)
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (err) {
      console.error('Error fetching notes:', err);
    }
  }

  async function addVolunteerToTeam(volunteerId: string, role: string = 'member') {
    setSaving(true);
    try {
      const response = await fetch('/api/mentors?action=add_member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          team_id: teamId,
          volunteer_id: volunteerId,
          role,
        }),
      });

      const result: ApiResponse = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to add volunteer');
      }

      await fetchTeam();
      onUpdate?.();
      setShowAddVolunteerModal(false);
    } catch (err) {
      console.error('Error adding volunteer:', err);
    } finally {
      setSaving(false);
    }
  }

  async function removeVolunteerFromTeam(memberId: string) {
    if (!confirm('Are you sure you want to remove this volunteer from the team?')) return;

    try {
      const response = await fetch(`/api/mentors?id=${memberId}&type=member`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const result: ApiResponse = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to remove volunteer');
      }

      await fetchTeam();
      onUpdate?.();
    } catch (err) {
      console.error('Error removing volunteer:', err);
    }
  }

  async function updateMemberRole(memberId: string, newRole: string) {
    try {
      const response = await fetch('/api/mentors?action=update_member', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          member_id: memberId,
          role: newRole,
        }),
      });

      const result: ApiResponse = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to update role');
      }

      await fetchTeam();
      onUpdate?.();
    } catch (err) {
      console.error('Error updating role:', err);
    }
  }

  // Get volunteers not already on the team
  const availableVolunteers = allVolunteers.filter(
    (v) => !team?.members?.some((m) => m.volunteer_id === v.id && m.is_active)
  );

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Team Details" size="xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-canmp-green-500" />
        </div>
      </Modal>
    );
  }

  if (!team) return null;

  const activeMembers = team.members?.filter((m) => m.is_active) || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={team.name || `Team for ${team.household?.name}`}
      size="xl"
    >
      {/* Header with team info */}
      <div className="px-6 py-4 bg-gradient-to-r from-pink-50 to-canmp-green-50 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-pink-100 flex items-center justify-center">
            <Heart className="w-7 h-7 text-pink-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">
              {team.name || `Team for ${team.household?.name}`}
            </h2>
            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
              {team.assigned_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Assigned {format(new Date(team.assigned_date), 'MMM d, yyyy')}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {activeMembers.length} volunteer{activeMembers.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 px-6">
        <nav className="flex gap-0 -mb-px">
          {[
            { id: 'family', label: 'Family', icon: Users },
            { id: 'volunteers', label: 'Volunteers', icon: Heart },
            { id: 'notes', label: 'Notes', icon: MessageSquare, count: notes.length },
            { id: 'requests', label: 'Requests', icon: FileText, count: teamRequests.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-canmp-green-500 text-canmp-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
        {/* Family Tab */}
        {activeTab === 'family' && team.household && (
          <div className="space-y-6">
            {/* Household Info */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                <Users className="w-5 h-5" />
                {team.household.name}
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {team.household.primary_language && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Globe className="w-4 h-4 text-gray-400" />
                    Primary Language: {team.household.primary_language}
                  </div>
                )}
                {team.household.phone && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <a href={`tel:${team.household.phone}`} className="hover:text-blue-600">
                      {team.household.phone}
                    </a>
                  </div>
                )}
                {team.household.email && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <a href={`mailto:${team.household.email}`} className="hover:text-blue-600">
                      {team.household.email}
                    </a>
                  </div>
                )}
                {team.household.address_street && (
                  <div className="flex items-start gap-2 text-gray-700 col-span-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                    <span>
                      {team.household.address_street}
                      {team.household.address_city && `, ${team.household.address_city}`}
                      {team.household.address_state && `, ${team.household.address_state}`}
                      {team.household.address_zip && ` ${team.household.address_zip}`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Family Members */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Family Members ({team.household.beneficiaries?.length || 0})
              </h4>
              <div className="space-y-2">
                {team.household.beneficiaries?.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-canmp-green-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-canmp-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {member.first_name} {member.last_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {member.relationship_type || 'Family Member'}
                          {member.date_of_birth && (
                            <span className="ml-2">
                              • Born {format(new Date(member.date_of_birth), 'MMM d, yyyy')}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {member.phone && (
                        <a
                          href={`tel:${member.phone}`}
                          className="p-2 text-gray-400 hover:text-canmp-green-600"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                      {member.email && (
                        <a
                          href={`mailto:${member.email}`}
                          className="p-2 text-gray-400 hover:text-canmp-green-600"
                        >
                          <Mail className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
                {(!team.household.beneficiaries || team.household.beneficiaries.length === 0) && (
                  <p className="text-gray-400 text-center py-4">No family members recorded</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Volunteers Tab */}
        {activeTab === 'volunteers' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium text-gray-700">Team Members</h4>
              <button
                onClick={() => setShowAddVolunteerModal(true)}
                className="btn-primary text-sm px-3 py-1.5"
              >
                <UserPlus className="w-4 h-4" />
                Add Volunteer
              </button>
            </div>

            <div className="space-y-2">
              {activeMembers.map((member) => (
                <div
                  key={member.id}
                  className={cn(
                    'flex items-center justify-between p-4 rounded-lg border',
                    member.role === 'lead'
                      ? 'bg-canmp-green-50 border-canmp-green-200'
                      : 'bg-gray-50 border-gray-200'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium',
                        member.role === 'lead'
                          ? 'bg-canmp-green-200 text-canmp-green-700'
                          : 'bg-gray-200 text-gray-700'
                      )}
                    >
                      {member.volunteer?.first_name?.[0]}
                      {member.volunteer?.last_name?.[0]}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {member.volunteer?.first_name} {member.volunteer?.last_name}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        {member.volunteer?.email && (
                          <a href={`mailto:${member.volunteer.email}`} className="hover:text-canmp-green-600">
                            {member.volunteer.email}
                          </a>
                        )}
                        {member.volunteer?.phone && (
                          <a href={`tel:${member.volunteer.phone}`} className="hover:text-canmp-green-600">
                            {member.volunteer.phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={member.role}
                      onChange={(e) => updateMemberRole(member.id, e.target.value)}
                      className="text-sm border border-gray-200 rounded px-2 py-1"
                    >
                      <option value="member">Member</option>
                      <option value="lead">Team Lead</option>
                    </select>
                    <button
                      onClick={() => removeVolunteerFromTeam(member.id)}
                      className="p-2 text-gray-400 hover:text-red-600"
                      title="Remove from team"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {activeMembers.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No volunteers assigned to this team</p>
                  <button
                    onClick={() => setShowAddVolunteerModal(true)}
                    className="text-canmp-green-600 hover:underline text-sm mt-2"
                  >
                    Add the first volunteer
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium text-gray-700">Team Notes</h4>
              <button
                onClick={() => setShowAddNoteModal(true)}
                className="btn-primary text-sm px-3 py-1.5"
              >
                <Plus className="w-4 h-4" />
                Add Note
              </button>
            </div>

            <div className="space-y-3">
              {notes.map((note) => (
                <div key={note.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded',
                        note.note_type === 'meeting' && 'bg-blue-100 text-blue-700',
                        note.note_type === 'concern' && 'bg-red-100 text-red-700',
                        note.note_type === 'milestone' && 'bg-green-100 text-green-700',
                        note.note_type === 'general' && 'bg-gray-100 text-gray-700'
                      )}
                    >
                      {note.note_type.charAt(0).toUpperCase() + note.note_type.slice(1)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{note.content}</p>
                  {note.created_by && (
                    <p className="text-xs text-gray-400 mt-2">
                      — {note.created_by.first_name} {note.created_by.last_name}
                    </p>
                  )}
                </div>
              ))}

              {notes.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No notes yet</p>
                  <button
                    onClick={() => setShowAddNoteModal(true)}
                    className="text-canmp-green-600 hover:underline text-sm mt-2"
                  >
                    Add the first note
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium text-gray-700">Volunteer Requests</h4>
              <button
                onClick={() => setShowAddRequestModal(true)}
                className="btn-primary text-sm px-3 py-1.5"
              >
                <Plus className="w-4 h-4" />
                New Request
              </button>
            </div>

            <div className="space-y-2">
              {teamRequests.map((request) => {
                const status = statusConfig[request.status] || statusConfig.pending;
                return (
                  <div
                    key={request.id}
                    className="bg-white border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h5 className="font-medium text-gray-900">{request.title}</h5>
                        <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                          {request.request_type && (
                            <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                              {request.request_type}
                            </span>
                          )}
                          {request.preferred_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(request.preferred_date), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                        {request.assigned_volunteer && (
                          <p className="text-sm text-canmp-green-600 mt-2">
                            Assigned to: {request.assigned_volunteer.first_name}{' '}
                            {request.assigned_volunteer.last_name}
                          </p>
                        )}
                      </div>
                      <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', status.color)}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                );
              })}

              {teamRequests.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No requests for this family</p>
                  <button
                    onClick={() => setShowAddRequestModal(true)}
                    className="text-canmp-green-600 hover:underline text-sm mt-2"
                  >
                    Create the first request
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
        <button onClick={onClose} className="btn-secondary">
          Close
        </button>
      </div>

      {/* Add Volunteer Modal */}
      {showAddVolunteerModal && (
        <AddVolunteerToTeamModal
          isOpen={showAddVolunteerModal}
          onClose={() => setShowAddVolunteerModal(false)}
          volunteers={availableVolunteers}
          onAdd={addVolunteerToTeam}
          saving={saving}
        />
      )}

      {/* Add Note Modal */}
      {showAddNoteModal && (
        <AddNoteModal
          isOpen={showAddNoteModal}
          onClose={() => setShowAddNoteModal(false)}
          teamId={teamId}
          onSave={async () => {
            await fetchNotes();
            setShowAddNoteModal(false);
          }}
        />
      )}

      {/* Add Request Modal */}
      {showAddRequestModal && team.household && (
        <AddRequestFromTeamModal
          isOpen={showAddRequestModal}
          onClose={() => setShowAddRequestModal(false)}
          householdId={team.household.id}
          householdName={team.household.name}
          teamId={teamId}
          beneficiaries={team.household.beneficiaries || []}
          requestTypes={requestTypes}
          onSave={async () => {
            await refetchRequests();
            setShowAddRequestModal(false);
          }}
        />
      )}
    </Modal>
  );
}

// Sub-modal for adding volunteer to team
function AddVolunteerToTeamModal({
  isOpen,
  onClose,
  volunteers,
  onAdd,
  saving,
}: {
  isOpen: boolean;
  onClose: () => void;
  volunteers: Volunteer[];
  onAdd: (volunteerId: string, role: string) => void;
  saving: boolean;
}) {
  const [selectedVolunteer, setSelectedVolunteer] = useState('');
  const [role, setRole] = useState('member');
  const [search, setSearch] = useState('');

  const filtered = volunteers.filter(
    (v) =>
      v.first_name.toLowerCase().includes(search.toLowerCase()) ||
      v.last_name.toLowerCase().includes(search.toLowerCase()) ||
      v.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Volunteer to Team" size="md">
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Search Volunteers</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-full"
            placeholder="Search by name or email..."
          />
        </div>

        <div className="max-h-60 overflow-y-auto border rounded-lg">
          {filtered.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelectedVolunteer(v.id)}
              className={cn(
                'w-full flex items-center gap-3 p-3 text-left border-b last:border-b-0 hover:bg-gray-50',
                selectedVolunteer === v.id && 'bg-canmp-green-50'
              )}
            >
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                {v.first_name[0]}{v.last_name[0]}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {v.first_name} {v.last_name}
                </p>
                {v.email && <p className="text-sm text-gray-500">{v.email}</p>}
              </div>
              {selectedVolunteer === v.id && (
                <CheckCircle className="w-5 h-5 text-canmp-green-600 ml-auto" />
              )}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-center py-4 text-gray-400">No volunteers found</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="input w-full"
          >
            <option value="member">Team Member</option>
            <option value="lead">Team Lead</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={() => onAdd(selectedVolunteer, role)}
            disabled={!selectedVolunteer || saving}
            className="btn-primary"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add to Team'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Sub-modal for adding note
function AddNoteModal({
  isOpen,
  onClose,
  teamId,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  onSave: () => void;
}) {
  const [content, setContent] = useState('');
  const [noteType, setNoteType] = useState('general');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const response = await fetch('/api/mentors?action=add_note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          team_id: teamId,
          content: content.trim(),
          note_type: noteType,
        }),
      });

      const result: ApiResponse = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to save note');
      }

      onSave();
    } catch (err) {
      console.error('Error saving note:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Note" size="md">
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Note Type</label>
          <select
            value={noteType}
            onChange={(e) => setNoteType(e.target.value)}
            className="input w-full"
          >
            <option value="general">General</option>
            <option value="meeting">Meeting</option>
            <option value="concern">Concern</option>
            <option value="milestone">Milestone</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="input w-full"
            rows={4}
            placeholder="Enter your note..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!content.trim() || saving}
            className="btn-primary"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Note'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Sub-modal for creating request from team
function AddRequestFromTeamModal({
  isOpen,
  onClose,
  householdId,
  householdName,
  teamId,
  beneficiaries,
  requestTypes,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  householdId: string;
  householdName: string;
  teamId: string;
  beneficiaries: Beneficiary[];
  requestTypes: Array<{ id: string; name: string }>;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    request_type: '',
    urgency: 'medium',
    beneficiary_id: '',
    preferred_date: '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const response = await fetch('/api/mentors?action=add_request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description || undefined,
          request_type: form.request_type || undefined,
          urgency: form.urgency,
          household_id: householdId,
          beneficiary_id: form.beneficiary_id || undefined,
          preferred_date: form.preferred_date || undefined,
          mentor_team_id: teamId,
        }),
      });

      const result: ApiResponse = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to create request');
      }

      onSave();
    } catch (err) {
      console.error('Error creating request:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`New Request for ${householdName}`} size="md">
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Request Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="input w-full"
            placeholder="e.g., Transportation to appointment"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Request Type</label>
            <select
              value={form.request_type}
              onChange={(e) => setForm({ ...form, request_type: e.target.value })}
              className="input w-full"
            >
              <option value="">Select type...</option>
              {requestTypes.map((type) => (
                <option key={type.id} value={type.name}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
            <select
              value={form.urgency}
              onChange={(e) => setForm({ ...form, urgency: e.target.value })}
              className="input w-full"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">For Beneficiary</label>
            <select
              value={form.beneficiary_id}
              onChange={(e) => setForm({ ...form, beneficiary_id: e.target.value })}
              className="input w-full"
            >
              <option value="">Entire household</option>
              {beneficiaries.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.first_name} {b.last_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Date</label>
            <input
              type="date"
              value={form.preferred_date}
              onChange={(e) => setForm({ ...form, preferred_date: e.target.value })}
              className="input w-full"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input w-full"
            rows={3}
            placeholder="Describe what help is needed..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!form.title.trim() || saving}
            className="btn-primary"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Request'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

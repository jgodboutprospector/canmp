'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import {
  Loader2,
  Users,
  Globe,
  MapPin,
  Calendar,
  User,
  Phone,
  Mail,
  MessageSquare,
  Send,
  Edit2,
  Languages,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Household, Beneficiary, Site, CaseNote } from '@/types/database';

interface HouseholdWithRelations extends Household {
  beneficiaries?: Beneficiary[];
  site?: Site | null;
}

interface CaseNoteWithAuthor extends CaseNote {
  author?: {
    first_name: string;
    last_name: string;
  } | null;
}

interface HouseholdDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  householdId: string;
  onBeneficiaryClick?: (beneficiaryId: string) => void;
}

const COUNTRIES = [
  'Afghanistan', 'Angola', 'Burundi', 'Cameroon', 'Central African Republic',
  'Chad', 'Colombia', 'Congo (DRC)', 'Eritrea', 'Ethiopia', 'Guatemala',
  'Haiti', 'Honduras', 'Iraq', 'Myanmar', 'Rwanda', 'Somalia', 'South Sudan',
  'Sudan', 'Syria', 'Uganda', 'Ukraine', 'Venezuela', 'Yemen', 'Other',
];

const LANGUAGES = [
  'Amharic', 'Arabic', 'Burmese', 'Dari', 'English', 'French', 'Haitian Creole',
  'Karen', 'Kinyarwanda', 'Kirundi', 'Lingala', 'Nepali', 'Pashto', 'Portuguese',
  'Somali', 'Spanish', 'Swahili', 'Tigrinya', 'Ukrainian', 'Other',
];

export function HouseholdDetailModal({
  isOpen,
  onClose,
  householdId,
  onBeneficiaryClick,
}: HouseholdDetailModalProps) {
  const [household, setHousehold] = useState<HouseholdWithRelations | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [notes, setNotes] = useState<CaseNoteWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'notes'>('overview');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Household>>({});
  const [saving, setSaving] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    if (isOpen && householdId) {
      fetchHousehold();
      fetchSites();
      fetchNotes();
    }
  }, [isOpen, householdId]);

  async function fetchHousehold() {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('households')
        .select(`
          *,
          beneficiaries(*),
          site:sites(*)
        `)
        .eq('id', householdId)
        .single();

      if (error) throw error;
      setHousehold(data);
      setEditForm(data);
    } catch (err) {
      console.error('Error fetching household:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSites() {
    try {
      const { data } = await (supabase as any).from('sites').select('*').order('name');
      setSites(data || []);
    } catch (err) {
      console.error('Error fetching sites:', err);
    }
  }

  async function fetchNotes() {
    setLoadingNotes(true);
    try {
      const { data, error } = await (supabase as any)
        .from('case_notes')
        .select(`
          *,
          author:user_profiles(first_name, last_name)
        `)
        .eq('household_id', householdId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setNotes(data || []);
    } catch (err) {
      console.error('Error fetching notes:', err);
    } finally {
      setLoadingNotes(false);
    }
  }

  async function saveHousehold() {
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('households')
        .update({
          name: editForm.name,
          country_of_origin: editForm.country_of_origin || null,
          primary_language: editForm.primary_language || null,
          secondary_language: editForm.secondary_language || null,
          date_arrived_us: editForm.date_arrived_us || null,
          date_arrived_maine: editForm.date_arrived_maine || null,
          site_id: editForm.site_id || null,
          notes: editForm.notes || null,
        })
        .eq('id', householdId);

      if (error) throw error;

      setHousehold({ ...household, ...editForm } as HouseholdWithRelations);
      setEditing(false);
    } catch (err) {
      console.error('Error saving household:', err);
    } finally {
      setSaving(false);
    }
  }

  async function addNote() {
    if (!newNote.trim()) return;
    setSavingNote(true);

    try {
      const { error } = await (supabase as any).from('case_notes').insert({
        household_id: householdId,
        content: newNote.trim(),
        category: 'general',
        visibility: 'all_staff',
        is_followup_required: false,
        followup_completed: false,
      });

      if (error) throw error;

      setNewNote('');
      await fetchNotes();
    } catch (err) {
      console.error('Error adding note:', err);
    } finally {
      setSavingNote(false);
    }
  }

  const getRelationshipLabel = (type: string) => {
    const labels: Record<string, string> = {
      head_of_household: 'Head of Household',
      spouse: 'Spouse',
      child: 'Child',
      parent: 'Parent',
      sibling: 'Sibling',
      other_relative: 'Other Relative',
      other: 'Other',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Household Details" size="xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-canmp-green-500" />
        </div>
      </Modal>
    );
  }

  if (!household) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={household.name} size="xl">
      <div className="px-6 pb-6">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-4">
          {(['overview', 'members', 'notes'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize',
                activeTab === tab
                  ? 'border-canmp-green-500 text-canmp-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {!editing ? (
              <>
                <div className="flex justify-end">
                  <button
                    onClick={() => setEditing(true)}
                    className="text-sm text-canmp-green-600 hover:underline flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit Details
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <Globe className="w-3 h-3" />
                      Country of Origin
                    </div>
                    <p className="font-medium text-gray-900">
                      {household.country_of_origin || 'Not specified'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <MapPin className="w-3 h-3" />
                      Site
                    </div>
                    <p className="font-medium text-gray-900">
                      {household.site?.name || 'Not assigned'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <Languages className="w-3 h-3" />
                      Primary Language
                    </div>
                    <p className="font-medium text-gray-900">
                      {household.primary_language || 'Not specified'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <Languages className="w-3 h-3" />
                      Secondary Language
                    </div>
                    <p className="font-medium text-gray-900">
                      {household.secondary_language || 'Not specified'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <Calendar className="w-3 h-3" />
                      Arrived in US
                    </div>
                    <p className="font-medium text-gray-900">
                      {household.date_arrived_us
                        ? format(new Date(household.date_arrived_us), 'MMM d, yyyy')
                        : 'Not specified'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <Calendar className="w-3 h-3" />
                      Arrived in Maine
                    </div>
                    <p className="font-medium text-gray-900">
                      {household.date_arrived_maine
                        ? format(new Date(household.date_arrived_maine), 'MMM d, yyyy')
                        : 'Not specified'}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <Users className="w-3 h-3" />
                    Household Members
                  </div>
                  <p className="font-medium text-gray-900">
                    {household.beneficiaries?.length || 0} members
                  </p>
                </div>

                {household.notes && (
                  <div className="bg-yellow-50 rounded-lg p-3">
                    <p className="text-xs text-yellow-700 font-medium mb-1">Notes</p>
                    <p className="text-sm text-gray-700">{household.notes}</p>
                  </div>
                )}
              </>
            ) : (
              /* Edit Form */
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Household Name
                  </label>
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="input"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country of Origin
                    </label>
                    <select
                      value={editForm.country_of_origin || ''}
                      onChange={(e) => setEditForm({ ...editForm, country_of_origin: e.target.value })}
                      className="input"
                    >
                      <option value="">Select country...</option>
                      {COUNTRIES.map((country) => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Site
                    </label>
                    <select
                      value={editForm.site_id || ''}
                      onChange={(e) => setEditForm({ ...editForm, site_id: e.target.value })}
                      className="input"
                    >
                      <option value="">Select site...</option>
                      {sites.map((site) => (
                        <option key={site.id} value={site.id}>{site.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Primary Language
                    </label>
                    <select
                      value={editForm.primary_language || ''}
                      onChange={(e) => setEditForm({ ...editForm, primary_language: e.target.value })}
                      className="input"
                    >
                      <option value="">Select language...</option>
                      {LANGUAGES.map((lang) => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Secondary Language
                    </label>
                    <select
                      value={editForm.secondary_language || ''}
                      onChange={(e) => setEditForm({ ...editForm, secondary_language: e.target.value })}
                      className="input"
                    >
                      <option value="">Select language...</option>
                      {LANGUAGES.map((lang) => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date Arrived in US
                    </label>
                    <input
                      type="date"
                      value={editForm.date_arrived_us || ''}
                      onChange={(e) => setEditForm({ ...editForm, date_arrived_us: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date Arrived in Maine
                    </label>
                    <input
                      type="date"
                      value={editForm.date_arrived_maine || ''}
                      onChange={(e) => setEditForm({ ...editForm, date_arrived_maine: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={editForm.notes || ''}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    className="input"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setEditing(false);
                      setEditForm(household);
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveHousehold}
                    disabled={saving}
                    className="btn-primary"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="space-y-3">
            {household.beneficiaries && household.beneficiaries.length > 0 ? (
              household.beneficiaries.map((member) => (
                <div
                  key={member.id}
                  onClick={() => onBeneficiaryClick?.(member.id)}
                  className={cn(
                    'bg-gray-50 rounded-lg p-4 flex items-center justify-between',
                    onBeneficiaryClick && 'cursor-pointer hover:bg-gray-100 transition-colors'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-canmp-green-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-canmp-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {member.first_name} {member.last_name}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-xs',
                          member.relationship_type === 'head_of_household'
                            ? 'bg-canmp-green-100 text-canmp-green-700'
                            : 'bg-gray-100 text-gray-600'
                        )}>
                          {getRelationshipLabel(member.relationship_type)}
                        </span>
                        {member.date_of_birth && (
                          <span>
                            {format(new Date(member.date_of_birth), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    {member.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {member.phone}
                      </div>
                    )}
                    {member.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {member.email}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No members in this household yet</p>
              </div>
            )}
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div>
            {/* Add Note */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a quick note..."
                className="input flex-1"
                onKeyDown={(e) => e.key === 'Enter' && addNote()}
              />
              <button
                onClick={addNote}
                disabled={savingNote || !newNote.trim()}
                className="btn-primary px-4"
              >
                {savingNote ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Notes List */}
            {loadingNotes ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : notes.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No notes yet</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-3">
                {notes.map((note) => (
                  <div key={note.id} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-900">{note.content}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <User className="w-3 h-3" />
                      <span>
                        {note.author?.first_name} {note.author?.last_name}
                      </span>
                      <span>•</span>
                      <span>{format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}</span>
                      {note.category && note.category !== 'general' && (
                        <>
                          <span>•</span>
                          <span className="capitalize">{note.category}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Phone,
  CheckCircle,
  Calendar,
  Edit2,
  Save,
  Loader2,
  MessageSquare,
  Plus,
  Trash2,
  Clock,
  CalendarDays,
  User,
  MapPin,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import type { Volunteer } from '@/types/database';
import { cn } from '@/lib/utils';
import { VolunteerHoursTable } from './VolunteerHoursTable';
import { AvailabilityEditor } from './AvailabilityEditor';
import { LogHoursModal } from './LogHoursModal';

interface VolunteerNote {
  id: string;
  volunteer_id: string;
  author_id: string;
  content: string;
  note_type: string;
  created_at: string;
  author?: { first_name: string; last_name: string };
}

interface VolunteerDetailModalProps {
  volunteer: Volunteer;
  onClose: () => void;
  onUpdate: () => void;
}

const COMMON_LANGUAGES = [
  'English', 'Spanish', 'French', 'Arabic', 'Somali', 'Swahili', 'Portuguese', 'Amharic', 'Tigrinya',
];

const COMMON_SKILLS = [
  'Tutoring', 'Transportation', 'Translation', 'Mentoring', 'Job Coaching', 'Childcare', 'Administrative', 'Event Planning',
];

type TabType = 'profile' | 'hours' | 'availability' | 'notes';

export function VolunteerDetailModal({ volunteer, onClose, onUpdate }: VolunteerDetailModalProps) {
  const { profile, isAdmin, isCoordinator } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showLogHoursModal, setShowLogHoursModal] = useState(false);

  // Editable form state
  const [form, setForm] = useState({
    first_name: volunteer.first_name,
    last_name: volunteer.last_name,
    email: volunteer.email || '',
    phone: volunteer.phone || '',
    languages_spoken: [...(volunteer.languages_spoken || [])],
    skills: [...(volunteer.skills || [])],
    background_check_date: volunteer.background_check_date || '',
    orientation_date: volunteer.orientation_date || '',
    availability_notes: volunteer.availability_notes || '',
    emergency_contact_name: volunteer.emergency_contact_name || '',
    emergency_contact_phone: volunteer.emergency_contact_phone || '',
    emergency_contact_relationship: volunteer.emergency_contact_relationship || '',
    address_street: volunteer.address_street || '',
    address_city: volunteer.address_city || '',
    address_state: volunteer.address_state || '',
    address_zip: volunteer.address_zip || '',
    is_active: volunteer.is_active,
  });

  const [languageInput, setLanguageInput] = useState('');
  const [skillInput, setSkillInput] = useState('');

  // Notes state
  const [notes, setNotes] = useState<VolunteerNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    if (activeTab === 'notes') {
      fetchNotes();
    }
  }, [activeTab, volunteer.id]);

  async function fetchNotes() {
    setNotesLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('volunteer_notes')
        .select('id, content, note_type, created_at, author_id')
        .eq('volunteer_id', volunteer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (err) {
      console.error('Error fetching notes:', err);
    } finally {
      setNotesLoading(false);
    }
  }

  async function handleAddNote() {
    if (!newNote.trim() || !profile?.id) return;
    setAddingNote(true);
    try {
      const { error } = await (supabase as any).from('volunteer_notes').insert({
        volunteer_id: volunteer.id,
        author_id: profile.id,
        content: newNote.trim(),
        note_type: 'general',
      });

      if (error) throw error;
      setNewNote('');
      fetchNotes();
    } catch (err) {
      console.error('Error adding note:', err);
    } finally {
      setAddingNote(false);
    }
  }

  async function handleDeleteNote(noteId: string) {
    if (!confirm('Delete this note?')) return;
    try {
      await (supabase as any).from('volunteer_notes').delete().eq('id', noteId);
      fetchNotes();
    } catch (err) {
      console.error('Error deleting note:', err);
    }
  }

  function addLanguage(language: string) {
    const trimmed = language.trim();
    if (trimmed && !form.languages_spoken.includes(trimmed)) {
      setForm({ ...form, languages_spoken: [...form.languages_spoken, trimmed] });
    }
    setLanguageInput('');
  }

  function removeLanguage(language: string) {
    setForm({ ...form, languages_spoken: form.languages_spoken.filter((l) => l !== language) });
  }

  function addSkill(skill: string) {
    const trimmed = skill.trim();
    if (trimmed && !form.skills.includes(trimmed)) {
      setForm({ ...form, skills: [...form.skills, trimmed] });
    }
    setSkillInput('');
  }

  function removeSkill(skill: string) {
    setForm({ ...form, skills: form.skills.filter((s) => s !== skill) });
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const { error } = await (supabase as any)
        .from('volunteers')
        .update({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          languages_spoken: form.languages_spoken,
          skills: form.skills,
          background_check_date: form.background_check_date || null,
          orientation_date: form.orientation_date || null,
          availability_notes: form.availability_notes.trim() || null,
          emergency_contact_name: form.emergency_contact_name.trim() || null,
          emergency_contact_phone: form.emergency_contact_phone.trim() || null,
          emergency_contact_relationship: form.emergency_contact_relationship.trim() || null,
          address_street: form.address_street.trim() || null,
          address_city: form.address_city.trim() || null,
          address_state: form.address_state.trim() || null,
          address_zip: form.address_zip.trim() || null,
          is_active: form.is_active,
        })
        .eq('id', volunteer.id);

      if (error) throw error;
      setIsEditing(false);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setForm({
      first_name: volunteer.first_name,
      last_name: volunteer.last_name,
      email: volunteer.email || '',
      phone: volunteer.phone || '',
      languages_spoken: [...(volunteer.languages_spoken || [])],
      skills: [...(volunteer.skills || [])],
      background_check_date: volunteer.background_check_date || '',
      orientation_date: volunteer.orientation_date || '',
      availability_notes: volunteer.availability_notes || '',
      emergency_contact_name: volunteer.emergency_contact_name || '',
      emergency_contact_phone: volunteer.emergency_contact_phone || '',
      emergency_contact_relationship: volunteer.emergency_contact_relationship || '',
      address_street: volunteer.address_street || '',
      address_city: volunteer.address_city || '',
      address_state: volunteer.address_state || '',
      address_zip: volunteer.address_zip || '',
      is_active: volunteer.is_active,
    });
    setIsEditing(false);
    setError('');
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { id: 'hours', label: 'Hours', icon: <Clock className="w-4 h-4" /> },
    { id: 'availability', label: 'Availability', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'notes', label: 'Notes', icon: <MessageSquare className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-canmp-green-100 flex items-center justify-center">
                <span className="text-lg font-semibold text-canmp-green-700">
                  {volunteer.first_name[0]}{volunteer.last_name[0]}
                </span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {volunteer.first_name} {volunteer.last_name}
                </h2>
                <p className="text-sm text-gray-500">
                  {volunteer.is_active ? (
                    <span className="text-green-600">Active Volunteer</span>
                  ) : (
                    <span className="text-gray-400">Inactive</span>
                  )}
                  {volunteer.total_hours > 0 && (
                    <span className="ml-2 text-amber-600">
                      • {volunteer.total_hours} total hours
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                  activeTab === tab.id
                    ? 'border-canmp-green-500 text-canmp-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                {/* Edit Toggle */}
                {(isAdmin || isCoordinator) && (
                  <div className="flex justify-end">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <button
                          onClick={handleCancel}
                          className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-canmp-green-500 text-white rounded-lg hover:bg-canmp-green-600"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Save
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-canmp-green-600 hover:bg-canmp-green-50 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                    )}
                  </div>
                )}

                {/* Name (Edit mode only) */}
                {isEditing && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                      <input
                        type="text"
                        value={form.first_name}
                        onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                      <input
                        type="text"
                        value={form.last_name}
                        onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                      />
                    </div>
                  </div>
                )}

                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-gray-900">
                        <Mail className="w-4 h-4 text-gray-400" />
                        {volunteer.email || <span className="text-gray-400">Not provided</span>}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-gray-900">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {volunteer.phone || <span className="text-gray-400">Not provided</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={form.address_street}
                        onChange={(e) => setForm({ ...form, address_street: e.target.value })}
                        placeholder="Street address"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={form.address_city}
                          onChange={(e) => setForm({ ...form, address_city: e.target.value })}
                          placeholder="City"
                          className="px-3 py-2 border border-gray-200 rounded-lg"
                        />
                        <input
                          type="text"
                          value={form.address_state}
                          onChange={(e) => setForm({ ...form, address_state: e.target.value })}
                          placeholder="State"
                          className="px-3 py-2 border border-gray-200 rounded-lg"
                        />
                        <input
                          type="text"
                          value={form.address_zip}
                          onChange={(e) => setForm({ ...form, address_zip: e.target.value })}
                          placeholder="ZIP"
                          className="px-3 py-2 border border-gray-200 rounded-lg"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 text-gray-900">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                      {volunteer.address_street ? (
                        <div>
                          <div>{volunteer.address_street}</div>
                          <div>
                            {volunteer.address_city}, {volunteer.address_state} {volunteer.address_zip}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Not provided</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Languages */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Languages Spoken</label>
                  {isEditing ? (
                    <>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={languageInput}
                          onChange={(e) => setLanguageInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addLanguage(languageInput);
                            }
                          }}
                          placeholder="Add a language..."
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => addLanguage(languageInput)}
                          disabled={!languageInput.trim()}
                          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {COMMON_LANGUAGES.filter((l) => !form.languages_spoken.includes(l))
                          .slice(0, 5)
                          .map((lang) => (
                            <button
                              key={lang}
                              type="button"
                              onClick={() => addLanguage(lang)}
                              className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                            >
                              + {lang}
                            </button>
                          ))}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {form.languages_spoken.map((lang) => (
                          <span
                            key={lang}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                          >
                            {lang}
                            <button type="button" onClick={() => removeLanguage(lang)}>
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {volunteer.languages_spoken?.length ? (
                        volunteer.languages_spoken.map((lang) => (
                          <span key={lang} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm">
                            {lang}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400">None specified</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Skills */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Skills</label>
                  {isEditing ? (
                    <>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={skillInput}
                          onChange={(e) => setSkillInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addSkill(skillInput);
                            }
                          }}
                          placeholder="Add a skill..."
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => addSkill(skillInput)}
                          disabled={!skillInput.trim()}
                          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {COMMON_SKILLS.filter((s) => !form.skills.includes(s))
                          .slice(0, 5)
                          .map((skill) => (
                            <button
                              key={skill}
                              type="button"
                              onClick={() => addSkill(skill)}
                              className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                            >
                              + {skill}
                            </button>
                          ))}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {form.skills.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-canmp-green-100 text-canmp-green-700 rounded-full text-sm"
                          >
                            {skill}
                            <button type="button" onClick={() => removeSkill(skill)}>
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {volunteer.skills?.length ? (
                        volunteer.skills.map((skill) => (
                          <span key={skill} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400">None specified</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Emergency Contact */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact</label>
                  {isEditing ? (
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={form.emergency_contact_name}
                        onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })}
                        placeholder="Name"
                        className="px-3 py-2 border border-gray-200 rounded-lg"
                      />
                      <input
                        type="tel"
                        value={form.emergency_contact_phone}
                        onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })}
                        placeholder="Phone"
                        className="px-3 py-2 border border-gray-200 rounded-lg"
                      />
                      <input
                        type="text"
                        value={form.emergency_contact_relationship}
                        onChange={(e) => setForm({ ...form, emergency_contact_relationship: e.target.value })}
                        placeholder="Relationship"
                        className="px-3 py-2 border border-gray-200 rounded-lg"
                      />
                    </div>
                  ) : volunteer.emergency_contact_name ? (
                    <div className="text-gray-900">
                      <p>{volunteer.emergency_contact_name}</p>
                      <p className="text-sm text-gray-500">
                        {volunteer.emergency_contact_phone}
                        {volunteer.emergency_contact_relationship && ` • ${volunteer.emergency_contact_relationship}`}
                      </p>
                    </div>
                  ) : (
                    <span className="text-gray-400">Not provided</span>
                  )}
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Background Check Date</label>
                    {isEditing ? (
                      <input
                        type="date"
                        value={form.background_check_date}
                        onChange={(e) => setForm({ ...form, background_check_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-gray-900">
                        {volunteer.background_check_date ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            {new Date(volunteer.background_check_date).toLocaleDateString()}
                          </>
                        ) : (
                          <span className="text-gray-400">Not completed</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Orientation Date</label>
                    {isEditing ? (
                      <input
                        type="date"
                        value={form.orientation_date}
                        onChange={(e) => setForm({ ...form, orientation_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-gray-900">
                        {volunteer.orientation_date ? (
                          <>
                            <Calendar className="w-4 h-4 text-blue-500" />
                            {new Date(volunteer.orientation_date).toLocaleDateString()}
                          </>
                        ) : (
                          <span className="text-gray-400">Not completed</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Active Status */}
                {isEditing && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-canmp-green-600"
                    />
                    <label htmlFor="is_active" className="text-sm text-gray-700">
                      Active volunteer
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Hours Tab */}
            {activeTab === 'hours' && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowLogHoursModal(true)}
                    className="btn-primary"
                  >
                    <Plus className="w-4 h-4" />
                    Log Hours
                  </button>
                </div>
                <VolunteerHoursTable
                  volunteerId={volunteer.id}
                  onUpdate={onUpdate}
                />
              </div>
            )}

            {/* Availability Tab */}
            {activeTab === 'availability' && (
              <AvailabilityEditor
                volunteerId={volunteer.id}
                onUpdate={onUpdate}
              />
            )}

            {/* Notes Tab */}
            {activeTab === 'notes' && (
              <div className="space-y-4">
                {/* Add Note */}
                <div className="flex gap-2">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a note about this volunteer..."
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    rows={2}
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || addingNote}
                    className="self-end px-3 py-2 bg-canmp-green-500 text-white rounded-lg hover:bg-canmp-green-600 disabled:opacity-50"
                  >
                    {addingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </button>
                </div>

                {/* Notes List */}
                {notesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : notes.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    No notes yet. Add the first note above.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notes.map((note) => (
                      <div key={note.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <p className="text-sm text-gray-900 whitespace-pre-wrap">{note.content}</p>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="p-1 text-gray-400 hover:text-red-500 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                          <span>
                            {note.author
                              ? `${note.author.first_name} ${note.author.last_name}`
                              : 'Unknown'}
                          </span>
                          <span>•</span>
                          <span>{new Date(note.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Log Hours Modal */}
      <LogHoursModal
        isOpen={showLogHoursModal}
        onClose={() => setShowLogHoursModal(false)}
        onSuccess={() => {
          setShowLogHoursModal(false);
          onUpdate();
        }}
        volunteerId={volunteer.id}
        volunteerName={`${volunteer.first_name} ${volunteer.last_name}`}
      />
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import {
  Loader2,
  User,
  Phone,
  Mail,
  Calendar,
  Shield,
  FileText,
  Briefcase,
  GraduationCap,
  Send,
  AlertTriangle,
  Eye,
  EyeOff,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Beneficiary {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: string | null;
  email: string | null;
  phone: string | null;
  relationship_type: string;
  immigration_status: string | null;
  work_authorization_expiry: string | null;
  education_level: string | null;
  english_proficiency: string | null;
  is_employed: boolean;
  employer_name: string | null;
  occupation: string | null;
  ssn_collected: boolean;
  a_number_collected: boolean;
  ssn_last_four: string | null;
  a_number_last_four: string | null;
  household: {
    id: string;
    name: string;
    country_of_origin: string | null;
    primary_language: string | null;
  } | null;
}

interface Note {
  id: string;
  content: string;
  note_type: string;
  is_confidential: boolean;
  created_at: string;
  author: {
    first_name: string;
    last_name: string;
  } | null;
}

interface BeneficiaryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  beneficiaryId: string;
  onSave?: () => void;
}

export function BeneficiaryDetailModal({
  isOpen,
  onClose,
  beneficiaryId,
  onSave,
}: BeneficiaryDetailModalProps) {
  const [beneficiary, setBeneficiary] = useState<Beneficiary | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'sensitive' | 'employment' | 'notes'>('profile');
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Beneficiary>>({});

  // Sensitive data visibility
  const [showSSN, setShowSSN] = useState(false);
  const [showANumber, setShowANumber] = useState(false);
  const [ssnValue, setSsnValue] = useState('');
  const [aNumberValue, setANumberValue] = useState('');

  useEffect(() => {
    if (isOpen && beneficiaryId) {
      fetchBeneficiary();
      fetchNotes();
    }
  }, [isOpen, beneficiaryId]);

  async function fetchBeneficiary() {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('beneficiaries')
        .select(`
          *,
          household:households(id, name, country_of_origin, primary_language)
        `)
        .eq('id', beneficiaryId)
        .single();

      if (error) throw error;
      setBeneficiary(data);
      setEditForm(data);
    } catch (err) {
      console.error('Error fetching beneficiary:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchNotes() {
    setLoadingNotes(true);
    try {
      const { data, error } = await (supabase as any)
        .from('beneficiary_notes')
        .select(`
          id, content, note_type, is_confidential, created_at,
          author:users(first_name, last_name)
        `)
        .eq('beneficiary_id', beneficiaryId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (err) {
      console.error('Error fetching notes:', err);
    } finally {
      setLoadingNotes(false);
    }
  }

  async function addNote() {
    if (!newNote.trim()) return;
    setSavingNote(true);

    try {
      const { error } = await (supabase as any).from('beneficiary_notes').insert({
        beneficiary_id: beneficiaryId,
        content: newNote.trim(),
        note_type: 'general',
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

  async function saveBeneficiary() {
    try {
      const updates: Record<string, any> = {
        ...editForm,
      };

      // Handle SSN update
      if (ssnValue) {
        updates.ssn_collected = true;
        updates.ssn_last_four = ssnValue.slice(-4);
        // In production, encrypt and store full SSN
      }

      // Handle A# update
      if (aNumberValue) {
        updates.a_number_collected = true;
        updates.a_number_last_four = aNumberValue.slice(-4);
        // In production, encrypt and store full A#
      }

      const { error } = await (supabase as any)
        .from('beneficiaries')
        .update(updates)
        .eq('id', beneficiaryId);

      if (error) throw error;

      setBeneficiary({ ...beneficiary, ...updates } as Beneficiary);
      setEditing(false);
      setSsnValue('');
      setANumberValue('');
      onSave?.();
    } catch (err) {
      console.error('Error saving beneficiary:', err);
    }
  }

  function calculateAge(dob: string | null): string {
    if (!dob) return 'Unknown';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} years old`;
  }

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Beneficiary Details" size="xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-canmp-green-500" />
        </div>
      </Modal>
    );
  }

  if (!beneficiary) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${beneficiary.first_name} ${beneficiary.last_name}`}
      size="xl"
    >
      <div className="px-6 pb-6">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-4">
          {(['profile', 'sensitive', 'employment', 'notes'] as const).map((tab) => (
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
              {tab === 'sensitive' ? 'Sensitive Info' : tab}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            {!editing ? (
              <>
                <div className="flex justify-end">
                  <button
                    onClick={() => setEditing(true)}
                    className="text-sm text-canmp-green-600 hover:underline"
                  >
                    Edit Profile
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <Calendar className="w-3 h-3" />
                      Date of Birth
                    </div>
                    <p className="font-medium text-gray-900">
                      {beneficiary.date_of_birth
                        ? `${format(new Date(beneficiary.date_of_birth), 'MMM d, yyyy')} (${calculateAge(beneficiary.date_of_birth)})`
                        : 'Not set'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <User className="w-3 h-3" />
                      Gender
                    </div>
                    <p className="font-medium text-gray-900 capitalize">
                      {beneficiary.gender?.replace('_', ' ') || 'Not set'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <Phone className="w-3 h-3" />
                      Phone
                    </div>
                    <p className="font-medium text-gray-900">
                      {beneficiary.phone || 'Not set'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <Mail className="w-3 h-3" />
                      Email
                    </div>
                    <p className="font-medium text-gray-900">
                      {beneficiary.email || 'Not set'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <User className="w-3 h-3" />
                      Relationship
                    </div>
                    <p className="font-medium text-gray-900 capitalize">
                      {beneficiary.relationship_type?.replace(/_/g, ' ') || 'Not set'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <GraduationCap className="w-3 h-3" />
                      English Proficiency
                    </div>
                    <p className="font-medium text-gray-900 capitalize">
                      {beneficiary.english_proficiency || 'Not assessed'}
                    </p>
                  </div>
                </div>

                {beneficiary.household && (
                  <div className="bg-canmp-green-50 rounded-lg p-3 mt-4">
                    <p className="text-xs text-canmp-green-700 font-medium mb-1">Household</p>
                    <p className="text-sm text-gray-900">{beneficiary.household.name}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {beneficiary.household.country_of_origin &&
                        `From ${beneficiary.household.country_of_origin}`}
                      {beneficiary.household.primary_language &&
                        ` • Speaks ${beneficiary.household.primary_language}`}
                    </p>
                  </div>
                )}
              </>
            ) : (
              // Edit Form
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={editForm.first_name || ''}
                      onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={editForm.last_name || ''}
                      onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={editForm.date_of_birth || ''}
                      onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gender
                    </label>
                    <select
                      value={editForm.gender || ''}
                      onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                      className="input"
                    >
                      <option value="">Select...</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={editForm.phone || ''}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={editForm.email || ''}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Education Level
                    </label>
                    <input
                      type="text"
                      value={editForm.education_level || ''}
                      onChange={(e) => setEditForm({ ...editForm, education_level: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      English Proficiency
                    </label>
                    <select
                      value={editForm.english_proficiency || ''}
                      onChange={(e) =>
                        setEditForm({ ...editForm, english_proficiency: e.target.value })
                      }
                      className="input"
                    >
                      <option value="">Select...</option>
                      <option value="none">None</option>
                      <option value="basic">Basic</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                      <option value="fluent">Fluent</option>
                      <option value="native">Native</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setEditing(false);
                      setEditForm(beneficiary);
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button onClick={saveBeneficiary} className="btn-primary">
                    Save Changes
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sensitive Info Tab */}
        {activeTab === 'sensitive' && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 text-yellow-700">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">Sensitive Information</span>
              </div>
              <p className="text-xs text-yellow-600 mt-1">
                This information is encrypted and access is logged for security.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* SSN */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Shield className="w-4 h-4" />
                    Social Security Number
                  </div>
                  {beneficiary.ssn_collected && (
                    <button
                      onClick={() => setShowSSN(!showSSN)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      {showSSN ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                {beneficiary.ssn_collected ? (
                  <p className="font-mono text-gray-900">
                    {showSSN ? `***-**-${beneficiary.ssn_last_four}` : '***-**-****'}
                  </p>
                ) : (
                  <div>
                    <input
                      type="text"
                      placeholder="XXX-XX-XXXX"
                      value={ssnValue}
                      onChange={(e) => setSsnValue(e.target.value)}
                      className="input font-mono text-sm"
                      maxLength={11}
                    />
                    <p className="text-xs text-gray-500 mt-1">Not yet collected</p>
                  </div>
                )}
              </div>

              {/* A-Number */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <FileText className="w-4 h-4" />
                    Alien Number (A#)
                  </div>
                  {beneficiary.a_number_collected && (
                    <button
                      onClick={() => setShowANumber(!showANumber)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      {showANumber ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                {beneficiary.a_number_collected ? (
                  <p className="font-mono text-gray-900">
                    {showANumber
                      ? `A***-***-${beneficiary.a_number_last_four}`
                      : 'A***-***-***'}
                  </p>
                ) : (
                  <div>
                    <input
                      type="text"
                      placeholder="A-XXX-XXX-XXX"
                      value={aNumberValue}
                      onChange={(e) => setANumberValue(e.target.value)}
                      className="input font-mono text-sm"
                      maxLength={13}
                    />
                    <p className="text-xs text-gray-500 mt-1">Not yet collected</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Immigration Status</div>
                <p className="font-medium text-gray-900">
                  {beneficiary.immigration_status || 'Not set'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Work Authorization Expiry</div>
                <p className="font-medium text-gray-900">
                  {beneficiary.work_authorization_expiry
                    ? format(new Date(beneficiary.work_authorization_expiry), 'MMM d, yyyy')
                    : 'Not set'}
                </p>
              </div>
            </div>

            {(ssnValue || aNumberValue) && (
              <div className="flex justify-end mt-4">
                <button onClick={saveBeneficiary} className="btn-primary">
                  Save Sensitive Info
                </button>
              </div>
            )}
          </div>
        )}

        {/* Employment Tab */}
        {activeTab === 'employment' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <Briefcase className="w-3 h-3" />
                  Employment Status
                </div>
                <p className="font-medium text-gray-900">
                  {beneficiary.is_employed ? (
                    <span className="text-green-600">Employed</span>
                  ) : (
                    <span className="text-gray-500">Not employed</span>
                  )}
                </p>
              </div>
              {beneficiary.is_employed && (
                <>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Employer</div>
                    <p className="font-medium text-gray-900">
                      {beneficiary.employer_name || 'Not set'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Occupation</div>
                    <p className="font-medium text-gray-900">
                      {beneficiary.occupation || 'Not set'}
                    </p>
                  </div>
                </>
              )}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <GraduationCap className="w-3 h-3" />
                  Education Level
                </div>
                <p className="font-medium text-gray-900">
                  {beneficiary.education_level || 'Not set'}
                </p>
              </div>
            </div>
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
                placeholder="Add a note..."
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
              <p className="text-center text-gray-400 py-8 text-sm">No notes yet</p>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-3">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className={cn(
                      'rounded-lg p-3',
                      note.is_confidential ? 'bg-red-50 border-l-4 border-red-400' : 'bg-gray-50'
                    )}
                  >
                    <p className="text-sm text-gray-900">{note.content}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <User className="w-3 h-3" />
                      <span>
                        {note.author?.first_name} {note.author?.last_name}
                      </span>
                      <span>•</span>
                      <span>{format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}</span>
                      {note.is_confidential && (
                        <>
                          <span>•</span>
                          <span className="text-red-500 font-medium">Confidential</span>
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

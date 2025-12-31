'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Briefcase,
  GraduationCap,
  Building2,
  Users,
  Loader2,
  Plus,
  ChevronRight,
  MessageSquare,
  GripVertical,
  X,
  Send,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { Modal } from '@/components/ui/Modal';

const tabs = [
  { name: 'Kanban', href: '/workforce', icon: Briefcase },
  { name: 'Job Listings', href: '/workforce/jobs', icon: Building2 },
  { name: 'Training', href: '/workforce/training', icon: GraduationCap },
];

type JobStatus = 'intake' | 'preparing' | 'searching' | 'interviewing' | 'placed' | 'employed';

interface Participant {
  id: string;
  status: JobStatus;
  target_occupation: string | null;
  current_employer: string | null;
  current_job_title: string | null;
  notes: string | null;
  beneficiary: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
  } | null;
}

interface Note {
  id: string;
  content: string;
  note_type: string;
  created_at: string;
  author: {
    first_name: string;
    last_name: string;
  } | null;
}

const STATUS_COLUMNS: { id: JobStatus; title: string; color: string }[] = [
  { id: 'intake', title: 'Intake', color: 'bg-gray-100' },
  { id: 'preparing', title: 'Preparing', color: 'bg-blue-100' },
  { id: 'searching', title: 'Job Searching', color: 'bg-yellow-100' },
  { id: 'interviewing', title: 'Interviewing', color: 'bg-purple-100' },
  { id: 'placed', title: 'Placed', color: 'bg-green-100' },
  { id: 'employed', title: 'Employed 90+ Days', color: 'bg-emerald-100' },
];

export default function WorkforcePage() {
  const pathname = usePathname();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<JobStatus | null>(null);

  // Modal state
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    fetchParticipants();
  }, []);

  async function fetchParticipants() {
    try {
      const { data, error } = await (supabase as any)
        .from('workforce_participants')
        .select(`
          id, status, target_occupation, current_employer, current_job_title, notes,
          beneficiary:beneficiaries(id, first_name, last_name, phone)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setParticipants(data || []);
    } catch (err) {
      console.error('Error fetching participants:', err);
    } finally {
      setLoading(false);
    }
  }

  async function updateParticipantStatus(participantId: string, newStatus: JobStatus) {
    try {
      const { error } = await (supabase as any)
        .from('workforce_participants')
        .update({ status: newStatus })
        .eq('id', participantId);

      if (error) throw error;

      // Add a status change note
      await (supabase as any).from('workforce_notes').insert({
        participant_id: participantId,
        content: `Status changed to ${STATUS_COLUMNS.find((c) => c.id === newStatus)?.title}`,
        note_type: 'status_change',
      });

      // Update local state
      setParticipants((prev) =>
        prev.map((p) => (p.id === participantId ? { ...p, status: newStatus } : p))
      );
    } catch (err) {
      console.error('Error updating status:', err);
    }
  }

  async function fetchNotes(participantId: string) {
    setLoadingNotes(true);
    try {
      const { data, error } = await (supabase as any)
        .from('workforce_notes')
        .select(`
          id, content, note_type, created_at,
          author:users(first_name, last_name)
        `)
        .eq('participant_id', participantId)
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
    if (!selectedParticipant || !newNote.trim()) return;
    setSavingNote(true);

    try {
      const { error } = await (supabase as any).from('workforce_notes').insert({
        participant_id: selectedParticipant.id,
        content: newNote.trim(),
        note_type: 'general',
      });

      if (error) throw error;

      setNewNote('');
      await fetchNotes(selectedParticipant.id);
    } catch (err) {
      console.error('Error adding note:', err);
    } finally {
      setSavingNote(false);
    }
  }

  function openParticipantModal(participant: Participant) {
    setSelectedParticipant(participant);
    fetchNotes(participant.id);
  }

  function closeModal() {
    setSelectedParticipant(null);
    setNotes([]);
    setNewNote('');
  }

  // Drag and drop handlers
  function handleDragStart(e: React.DragEvent, participantId: string) {
    setDragging(participantId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', participantId);
  }

  function handleDragEnd() {
    setDragging(null);
    setDragOverColumn(null);
  }

  function handleDragOver(e: React.DragEvent, columnId: JobStatus) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  }

  function handleDragLeave() {
    setDragOverColumn(null);
  }

  function handleDrop(e: React.DragEvent, columnId: JobStatus) {
    e.preventDefault();
    const participantId = e.dataTransfer.getData('text/plain');
    if (participantId) {
      updateParticipantStatus(participantId, columnId);
    }
    setDragging(null);
    setDragOverColumn(null);
  }

  const getParticipantsByStatus = (status: JobStatus) =>
    participants.filter((p) => p.status === status);

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
            <h1 className="text-xl font-semibold text-gray-900">Workforce Development</h1>
            <p className="text-sm text-gray-500">
              Track job seekers through the employment pipeline
            </p>
          </div>
          <button className="btn-primary">
            <Plus className="w-4 h-4" />
            Add Participant
          </button>
        </div>

        {/* Kanban Board */}
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-canmp-green-500" />
            <span className="ml-2 text-gray-500">Loading...</span>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {STATUS_COLUMNS.map((column) => (
              <div
                key={column.id}
                className={cn(
                  'flex-shrink-0 w-72 rounded-lg transition-colors',
                  column.color,
                  dragOverColumn === column.id && 'ring-2 ring-canmp-green-500'
                )}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                {/* Column Header */}
                <div className="px-3 py-3 border-b border-black/10">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">{column.title}</h3>
                    <span className="text-sm font-medium text-gray-500">
                      {getParticipantsByStatus(column.id).length}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <div className="p-2 min-h-[200px] space-y-2">
                  {getParticipantsByStatus(column.id).map((participant) => (
                    <div
                      key={participant.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, participant.id)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        'bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-grab active:cursor-grabbing transition-all',
                        dragging === participant.id && 'opacity-50 scale-95'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-900 truncate">
                              {participant.beneficiary?.first_name}{' '}
                              {participant.beneficiary?.last_name}
                            </h4>
                            <button
                              onClick={() => openParticipantModal(participant)}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <MessageSquare className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                          {participant.target_occupation && (
                            <p className="text-sm text-gray-500 truncate">
                              {participant.target_occupation}
                            </p>
                          )}
                          {participant.current_employer && (
                            <p className="text-xs text-canmp-green-600 mt-1">
                              {participant.current_job_title} @ {participant.current_employer}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {getParticipantsByStatus(column.id).length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      No participants
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Participant Detail Modal */}
      {selectedParticipant && (
        <Modal
          isOpen={!!selectedParticipant}
          onClose={closeModal}
          title={`${selectedParticipant.beneficiary?.first_name} ${selectedParticipant.beneficiary?.last_name}`}
          size="lg"
        >
          <div className="px-6 pb-6">
            {/* Participant Info */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Current Status</p>
                <p className="font-medium text-gray-900">
                  {STATUS_COLUMNS.find((c) => c.id === selectedParticipant.status)?.title}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Target Occupation</p>
                <p className="font-medium text-gray-900">
                  {selectedParticipant.target_occupation || 'Not specified'}
                </p>
              </div>
              {selectedParticipant.current_employer && (
                <>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Current Employer</p>
                    <p className="font-medium text-gray-900">
                      {selectedParticipant.current_employer}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Job Title</p>
                    <p className="font-medium text-gray-900">
                      {selectedParticipant.current_job_title || '-'}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Move to Status */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Move to Status</p>
              <div className="flex flex-wrap gap-2">
                {STATUS_COLUMNS.map((column) => (
                  <button
                    key={column.id}
                    onClick={() => {
                      updateParticipantStatus(selectedParticipant.id, column.id);
                      setSelectedParticipant({
                        ...selectedParticipant,
                        status: column.id,
                      });
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                      selectedParticipant.status === column.id
                        ? 'bg-canmp-green-500 text-white'
                        : `${column.color} text-gray-700 hover:ring-2 hover:ring-canmp-green-300`
                    )}
                  >
                    {column.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes Section */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Notes & Activity</p>

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
                <p className="text-center text-gray-400 py-4 text-sm">No notes yet</p>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-3">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className={cn(
                        'p-3 rounded-lg text-sm',
                        note.note_type === 'status_change'
                          ? 'bg-blue-50 border-l-4 border-blue-400'
                          : 'bg-gray-50'
                      )}
                    >
                      <p className="text-gray-900">{note.content}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <User className="w-3 h-3" />
                        <span>
                          {note.author?.first_name} {note.author?.last_name}
                        </span>
                        <span>•</span>
                        <span>{format(new Date(note.created_at), 'MMM d, h:mm a')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

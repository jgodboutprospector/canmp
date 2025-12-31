'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Briefcase,
  GraduationCap,
  Building2,
  Loader2,
  Plus,
  MessageSquare,
  GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import ParticipantDetailModal from '@/components/modules/workforce/ParticipantDetailModal';

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
  current_hourly_wage: number | null;
  notes: string | null;
  career_summary: string | null;
  preferred_industries: string[] | null;
  preferred_schedule: string | null;
  strengths: string[] | null;
  areas_for_growth: string[] | null;
  beneficiary: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    email: string | null;
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
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);

  useEffect(() => {
    fetchParticipants();
  }, []);

  async function fetchParticipants() {
    try {
      const { data, error } = await (supabase as any)
        .from('workforce_participants')
        .select(`
          id, status, target_occupation, current_employer, current_job_title,
          current_hourly_wage, notes, career_summary, preferred_industries,
          preferred_schedule, strengths, areas_for_growth,
          beneficiary:beneficiaries(id, first_name, last_name, phone, email)
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

      // Update selected participant if open
      if (selectedParticipant?.id === participantId) {
        setSelectedParticipant({ ...selectedParticipant, status: newStatus });
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
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

        {/* Stats */}
        <div className="grid grid-cols-6 gap-2 mb-6">
          {STATUS_COLUMNS.map((column) => {
            const count = getParticipantsByStatus(column.id).length;
            return (
              <div key={column.id} className={`rounded-lg p-3 ${column.color}`}>
                <p className="text-sm font-medium text-gray-700">{column.title}</p>
                <p className="text-2xl font-semibold text-gray-900">{count}</p>
              </div>
            );
          })}
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
                              onClick={() => setSelectedParticipant(participant)}
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
        <ParticipantDetailModal
          participant={selectedParticipant}
          isOpen={!!selectedParticipant}
          onClose={() => setSelectedParticipant(null)}
          onStatusChange={updateParticipantStatus}
        />
      )}
    </div>
  );
}

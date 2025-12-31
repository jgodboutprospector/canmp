'use client';

import { useState, useEffect } from 'react';
import {
  Briefcase,
  Target,
  MessageSquare,
  Plus,
  Loader2,
  Send,
  User,
  Building2,
  Calendar,
  MapPin,
  CheckCircle,
  FileText,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import FileUpload from '@/components/ui/FileUpload';
import DocumentList from '@/components/ui/DocumentList';
import { uploadFile } from '@/lib/storage';

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

interface JobHistory {
  id: string;
  company_name: string;
  job_title: string;
  location: string | null;
  country: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
  skills_used: string[] | null;
  hourly_wage: number | null;
  reason_for_leaving: string | null;
}

interface CareerGoal {
  id: string;
  goal_type: string;
  title: string;
  description: string | null;
  target_occupation: string | null;
  target_wage: number | null;
  target_date: string | null;
  status: string;
  progress_notes: string | null;
  achieved_date: string | null;
  created_at: string;
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

interface Document {
  id: string;
  file_name: string;
  original_file_name: string;
  storage_path: string;
  file_size: number | null;
  mime_type: string | null;
  category: string;
  title: string | null;
  document_date: string | null;
  expiry_date: string | null;
  is_verified: boolean;
  created_at: string;
}

const STATUS_COLUMNS: { id: JobStatus; title: string; color: string }[] = [
  { id: 'intake', title: 'Intake', color: 'bg-gray-100' },
  { id: 'preparing', title: 'Preparing', color: 'bg-blue-100' },
  { id: 'searching', title: 'Job Searching', color: 'bg-yellow-100' },
  { id: 'interviewing', title: 'Interviewing', color: 'bg-purple-100' },
  { id: 'placed', title: 'Placed', color: 'bg-green-100' },
  { id: 'employed', title: 'Employed 90+ Days', color: 'bg-emerald-100' },
];

const GOAL_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  short_term: { label: 'Short Term (0-6 mo)', color: 'bg-blue-100 text-blue-700' },
  medium_term: { label: 'Medium Term (6-18 mo)', color: 'bg-purple-100 text-purple-700' },
  long_term: { label: 'Long Term (18+ mo)', color: 'bg-green-100 text-green-700' },
};

const GOAL_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: 'bg-blue-50 text-blue-600' },
  achieved: { label: 'Achieved', color: 'bg-green-50 text-green-600' },
  revised: { label: 'Revised', color: 'bg-yellow-50 text-yellow-600' },
  abandoned: { label: 'Abandoned', color: 'bg-gray-50 text-gray-600' },
};

interface Props {
  participant: Participant;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (participantId: string, newStatus: JobStatus) => void;
}

export default function ParticipantDetailModal({
  participant,
  isOpen,
  onClose,
  onStatusChange,
}: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'goals' | 'documents' | 'notes'>('overview');
  const [jobHistory, setJobHistory] = useState<JobHistory[]>([]);
  const [careerGoals, setCareerGoals] = useState<CareerGoal[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Add job history modal
  const [showAddJob, setShowAddJob] = useState(false);
  const [newJob, setNewJob] = useState({
    company_name: '',
    job_title: '',
    location: '',
    country: '',
    start_date: '',
    end_date: '',
    is_current: false,
    description: '',
    hourly_wage: '',
    reason_for_leaving: '',
  });

  // Add goal modal
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    goal_type: 'short_term',
    title: '',
    description: '',
    target_occupation: '',
    target_wage: '',
    target_date: '',
  });

  useEffect(() => {
    if (isOpen && participant) {
      fetchData();
    }
  }, [isOpen, participant]);

  async function fetchData() {
    setLoading(true);
    try {
      const [historyRes, goalsRes, docsRes, notesRes] = await Promise.all([
        (supabase as any)
          .from('workforce_job_history')
          .select('*')
          .eq('participant_id', participant.id)
          .order('start_date', { ascending: false }),
        (supabase as any)
          .from('workforce_career_goals')
          .select('*')
          .eq('participant_id', participant.id)
          .order('created_at', { ascending: false }),
        (supabase as any)
          .from('documents')
          .select('*')
          .eq('workforce_participant_id', participant.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        (supabase as any)
          .from('workforce_notes')
          .select('id, content, note_type, created_at, author:users(first_name, last_name)')
          .eq('participant_id', participant.id)
          .order('created_at', { ascending: false }),
      ]);

      setJobHistory(historyRes.data || []);
      setCareerGoals(goalsRes.data || []);
      setDocuments(docsRes.data || []);
      setNotes(notesRes.data || []);
    } catch (err) {
      console.error('Error fetching participant data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDocumentUpload(file: File): Promise<boolean> {
    const result = await uploadFile(file, 'workforce', participant.id, 'resume');
    if (!result.success) return false;

    try {
      const { error } = await (supabase as any).from('documents').insert({
        file_name: result.fileName,
        original_file_name: file.name,
        storage_path: result.path,
        file_size: file.size,
        mime_type: file.type,
        category: 'resume',
        workforce_participant_id: participant.id,
      });

      if (error) throw error;
      await fetchData();
      return true;
    } catch (err) {
      console.error('Error saving document:', err);
      return false;
    }
  }

  async function handleDocumentDelete(documentId: string) {
    try {
      const { error } = await (supabase as any)
        .from('documents')
        .update({ is_active: false })
        .eq('id', documentId);

      if (error) throw error;
      await fetchData();
    } catch (err) {
      console.error('Error deleting document:', err);
    }
  }

  async function addNote() {
    if (!newNote.trim()) return;
    setSavingNote(true);

    try {
      await (supabase as any).from('workforce_notes').insert({
        participant_id: participant.id,
        content: newNote.trim(),
        note_type: 'general',
      });

      setNewNote('');
      fetchData();
    } catch (err) {
      console.error('Error adding note:', err);
    } finally {
      setSavingNote(false);
    }
  }

  async function saveJobHistory() {
    try {
      await (supabase as any).from('workforce_job_history').insert({
        participant_id: participant.id,
        company_name: newJob.company_name,
        job_title: newJob.job_title,
        location: newJob.location || null,
        country: newJob.country || null,
        start_date: newJob.start_date || null,
        end_date: newJob.is_current ? null : newJob.end_date || null,
        is_current: newJob.is_current,
        description: newJob.description || null,
        hourly_wage: newJob.hourly_wage ? parseFloat(newJob.hourly_wage) : null,
        reason_for_leaving: newJob.reason_for_leaving || null,
      });

      setShowAddJob(false);
      setNewJob({
        company_name: '',
        job_title: '',
        location: '',
        country: '',
        start_date: '',
        end_date: '',
        is_current: false,
        description: '',
        hourly_wage: '',
        reason_for_leaving: '',
      });
      fetchData();
    } catch (err) {
      console.error('Error saving job history:', err);
    }
  }

  async function saveCareerGoal() {
    try {
      await (supabase as any).from('workforce_career_goals').insert({
        participant_id: participant.id,
        goal_type: newGoal.goal_type,
        title: newGoal.title,
        description: newGoal.description || null,
        target_occupation: newGoal.target_occupation || null,
        target_wage: newGoal.target_wage ? parseFloat(newGoal.target_wage) : null,
        target_date: newGoal.target_date || null,
        status: 'active',
      });

      setShowAddGoal(false);
      setNewGoal({
        goal_type: 'short_term',
        title: '',
        description: '',
        target_occupation: '',
        target_wage: '',
        target_date: '',
      });
      fetchData();
    } catch (err) {
      console.error('Error saving career goal:', err);
    }
  }

  async function updateGoalStatus(goalId: string, newStatus: string) {
    try {
      await (supabase as any)
        .from('workforce_career_goals')
        .update({
          status: newStatus,
          achieved_date: newStatus === 'achieved' ? new Date().toISOString() : null,
        })
        .eq('id', goalId);
      fetchData();
    } catch (err) {
      console.error('Error updating goal status:', err);
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'history', label: 'Job History', icon: Briefcase },
    { id: 'goals', label: 'Career Goals', icon: Target },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'notes', label: 'Notes', icon: MessageSquare },
  ] as const;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${participant.beneficiary?.first_name} ${participant.beneficiary?.last_name}`}
      size="xl"
    >
      {/* Tabs */}
      <div className="border-b border-gray-200 px-6">
        <nav className="flex gap-0 -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-canmp-green-500 text-canmp-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.id === 'history' && jobHistory.length > 0 && (
                <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{jobHistory.length}</span>
              )}
              {tab.id === 'goals' && careerGoals.filter((g) => g.status === 'active').length > 0 && (
                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                  {careerGoals.filter((g) => g.status === 'active').length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Status */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Current Status</p>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_COLUMNS.map((column) => (
                      <button
                        key={column.id}
                        onClick={() => onStatusChange(participant.id, column.id)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                          participant.status === column.id
                            ? 'bg-canmp-green-500 text-white'
                            : `${column.color} text-gray-700 hover:ring-2 hover:ring-canmp-green-300`
                        )}
                      >
                        {column.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Career Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Target Occupation</p>
                    <p className="font-medium text-gray-900">
                      {participant.target_occupation || 'Not specified'}
                    </p>
                  </div>
                  {participant.current_employer && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-xs text-gray-500 mb-1">Current Employment</p>
                      <p className="font-medium text-gray-900">
                        {participant.current_job_title} @ {participant.current_employer}
                      </p>
                      {participant.current_hourly_wage && (
                        <p className="text-sm text-green-600">${participant.current_hourly_wage}/hr</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Strengths & Areas for Growth */}
                {(participant.strengths?.length || participant.areas_for_growth?.length) && (
                  <div className="grid grid-cols-2 gap-4">
                    {participant.strengths && participant.strengths.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Strengths</p>
                        <div className="flex flex-wrap gap-1">
                          {participant.strengths.map((s) => (
                            <span key={s} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {participant.areas_for_growth && participant.areas_for_growth.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Areas for Growth</p>
                        <div className="flex flex-wrap gap-1">
                          {participant.areas_for_growth.map((a) => (
                            <span key={a} className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                              {a}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Contact Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-2">Contact Information</p>
                  <div className="flex gap-6 text-sm">
                    {participant.beneficiary?.phone && (
                      <span>{participant.beneficiary.phone}</span>
                    )}
                    {participant.beneficiary?.email && (
                      <span>{participant.beneficiary.email}</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Job History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500">Work experience and employment history</p>
                  <button
                    onClick={() => setShowAddJob(true)}
                    className="btn-secondary text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Job
                  </button>
                </div>

                {jobHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    No job history recorded yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {jobHistory.map((job) => (
                      <div key={job.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-900">{job.job_title}</h4>
                            <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                              <Building2 className="w-4 h-4" />
                              {job.company_name}
                            </div>
                            {(job.location || job.country) && (
                              <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                <MapPin className="w-4 h-4" />
                                {[job.location, job.country].filter(Boolean).join(', ')}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            {job.is_current ? (
                              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                                Current
                              </span>
                            ) : (
                              <div className="text-sm text-gray-500">
                                {job.start_date && format(new Date(job.start_date), 'MMM yyyy')}
                                {' - '}
                                {job.end_date ? format(new Date(job.end_date), 'MMM yyyy') : 'Present'}
                              </div>
                            )}
                            {job.hourly_wage && (
                              <p className="text-sm text-gray-600 mt-1">${job.hourly_wage}/hr</p>
                            )}
                          </div>
                        </div>
                        {job.description && (
                          <p className="text-sm text-gray-600 mt-2">{job.description}</p>
                        )}
                        {job.skills_used && job.skills_used.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {job.skills_used.map((skill) => (
                              <span key={skill} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded">
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Job Form */}
                {showAddJob && (
                  <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                    <h4 className="font-medium text-gray-900 mb-4">Add Job History</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Company Name *
                        </label>
                        <input
                          type="text"
                          value={newJob.company_name}
                          onChange={(e) => setNewJob({ ...newJob, company_name: e.target.value })}
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Job Title *
                        </label>
                        <input
                          type="text"
                          value={newJob.job_title}
                          onChange={(e) => setNewJob({ ...newJob, job_title: e.target.value })}
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <input
                          type="text"
                          value={newJob.location}
                          onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                          className="input"
                          placeholder="City, State"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                        <input
                          type="text"
                          value={newJob.country}
                          onChange={(e) => setNewJob({ ...newJob, country: e.target.value })}
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={newJob.start_date}
                          onChange={(e) => setNewJob({ ...newJob, start_date: e.target.value })}
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input
                          type="date"
                          value={newJob.end_date}
                          onChange={(e) => setNewJob({ ...newJob, end_date: e.target.value })}
                          className="input"
                          disabled={newJob.is_current}
                        />
                        <label className="flex items-center gap-2 mt-1">
                          <input
                            type="checkbox"
                            checked={newJob.is_current}
                            onChange={(e) => setNewJob({ ...newJob, is_current: e.target.checked })}
                          />
                          <span className="text-sm text-gray-600">Current job</span>
                        </label>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                          value={newJob.description}
                          onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                          className="input"
                          rows={2}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Wage</label>
                        <input
                          type="number"
                          step="0.01"
                          value={newJob.hourly_wage}
                          onChange={(e) => setNewJob({ ...newJob, hourly_wage: e.target.value })}
                          className="input"
                          placeholder="$"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Leaving</label>
                        <input
                          type="text"
                          value={newJob.reason_for_leaving}
                          onChange={(e) => setNewJob({ ...newJob, reason_for_leaving: e.target.value })}
                          className="input"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      <button
                        onClick={() => setShowAddJob(false)}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveJobHistory}
                        disabled={!newJob.company_name || !newJob.job_title}
                        className="btn-primary"
                      >
                        Save Job
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Career Goals Tab */}
            {activeTab === 'goals' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500">Track career aspirations and progress</p>
                  <button
                    onClick={() => setShowAddGoal(true)}
                    className="btn-secondary text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Goal
                  </button>
                </div>

                {careerGoals.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    No career goals set yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {careerGoals.map((goal) => {
                      const typeConfig = GOAL_TYPE_CONFIG[goal.goal_type] || GOAL_TYPE_CONFIG.short_term;
                      const statusConfig = GOAL_STATUS_CONFIG[goal.status] || GOAL_STATUS_CONFIG.active;

                      return (
                        <div
                          key={goal.id}
                          className={cn(
                            'border rounded-lg p-4',
                            goal.status === 'achieved' ? 'bg-green-50 border-green-200' : 'border-gray-200'
                          )}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-gray-900">{goal.title}</h4>
                                <span className={`text-xs px-2 py-0.5 rounded ${typeConfig.color}`}>
                                  {typeConfig.label}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded ${statusConfig.color}`}>
                                  {statusConfig.label}
                                </span>
                              </div>
                              {goal.description && (
                                <p className="text-sm text-gray-600 mt-1">{goal.description}</p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                {goal.target_occupation && (
                                  <span className="flex items-center gap-1">
                                    <Briefcase className="w-3.5 h-3.5" />
                                    {goal.target_occupation}
                                  </span>
                                )}
                                {goal.target_wage && (
                                  <span>${goal.target_wage}/hr target</span>
                                )}
                                {goal.target_date && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5" />
                                    Target: {format(new Date(goal.target_date), 'MMM yyyy')}
                                  </span>
                                )}
                              </div>
                            </div>
                            {goal.status === 'active' && (
                              <button
                                onClick={() => updateGoalStatus(goal.id, 'achieved')}
                                className="text-xs px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors flex items-center gap-1"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Mark Achieved
                              </button>
                            )}
                          </div>
                          {goal.achieved_date && (
                            <p className="text-sm text-green-600 mt-2">
                              Achieved on {format(new Date(goal.achieved_date), 'MMMM d, yyyy')}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add Goal Form */}
                {showAddGoal && (
                  <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                    <h4 className="font-medium text-gray-900 mb-4">Add Career Goal</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Goal Type *</label>
                        <select
                          value={newGoal.goal_type}
                          onChange={(e) => setNewGoal({ ...newGoal, goal_type: e.target.value })}
                          className="input"
                        >
                          <option value="short_term">Short Term (0-6 months)</option>
                          <option value="medium_term">Medium Term (6-18 months)</option>
                          <option value="long_term">Long Term (18+ months)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Target Date</label>
                        <input
                          type="date"
                          value={newGoal.target_date}
                          onChange={(e) => setNewGoal({ ...newGoal, target_date: e.target.value })}
                          className="input"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Goal Title *</label>
                        <input
                          type="text"
                          value={newGoal.title}
                          onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                          className="input"
                          placeholder="e.g., Get CNA certification"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                          value={newGoal.description}
                          onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                          className="input"
                          rows={2}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Target Occupation</label>
                        <input
                          type="text"
                          value={newGoal.target_occupation}
                          onChange={(e) => setNewGoal({ ...newGoal, target_occupation: e.target.value })}
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Target Hourly Wage</label>
                        <input
                          type="number"
                          step="0.01"
                          value={newGoal.target_wage}
                          onChange={(e) => setNewGoal({ ...newGoal, target_wage: e.target.value })}
                          className="input"
                          placeholder="$"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      <button
                        onClick={() => setShowAddGoal(false)}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveCareerGoal}
                        disabled={!newGoal.title}
                        className="btn-primary"
                      >
                        Save Goal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  Upload resumes, certifications, and other career documents
                </p>

                <FileUpload
                  onUpload={handleDocumentUpload}
                  accept=".pdf,.doc,.docx"
                  category="resume"
                  label="Upload Resume or Document"
                  hint="PDF, DOC, or DOCX files up to 10MB"
                />

                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Uploaded Documents</h4>
                  <DocumentList
                    documents={documents}
                    onDelete={handleDocumentDelete}
                    showCategory={true}
                    emptyMessage="No documents uploaded yet"
                  />
                </div>
              </div>
            )}

            {/* Notes Tab */}
            {activeTab === 'notes' && (
              <div className="space-y-4">
                {/* Add Note */}
                <div className="flex gap-2">
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
                    {savingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>

                {/* Notes List */}
                {notes.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">No notes yet</div>
                ) : (
                  <div className="space-y-3">
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
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}

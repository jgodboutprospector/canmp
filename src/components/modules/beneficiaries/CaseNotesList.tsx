'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  FileText,
  User,
  Calendar,
  Eye,
  AlertCircle,
  CheckCircle,
  Loader2,
  Filter,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface CaseNote {
  id: string;
  content: string;
  category: string | null;
  visibility: string;
  is_followup_required: boolean;
  followup_date: string | null;
  followup_completed: boolean;
  created_at: string;
  household: {
    id: string;
    name: string;
  } | null;
  beneficiary: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  author: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
}

const categoryColors: Record<string, string> = {
  general: 'bg-gray-100 text-gray-700',
  housing: 'bg-blue-100 text-blue-700',
  employment: 'bg-green-100 text-green-700',
  education: 'bg-purple-100 text-purple-700',
  health: 'bg-red-100 text-red-700',
  legal: 'bg-yellow-100 text-yellow-700',
  financial: 'bg-emerald-100 text-emerald-700',
};

const visibilityLabels: Record<string, { label: string; color: string }> = {
  all_staff: { label: 'All Staff', color: 'bg-gray-50 text-gray-600' },
  coordinators_only: { label: 'Coordinators Only', color: 'bg-yellow-50 text-yellow-700' },
  private: { label: 'Private', color: 'bg-red-50 text-red-600' },
};

export default function CaseNotesList() {
  const [notes, setNotes] = useState<CaseNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showFollowupsOnly, setShowFollowupsOnly] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, []);

  async function fetchNotes() {
    try {
      const { data, error } = await (supabase as any)
        .from('case_notes')
        .select(
          `
          id, content, category, visibility, is_followup_required,
          followup_date, followup_completed, created_at,
          household:households(id, name),
          beneficiary:beneficiaries(id, first_name, last_name),
          author:user_profiles(id, first_name, last_name, email)
        `
        )
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setNotes(data || []);
    } catch (err) {
      console.error('Error fetching case notes:', err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = notes.filter((note) => {
    const matchesSearch =
      note.content.toLowerCase().includes(search.toLowerCase()) ||
      note.household?.name?.toLowerCase().includes(search.toLowerCase()) ||
      `${note.beneficiary?.first_name} ${note.beneficiary?.last_name}`
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || note.category === categoryFilter;
    const matchesFollowup = !showFollowupsOnly || (note.is_followup_required && !note.followup_completed);
    return matchesSearch && matchesCategory && matchesFollowup;
  });

  const pendingFollowups = notes.filter((n) => n.is_followup_required && !n.followup_completed).length;
  const overdueFollowups = notes.filter(
    (n) =>
      n.is_followup_required &&
      !n.followup_completed &&
      n.followup_date &&
      new Date(n.followup_date) < new Date()
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-canmp-green-500" />
        <span className="ml-2 text-gray-500">Loading case notes...</span>
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
            Case Notes
          </h1>
          <p className="text-sm text-gray-500">
            Track interactions and follow-ups with households
          </p>
        </div>
        <button className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Note
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-sm text-gray-500">Total Notes</p>
          <p className="text-2xl font-semibold">{notes.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">This Month</p>
          <p className="text-2xl font-semibold text-canmp-green-600">
            {
              notes.filter((n) => {
                const noteDate = new Date(n.created_at);
                const now = new Date();
                return (
                  noteDate.getMonth() === now.getMonth() &&
                  noteDate.getFullYear() === now.getFullYear()
                );
              }).length
            }
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Pending Follow-ups</p>
          <p className="text-2xl font-semibold text-yellow-600">{pendingFollowups}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Overdue</p>
          <p className="text-2xl font-semibold text-red-600">{overdueFollowups}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search notes, households, beneficiaries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input w-40"
          >
            <option value="all">All Categories</option>
            <option value="general">General</option>
            <option value="housing">Housing</option>
            <option value="employment">Employment</option>
            <option value="education">Education</option>
            <option value="health">Health</option>
            <option value="legal">Legal</option>
            <option value="financial">Financial</option>
          </select>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showFollowupsOnly}
              onChange={(e) => setShowFollowupsOnly(e.target.checked)}
              className="w-4 h-4 text-canmp-green-600 border-gray-300 rounded focus:ring-canmp-green-500"
            />
            <span className="text-sm text-gray-600">Pending follow-ups only</span>
          </label>
        </div>
      </div>

      {/* Notes List */}
      <div className="space-y-4">
        {filtered.map((note) => {
          const visibility = visibilityLabels[note.visibility] || visibilityLabels.all_staff;
          const isOverdue =
            note.is_followup_required &&
            !note.followup_completed &&
            note.followup_date &&
            new Date(note.followup_date) < new Date();

          return (
            <div
              key={note.id}
              className={`card p-5 ${isOverdue ? 'border-l-4 border-l-red-500' : ''}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-gray-900">
                      {note.household?.name || 'Unknown Household'}
                    </span>
                    {note.beneficiary && (
                      <>
                        <span className="text-gray-400">-</span>
                        <span className="text-gray-600">
                          {note.beneficiary.first_name} {note.beneficiary.last_name}
                        </span>
                      </>
                    )}
                    {note.category && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          categoryColors[note.category] || categoryColors.general
                        }`}
                      >
                        {note.category.charAt(0).toUpperCase() + note.category.slice(1)}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded ${visibility.color}`}>
                      <Eye className="w-3 h-3 inline mr-1" />
                      {visibility.label}
                    </span>
                  </div>

                  <p className="text-gray-600 text-sm whitespace-pre-wrap line-clamp-3">
                    {note.content}
                  </p>

                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(note.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                    {note.author && (
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {note.author.first_name && note.author.last_name
                          ? `${note.author.first_name} ${note.author.last_name}`
                          : note.author.email}
                      </span>
                    )}
                  </div>
                </div>

                {note.is_followup_required && (
                  <div
                    className={`ml-4 flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
                      note.followup_completed
                        ? 'bg-green-50 text-green-700'
                        : isOverdue
                          ? 'bg-red-50 text-red-700'
                          : 'bg-yellow-50 text-yellow-700'
                    }`}
                  >
                    {note.followup_completed ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Follow-up Complete
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4" />
                        {isOverdue ? 'Overdue' : 'Follow-up'}{' '}
                        {note.followup_date &&
                          new Date(note.followup_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="card p-12 text-center text-gray-400">
            {search || categoryFilter !== 'all' || showFollowupsOnly
              ? 'No case notes found matching your filters.'
              : 'No case notes yet. Add your first note to get started.'}
          </div>
        )}
      </div>
    </div>
  );
}

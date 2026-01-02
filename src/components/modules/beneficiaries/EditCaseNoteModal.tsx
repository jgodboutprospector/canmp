'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { Loader2, Trash2, CheckCircle, Clock, History } from 'lucide-react';
import { logUpdate, logDelete } from '@/lib/audit';
import { useEntityAuditLogs } from '@/lib/hooks/useAuditLogs';
import { formatAction, getActionColor } from '@/lib/audit';
import { format } from 'date-fns';
import type { CaseNote, CaseNoteVisibility } from '@/types/database';

interface EditCaseNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  note: CaseNote & {
    household?: { name: string } | null;
    beneficiary?: { first_name: string; last_name: string } | null;
    author?: { first_name: string; last_name: string } | null;
  };
}

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'housing', label: 'Housing' },
  { value: 'employment', label: 'Employment' },
  { value: 'education', label: 'Education' },
  { value: 'health', label: 'Health' },
  { value: 'legal', label: 'Legal' },
  { value: 'financial', label: 'Financial' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'childcare', label: 'Childcare' },
];

const VISIBILITY_OPTIONS = [
  { value: 'all_staff', label: 'All Staff' },
  { value: 'coordinators_only', label: 'Coordinators Only' },
  { value: 'private', label: 'Private (Only Me)' },
];

export function EditCaseNoteModal({
  isOpen,
  onClose,
  onSuccess,
  note,
}: EditCaseNoteModalProps) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'history'>('edit');

  const [form, setForm] = useState({
    content: note.content || '',
    category: note.category || 'general',
    visibility: note.visibility || 'all_staff',
    is_followup_required: note.is_followup_required || false,
    followup_date: note.followup_date || '',
    followup_completed: note.followup_completed || false,
  });

  // Fetch audit history for this note
  const { logs: auditLogs, loading: loadingHistory } = useEntityAuditLogs('case_note', note.id, 50);

  useEffect(() => {
    if (isOpen) {
      // Reset form to note values
      setForm({
        content: note.content || '',
        category: note.category || 'general',
        visibility: note.visibility || 'all_staff',
        is_followup_required: note.is_followup_required || false,
        followup_date: note.followup_date || '',
        followup_completed: note.followup_completed || false,
      });
      setShowDeleteConfirm(false);
      setActiveTab('edit');
      setError('');
    }
  }, [isOpen, note]);

  function handleClose() {
    setShowDeleteConfirm(false);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const oldValues = {
        content: note.content,
        category: note.category,
        visibility: note.visibility,
        is_followup_required: note.is_followup_required,
        followup_date: note.followup_date,
        followup_completed: note.followup_completed,
      };

      const newValues = {
        content: form.content.trim(),
        category: form.category,
        visibility: form.visibility as CaseNoteVisibility,
        is_followup_required: form.is_followup_required,
        followup_date: form.is_followup_required && form.followup_date ? form.followup_date : null,
        followup_completed: form.followup_completed,
      };

      const { error } = await (supabase as any)
        .from('case_notes')
        .update(newValues)
        .eq('id', note.id);

      if (error) throw error;

      // Log audit entry
      await logUpdate(
        'case_note',
        note.id,
        `Note for ${note.household?.name || 'Unknown'}`,
        oldValues,
        newValues
      );

      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update case note');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError('');

    try {
      const oldValues = {
        content: note.content,
        category: note.category,
        visibility: note.visibility,
        is_followup_required: note.is_followup_required,
        followup_date: note.followup_date,
        followup_completed: note.followup_completed,
        is_active: true,
      };

      // Soft delete by setting a flag or actually delete
      const { error } = await (supabase as any)
        .from('case_notes')
        .delete()
        .eq('id', note.id);

      if (error) throw error;

      // Log audit entry
      await logDelete(
        'case_note',
        note.id,
        `Note for ${note.household?.name || 'Unknown'}`,
        oldValues
      );

      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete case note');
    } finally {
      setDeleting(false);
    }
  }

  async function handleMarkComplete() {
    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('case_notes')
        .update({ followup_completed: true })
        .eq('id', note.id);

      if (error) throw error;

      await logUpdate(
        'case_note',
        note.id,
        `Note for ${note.household?.name || 'Unknown'}`,
        { followup_completed: false },
        { followup_completed: true }
      );

      setForm({ ...form, followup_completed: true });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as complete');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit Case Note" size="lg">
      {/* Tabs */}
      <div className="px-6 border-b border-gray-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('edit')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'edit'
                ? 'border-canmp-green-500 text-canmp-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Edit Note
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${
              activeTab === 'history'
                ? 'border-canmp-green-500 text-canmp-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <History className="w-4 h-4" />
            History
          </button>
        </nav>
      </div>

      {activeTab === 'edit' ? (
        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Context Info */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Household</p>
                <p className="font-medium text-gray-900">{note.household?.name || 'Unknown'}</p>
              </div>
              {note.beneficiary && (
                <div className="text-right">
                  <p className="text-sm text-gray-500">Individual</p>
                  <p className="font-medium text-gray-900">
                    {note.beneficiary.first_name} {note.beneficiary.last_name}
                  </p>
                </div>
              )}
            </div>
            {note.author && (
              <p className="text-xs text-gray-400 mt-2">
                Created by {note.author.first_name} {note.author.last_name} on{' '}
                {format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="input"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
              <select
                value={form.visibility}
                onChange={(e) => setForm({ ...form, visibility: e.target.value as CaseNoteVisibility })}
                className="input"
              >
                {VISIBILITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note Content <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Enter the case note details..."
              className="input"
              rows={5}
              required
            />
          </div>

          {/* Follow-up Section */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_followup_required}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      is_followup_required: e.target.checked,
                      followup_date: e.target.checked ? form.followup_date : '',
                    })
                  }
                  className="rounded border-gray-300 text-canmp-green-600 focus:ring-canmp-green-500"
                />
                <span className="text-sm font-medium text-gray-700">Follow-up required</span>
              </label>

              {form.is_followup_required && !form.followup_completed && (
                <button
                  type="button"
                  onClick={handleMarkComplete}
                  disabled={loading}
                  className="text-sm text-canmp-green-600 hover:text-canmp-green-700 flex items-center gap-1"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark Complete
                </button>
              )}

              {form.followup_completed && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Completed
                </span>
              )}
            </div>

            {form.is_followup_required && (
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={form.followup_date}
                    onChange={(e) => setForm({ ...form, followup_date: e.target.value })}
                    className="input"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-6">
                  <input
                    type="checkbox"
                    checked={form.followup_completed}
                    onChange={(e) => setForm({ ...form, followup_completed: e.target.checked })}
                    className="rounded border-gray-300 text-canmp-green-600 focus:ring-canmp-green-500"
                  />
                  <span className="text-sm text-gray-700">Completed</span>
                </label>
              </div>
            )}
          </div>

          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700 font-medium mb-3">
                Are you sure you want to delete this case note? This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 flex items-center gap-1"
                >
                  {deleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Yes, Delete
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !form.content.trim()}
                className="btn-primary"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </form>
      ) : (
        /* History Tab */
        <div className="px-6 pb-6 pt-4">
          {loadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Loading history...</span>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No edit history available
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {auditLogs.map((log) => (
                <div key={log.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                        {formatAction(log.action)}
                      </span>
                      <span className="text-sm text-gray-600">
                        by {log.user_name || 'System'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>

                  {log.changes && Object.keys(log.changes).length > 0 && (
                    <div className="mt-2 text-sm">
                      {Object.entries(log.changes).map(([field, change]) => (
                        <div key={field} className="text-gray-600">
                          <span className="font-medium">{field.replace(/_/g, ' ')}</span>:{' '}
                          <span className="text-red-600 line-through">
                            {String((change as any).from || 'empty')}
                          </span>{' '}
                          →{' '}
                          <span className="text-green-600">
                            {String((change as any).to || 'empty')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

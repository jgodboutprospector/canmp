'use client';

import { useState, useEffect } from 'react';
import {
  Loader2,
  User,
  BookOpen,
  Calendar,
  Award,
  FileText,
  GraduationCap,
  Car,
  Baby,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import FileUpload from '@/components/ui/FileUpload';
import DocumentList from '@/components/ui/DocumentList';
import { uploadFile } from '@/lib/storage';

interface Enrollment {
  id: string;
  enrolled_date: string;
  status: string;
  pre_test_score: number | null;
  post_test_score: number | null;
  completion_date: string | null;
  needs_transportation: boolean;
  needs_childcare: boolean;
  notes: string | null;
  beneficiary: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
  } | null;
  section: {
    id: string;
    name: string;
    level: string;
    teacher: {
      first_name: string;
      last_name: string;
    } | null;
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

interface Props {
  enrollmentId: string;
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  onDelete?: () => void;
}

export default function EnrollmentDetailModal({
  enrollmentId,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'certificates'>('overview');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit form
  const [editForm, setEditForm] = useState({
    pre_test_score: '',
    post_test_score: '',
    status: '',
    notes: '',
  });

  useEffect(() => {
    if (isOpen && enrollmentId) {
      fetchEnrollment();
      fetchDocuments();
    }
  }, [isOpen, enrollmentId]);

  async function fetchEnrollment() {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('class_enrollments')
        .select(`
          *,
          beneficiary:beneficiaries(id, first_name, last_name, email, phone),
          section:class_sections(id, name, level, teacher:teachers(first_name, last_name))
        `)
        .eq('id', enrollmentId)
        .single();

      if (error) throw error;
      setEnrollment(data);
      setEditForm({
        pre_test_score: data.pre_test_score?.toString() || '',
        post_test_score: data.post_test_score?.toString() || '',
        status: data.status || 'active',
        notes: data.notes || '',
      });
    } catch (err) {
      console.error('Error fetching enrollment:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchDocuments() {
    try {
      const { data, error } = await (supabase as any)
        .from('documents')
        .select('*')
        .eq('class_enrollment_id', enrollmentId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
    }
  }

  async function handleDocumentUpload(file: File): Promise<boolean> {
    const result = await uploadFile(file, 'certificates', enrollmentId, 'certificate');
    if (!result.success) return false;

    try {
      const { error } = await (supabase as any).from('documents').insert({
        file_name: result.fileName,
        original_file_name: file.name,
        storage_path: result.path,
        file_size: file.size,
        mime_type: file.type,
        category: 'certificate',
        class_enrollment_id: enrollmentId,
        beneficiary_id: enrollment?.beneficiary?.id,
      });

      if (error) throw error;
      await fetchDocuments();
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
      await fetchDocuments();
    } catch (err) {
      console.error('Error deleting document:', err);
    }
  }

  async function saveEnrollment() {
    setSaving(true);
    try {
      const updates: Record<string, any> = {
        pre_test_score: editForm.pre_test_score ? parseFloat(editForm.pre_test_score) : null,
        post_test_score: editForm.post_test_score ? parseFloat(editForm.post_test_score) : null,
        status: editForm.status,
        notes: editForm.notes || null,
      };

      // Set completion date if status changed to completed
      if (editForm.status === 'completed' && enrollment?.status !== 'completed') {
        updates.completion_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await (supabase as any)
        .from('class_enrollments')
        .update(updates)
        .eq('id', enrollmentId);

      if (error) throw error;
      await fetchEnrollment();
      onSave?.();
    } catch (err) {
      console.error('Error saving enrollment:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteEnrollment() {
    setDeleting(true);
    try {
      const response = await fetch(`/api/language?type=enrollments&id=${enrollmentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to drop enrollment');
      }

      onDelete?.();
      onClose();
    } catch (err) {
      console.error('Error deleting enrollment:', err);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Enrollment Details" size="lg">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-canmp-green-500" />
        </div>
      </Modal>
    );
  }

  if (!enrollment) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${enrollment.beneficiary?.first_name} ${enrollment.beneficiary?.last_name}`}
      size="lg"
    >
      {/* Tabs */}
      <div className="border-b border-gray-200 px-6">
        <nav className="flex gap-0 -mb-px">
          {[
            { id: 'overview', label: 'Overview', icon: User },
            { id: 'certificates', label: 'Certificates', icon: Award },
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
              {tab.id === 'certificates' && documents.length > 0 && (
                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                  {documents.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Class Info */}
            <div className="bg-canmp-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-canmp-green-700 mb-2">
                <BookOpen className="w-4 h-4" />
                <span className="text-sm font-medium">Class</span>
              </div>
              <p className="text-gray-900 font-medium">{enrollment.section?.name}</p>
              <p className="text-sm text-gray-600 capitalize">
                {enrollment.section?.level} Level
                {enrollment.section?.teacher && (
                  <> • {enrollment.section.teacher.first_name} {enrollment.section.teacher.last_name}</>
                )}
              </p>
            </div>

            {/* Enrollment Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <Calendar className="w-3 h-3" />
                  Enrolled
                </div>
                <p className="font-medium text-gray-900">
                  {format(new Date(enrollment.enrolled_date), 'MMM d, yyyy')}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Status</div>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="input text-sm py-1"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="withdrawn">Withdrawn</option>
                  <option value="on_hold">On Hold</option>
                </select>
              </div>
            </div>

            {/* Test Scores */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <GraduationCap className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-gray-900">Test Scores</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Pre-Test Score</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editForm.pre_test_score}
                      onChange={(e) => setEditForm({ ...editForm, pre_test_score: e.target.value })}
                      className="input"
                      placeholder="0-100"
                    />
                    <span className="text-gray-500">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Post-Test Score</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editForm.post_test_score}
                      onChange={(e) => setEditForm({ ...editForm, post_test_score: e.target.value })}
                      className="input"
                      placeholder="0-100"
                    />
                    <span className="text-gray-500">%</span>
                  </div>
                </div>
              </div>
              {editForm.pre_test_score && editForm.post_test_score && (
                <div className="mt-3 p-2 bg-blue-50 rounded text-sm text-blue-700">
                  Improvement: {(parseFloat(editForm.post_test_score) - parseFloat(editForm.pre_test_score)).toFixed(0)} points
                </div>
              )}
            </div>

            {/* Needs */}
            <div className="flex gap-4">
              {enrollment.needs_transportation && (
                <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 text-orange-700 rounded-lg text-sm">
                  <Car className="w-4 h-4" />
                  Needs Transportation
                </div>
              )}
              {enrollment.needs_childcare && (
                <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm">
                  <Baby className="w-4 h-4" />
                  Needs Childcare
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                className="input"
                rows={3}
                placeholder="Add notes about this enrollment..."
              />
            </div>

            {/* Completion Info */}
            {enrollment.completion_date && (
              <div className="bg-green-50 rounded-lg p-4 flex items-center gap-3">
                <Award className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">Course Completed</p>
                  <p className="text-sm text-green-600">
                    {format(new Date(enrollment.completion_date), 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end pt-2">
              <button onClick={saveEnrollment} disabled={saving} className="btn-primary">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {/* Certificates Tab */}
        {activeTab === 'certificates' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Upload certificates, diplomas, and completion documents for this student
            </p>

            <FileUpload
              onUpload={handleDocumentUpload}
              accept=".pdf,.jpg,.jpeg,.png"
              category="certificate"
              label="Upload Certificate"
              hint="PDF or image files up to 10MB"
            />

            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Uploaded Certificates ({documents.length})
              </h4>
              <DocumentList
                documents={documents}
                onDelete={handleDocumentDelete}
                showCategory={true}
                showVerification={true}
                emptyMessage="No certificates uploaded yet"
              />
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="mx-6 mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700 mb-3">
            Are you sure you want to drop this enrollment? The student&apos;s status will be changed to &quot;dropped&quot;.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDeleteEnrollment}
              disabled={deleting}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm disabled:opacity-50 flex items-center gap-1"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              {deleting ? 'Dropping...' : 'Yes, Drop Enrollment'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleting}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Drop Enrollment
        </button>
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

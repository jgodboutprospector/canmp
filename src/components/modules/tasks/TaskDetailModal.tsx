'use client';

import { useState } from 'react';
import { X, Trash2, Calendar, User, Tag, Clock, MessageSquare, Save, Edit2 } from 'lucide-react';
import { Task, UpdateTaskInput, TaskStatus, TaskPriority, useTaskOptions } from '@/lib/hooks/useTasksData';
import { cn } from '@/lib/utils';

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
  onUpdate: (input: UpdateTaskInput) => Promise<void>;
  onDelete: () => Promise<void>;
}

const statusLabels: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

export default function TaskDetailModal({ task, onClose, onUpdate, onDelete }: TaskDetailModalProps) {
  const { users, beneficiaries, volunteers, classes, events, properties, loading: optionsLoading } = useTaskOptions();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [formData, setFormData] = useState({
    title: task.title,
    description: task.description || '',
    notes: task.notes || '',
    status: task.status,
    priority: task.priority,
    due_date: task.due_date || '',
    assignee_id: task.assignee_id || '',
    beneficiary_id: task.beneficiary_id || '',
    volunteer_id: task.volunteer_id || '',
    class_section_id: task.class_section_id || '',
    event_id: task.event_id || '',
    property_id: task.property_id || '',
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const input: UpdateTaskInput = {
        id: task.id,
        title: formData.title,
        description: formData.description || undefined,
        notes: formData.notes || undefined,
        status: formData.status,
        priority: formData.priority,
        due_date: formData.due_date || null,
        assignee_id: formData.assignee_id || null,
        beneficiary_id: formData.beneficiary_id || null,
        volunteer_id: formData.volunteer_id || null,
        class_section_id: formData.class_section_id || null,
        event_id: formData.event_id || null,
        property_id: formData.property_id || null,
      };
      await onUpdate(input);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = async (newStatus: TaskStatus) => {
    setSaving(true);
    try {
      await onUpdate({ id: task.id, status: newStatus });
      setFormData({ ...formData, status: newStatus });
    } finally {
      setSaving(false);
    }
  };

  const getTagInfo = () => {
    if (task.beneficiary) return { label: `${task.beneficiary.first_name} ${task.beneficiary.last_name}`, type: 'Beneficiary', color: 'bg-emerald-100 text-emerald-700' };
    if (task.volunteer) return { label: `${task.volunteer.first_name} ${task.volunteer.last_name}`, type: 'Volunteer', color: 'bg-purple-100 text-purple-700' };
    if (task.class_section) return { label: task.class_section.name, type: 'Class', color: 'bg-blue-100 text-blue-700' };
    if (task.event) return { label: task.event.title, type: 'Event', color: 'bg-pink-100 text-pink-700' };
    if (task.property) return { label: task.property.name, type: 'Property', color: 'bg-amber-100 text-amber-700' };
    if (task.household) return { label: task.household.name, type: 'Household', color: 'bg-cyan-100 text-cyan-700' };
    return null;
  };

  const tagInfo = getTagInfo();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Edit task"
              >
                <Edit2 className="w-4 h-4 text-gray-500" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                className="p-2 hover:bg-canmp-green-100 rounded-lg transition-colors"
                title="Save changes"
              >
                <Save className="w-4 h-4 text-canmp-green-600" />
              </button>
            )}
            <span className={cn('px-2 py-1 rounded text-xs font-medium', priorityColors[task.priority])}>
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 hover:bg-red-100 rounded-lg transition-colors"
              title="Delete task"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Title */}
          {isEditing ? (
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full text-xl font-semibold px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-canmp-green-500 focus:border-transparent"
            />
          ) : (
            <h2 className="text-xl font-semibold text-gray-900">{task.title}</h2>
          )}

          {/* Status Pills */}
          <div className="flex flex-wrap gap-2">
            {(['backlog', 'todo', 'in_progress', 'review', 'done'] as TaskStatus[]).map(status => (
              <button
                key={status}
                onClick={() => !isEditing && handleStatusChange(status)}
                disabled={saving}
                className={cn(
                  'px-3 py-1 rounded-full text-sm font-medium transition-colors',
                  (isEditing ? formData.status : task.status) === status
                    ? 'bg-canmp-green-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {statusLabels[status]}
              </button>
            ))}
          </div>

          {/* Meta Info */}
          <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-100">
            {/* Due Date */}
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Due Date</p>
                {isEditing ? (
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="text-sm px-2 py-1 border border-gray-200 rounded"
                  />
                ) : (
                  <p className="text-sm font-medium text-gray-900">
                    {task.due_date
                      ? new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'No due date'}
                  </p>
                )}
              </div>
            </div>

            {/* Assignee */}
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Assignee</p>
                {isEditing ? (
                  <select
                    value={formData.assignee_id}
                    onChange={(e) => setFormData({ ...formData, assignee_id: e.target.value })}
                    className="text-sm px-2 py-1 border border-gray-200 rounded"
                    disabled={optionsLoading}
                  >
                    <option value="">Unassigned</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm font-medium text-gray-900">
                    {task.assignee
                      ? `${task.assignee.first_name} ${task.assignee.last_name}`
                      : 'Unassigned'}
                  </p>
                )}
              </div>
            </div>

            {/* Created By */}
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Created By</p>
                <p className="text-sm font-medium text-gray-900">
                  {task.created_by
                    ? `${task.created_by.first_name} ${task.created_by.last_name}`
                    : 'Unknown'}
                </p>
              </div>
            </div>

            {/* Created At */}
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Created</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>

          {/* Tag */}
          {(tagInfo || isEditing) && (
            <div className="flex items-start gap-3">
              <Tag className="w-5 h-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Linked To</p>
                {isEditing ? (
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={formData.beneficiary_id}
                      onChange={(e) => setFormData({ ...formData, beneficiary_id: e.target.value })}
                      className="text-sm px-2 py-1 border border-gray-200 rounded"
                    >
                      <option value="">No beneficiary</option>
                      {beneficiaries.map(b => (
                        <option key={b.id} value={b.id}>{b.first_name} {b.last_name}</option>
                      ))}
                    </select>
                    <select
                      value={formData.volunteer_id}
                      onChange={(e) => setFormData({ ...formData, volunteer_id: e.target.value })}
                      className="text-sm px-2 py-1 border border-gray-200 rounded"
                    >
                      <option value="">No volunteer</option>
                      {volunteers.map(v => (
                        <option key={v.id} value={v.id}>{v.first_name} {v.last_name}</option>
                      ))}
                    </select>
                    <select
                      value={formData.class_section_id}
                      onChange={(e) => setFormData({ ...formData, class_section_id: e.target.value })}
                      className="text-sm px-2 py-1 border border-gray-200 rounded"
                    >
                      <option value="">No class</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <select
                      value={formData.event_id}
                      onChange={(e) => setFormData({ ...formData, event_id: e.target.value })}
                      className="text-sm px-2 py-1 border border-gray-200 rounded"
                    >
                      <option value="">No event</option>
                      {events.map(ev => (
                        <option key={ev.id} value={ev.id}>{ev.title}</option>
                      ))}
                    </select>
                  </div>
                ) : tagInfo ? (
                  <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium', tagInfo.color)}>
                    {tagInfo.type}: {tagInfo.label}
                  </span>
                ) : (
                  <span className="text-sm text-gray-500">No linked items</span>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            {isEditing ? (
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-canmp-green-500 focus:border-transparent"
                placeholder="Add a description..."
              />
            ) : (
              <p className="text-gray-600 whitespace-pre-wrap">
                {task.description || 'No description'}
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MessageSquare className="w-4 h-4 inline mr-1" />
              Running Notes
            </label>
            {isEditing ? (
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-canmp-green-500 focus:border-transparent"
                placeholder="Add notes..."
              />
            ) : (
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 whitespace-pre-wrap min-h-[80px]">
                {task.notes || 'No notes yet'}
              </div>
            )}
          </div>

          {/* Edit Actions */}
          {isEditing && (
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setFormData({
                    title: task.title,
                    description: task.description || '',
                    notes: task.notes || '',
                    status: task.status,
                    priority: task.priority,
                    due_date: task.due_date || '',
                    assignee_id: task.assignee_id || '',
                    beneficiary_id: task.beneficiary_id || '',
                    volunteer_id: task.volunteer_id || '',
                    class_section_id: task.class_section_id || '',
                    event_id: task.event_id || '',
                    property_id: task.property_id || '',
                  });
                  setIsEditing(false);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className={cn(
                  'px-4 py-2 bg-canmp-green-500 text-white rounded-lg transition-colors',
                  saving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-canmp-green-600'
                )}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Task?</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete &quot;{task.title}&quot;? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

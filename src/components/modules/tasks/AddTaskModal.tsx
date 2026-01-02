'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { CreateTaskInput, TaskStatus, TaskPriority, useTaskOptions } from '@/lib/hooks/useTasksData';
import { cn } from '@/lib/utils';

interface AddTaskModalProps {
  onClose: () => void;
  onCreate: (input: CreateTaskInput) => Promise<void>;
  defaultDueDate?: string;
  defaultStatus?: TaskStatus;
}

export default function AddTaskModal({ onClose, onCreate, defaultDueDate, defaultStatus = 'todo' }: AddTaskModalProps) {
  const { users, beneficiaries, volunteers, classes, events, properties, loading: optionsLoading } = useTaskOptions();
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<CreateTaskInput>({
    title: '',
    description: '',
    notes: '',
    status: defaultStatus,
    priority: 'medium',
    due_date: defaultDueDate || '',
    assignee_id: '',
    beneficiary_id: '',
    volunteer_id: '',
    class_section_id: '',
    event_id: '',
    property_id: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setSaving(true);
    try {
      const input: CreateTaskInput = {
        title: formData.title,
        status: formData.status,
        priority: formData.priority,
      };

      if (formData.description) input.description = formData.description;
      if (formData.notes) input.notes = formData.notes;
      if (formData.due_date) input.due_date = formData.due_date;
      if (formData.assignee_id) input.assignee_id = formData.assignee_id;
      if (formData.beneficiary_id) input.beneficiary_id = formData.beneficiary_id;
      if (formData.volunteer_id) input.volunteer_id = formData.volunteer_id;
      if (formData.class_section_id) input.class_section_id = formData.class_section_id;
      if (formData.event_id) input.event_id = formData.event_id;
      if (formData.property_id) input.property_id = formData.property_id;

      await onCreate(input);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Create New Task</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter task title..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-canmp-green-500 focus:border-transparent"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add a description..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-canmp-green-500 focus:border-transparent"
            />
          </div>

          {/* Status and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-canmp-green-500 focus:border-transparent"
              >
                <option value="backlog">Backlog</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-canmp-green-500 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Due Date and Assignee */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-canmp-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assignee
              </label>
              <select
                value={formData.assignee_id}
                onChange={(e) => setFormData({ ...formData, assignee_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-canmp-green-500 focus:border-transparent"
                disabled={optionsLoading}
              >
                <option value="">Unassigned</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags Section */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Link to (optional)</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Beneficiary */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Beneficiary
                </label>
                <select
                  value={formData.beneficiary_id}
                  onChange={(e) => setFormData({ ...formData, beneficiary_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-canmp-green-500 focus:border-transparent text-sm"
                  disabled={optionsLoading}
                >
                  <option value="">None</option>
                  {beneficiaries.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.first_name} {b.last_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Volunteer */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Volunteer
                </label>
                <select
                  value={formData.volunteer_id}
                  onChange={(e) => setFormData({ ...formData, volunteer_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-canmp-green-500 focus:border-transparent text-sm"
                  disabled={optionsLoading}
                >
                  <option value="">None</option>
                  {volunteers.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.first_name} {v.last_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Class
                </label>
                <select
                  value={formData.class_section_id}
                  onChange={(e) => setFormData({ ...formData, class_section_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-canmp-green-500 focus:border-transparent text-sm"
                  disabled={optionsLoading}
                >
                  <option value="">None</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Event */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Event
                </label>
                <select
                  value={formData.event_id}
                  onChange={(e) => setFormData({ ...formData, event_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-canmp-green-500 focus:border-transparent text-sm"
                  disabled={optionsLoading}
                >
                  <option value="">None</option>
                  {events.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Property */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Property
                </label>
                <select
                  value={formData.property_id}
                  onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-canmp-green-500 focus:border-transparent text-sm"
                  disabled={optionsLoading}
                >
                  <option value="">None</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add running notes..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-canmp-green-500 focus:border-transparent"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formData.title.trim()}
              className={cn(
                'px-4 py-2 bg-canmp-green-500 text-white rounded-lg transition-colors',
                saving || !formData.title.trim()
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-canmp-green-600'
              )}
            >
              {saving ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

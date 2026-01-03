'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import {
  Loader2,
  Wrench,
  MapPin,
  Calendar,
  User,
  DollarSign,
  Trash2,
  AlertTriangle,
  Check,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { cn, getCategoryEmoji, getWorkOrderStatusLabel, getStatusBadgeVariant, getPriorityBadgeVariant } from '@/lib/utils';
import type { WorkOrderCategory, WorkOrderPriority, WorkOrderStatus } from '@/types/database';

interface WorkOrder {
  id: string;
  title: string;
  description: string | null;
  category: WorkOrderCategory;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  reported_date: string;
  scheduled_date: string | null;
  completed_date: string | null;
  assigned_to: string | null;
  cost: number | null;
  notes: string | null;
  property: {
    id: string;
    name: string;
    address_street: string;
  } | null;
  unit: {
    id: string;
    unit_number: string;
  } | null;
}

interface WorkOrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrderId: string;
  onDelete?: () => void;
  onUpdate?: () => void;
}

const CATEGORIES: { value: WorkOrderCategory; label: string }[] = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'appliance', label: 'Appliance' },
  { value: 'structural', label: 'Structural' },
  { value: 'safety', label: 'Safety' },
  { value: 'pest', label: 'Pest Control' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'other', label: 'Other' },
];

const PRIORITIES: { value: WorkOrderPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const STATUSES: { value: WorkOrderStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function WorkOrderDetailModal({ isOpen, onClose, workOrderId, onDelete, onUpdate }: WorkOrderDetailModalProps) {
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'other' as WorkOrderCategory,
    priority: 'medium' as WorkOrderPriority,
    status: 'open' as WorkOrderStatus,
    assigned_to: '',
    scheduled_date: '',
    completed_date: '',
    cost: '',
    notes: '',
  });

  useEffect(() => {
    if (isOpen && workOrderId) {
      fetchWorkOrder();
    }
  }, [isOpen, workOrderId]);

  async function fetchWorkOrder() {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('work_orders')
        .select(`
          *,
          property:properties(id, name, address_street),
          unit:units(id, unit_number)
        `)
        .eq('id', workOrderId)
        .single();

      if (error) throw error;
      setWorkOrder(data);
      setForm({
        title: data.title || '',
        description: data.description || '',
        category: data.category || 'other',
        priority: data.priority || 'medium',
        status: data.status || 'open',
        assigned_to: data.assigned_to || '',
        scheduled_date: data.scheduled_date || '',
        completed_date: data.completed_date || '',
        cost: data.cost?.toString() || '',
        notes: data.notes || '',
      });
    } catch (err) {
      console.error('Error fetching work order:', err);
    } finally {
      setLoading(false);
    }
  }

  async function saveWorkOrder() {
    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category,
        priority: form.priority,
        status: form.status,
        assigned_to: form.assigned_to.trim() || null,
        scheduled_date: form.scheduled_date || null,
        completed_date: form.completed_date || null,
        cost: form.cost ? parseFloat(form.cost) : null,
        notes: form.notes.trim() || null,
      };

      // Auto-set completed date when status changes to completed
      if (form.status === 'completed' && !form.completed_date) {
        updateData.completed_date = format(new Date(), 'yyyy-MM-dd');
      }

      const { error } = await (supabase as any)
        .from('work_orders')
        .update(updateData)
        .eq('id', workOrderId);

      if (error) throw error;

      await fetchWorkOrder();
      setEditing(false);
      onUpdate?.();
    } catch (err) {
      console.error('Error saving work order:', err);
    } finally {
      setSaving(false);
    }
  }

  async function deleteWorkOrder() {
    setDeleting(true);
    try {
      const { error } = await (supabase as any)
        .from('work_orders')
        .delete()
        .eq('id', workOrderId);

      if (error) throw error;

      onClose();
      onDelete?.();
    } catch (err) {
      console.error('Error deleting work order:', err);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Work Order Details" size="lg">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-canmp-green-500" />
        </div>
      </Modal>
    );
  }

  if (!workOrder) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${getCategoryEmoji(workOrder.category)} ${workOrder.title}`}
      size="lg"
    >
      <div className="px-6 pb-6">
        {!editing ? (
          // View Mode
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex gap-2">
                <span className={`badge badge-${getPriorityBadgeVariant(workOrder.priority)}`}>
                  {workOrder.priority.charAt(0).toUpperCase() + workOrder.priority.slice(1)}
                </span>
                <span className={`badge badge-${getStatusBadgeVariant(workOrder.status)}`}>
                  {getWorkOrderStatusLabel(workOrder.status)}
                </span>
              </div>
              <button
                onClick={() => setEditing(true)}
                className="text-sm text-canmp-green-600 hover:underline"
              >
                Edit Details
              </button>
            </div>

            {workOrder.description && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-500 mb-1">Description</p>
                <p className="text-gray-900">{workOrder.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <MapPin className="w-3 h-3" />
                  Location
                </div>
                <p className="font-medium text-gray-900">
                  {workOrder.property?.name || 'Not specified'}
                  {workOrder.unit && ` - Unit ${workOrder.unit.unit_number}`}
                </p>
                {workOrder.property?.address_street && (
                  <p className="text-sm text-gray-500">{workOrder.property.address_street}</p>
                )}
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <Wrench className="w-3 h-3" />
                  Category
                </div>
                <p className="font-medium text-gray-900 capitalize">{workOrder.category}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <Calendar className="w-3 h-3" />
                  Reported
                </div>
                <p className="font-medium text-gray-900">
                  {format(new Date(workOrder.reported_date), 'MMM d, yyyy')}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <User className="w-3 h-3" />
                  Assigned To
                </div>
                <p className="font-medium text-gray-900">
                  {workOrder.assigned_to || 'Unassigned'}
                </p>
              </div>
              {workOrder.scheduled_date && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <Clock className="w-3 h-3" />
                    Scheduled
                  </div>
                  <p className="font-medium text-gray-900">
                    {format(new Date(workOrder.scheduled_date), 'MMM d, yyyy')}
                  </p>
                </div>
              )}
              {workOrder.completed_date && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <CheckCircle className="w-3 h-3" />
                    Completed
                  </div>
                  <p className="font-medium text-gray-900">
                    {format(new Date(workOrder.completed_date), 'MMM d, yyyy')}
                  </p>
                </div>
              )}
              {workOrder.cost !== null && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <DollarSign className="w-3 h-3" />
                    Cost
                  </div>
                  <p className="font-medium text-gray-900">
                    ${workOrder.cost.toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            {workOrder.notes && (
              <div className="bg-yellow-50 rounded-lg p-3">
                <p className="text-xs text-yellow-700 font-medium mb-1">Notes</p>
                <p className="text-sm text-gray-700">{workOrder.notes}</p>
              </div>
            )}
          </div>
        ) : (
          // Edit Mode
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as WorkOrderCategory })}
                  className="input"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as WorkOrderPriority })}
                  className="input"
                >
                  {PRIORITIES.map((pri) => (
                    <option key={pri.value} value={pri.value}>{pri.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as WorkOrderStatus })}
                  className="input"
                >
                  {STATUSES.map((st) => (
                    <option key={st.value} value={st.value}>{st.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                <input
                  type="text"
                  value={form.assigned_to}
                  onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                  placeholder="Contractor or staff name"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cost</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: e.target.value })}
                    className="input pl-8"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date</label>
                <input
                  type="date"
                  value={form.scheduled_date}
                  onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Completed Date</label>
                <input
                  type="date"
                  value={form.completed_date}
                  onChange={(e) => setForm({ ...form, completed_date: e.target.value })}
                  className="input"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="input"
                rows={2}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setEditing(false);
                  // Reset form to current values
                  if (workOrder) {
                    setForm({
                      title: workOrder.title || '',
                      description: workOrder.description || '',
                      category: workOrder.category || 'other',
                      priority: workOrder.priority || 'medium',
                      status: workOrder.status || 'open',
                      assigned_to: workOrder.assigned_to || '',
                      scheduled_date: workOrder.scheduled_date || '',
                      completed_date: workOrder.completed_date || '',
                      cost: workOrder.cost?.toString() || '',
                      notes: workOrder.notes || '',
                    });
                  }
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button onClick={saveWorkOrder} disabled={saving} className="btn-primary">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-red-800">Delete Work Order?</h4>
                <p className="text-sm text-red-600 mt-1">
                  This will permanently delete this work order. This action cannot be undone.
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 text-sm bg-white text-gray-700 rounded border border-gray-300 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={deleteWorkOrder}
                    disabled={deleting}
                    className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
                  >
                    {deleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
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

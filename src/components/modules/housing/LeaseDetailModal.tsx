'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { format, startOfMonth, addMonths, subMonths } from 'date-fns';
import {
  Loader2,
  DollarSign,
  FileText,
  Check,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Home,
  Edit2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import FileUpload from '@/components/ui/FileUpload';
import DocumentList from '@/components/ui/DocumentList';
import { uploadFile } from '@/lib/storage';

interface Lease {
  id: string;
  monthly_rent: number;
  subsidy_amount: number;
  tenant_pays: number;
  start_date: string;
  end_date: string | null;
  status: string;
  lease_type: string;
  household: {
    id: string;
    name: string;
  } | null;
  unit: {
    id: string;
    unit_number: string;
    property: {
      id: string;
      name: string;
      address_street: string;
    } | null;
  } | null;
}

interface RentLedger {
  id: string;
  ledger_month: string;
  rent_due_from_tenant: number;
  rent_due_to_landlord: number;
  amount_collected_from_tenant: number;
  collection_date: string | null;
  collection_method: string | null;
  amount_paid_to_landlord: number;
  landlord_payment_date: string | null;
  landlord_payment_method: string | null;
  tenant_paid: boolean;
  landlord_paid: boolean;
  notes: string | null;
}

interface LeaseDocument {
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

interface LeaseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaseId: string;
  onDelete?: () => void;
}

const DOCUMENT_TYPES = [
  { value: 'lease_agreement', label: 'Lease Agreement' },
  { value: 'amendment', label: 'Amendment' },
  { value: 'addendum', label: 'Addendum' },
  { value: 'move_in_checklist', label: 'Move-In Checklist' },
  { value: 'move_out_checklist', label: 'Move-Out Checklist' },
  { value: 'notice', label: 'Notice' },
  { value: 'other', label: 'Other' },
];

export function LeaseDetailModal({ isOpen, onClose, leaseId, onDelete }: LeaseDetailModalProps) {
  const [lease, setLease] = useState<Lease | null>(null);
  const [rentLedger, setRentLedger] = useState<RentLedger[]>([]);
  const [documents, setDocuments] = useState<LeaseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'rent' | 'documents'>('overview');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Rent tracking state
  const [viewMonth, setViewMonth] = useState(startOfMonth(new Date()));
  const [currentEntry, setCurrentEntry] = useState<RentLedger | null>(null);
  const [saving, setSaving] = useState(false);

  // Lease editing state
  const [editingLease, setEditingLease] = useState(false);
  const [leaseForm, setLeaseForm] = useState({
    monthly_rent: 0,
    subsidy_amount: 0,
    start_date: '',
    end_date: '',
    status: '',
    lease_type: '',
    notes: '',
  });

  // Payment entry form
  const [paymentForm, setPaymentForm] = useState({
    amount_collected_from_tenant: 0,
    collection_method: 'cash',
    amount_paid_to_landlord: 0,
    landlord_payment_method: 'check',
    notes: '',
  });

  useEffect(() => {
    if (isOpen && leaseId) {
      fetchLease();
      fetchRentLedger();
      fetchDocuments();
    }
  }, [isOpen, leaseId]);

  useEffect(() => {
    // Find entry for current view month
    const monthStr = format(viewMonth, 'yyyy-MM-01');
    const entry = rentLedger.find((r) => r.ledger_month === monthStr);
    setCurrentEntry(entry || null);
    if (entry) {
      setPaymentForm({
        amount_collected_from_tenant: entry.amount_collected_from_tenant,
        collection_method: entry.collection_method || 'cash',
        amount_paid_to_landlord: entry.amount_paid_to_landlord,
        landlord_payment_method: entry.landlord_payment_method || 'check',
        notes: entry.notes || '',
      });
    } else {
      setPaymentForm({
        amount_collected_from_tenant: 0,
        collection_method: 'cash',
        amount_paid_to_landlord: 0,
        landlord_payment_method: 'check',
        notes: '',
      });
    }
  }, [viewMonth, rentLedger]);

  async function fetchLease() {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('leases')
        .select(`
          *,
          household:households(id, name),
          unit:units(id, unit_number, property:properties(id, name, address_street))
        `)
        .eq('id', leaseId)
        .single();

      if (error) throw error;
      setLease(data);
      // Populate the edit form
      setLeaseForm({
        monthly_rent: data.monthly_rent || 0,
        subsidy_amount: data.subsidy_amount || 0,
        start_date: data.start_date || '',
        end_date: data.end_date || '',
        status: data.status || 'active',
        lease_type: data.lease_type || 'canmp_direct',
        notes: data.notes || '',
      });
    } catch (err) {
      console.error('Error fetching lease:', err);
    } finally {
      setLoading(false);
    }
  }

  async function saveLease() {
    if (!lease) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('leases')
        .update({
          monthly_rent: leaseForm.monthly_rent,
          subsidy_amount: leaseForm.subsidy_amount,
          start_date: leaseForm.start_date,
          end_date: leaseForm.end_date || null,
          status: leaseForm.status,
          lease_type: leaseForm.lease_type,
          notes: leaseForm.notes || null,
        })
        .eq('id', leaseId);

      if (error) throw error;

      // Update local state
      setLease({
        ...lease,
        monthly_rent: leaseForm.monthly_rent,
        subsidy_amount: leaseForm.subsidy_amount,
        tenant_pays: leaseForm.monthly_rent - leaseForm.subsidy_amount,
        start_date: leaseForm.start_date,
        end_date: leaseForm.end_date || null,
        status: leaseForm.status,
        lease_type: leaseForm.lease_type,
      });
      setEditingLease(false);
    } catch (err) {
      console.error('Error saving lease:', err);
    } finally {
      setSaving(false);
    }
  }

  async function fetchRentLedger() {
    try {
      const { data, error } = await (supabase as any)
        .from('rent_ledger')
        .select('*')
        .eq('lease_id', leaseId)
        .order('ledger_month', { ascending: false });

      if (error) throw error;
      setRentLedger(data || []);
    } catch (err) {
      console.error('Error fetching rent ledger:', err);
    }
  }

  async function fetchDocuments() {
    try {
      const { data, error } = await (supabase as any)
        .from('documents')
        .select('*')
        .eq('lease_id', leaseId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
    }
  }

  async function handleDocumentUpload(file: File): Promise<boolean> {
    const result = await uploadFile(file, 'leases', leaseId, 'lease');
    if (!result.success) return false;

    try {
      const { error } = await (supabase as any).from('documents').insert({
        file_name: result.fileName,
        original_file_name: file.name,
        storage_path: result.path,
        file_size: file.size,
        mime_type: file.type,
        category: 'lease',
        lease_id: leaseId,
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

  async function saveRentEntry() {
    if (!lease) return;
    setSaving(true);

    const monthStr = format(viewMonth, 'yyyy-MM-01');

    try {
      if (currentEntry) {
        // Update existing entry
        const { error } = await (supabase as any)
          .from('rent_ledger')
          .update({
            ...paymentForm,
            collection_date:
              paymentForm.amount_collected_from_tenant > 0 ? format(new Date(), 'yyyy-MM-dd') : null,
            landlord_payment_date:
              paymentForm.amount_paid_to_landlord > 0 ? format(new Date(), 'yyyy-MM-dd') : null,
            tenant_paid: paymentForm.amount_collected_from_tenant >= (lease.tenant_pays || 0),
            landlord_paid:
              paymentForm.amount_paid_to_landlord >= (lease.monthly_rent || 0),
          })
          .eq('id', currentEntry.id);

        if (error) throw error;
      } else {
        // Create new entry
        const { error } = await (supabase as any).from('rent_ledger').insert({
          lease_id: leaseId,
          ledger_month: monthStr,
          rent_due_from_tenant: lease.tenant_pays || 0,
          rent_due_to_landlord: lease.monthly_rent || 0,
          ...paymentForm,
          collection_date:
            paymentForm.amount_collected_from_tenant > 0 ? format(new Date(), 'yyyy-MM-dd') : null,
          landlord_payment_date:
            paymentForm.amount_paid_to_landlord > 0 ? format(new Date(), 'yyyy-MM-dd') : null,
          tenant_paid: paymentForm.amount_collected_from_tenant >= (lease.tenant_pays || 0),
          landlord_paid:
            paymentForm.amount_paid_to_landlord >= (lease.monthly_rent || 0),
        });

        if (error) throw error;
      }

      await fetchRentLedger();
    } catch (err) {
      console.error('Error saving rent entry:', err);
    } finally {
      setSaving(false);
    }
  }

  async function deleteLease() {
    setDeleting(true);
    try {
      const { error } = await (supabase as any)
        .from('leases')
        .delete()
        .eq('id', leaseId);

      if (error) throw error;

      onClose();
      onDelete?.();
    } catch (err) {
      console.error('Error deleting lease:', err);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Lease Details" size="xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-canmp-green-500" />
        </div>
      </Modal>
    );
  }

  if (!lease) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Lease - ${lease.household?.name || 'Unknown'}`}
      size="xl"
    >
      <div className="px-6 pb-6">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-4">
          {(['overview', 'rent', 'documents'] as const).map((tab) => (
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
              {tab === 'rent' ? 'Rent Tracking' : tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {!editingLease ? (
              <>
                <div className="flex justify-end">
                  <button
                    onClick={() => setEditingLease(true)}
                    className="flex items-center gap-1 text-sm text-canmp-green-600 hover:underline"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Lease Details
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <Home className="w-3 h-3" />
                      Property
                    </div>
                    <p className="font-medium text-gray-900">
                      {lease.unit?.property?.name}
                      <br />
                      <span className="text-sm text-gray-500">
                        {lease.unit?.unit_number} • {lease.unit?.property?.address_street}
                      </span>
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <Calendar className="w-3 h-3" />
                      Lease Term
                    </div>
                    <p className="font-medium text-gray-900">
                      {format(new Date(lease.start_date), 'MMM d, yyyy')} -{' '}
                      {lease.end_date ? format(new Date(lease.end_date), 'MMM d, yyyy') : 'Ongoing'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <DollarSign className="w-3 h-3" />
                      Monthly Rent
                    </div>
                    <p className="font-medium text-gray-900">{formatCurrency(lease.monthly_rent)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Tenant Pays</div>
                    <p className="font-medium text-gray-900">
                      {formatCurrency(lease.tenant_pays || 0)}
                      {(lease.subsidy_amount || 0) > 0 && (
                        <span className="text-sm text-gray-500 ml-2">
                          (+{formatCurrency(lease.subsidy_amount)} subsidy)
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-canmp-green-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-xs text-canmp-green-700 font-medium mb-1">
                      <FileText className="w-3 h-3" />
                      Lease Type
                    </div>
                    <p className="font-medium text-gray-900 capitalize">
                      {lease.lease_type?.replace('_', ' ')}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Status</div>
                    <p className="font-medium text-gray-900 capitalize">{lease.status}</p>
                  </div>
                </div>
              </>
            ) : (
              // Edit Lease Form
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monthly Rent
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        value={leaseForm.monthly_rent}
                        onChange={(e) =>
                          setLeaseForm({ ...leaseForm, monthly_rent: parseFloat(e.target.value) || 0 })
                        }
                        className="input pl-8"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subsidy Amount
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        value={leaseForm.subsidy_amount}
                        onChange={(e) =>
                          setLeaseForm({ ...leaseForm, subsidy_amount: parseFloat(e.target.value) || 0 })
                        }
                        className="input pl-8"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                  Tenant pays: {formatCurrency(leaseForm.monthly_rent - leaseForm.subsidy_amount)}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={leaseForm.start_date}
                      onChange={(e) => setLeaseForm({ ...leaseForm, start_date: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={leaseForm.end_date}
                      onChange={(e) => setLeaseForm({ ...leaseForm, end_date: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lease Type
                    </label>
                    <select
                      value={leaseForm.lease_type}
                      onChange={(e) => setLeaseForm({ ...leaseForm, lease_type: e.target.value })}
                      className="input"
                    >
                      <option value="canmp_direct">CANMP Direct</option>
                      <option value="master_sublease">Master Sublease</option>
                      <option value="bridge">Bridge</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={leaseForm.status}
                      onChange={(e) => setLeaseForm({ ...leaseForm, status: e.target.value })}
                      className="input"
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="terminated">Terminated</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={leaseForm.notes}
                    onChange={(e) => setLeaseForm({ ...leaseForm, notes: e.target.value })}
                    className="input"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setEditingLease(false);
                      // Reset form to original values
                      if (lease) {
                        setLeaseForm({
                          monthly_rent: lease.monthly_rent || 0,
                          subsidy_amount: lease.subsidy_amount || 0,
                          start_date: lease.start_date || '',
                          end_date: lease.end_date || '',
                          status: lease.status || 'active',
                          lease_type: lease.lease_type || 'canmp_direct',
                          notes: '',
                        });
                      }
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button onClick={saveLease} disabled={saving} className="btn-primary">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Save Changes
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rent Tracking Tab */}
        {activeTab === 'rent' && (
          <div>
            {/* Month Navigator */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setViewMonth(subMonths(viewMonth, 1))}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="font-semibold text-gray-900">{format(viewMonth, 'MMMM yyyy')}</h3>
              <button
                onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Rent Status */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div
                className={cn(
                  'rounded-lg p-4',
                  currentEntry?.tenant_paid ? 'bg-green-50' : 'bg-gray-50'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Tenant Payment</span>
                  {currentEntry?.tenant_paid && (
                    <Check className="w-4 h-4 text-green-600" />
                  )}
                </div>
                <p className="text-lg font-semibold">
                  {formatCurrency(currentEntry?.amount_collected_from_tenant || 0)}
                  <span className="text-sm text-gray-500 font-normal">
                    {' '}
                    / {formatCurrency(lease.tenant_pays || 0)}
                  </span>
                </p>
              </div>
              <div
                className={cn(
                  'rounded-lg p-4',
                  currentEntry?.landlord_paid ? 'bg-green-50' : 'bg-gray-50'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Landlord Payment</span>
                  {currentEntry?.landlord_paid && (
                    <Check className="w-4 h-4 text-green-600" />
                  )}
                </div>
                <p className="text-lg font-semibold">
                  {formatCurrency(currentEntry?.amount_paid_to_landlord || 0)}
                  <span className="text-sm text-gray-500 font-normal">
                    {' '}
                    / {formatCurrency(lease.monthly_rent || 0)}
                  </span>
                </p>
              </div>
            </div>

            {/* Payment Entry Form */}
            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-medium text-gray-900">Record Payment</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Collected from Tenant
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      value={paymentForm.amount_collected_from_tenant}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          amount_collected_from_tenant: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="input pl-8"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Collection Method
                  </label>
                  <select
                    value={paymentForm.collection_method}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, collection_method: e.target.value })
                    }
                    className="input"
                  >
                    <option value="cash">Cash</option>
                    <option value="check">Check</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Paid to Landlord
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      value={paymentForm.amount_paid_to_landlord}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          amount_paid_to_landlord: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="input pl-8"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentForm.landlord_payment_method}
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        landlord_payment_method: e.target.value,
                      })
                    }
                    className="input"
                  >
                    <option value="check">Check</option>
                    <option value="ach">ACH</option>
                    <option value="wire">Wire</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="input"
                  rows={2}
                />
              </div>
              <div className="flex justify-end">
                <button onClick={saveRentEntry} disabled={saving} className="btn-primary">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save Entry
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Upload lease agreements, amendments, and other lease documents
            </p>

            <FileUpload
              onUpload={handleDocumentUpload}
              accept=".pdf"
              category="lease"
              label="Upload Lease Document"
              hint="PDF files only, up to 10MB"
            />

            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Uploaded Documents ({documents.length})
              </h4>
              <DocumentList
                documents={documents}
                onDelete={handleDocumentDelete}
                showCategory={true}
                emptyMessage="No lease documents uploaded yet"
              />
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-red-800">Delete Lease?</h4>
                <p className="text-sm text-red-600 mt-1">
                  This will permanently delete this lease for {lease.household?.name || 'this household'} and all associated rent records. This action cannot be undone.
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 text-sm bg-white text-gray-700 rounded border border-gray-300 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={deleteLease}
                    disabled={deleting}
                    className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
                  >
                    {deleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Delete Lease
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

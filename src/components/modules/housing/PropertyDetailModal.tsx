'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import {
  Loader2,
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  CreditCard,
  MessageSquare,
  Send,
  Home,
  Calendar,
  DollarSign,
  Trash2,
  AlertTriangle,
  Plus,
  Edit2,
  Bed,
  Bath,
  Square,
  CheckCircle,
  XCircle,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/providers/AuthProvider';

interface Property {
  id: string;
  name: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  property_type: string;
  total_units: number;
  landlord_name: string | null;
  landlord_phone: string | null;
  landlord_email: string | null;
  landlord_address: string | null;
  landlord_bank_name: string | null;
  landlord_bank_routing: string | null;
  landlord_bank_account: string | null;
  landlord_payment_method: string | null;
  landlord_notes: string | null;
  master_lease_start: string | null;
  master_lease_end: string | null;
  master_lease_rent: number | null;
  notes: string | null;
}

interface Note {
  id: string;
  content: string;
  note_type: string;
  created_at: string;
  author_id: string | null;
}

interface Unit {
  id: string;
  property_id: string;
  unit_number: string;
  bedrooms: number;
  bathrooms: number;
  square_feet: number | null;
  floor_number: number | null;
  market_rent: number | null;
  program_rent: number | null;
  status: 'available' | 'occupied' | 'maintenance' | 'offline';
  amenities: Record<string, unknown> | null;
  notes: string | null;
  lease?: {
    id: string;
    household?: {
      id: string;
      name: string;
    };
  } | null;
}

interface PropertyDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  onDelete?: () => void;
}

export function PropertyDetailModal({ isOpen, onClose, propertyId, onDelete }: PropertyDetailModalProps) {
  const { profile } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'units' | 'landlord' | 'notes'>('details');
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Property>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [unitCount, setUnitCount] = useState(0);
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [savingUnit, setSavingUnit] = useState(false);
  const [unitForm, setUnitForm] = useState<{
    unit_number: string;
    bedrooms: number;
    bathrooms: number;
    square_feet: string;
    floor_number: string;
    market_rent: string;
    program_rent: string;
    status: 'available' | 'occupied' | 'maintenance' | 'offline';
    notes: string;
  }>({
    unit_number: '',
    bedrooms: 1,
    bathrooms: 1,
    square_feet: '',
    floor_number: '',
    market_rent: '',
    program_rent: '',
    status: 'available',
    notes: '',
  });

  useEffect(() => {
    if (isOpen && propertyId) {
      fetchProperty();
      fetchNotes();
      fetchUnits();
    }
  }, [isOpen, propertyId]);

  async function fetchProperty() {
    setLoading(true);
    try {
      const [propertyRes, unitCountRes] = await Promise.all([
        (supabase as any)
          .from('properties')
          .select('*')
          .eq('id', propertyId)
          .single(),
        (supabase as any)
          .from('units')
          .select('id', { count: 'exact', head: true })
          .eq('property_id', propertyId)
          .neq('status', 'offline'),
      ]);

      if (propertyRes.error) throw propertyRes.error;
      setProperty(propertyRes.data);
      setEditForm(propertyRes.data);
      setUnitCount(unitCountRes.count || 0);
    } catch (err) {
      console.error('Error fetching property:', err);
    } finally {
      setLoading(false);
    }
  }

  async function generateUnits() {
    if (!property) return;

    const unitsToCreate = property.total_units - unitCount;
    if (unitsToCreate <= 0) return;

    try {
      const newUnits = Array.from({ length: unitsToCreate }, (_, i) => ({
        property_id: propertyId,
        unit_number: String(unitCount + i + 1),
        bedrooms: 1,
        bathrooms: 1,
        status: 'available',
      }));

      const { error } = await (supabase as any)
        .from('units')
        .insert(newUnits);

      if (error) throw error;

      // Refresh data
      await fetchProperty();
      await fetchUnits();
    } catch (err) {
      console.error('Error generating units:', err);
    }
  }

  async function fetchUnits() {
    setLoadingUnits(true);
    try {
      const { data, error } = await (supabase as any)
        .from('units')
        .select(`
          *,
          lease:leases(id, household:households(id, name))
        `)
        .eq('property_id', propertyId)
        .neq('status', 'offline')
        .order('unit_number');

      if (error) throw error;

      // Filter to only active leases
      const unitsWithActiveLease = (data || []).map((unit: Unit & { lease: Array<{ id: string; household: { id: string; name: string } | null }> }) => ({
        ...unit,
        lease: unit.lease?.find((l: { id: string }) => l) || null,
      }));

      setUnits(unitsWithActiveLease);
    } catch (err) {
      console.error('Error fetching units:', err);
    } finally {
      setLoadingUnits(false);
    }
  }

  function resetUnitForm() {
    setUnitForm({
      unit_number: '',
      bedrooms: 1,
      bathrooms: 1,
      square_feet: '',
      floor_number: '',
      market_rent: '',
      program_rent: '',
      status: 'available',
      notes: '',
    });
  }

  function openEditUnit(unit: Unit) {
    setEditingUnit(unit);
    setUnitForm({
      unit_number: unit.unit_number,
      bedrooms: unit.bedrooms,
      bathrooms: unit.bathrooms,
      square_feet: unit.square_feet?.toString() || '',
      floor_number: unit.floor_number?.toString() || '',
      market_rent: unit.market_rent?.toString() || '',
      program_rent: unit.program_rent?.toString() || '',
      status: unit.status,
      notes: unit.notes || '',
    });
    setShowAddUnitModal(true);
  }

  async function saveUnit() {
    setSavingUnit(true);
    try {
      const unitData = {
        property_id: propertyId,
        unit_number: unitForm.unit_number,
        bedrooms: unitForm.bedrooms,
        bathrooms: unitForm.bathrooms,
        square_feet: unitForm.square_feet ? parseInt(unitForm.square_feet) : null,
        floor_number: unitForm.floor_number ? parseInt(unitForm.floor_number) : null,
        market_rent: unitForm.market_rent ? parseFloat(unitForm.market_rent) : null,
        program_rent: unitForm.program_rent ? parseFloat(unitForm.program_rent) : null,
        status: unitForm.status,
        notes: unitForm.notes || null,
      };

      if (editingUnit) {
        const { error } = await (supabase as any)
          .from('units')
          .update(unitData)
          .eq('id', editingUnit.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('units')
          .insert(unitData);
        if (error) throw error;
      }

      await fetchUnits();
      await fetchProperty();
      setShowAddUnitModal(false);
      setEditingUnit(null);
      resetUnitForm();
    } catch (err) {
      console.error('Error saving unit:', err);
    } finally {
      setSavingUnit(false);
    }
  }

  async function deleteUnit(unitId: string) {
    if (!confirm('Are you sure you want to remove this unit?')) return;
    try {
      const { error } = await (supabase as any)
        .from('units')
        .update({ status: 'offline' })
        .eq('id', unitId);

      if (error) throw error;
      await fetchUnits();
      await fetchProperty();
    } catch (err) {
      console.error('Error deleting unit:', err);
    }
  }

  async function fetchNotes() {
    setLoadingNotes(true);
    try {
      const { data, error } = await (supabase as any)
        .from('property_notes')
        .select('id, content, note_type, created_at, author_id')
        .eq('property_id', propertyId)
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
    if (!newNote.trim() || !profile?.id) return;
    setSavingNote(true);

    try {
      const { error } = await (supabase as any).from('property_notes').insert({
        property_id: propertyId,
        author_id: profile.id,
        content: newNote.trim(),
        note_type: 'general',
      });

      if (error) throw error;

      setNewNote('');
      await fetchNotes();
    } catch (err) {
      console.error('Error adding note:', err);
    } finally {
      setSavingNote(false);
    }
  }

  async function saveProperty() {
    try {
      const { error } = await (supabase as any)
        .from('properties')
        .update(editForm)
        .eq('id', propertyId);

      if (error) throw error;

      setProperty({ ...property, ...editForm } as Property);
      setEditing(false);
    } catch (err) {
      console.error('Error saving property:', err);
    }
  }

  async function deleteProperty() {
    setDeleting(true);
    try {
      const response = await fetch(`/api/housing?type=properties&id=${propertyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete property');
      }

      onClose();
      onDelete?.();
    } catch (err) {
      console.error('Error deleting property:', err);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Property Details" size="xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-canmp-green-500" />
        </div>
      </Modal>
    );
  }

  if (!property) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={property.name} size="xl">
      <div className="px-6 pb-6">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-4">
          {(['details', 'units', 'landlord', 'notes'] as const).map((tab) => (
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
              {tab === 'landlord' ? 'Landlord Info' : tab}
              {tab === 'units' && (
                <span className="ml-1 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                  {units.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="space-y-4">
            {!editingDetails ? (
              <>
                <div className="flex justify-end">
                  <button
                    onClick={() => setEditingDetails(true)}
                    className="text-sm text-canmp-green-600 hover:underline"
                  >
                    Edit Property Details
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <Building2 className="w-3 h-3" />
                      Property Name
                    </div>
                    <p className="font-medium text-gray-900">{property.name}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <Building2 className="w-3 h-3" />
                      Property Type
                    </div>
                    <p className="font-medium text-gray-900">
                      {property.property_type === 'canmp_owned' ? 'CANMP Owned' : 'Master Lease'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <MapPin className="w-3 h-3" />
                      Address
                    </div>
                    <p className="font-medium text-gray-900">
                      {property.address_street}
                      <br />
                      {property.address_city}, {property.address_state} {property.address_zip}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <Home className="w-3 h-3" />
                      Units
                    </div>
                    <p className="font-medium text-gray-900">
                      {unitCount} / {property.total_units}
                      {unitCount < property.total_units && (
                        <span className="text-yellow-600 text-xs ml-2">
                          ({property.total_units - unitCount} missing)
                        </span>
                      )}
                    </p>
                    {unitCount < property.total_units && (
                      <button
                        onClick={generateUnits}
                        className="text-xs text-canmp-green-600 hover:underline mt-1"
                      >
                        Generate missing units
                      </button>
                    )}
                  </div>
                  {property.property_type === 'master_lease' && (
                    <>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                          <Calendar className="w-3 h-3" />
                          Lease Period
                        </div>
                        <p className="font-medium text-gray-900">
                          {property.master_lease_start
                            ? format(new Date(property.master_lease_start), 'MMM d, yyyy')
                            : 'Not set'}{' '}
                          -{' '}
                          {property.master_lease_end
                            ? format(new Date(property.master_lease_end), 'MMM d, yyyy')
                            : 'Not set'}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                          <DollarSign className="w-3 h-3" />
                          Master Lease Rent
                        </div>
                        <p className="font-medium text-gray-900">
                          {property.master_lease_rent
                            ? `$${property.master_lease_rent.toLocaleString()}/mo`
                            : 'Not set'}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {property.notes && (
                  <div className="bg-yellow-50 rounded-lg p-3 mt-4">
                    <p className="text-xs text-yellow-700 font-medium mb-1">Property Notes</p>
                    <p className="text-sm text-gray-700">{property.notes}</p>
                  </div>
                )}
              </>
            ) : (
              // Edit Property Details Form
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Property Name
                    </label>
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Property Type
                    </label>
                    <select
                      value={editForm.property_type || ''}
                      onChange={(e) => setEditForm({ ...editForm, property_type: e.target.value })}
                      className="input"
                    >
                      <option value="canmp_owned">CANMP Owned</option>
                      <option value="master_lease">Master Lease</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={editForm.address_street || ''}
                    onChange={(e) => setEditForm({ ...editForm, address_street: e.target.value })}
                    className="input"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={editForm.address_city || ''}
                      onChange={(e) => setEditForm({ ...editForm, address_city: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <input
                      type="text"
                      value={editForm.address_state || ''}
                      onChange={(e) => setEditForm({ ...editForm, address_state: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                    <input
                      type="text"
                      value={editForm.address_zip || ''}
                      onChange={(e) => setEditForm({ ...editForm, address_zip: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Units
                  </label>
                  <input
                    type="number"
                    value={editForm.total_units || ''}
                    onChange={(e) => setEditForm({ ...editForm, total_units: parseInt(e.target.value) || 0 })}
                    className="input w-32"
                    min="1"
                  />
                </div>

                {editForm.property_type === 'master_lease' && (
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Master Lease Details</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Lease Start
                        </label>
                        <input
                          type="date"
                          value={editForm.master_lease_start || ''}
                          onChange={(e) => setEditForm({ ...editForm, master_lease_start: e.target.value })}
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Lease End
                        </label>
                        <input
                          type="date"
                          value={editForm.master_lease_end || ''}
                          onChange={(e) => setEditForm({ ...editForm, master_lease_end: e.target.value })}
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Monthly Rent
                        </label>
                        <input
                          type="number"
                          value={editForm.master_lease_rent || ''}
                          onChange={(e) => setEditForm({ ...editForm, master_lease_rent: parseFloat(e.target.value) || 0 })}
                          className="input"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Property Notes
                  </label>
                  <textarea
                    value={editForm.notes || ''}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    className="input"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setEditingDetails(false);
                      setEditForm(property);
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      saveProperty();
                      setEditingDetails(false);
                    }}
                    className="btn-primary"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Units Tab */}
        {activeTab === 'units' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                {units.filter(u => u.status === 'occupied').length} occupied / {units.length} total units
              </div>
              <button
                onClick={() => {
                  resetUnitForm();
                  setEditingUnit(null);
                  setShowAddUnitModal(true);
                }}
                className="btn-primary text-sm px-3 py-1.5"
              >
                <Plus className="w-4 h-4" />
                Add Unit
              </button>
            </div>

            {loadingUnits ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-canmp-green-500" />
              </div>
            ) : units.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Home className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No units created yet</p>
                <button
                  onClick={() => {
                    resetUnitForm();
                    setShowAddUnitModal(true);
                  }}
                  className="text-canmp-green-600 hover:underline text-sm mt-2"
                >
                  Add the first unit
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                {units.map((unit) => {
                  const statusConfig = {
                    available: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'Available' },
                    occupied: { icon: User, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Occupied' },
                    maintenance: { icon: Wrench, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Maintenance' },
                    offline: { icon: XCircle, color: 'text-gray-600', bg: 'bg-gray-50', label: 'Offline' },
                  };
                  const status = statusConfig[unit.status];
                  const StatusIcon = status.icon;

                  return (
                    <div
                      key={unit.id}
                      className={cn(
                        'border rounded-lg p-3 hover:shadow-sm transition-shadow',
                        status.bg
                      )}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">Unit {unit.unit_number}</h4>
                          <div className={cn('flex items-center gap-1 text-xs', status.color)}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => openEditUnit(unit)}
                            className="p-1 text-gray-400 hover:text-canmp-green-600"
                            title="Edit unit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteUnit(unit.id)}
                            className="p-1 text-gray-400 hover:text-red-600"
                            title="Remove unit"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                        <span className="flex items-center gap-1">
                          <Bed className="w-3 h-3" />
                          {unit.bedrooms} bed
                        </span>
                        <span className="flex items-center gap-1">
                          <Bath className="w-3 h-3" />
                          {unit.bathrooms} bath
                        </span>
                        {unit.square_feet && (
                          <span className="flex items-center gap-1">
                            <Square className="w-3 h-3" />
                            {unit.square_feet} sqft
                          </span>
                        )}
                      </div>

                      {(unit.market_rent || unit.program_rent) && (
                        <div className="flex gap-2 text-xs mb-2">
                          {unit.market_rent && (
                            <span className="text-gray-600">
                              Market: ${unit.market_rent.toLocaleString()}
                            </span>
                          )}
                          {unit.program_rent && (
                            <span className="text-canmp-green-600">
                              Program: ${unit.program_rent.toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}

                      {unit.status === 'occupied' && unit.lease?.household && (
                        <div className="text-xs bg-white rounded px-2 py-1 text-blue-700">
                          Tenant: {unit.lease.household.name}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add/Edit Unit Modal */}
            {showAddUnitModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {editingUnit ? 'Edit Unit' : 'Add New Unit'}
                  </h3>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Unit Number *
                        </label>
                        <input
                          type="text"
                          value={unitForm.unit_number}
                          onChange={(e) => setUnitForm({ ...unitForm, unit_number: e.target.value })}
                          className="input w-full"
                          placeholder="e.g., 101, A-1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Status
                        </label>
                        <select
                          value={unitForm.status}
                          onChange={(e) => setUnitForm({ ...unitForm, status: e.target.value as Unit['status'] })}
                          className="input w-full"
                        >
                          <option value="available">Available</option>
                          <option value="occupied">Occupied</option>
                          <option value="maintenance">Maintenance</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Bedrooms
                        </label>
                        <input
                          type="number"
                          value={unitForm.bedrooms}
                          onChange={(e) => setUnitForm({ ...unitForm, bedrooms: parseInt(e.target.value) || 0 })}
                          className="input w-full"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Bathrooms
                        </label>
                        <input
                          type="number"
                          value={unitForm.bathrooms}
                          onChange={(e) => setUnitForm({ ...unitForm, bathrooms: parseFloat(e.target.value) || 0 })}
                          className="input w-full"
                          min="0"
                          step="0.5"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Sq Ft
                        </label>
                        <input
                          type="number"
                          value={unitForm.square_feet}
                          onChange={(e) => setUnitForm({ ...unitForm, square_feet: e.target.value })}
                          className="input w-full"
                          min="0"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Market Rent
                        </label>
                        <input
                          type="number"
                          value={unitForm.market_rent}
                          onChange={(e) => setUnitForm({ ...unitForm, market_rent: e.target.value })}
                          className="input w-full"
                          min="0"
                          step="0.01"
                          placeholder="$"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Program Rent
                        </label>
                        <input
                          type="number"
                          value={unitForm.program_rent}
                          onChange={(e) => setUnitForm({ ...unitForm, program_rent: e.target.value })}
                          className="input w-full"
                          min="0"
                          step="0.01"
                          placeholder="$"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Floor Number
                      </label>
                      <input
                        type="number"
                        value={unitForm.floor_number}
                        onChange={(e) => setUnitForm({ ...unitForm, floor_number: e.target.value })}
                        className="input w-24"
                        min="1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      <textarea
                        value={unitForm.notes}
                        onChange={(e) => setUnitForm({ ...unitForm, notes: e.target.value })}
                        className="input w-full"
                        rows={2}
                        placeholder="Any notes about this unit..."
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={() => {
                        setShowAddUnitModal(false);
                        setEditingUnit(null);
                        resetUnitForm();
                      }}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveUnit}
                      disabled={!unitForm.unit_number || savingUnit}
                      className="btn-primary"
                    >
                      {savingUnit ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : editingUnit ? (
                        'Save Changes'
                      ) : (
                        'Add Unit'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Landlord Tab */}
        {activeTab === 'landlord' && (
          <div className="space-y-4">
            {property.property_type === 'canmp_owned' ? (
              <div className="text-center py-8 text-gray-500">
                This is a CANMP-owned property. No landlord information required.
              </div>
            ) : (
              <>
                {!editing ? (
                  <>
                    <div className="flex justify-end">
                      <button
                        onClick={() => setEditing(true)}
                        className="text-sm text-canmp-green-600 hover:underline"
                      >
                        Edit Landlord Info
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                          <User className="w-3 h-3" />
                          Contact Name
                        </div>
                        <p className="font-medium text-gray-900">
                          {property.landlord_name || 'Not set'}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                          <Phone className="w-3 h-3" />
                          Phone
                        </div>
                        <p className="font-medium text-gray-900">
                          {property.landlord_phone || 'Not set'}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                          <Mail className="w-3 h-3" />
                          Email
                        </div>
                        <p className="font-medium text-gray-900">
                          {property.landlord_email || 'Not set'}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                          <MapPin className="w-3 h-3" />
                          Landlord Address
                        </div>
                        <p className="font-medium text-gray-900">
                          {property.landlord_address || 'Not set'}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">
                        Bank Information
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                            <CreditCard className="w-3 h-3" />
                            Bank Name
                          </div>
                          <p className="font-medium text-gray-900">
                            {property.landlord_bank_name || 'Not set'}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                            Payment Method
                          </div>
                          <p className="font-medium text-gray-900 capitalize">
                            {property.landlord_payment_method || 'Not set'}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-xs text-gray-500 mb-1">Routing #</div>
                          <p className="font-medium text-gray-900 font-mono">
                            {property.landlord_bank_routing
                              ? `****${property.landlord_bank_routing.slice(-4)}`
                              : 'Not set'}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-xs text-gray-500 mb-1">Account #</div>
                          <p className="font-medium text-gray-900 font-mono">
                            {property.landlord_bank_account
                              ? `****${property.landlord_bank_account.slice(-4)}`
                              : 'Not set'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {property.landlord_notes && (
                      <div className="bg-yellow-50 rounded-lg p-3 mt-4">
                        <p className="text-xs text-yellow-700 font-medium mb-1">
                          Landlord Notes
                        </p>
                        <p className="text-sm text-gray-700">{property.landlord_notes}</p>
                      </div>
                    )}
                  </>
                ) : (
                  // Edit Form
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Contact Name
                        </label>
                        <input
                          type="text"
                          value={editForm.landlord_name || ''}
                          onChange={(e) =>
                            setEditForm({ ...editForm, landlord_name: e.target.value })
                          }
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone
                        </label>
                        <input
                          type="text"
                          value={editForm.landlord_phone || ''}
                          onChange={(e) =>
                            setEditForm({ ...editForm, landlord_phone: e.target.value })
                          }
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          value={editForm.landlord_email || ''}
                          onChange={(e) =>
                            setEditForm({ ...editForm, landlord_email: e.target.value })
                          }
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Address
                        </label>
                        <input
                          type="text"
                          value={editForm.landlord_address || ''}
                          onChange={(e) =>
                            setEditForm({ ...editForm, landlord_address: e.target.value })
                          }
                          className="input"
                        />
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">
                        Bank Information
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Bank Name
                          </label>
                          <input
                            type="text"
                            value={editForm.landlord_bank_name || ''}
                            onChange={(e) =>
                              setEditForm({ ...editForm, landlord_bank_name: e.target.value })
                            }
                            className="input"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Payment Method
                          </label>
                          <select
                            value={editForm.landlord_payment_method || ''}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                landlord_payment_method: e.target.value,
                              })
                            }
                            className="input"
                          >
                            <option value="">Select...</option>
                            <option value="check">Check</option>
                            <option value="ach">ACH Transfer</option>
                            <option value="wire">Wire Transfer</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Routing Number
                          </label>
                          <input
                            type="text"
                            value={editForm.landlord_bank_routing || ''}
                            onChange={(e) =>
                              setEditForm({ ...editForm, landlord_bank_routing: e.target.value })
                            }
                            className="input font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Account Number
                          </label>
                          <input
                            type="text"
                            value={editForm.landlord_bank_account || ''}
                            onChange={(e) =>
                              setEditForm({ ...editForm, landlord_bank_account: e.target.value })
                            }
                            className="input font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Landlord Notes
                      </label>
                      <textarea
                        value={editForm.landlord_notes || ''}
                        onChange={(e) =>
                          setEditForm({ ...editForm, landlord_notes: e.target.value })
                        }
                        className="input"
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => {
                          setEditing(false);
                          setEditForm(property);
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                      <button onClick={saveProperty} className="btn-primary">
                        Save Changes
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div>
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
              <p className="text-center text-gray-400 py-8 text-sm">No notes yet</p>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-3">
                {notes.map((note) => (
                  <div key={note.id} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-900">{note.content}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <MessageSquare className="w-3 h-3" />
                      <span>{format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-red-800">Deactivate Property?</h4>
                <p className="text-sm text-red-600 mt-1">
                  This will deactivate {property.name} and hide it from active lists.
                </p>
                {unitCount > 0 && (
                  <div className="mt-2 p-2 bg-red-100 rounded text-sm">
                    <p className="font-medium text-red-800">This will also affect:</p>
                    <p className="text-red-700">{unitCount} active unit{unitCount !== 1 ? 's' : ''}</p>
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                    className="px-3 py-1.5 text-sm bg-white text-gray-700 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={deleteProperty}
                    disabled={deleting}
                    className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1 disabled:opacity-50"
                  >
                    {deleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    {deleting ? 'Deleting...' : 'Deactivate Property'}
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

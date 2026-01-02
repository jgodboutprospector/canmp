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
  author: {
    first_name: string;
    last_name: string;
  } | null;
}

interface PropertyDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
}

export function PropertyDetailModal({ isOpen, onClose, propertyId }: PropertyDetailModalProps) {
  const { profile } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'landlord' | 'notes'>('details');
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Property>>({});

  useEffect(() => {
    if (isOpen && propertyId) {
      fetchProperty();
      fetchNotes();
    }
  }, [isOpen, propertyId]);

  async function fetchProperty() {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (error) throw error;
      setProperty(data);
      setEditForm(data);
    } catch (err) {
      console.error('Error fetching property:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchNotes() {
    setLoadingNotes(true);
    try {
      const { data, error } = await (supabase as any)
        .from('property_notes')
        .select(`
          id, content, note_type, created_at,
          author:users(first_name, last_name)
        `)
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
          {(['details', 'landlord', 'notes'] as const).map((tab) => (
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
                      Total Units
                    </div>
                    <p className="font-medium text-gray-900">{property.total_units}</p>
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
                      <User className="w-3 h-3" />
                      <span>
                        {note.author?.first_name} {note.author?.last_name}
                      </span>
                      <span>•</span>
                      <span>{format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
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

'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Loader2,
  Phone,
  Mail,
  Building2,
  User,
  Languages,
  Trash2,
  Star,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface ExternalContact {
  id: string;
  first_name: string;
  last_name: string;
  title: string | null;
  contact_type: string;
  phone: string | null;
  email: string | null;
  languages: string[] | null;
  is_certified: boolean;
  organization: {
    id: string;
    name: string;
  } | null;
}

interface BeneficiaryContact {
  id: string;
  relationship_type: string;
  is_primary: boolean;
  notes: string | null;
  external_contact: ExternalContact;
}

interface ExternalContactsTabProps {
  beneficiaryId: string;
}

const contactTypeLabels: Record<string, string> = {
  case_worker: 'Case Worker',
  translator: 'Translator',
  legal_services: 'Legal Services',
  medical_provider: 'Medical Provider',
  mental_health: 'Mental Health',
  school_contact: 'School Contact',
  childcare: 'Childcare',
  employment_services: 'Employment Services',
  immigration_attorney: 'Immigration Attorney',
  social_services: 'Social Services',
  other: 'Other',
};

const contactTypeColors: Record<string, string> = {
  case_worker: 'bg-blue-100 text-blue-700',
  translator: 'bg-purple-100 text-purple-700',
  legal_services: 'bg-indigo-100 text-indigo-700',
  medical_provider: 'bg-red-100 text-red-700',
  mental_health: 'bg-pink-100 text-pink-700',
  school_contact: 'bg-yellow-100 text-yellow-700',
  childcare: 'bg-orange-100 text-orange-700',
  employment_services: 'bg-green-100 text-green-700',
  immigration_attorney: 'bg-gray-100 text-gray-700',
  social_services: 'bg-teal-100 text-teal-700',
  other: 'bg-gray-100 text-gray-700',
};

export default function ExternalContactsTab({ beneficiaryId }: ExternalContactsTabProps) {
  const [contacts, setContacts] = useState<BeneficiaryContact[]>([]);
  const [allContacts, setAllContacts] = useState<ExternalContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showNewContactForm, setShowNewContactForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state for linking existing contact
  const [selectedContactId, setSelectedContactId] = useState('');
  const [relationshipType, setRelationshipType] = useState('case_worker');
  const [isPrimary, setIsPrimary] = useState(false);
  const [linkNotes, setLinkNotes] = useState('');

  // Form state for new contact
  const [newContact, setNewContact] = useState({
    first_name: '',
    last_name: '',
    title: '',
    contact_type: 'case_worker',
    phone: '',
    email: '',
    languages: '',
    is_certified: false,
  });

  useEffect(() => {
    fetchContacts();
    fetchAllContacts();
  }, [beneficiaryId]);

  async function fetchContacts() {
    try {
      const { data, error } = await (supabase as any)
        .from('beneficiary_external_contacts')
        .select(`
          id, relationship_type, is_primary, notes,
          external_contact:external_contacts(
            id, first_name, last_name, title, contact_type, phone, email, languages, is_certified,
            organization:external_organizations(id, name)
          )
        `)
        .eq('beneficiary_id', beneficiaryId)
        .order('is_primary', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (err) {
      console.error('Error fetching contacts:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAllContacts() {
    try {
      const { data, error } = await (supabase as any)
        .from('external_contacts')
        .select(`
          id, first_name, last_name, title, contact_type, phone, email, languages, is_certified,
          organization:external_organizations(id, name)
        `)
        .eq('is_active', true)
        .order('last_name');

      if (error) throw error;
      setAllContacts(data || []);
    } catch (err) {
      console.error('Error fetching all contacts:', err);
    }
  }

  async function linkContact() {
    if (!selectedContactId) return;
    setSaving(true);

    try {
      const { error } = await (supabase as any)
        .from('beneficiary_external_contacts')
        .insert({
          beneficiary_id: beneficiaryId,
          external_contact_id: selectedContactId,
          relationship_type: relationshipType,
          is_primary: isPrimary,
          notes: linkNotes || null,
        });

      if (error) throw error;

      await fetchContacts();
      resetForm();
    } catch (err) {
      console.error('Error linking contact:', err);
    } finally {
      setSaving(false);
    }
  }

  async function createAndLinkContact() {
    if (!newContact.first_name || !newContact.last_name) return;
    setSaving(true);

    try {
      // Create the contact
      const { data: contactData, error: contactError } = await (supabase as any)
        .from('external_contacts')
        .insert({
          first_name: newContact.first_name,
          last_name: newContact.last_name,
          title: newContact.title || null,
          contact_type: newContact.contact_type,
          phone: newContact.phone || null,
          email: newContact.email || null,
          languages: newContact.languages ? newContact.languages.split(',').map((l: string) => l.trim()) : null,
          is_certified: newContact.is_certified,
        })
        .select()
        .single();

      if (contactError) throw contactError;

      // Link to beneficiary
      const { error: linkError } = await (supabase as any)
        .from('beneficiary_external_contacts')
        .insert({
          beneficiary_id: beneficiaryId,
          external_contact_id: contactData.id,
          relationship_type: newContact.contact_type,
          is_primary: isPrimary,
        });

      if (linkError) throw linkError;

      await fetchContacts();
      await fetchAllContacts();
      resetForm();
    } catch (err) {
      console.error('Error creating contact:', err);
    } finally {
      setSaving(false);
    }
  }

  async function removeContact(linkId: string) {
    if (!confirm('Remove this contact from the beneficiary?')) return;

    try {
      const { error } = await (supabase as any)
        .from('beneficiary_external_contacts')
        .delete()
        .eq('id', linkId);

      if (error) throw error;
      await fetchContacts();
    } catch (err) {
      console.error('Error removing contact:', err);
    }
  }

  async function togglePrimary(linkId: string, currentValue: boolean) {
    try {
      const { error } = await (supabase as any)
        .from('beneficiary_external_contacts')
        .update({ is_primary: !currentValue })
        .eq('id', linkId);

      if (error) throw error;
      await fetchContacts();
    } catch (err) {
      console.error('Error updating primary status:', err);
    }
  }

  function resetForm() {
    setShowAddForm(false);
    setShowNewContactForm(false);
    setSelectedContactId('');
    setRelationshipType('case_worker');
    setIsPrimary(false);
    setLinkNotes('');
    setNewContact({
      first_name: '',
      last_name: '',
      title: '',
      contact_type: 'case_worker',
      phone: '',
      email: '',
      languages: '',
      is_certified: false,
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Case workers, translators, and other contacts associated with this person.
        </p>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-secondary text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Contact
          </button>
        )}
      </div>

      {/* Add Contact Form */}
      {showAddForm && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Add External Contact</h4>
            <button
              onClick={() => setShowNewContactForm(!showNewContactForm)}
              className="text-sm text-canmp-green-600 hover:underline"
            >
              {showNewContactForm ? 'Link Existing Contact' : 'Create New Contact'}
            </button>
          </div>

          {!showNewContactForm ? (
            // Link existing contact
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Contact
                </label>
                <select
                  value={selectedContactId}
                  onChange={(e) => setSelectedContactId(e.target.value)}
                  className="input"
                >
                  <option value="">Choose a contact...</option>
                  {allContacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name} ({contactTypeLabels[c.contact_type]})
                      {c.organization && ` - ${c.organization.name}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Relationship Type
                  </label>
                  <select
                    value={relationshipType}
                    onChange={(e) => setRelationshipType(e.target.value)}
                    className="input"
                  >
                    {Object.entries(contactTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPrimary}
                      onChange={(e) => setIsPrimary(e.target.checked)}
                      className="rounded border-gray-300 text-canmp-green-600 focus:ring-canmp-green-500"
                    />
                    <span className="text-sm text-gray-700">Primary contact</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={linkNotes}
                  onChange={(e) => setLinkNotes(e.target.value)}
                  placeholder="Any notes about this relationship..."
                  className="input"
                />
              </div>
            </div>
          ) : (
            // Create new contact
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={newContact.first_name}
                    onChange={(e) => setNewContact({ ...newContact, first_name: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={newContact.last_name}
                    onChange={(e) => setNewContact({ ...newContact, last_name: e.target.value })}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Type *
                  </label>
                  <select
                    value={newContact.contact_type}
                    onChange={(e) => setNewContact({ ...newContact, contact_type: e.target.value })}
                    className="input"
                  >
                    {Object.entries(contactTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title/Role
                  </label>
                  <input
                    type="text"
                    value={newContact.title}
                    onChange={(e) => setNewContact({ ...newContact, title: e.target.value })}
                    placeholder="e.g., Case Manager"
                    className="input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              {newContact.contact_type === 'translator' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Languages (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={newContact.languages}
                      onChange={(e) => setNewContact({ ...newContact, languages: e.target.value })}
                      placeholder="e.g., Spanish, French"
                      className="input"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newContact.is_certified}
                        onChange={(e) => setNewContact({ ...newContact, is_certified: e.target.checked })}
                        className="rounded border-gray-300 text-canmp-green-600 focus:ring-canmp-green-500"
                      />
                      <span className="text-sm text-gray-700">Certified translator</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPrimary}
                    onChange={(e) => setIsPrimary(e.target.checked)}
                    className="rounded border-gray-300 text-canmp-green-600 focus:ring-canmp-green-500"
                  />
                  <span className="text-sm text-gray-700">Set as primary contact</span>
                </label>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={resetForm} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={showNewContactForm ? createAndLinkContact : linkContact}
              disabled={saving || (showNewContactForm ? !newContact.first_name || !newContact.last_name : !selectedContactId)}
              className="btn-primary"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Contacts List */}
      {contacts.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          No external contacts linked yet
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.map((bc) => (
            <div key={bc.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <div
                className="flex items-center justify-between p-3 bg-white cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedId(expandedId === bc.id ? null : bc.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {bc.external_contact.first_name} {bc.external_contact.last_name}
                      </span>
                      {bc.is_primary && (
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className={cn('px-2 py-0.5 rounded-full text-xs', contactTypeColors[bc.relationship_type])}>
                        {contactTypeLabels[bc.relationship_type]}
                      </span>
                      {bc.external_contact.organization && (
                        <span className="text-gray-500">
                          {bc.external_contact.organization.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {bc.external_contact.phone && (
                    <a
                      href={`tel:${bc.external_contact.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  )}
                  {bc.external_contact.email && (
                    <a
                      href={`mailto:${bc.external_contact.email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                    >
                      <Mail className="w-4 h-4" />
                    </a>
                  )}
                  {expandedId === bc.id ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>

              {expandedId === bc.id && (
                <div className="px-3 pb-3 pt-0 bg-gray-50 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-3 py-3">
                    {bc.external_contact.title && (
                      <div>
                        <p className="text-xs text-gray-500">Title</p>
                        <p className="text-sm text-gray-900">{bc.external_contact.title}</p>
                      </div>
                    )}
                    {bc.external_contact.phone && (
                      <div>
                        <p className="text-xs text-gray-500">Phone</p>
                        <p className="text-sm text-gray-900">{bc.external_contact.phone}</p>
                      </div>
                    )}
                    {bc.external_contact.email && (
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="text-sm text-gray-900">{bc.external_contact.email}</p>
                      </div>
                    )}
                    {bc.external_contact.languages && bc.external_contact.languages.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500">Languages</p>
                        <div className="flex items-center gap-1">
                          <Languages className="w-3 h-3 text-gray-400" />
                          <p className="text-sm text-gray-900">
                            {bc.external_contact.languages.join(', ')}
                            {bc.external_contact.is_certified && ' (Certified)'}
                          </p>
                        </div>
                      </div>
                    )}
                    {bc.notes && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500">Notes</p>
                        <p className="text-sm text-gray-900">{bc.notes}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                    <button
                      onClick={() => togglePrimary(bc.id, bc.is_primary)}
                      className="text-xs text-gray-600 hover:text-gray-900"
                    >
                      {bc.is_primary ? 'Remove primary' : 'Set as primary'}
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={() => removeContact(bc.id)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Remove contact
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

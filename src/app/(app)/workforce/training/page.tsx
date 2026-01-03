'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Briefcase,
  GraduationCap,
  Building2,
  Loader2,
  Plus,
  Search,
  Clock,
  DollarSign,
  Calendar,
  Award,
  Users,
  ExternalLink,
  Edit2,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Modal } from '@/components/ui/Modal';
import { format } from 'date-fns';

const tabs = [
  { name: 'Kanban', href: '/workforce', icon: Briefcase },
  { name: 'Job Listings', href: '/workforce/jobs', icon: Building2 },
  { name: 'Training', href: '/workforce/training', icon: GraduationCap },
];

type ProgramStatus = 'active' | 'inactive' | 'upcoming';

interface TrainingProgram {
  id: string;
  name: string;
  provider: string;
  description: string | null;
  category: string | null;
  duration_hours: number | null;
  cost: number | null;
  location: string | null;
  schedule: string | null;
  certification_offered: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  external_url: string | null;
  status: ProgramStatus;
  start_date: string | null;
  end_date: string | null;
  max_participants: number | null;
  created_at: string;
}

const STATUS_COLORS: Record<ProgramStatus, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-700',
  upcoming: 'bg-blue-100 text-blue-700',
};

const CATEGORY_OPTIONS = [
  'ESL/English',
  'Digital Literacy',
  'Healthcare/CNA',
  'Food Safety',
  'Forklift/Warehouse',
  'Construction',
  'Customer Service',
  'Job Readiness',
  'Financial Literacy',
  'Driver Education',
  'Soft Skills',
  'Other',
];

export default function TrainingPage() {
  const pathname = usePathname();
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProgramStatus | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<TrainingProgram | null>(null);
  const [editingProgram, setEditingProgram] = useState<TrainingProgram | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    provider: '',
    description: '',
    category: '',
    duration_hours: '',
    cost: '',
    location: '',
    schedule: '',
    certification_offered: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    external_url: '',
    start_date: '',
    end_date: '',
    max_participants: '',
  });

  useEffect(() => {
    fetchPrograms();
  }, []);

  async function fetchPrograms() {
    try {
      const { data, error } = await (supabase as any)
        .from('training_programs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrograms(data || []);
    } catch (err) {
      console.error('Error fetching programs:', err);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm({
      name: '',
      provider: '',
      description: '',
      category: '',
      duration_hours: '',
      cost: '',
      location: '',
      schedule: '',
      certification_offered: '',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      external_url: '',
      start_date: '',
      end_date: '',
      max_participants: '',
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const programData = {
        name: form.name.trim(),
        provider: form.provider.trim(),
        description: form.description.trim() || null,
        category: form.category || null,
        duration_hours: form.duration_hours ? parseInt(form.duration_hours) : null,
        cost: form.cost ? parseFloat(form.cost) : null,
        location: form.location.trim() || null,
        schedule: form.schedule.trim() || null,
        certification_offered: form.certification_offered.trim() || null,
        contact_name: form.contact_name.trim() || null,
        contact_email: form.contact_email.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        external_url: form.external_url.trim() || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        max_participants: form.max_participants ? parseInt(form.max_participants) : null,
        status: 'active' as ProgramStatus,
      };

      if (editingProgram) {
        const { error } = await (supabase as any)
          .from('training_programs')
          .update(programData)
          .eq('id', editingProgram.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('training_programs')
          .insert(programData);
        if (error) throw error;
      }

      setShowAddModal(false);
      setEditingProgram(null);
      resetForm();
      await fetchPrograms();
    } catch (err) {
      console.error('Error saving program:', err);
    } finally {
      setSaving(false);
    }
  }

  async function updateProgramStatus(programId: string, status: ProgramStatus) {
    try {
      const { error } = await (supabase as any)
        .from('training_programs')
        .update({ status })
        .eq('id', programId);
      if (error) throw error;
      await fetchPrograms();
      setSelectedProgram(null);
    } catch (err) {
      console.error('Error updating program:', err);
    }
  }

  async function deleteProgram(programId: string) {
    if (!confirm('Are you sure you want to delete this training program?')) return;

    try {
      const { error } = await (supabase as any)
        .from('training_programs')
        .delete()
        .eq('id', programId);
      if (error) throw error;
      await fetchPrograms();
      setSelectedProgram(null);
    } catch (err) {
      console.error('Error deleting program:', err);
    }
  }

  function startEdit(program: TrainingProgram) {
    setEditingProgram(program);
    setForm({
      name: program.name,
      provider: program.provider,
      description: program.description || '',
      category: program.category || '',
      duration_hours: program.duration_hours?.toString() || '',
      cost: program.cost?.toString() || '',
      location: program.location || '',
      schedule: program.schedule || '',
      certification_offered: program.certification_offered || '',
      contact_name: program.contact_name || '',
      contact_email: program.contact_email || '',
      contact_phone: program.contact_phone || '',
      external_url: program.external_url || '',
      start_date: program.start_date || '',
      end_date: program.end_date || '',
      max_participants: program.max_participants?.toString() || '',
    });
    setShowAddModal(true);
    setSelectedProgram(null);
  }

  const filteredPrograms = programs.filter((program) => {
    const matchesSearch =
      program.name.toLowerCase().includes(search.toLowerCase()) ||
      program.provider.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || program.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeCount = programs.filter((p) => p.status === 'active').length;

  return (
    <div className="min-h-full">
      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 px-6">
        <nav className="flex gap-0">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={cn(
                  'flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-colors',
                  isActive
                    ? 'border-canmp-green-500 text-canmp-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Training Programs</h1>
            <p className="text-sm text-gray-500">
              Manage training and certification programs for workforce participants
            </p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Add Training Program
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="card p-4">
            <p className="text-sm text-gray-500">Total Programs</p>
            <p className="text-2xl font-semibold">{programs.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Active</p>
            <p className="text-2xl font-semibold text-green-600">{activeCount}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Upcoming</p>
            <p className="text-2xl font-semibold text-blue-600">
              {programs.filter((p) => p.status === 'upcoming').length}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">With Certification</p>
            <p className="text-2xl font-semibold text-purple-600">
              {programs.filter((p) => p.certification_offered).length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4 mb-6">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search programs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ProgramStatus | 'all')}
              className="input w-40"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="upcoming">Upcoming</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Programs Grid */}
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-canmp-green-500" />
            <span className="ml-2 text-gray-500">Loading...</span>
          </div>
        ) : filteredPrograms.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            {programs.length === 0
              ? 'No training programs yet. Add one to get started!'
              : 'No programs match your filters.'}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPrograms.map((program) => (
              <div
                key={program.id}
                onClick={() => setSelectedProgram(program)}
                className="card p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 line-clamp-1">{program.name}</h3>
                    <p className="text-sm text-gray-600">{program.provider}</p>
                  </div>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium capitalize ml-2',
                      STATUS_COLORS[program.status]
                    )}
                  >
                    {program.status}
                  </span>
                </div>

                {program.category && (
                  <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded mb-3">
                    {program.category}
                  </span>
                )}

                <div className="space-y-2 text-sm text-gray-500">
                  {program.duration_hours && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {program.duration_hours} hours
                    </div>
                  )}
                  {program.cost !== null && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      {program.cost === 0 ? 'Free' : `$${program.cost}`}
                    </div>
                  )}
                  {program.certification_offered && (
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-yellow-500" />
                      {program.certification_offered}
                    </div>
                  )}
                  {program.start_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Starts {format(new Date(program.start_date), 'MMM d, yyyy')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingProgram(null);
          resetForm();
        }}
        title={editingProgram ? 'Edit Training Program' : 'Add Training Program'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Program Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
                required
                placeholder="e.g., CNA Certification Course"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Provider <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
                className="input"
                required
                placeholder="e.g., Maine Community College"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="input"
              >
                <option value="">Select category...</option>
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (hours)</label>
              <input
                type="number"
                value={form.duration_hours}
                onChange={(e) => setForm({ ...form, duration_hours: e.target.value })}
                className="input"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost ($)</label>
              <input
                type="number"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
                className="input"
                step="0.01"
                min="0"
                placeholder="0 for free"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="input"
                placeholder="e.g., Portland Campus"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Schedule</label>
              <input
                type="text"
                value={form.schedule}
                onChange={(e) => setForm({ ...form, schedule: e.target.value })}
                className="input"
                placeholder="e.g., Mon/Wed 6-9pm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Participants</label>
              <input
                type="number"
                value={form.max_participants}
                onChange={(e) => setForm({ ...form, max_participants: e.target.value })}
                className="input"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Certification Offered</label>
              <input
                type="text"
                value={form.certification_offered}
                onChange={(e) => setForm({ ...form, certification_offered: e.target.value })}
                className="input"
                placeholder="e.g., Maine CNA License"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input"
                rows={3}
              />
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <h4 className="text-sm font-medium text-gray-900">Contact Information</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                <input
                  type="text"
                  value={form.contact_name}
                  onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={form.contact_phone}
                  onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                  className="input"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">External URL</label>
              <input
                type="url"
                value={form.external_url}
                onChange={(e) => setForm({ ...form, external_url: e.target.value })}
                className="input"
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => {
                setShowAddModal(false);
                setEditingProgram(null);
                resetForm();
              }}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.name || !form.provider}
              className="btn-primary"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editingProgram ? 'Update Program' : 'Add Program'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      {selectedProgram && (
        <Modal
          isOpen={!!selectedProgram}
          onClose={() => setSelectedProgram(null)}
          title={selectedProgram.name}
          size="lg"
        >
          <div className="px-6 pb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-lg font-medium text-gray-900">{selectedProgram.provider}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium capitalize',
                      STATUS_COLORS[selectedProgram.status]
                    )}
                  >
                    {selectedProgram.status}
                  </span>
                  {selectedProgram.category && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                      {selectedProgram.category}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(selectedProgram)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteProgram(selectedProgram.id)}
                  className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {selectedProgram.duration_hours && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Duration</p>
                  <p className="font-medium text-gray-900">{selectedProgram.duration_hours} hours</p>
                </div>
              )}
              {selectedProgram.cost !== null && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Cost</p>
                  <p className="font-medium text-gray-900">
                    {selectedProgram.cost === 0 ? 'Free' : `$${selectedProgram.cost}`}
                  </p>
                </div>
              )}
              {selectedProgram.location && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Location</p>
                  <p className="font-medium text-gray-900">{selectedProgram.location}</p>
                </div>
              )}
              {selectedProgram.schedule && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Schedule</p>
                  <p className="font-medium text-gray-900">{selectedProgram.schedule}</p>
                </div>
              )}
              {selectedProgram.start_date && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Start Date</p>
                  <p className="font-medium text-gray-900">
                    {format(new Date(selectedProgram.start_date), 'MMM d, yyyy')}
                  </p>
                </div>
              )}
              {selectedProgram.max_participants && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Max Participants</p>
                  <p className="font-medium text-gray-900">{selectedProgram.max_participants}</p>
                </div>
              )}
            </div>

            {selectedProgram.certification_offered && (
              <div className="bg-yellow-50 rounded-lg p-3 mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-yellow-900">Certification Offered</p>
                  <p className="text-sm text-yellow-700">{selectedProgram.certification_offered}</p>
                </div>
              </div>
            )}

            {selectedProgram.description && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
                <p className="text-gray-600 whitespace-pre-wrap">{selectedProgram.description}</p>
              </div>
            )}

            {(selectedProgram.contact_name ||
              selectedProgram.contact_email ||
              selectedProgram.contact_phone) && (
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-blue-900 mb-2">Contact Information</p>
                {selectedProgram.contact_name && (
                  <p className="text-sm text-gray-700">{selectedProgram.contact_name}</p>
                )}
                {selectedProgram.contact_email && (
                  <p className="text-sm text-gray-700">{selectedProgram.contact_email}</p>
                )}
                {selectedProgram.contact_phone && (
                  <p className="text-sm text-gray-700">{selectedProgram.contact_phone}</p>
                )}
              </div>
            )}

            {selectedProgram.external_url && (
              <a
                href={selectedProgram.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-canmp-green-600 hover:text-canmp-green-700 mb-4"
              >
                <ExternalLink className="w-4 h-4" />
                View Program Website
              </a>
            )}

            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Update Status</p>
              <div className="flex flex-wrap gap-2">
                {(['active', 'upcoming', 'inactive'] as ProgramStatus[]).map((status) => (
                  <button
                    key={status}
                    onClick={() => updateProgramStatus(selectedProgram.id, status)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize',
                      selectedProgram.status === status
                        ? 'bg-canmp-green-500 text-white'
                        : `${STATUS_COLORS[status]} hover:ring-2 hover:ring-canmp-green-300`
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSelectedProgram(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

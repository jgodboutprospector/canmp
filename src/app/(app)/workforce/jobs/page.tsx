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
  MapPin,
  DollarSign,
  Clock,
  Users,
  ExternalLink,
  Edit2,
  Trash2,
  X,
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

type JobStatus = 'active' | 'filled' | 'closed' | 'on_hold';

interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string | null;
  hourly_wage_min: number | null;
  hourly_wage_max: number | null;
  schedule_type: string | null;
  description: string | null;
  requirements: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  external_url: string | null;
  status: JobStatus;
  openings: number;
  placements: number;
  created_at: string;
}

const STATUS_COLORS: Record<JobStatus, string> = {
  active: 'bg-green-100 text-green-700',
  filled: 'bg-blue-100 text-blue-700',
  closed: 'bg-gray-100 text-gray-700',
  on_hold: 'bg-yellow-100 text-yellow-700',
};

const SCHEDULE_OPTIONS = [
  'Full-time',
  'Part-time',
  'Flexible',
  'Shift work',
  'Weekends',
  'Nights',
  'Seasonal',
];

export default function JobListingsPage() {
  const pathname = usePathname();
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
  const [editingJob, setEditingJob] = useState<JobListing | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '',
    company: '',
    location: '',
    hourly_wage_min: '',
    hourly_wage_max: '',
    schedule_type: '',
    description: '',
    requirements: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    external_url: '',
    openings: 1,
  });

  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    try {
      const { data, error } = await (supabase as any)
        .from('job_listings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (err) {
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm({
      title: '',
      company: '',
      location: '',
      hourly_wage_min: '',
      hourly_wage_max: '',
      schedule_type: '',
      description: '',
      requirements: '',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      external_url: '',
      openings: 1,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const jobData = {
        title: form.title.trim(),
        company: form.company.trim(),
        location: form.location.trim() || null,
        hourly_wage_min: form.hourly_wage_min ? parseFloat(form.hourly_wage_min) : null,
        hourly_wage_max: form.hourly_wage_max ? parseFloat(form.hourly_wage_max) : null,
        schedule_type: form.schedule_type || null,
        description: form.description.trim() || null,
        requirements: form.requirements.trim() || null,
        contact_name: form.contact_name.trim() || null,
        contact_email: form.contact_email.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        external_url: form.external_url.trim() || null,
        openings: form.openings,
        status: 'active' as JobStatus,
      };

      if (editingJob) {
        const { error } = await (supabase as any)
          .from('job_listings')
          .update(jobData)
          .eq('id', editingJob.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('job_listings')
          .insert({ ...jobData, placements: 0 });
        if (error) throw error;
      }

      setShowAddModal(false);
      setEditingJob(null);
      resetForm();
      await fetchJobs();
    } catch (err) {
      console.error('Error saving job:', err);
    } finally {
      setSaving(false);
    }
  }

  async function updateJobStatus(jobId: string, status: JobStatus) {
    try {
      const { error } = await (supabase as any)
        .from('job_listings')
        .update({ status })
        .eq('id', jobId);
      if (error) throw error;
      await fetchJobs();
      setSelectedJob(null);
    } catch (err) {
      console.error('Error updating job:', err);
    }
  }

  async function deleteJob(jobId: string) {
    if (!confirm('Are you sure you want to delete this job listing?')) return;

    try {
      const { error } = await (supabase as any)
        .from('job_listings')
        .delete()
        .eq('id', jobId);
      if (error) throw error;
      await fetchJobs();
      setSelectedJob(null);
    } catch (err) {
      console.error('Error deleting job:', err);
    }
  }

  function startEdit(job: JobListing) {
    setEditingJob(job);
    setForm({
      title: job.title,
      company: job.company,
      location: job.location || '',
      hourly_wage_min: job.hourly_wage_min?.toString() || '',
      hourly_wage_max: job.hourly_wage_max?.toString() || '',
      schedule_type: job.schedule_type || '',
      description: job.description || '',
      requirements: job.requirements || '',
      contact_name: job.contact_name || '',
      contact_email: job.contact_email || '',
      contact_phone: job.contact_phone || '',
      external_url: job.external_url || '',
      openings: job.openings,
    });
    setShowAddModal(true);
    setSelectedJob(null);
  }

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.company.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeCount = jobs.filter((j) => j.status === 'active').length;

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
            <h1 className="text-xl font-semibold text-gray-900">Job Listings</h1>
            <p className="text-sm text-gray-500">
              Manage job opportunities for workforce participants
            </p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Add Job Listing
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="card p-4">
            <p className="text-sm text-gray-500">Total Listings</p>
            <p className="text-2xl font-semibold">{jobs.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Active</p>
            <p className="text-2xl font-semibold text-green-600">{activeCount}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Total Openings</p>
            <p className="text-2xl font-semibold text-blue-600">
              {jobs.filter((j) => j.status === 'active').reduce((sum, j) => sum + j.openings, 0)}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Placements</p>
            <p className="text-2xl font-semibold text-purple-600">
              {jobs.reduce((sum, j) => sum + (j.placements || 0), 0)}
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
                placeholder="Search jobs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as JobStatus | 'all')}
              className="input w-40"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="filled">Filled</option>
              <option value="on_hold">On Hold</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {/* Job Listings */}
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-canmp-green-500" />
            <span className="ml-2 text-gray-500">Loading...</span>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            {jobs.length === 0 ? 'No job listings yet. Add one to get started!' : 'No jobs match your filters.'}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className="card p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{job.title}</h3>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-medium capitalize',
                          STATUS_COLORS[job.status]
                        )}
                      >
                        {job.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{job.company}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {job.location}
                        </span>
                      )}
                      {(job.hourly_wage_min || job.hourly_wage_max) && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {job.hourly_wage_min && job.hourly_wage_max
                            ? `$${job.hourly_wage_min} - $${job.hourly_wage_max}/hr`
                            : job.hourly_wage_min
                            ? `$${job.hourly_wage_min}+/hr`
                            : `Up to $${job.hourly_wage_max}/hr`}
                        </span>
                      )}
                      {job.schedule_type && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {job.schedule_type}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {job.openings} opening{job.openings !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-400">
                    {format(new Date(job.created_at), 'MMM d, yyyy')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Job Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingJob(null);
          resetForm();
        }}
        title={editingJob ? 'Edit Job Listing' : 'Add Job Listing'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="input"
                required
                placeholder="e.g., Warehouse Associate"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="input"
                placeholder="e.g., Portland, ME"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Wage ($/hr)</label>
              <input
                type="number"
                value={form.hourly_wage_min}
                onChange={(e) => setForm({ ...form, hourly_wage_min: e.target.value })}
                className="input"
                step="0.01"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Wage ($/hr)</label>
              <input
                type="number"
                value={form.hourly_wage_max}
                onChange={(e) => setForm({ ...form, hourly_wage_max: e.target.value })}
                className="input"
                step="0.01"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Schedule</label>
              <select
                value={form.schedule_type}
                onChange={(e) => setForm({ ...form, schedule_type: e.target.value })}
                className="input"
              >
                <option value="">Select schedule...</option>
                {SCHEDULE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Number of Openings</label>
              <input
                type="number"
                value={form.openings}
                onChange={(e) => setForm({ ...form, openings: parseInt(e.target.value) || 1 })}
                className="input"
                min="1"
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

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Requirements</label>
              <textarea
                value={form.requirements}
                onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                className="input"
                rows={2}
                placeholder="List any required skills, certifications, or experience"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">External Application URL</label>
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
                setEditingJob(null);
                resetForm();
              }}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.title || !form.company}
              className="btn-primary"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editingJob ? 'Update Job' : 'Add Job'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Job Detail Modal */}
      {selectedJob && (
        <Modal
          isOpen={!!selectedJob}
          onClose={() => setSelectedJob(null)}
          title={selectedJob.title}
          size="lg"
        >
          <div className="px-6 pb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-lg font-medium text-gray-900">{selectedJob.company}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium capitalize',
                      STATUS_COLORS[selectedJob.status]
                    )}
                  >
                    {selectedJob.status.replace('_', ' ')}
                  </span>
                  <span className="text-sm text-gray-500">
                    Posted {format(new Date(selectedJob.created_at), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(selectedJob)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteJob(selectedJob.id)}
                  className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {selectedJob.location && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Location</p>
                  <p className="font-medium text-gray-900">{selectedJob.location}</p>
                </div>
              )}
              {(selectedJob.hourly_wage_min || selectedJob.hourly_wage_max) && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Wage</p>
                  <p className="font-medium text-gray-900">
                    {selectedJob.hourly_wage_min && selectedJob.hourly_wage_max
                      ? `$${selectedJob.hourly_wage_min} - $${selectedJob.hourly_wage_max}/hr`
                      : selectedJob.hourly_wage_min
                      ? `$${selectedJob.hourly_wage_min}+/hr`
                      : `Up to $${selectedJob.hourly_wage_max}/hr`}
                  </p>
                </div>
              )}
              {selectedJob.schedule_type && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Schedule</p>
                  <p className="font-medium text-gray-900">{selectedJob.schedule_type}</p>
                </div>
              )}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Openings</p>
                <p className="font-medium text-gray-900">
                  {selectedJob.openings} ({selectedJob.placements || 0} placed)
                </p>
              </div>
            </div>

            {selectedJob.description && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
                <p className="text-gray-600 whitespace-pre-wrap">{selectedJob.description}</p>
              </div>
            )}

            {selectedJob.requirements && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-1">Requirements</p>
                <p className="text-gray-600 whitespace-pre-wrap">{selectedJob.requirements}</p>
              </div>
            )}

            {(selectedJob.contact_name || selectedJob.contact_email || selectedJob.contact_phone) && (
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-blue-900 mb-2">Contact Information</p>
                {selectedJob.contact_name && (
                  <p className="text-sm text-gray-700">{selectedJob.contact_name}</p>
                )}
                {selectedJob.contact_email && (
                  <p className="text-sm text-gray-700">{selectedJob.contact_email}</p>
                )}
                {selectedJob.contact_phone && (
                  <p className="text-sm text-gray-700">{selectedJob.contact_phone}</p>
                )}
              </div>
            )}

            {selectedJob.external_url && (
              <a
                href={selectedJob.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-canmp-green-600 hover:text-canmp-green-700 mb-4"
              >
                <ExternalLink className="w-4 h-4" />
                View External Listing
              </a>
            )}

            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Update Status</p>
              <div className="flex flex-wrap gap-2">
                {(['active', 'on_hold', 'filled', 'closed'] as JobStatus[]).map((status) => (
                  <button
                    key={status}
                    onClick={() => updateJobStatus(selectedJob.id, status)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize',
                      selectedJob.status === status
                        ? 'bg-canmp-green-500 text-white'
                        : `${STATUS_COLORS[status]} hover:ring-2 hover:ring-canmp-green-300`
                    )}
                  >
                    {status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSelectedJob(null)}
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

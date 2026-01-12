'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  Users,
  GraduationCap,
  ClipboardCheck,
  Search,
  Plus,
  Loader2,
  UserCheck,
  UserX,
  Calendar,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import EnrollmentDetailModal from '@/components/modules/language/EnrollmentDetailModal';
import { AddEnrollmentModal } from '@/components/modules/language/AddEnrollmentModal';

const tabs = [
  { name: 'Classes', href: '/language', icon: BookOpen },
  { name: 'Teachers', href: '/language/teachers', icon: GraduationCap },
  { name: 'Enrollments', href: '/language/enrollments', icon: Users },
  { name: 'Attendance', href: '/language/attendance', icon: ClipboardCheck },
];

interface Enrollment {
  id: string;
  enrolled_date: string;
  status: string;
  pre_test_score: number | null;
  post_test_score: number | null;
  needs_transportation: boolean;
  needs_childcare: boolean;
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

export default function EnrollmentsPage() {
  const pathname = usePathname();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchEnrollments();
  }, []);

  async function fetchEnrollments() {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('class_enrollments')
        .select(`
          *,
          beneficiary:beneficiaries(id, first_name, last_name, email, phone),
          section:class_sections(id, name, level, teacher:teachers(first_name, last_name))
        `)
        .order('enrolled_date', { ascending: false });

      if (error) throw error;
      setEnrollments(data || []);
    } catch (err) {
      console.error('Error fetching enrollments:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredEnrollments = enrollments.filter((e) => {
    const matchesSearch =
      e.beneficiary?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.beneficiary?.last_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.section?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: enrollments.length,
    active: enrollments.filter((e) => e.status === 'active').length,
    completed: enrollments.filter((e) => e.status === 'completed').length,
    withdrawn: enrollments.filter((e) => e.status === 'withdrawn').length,
  };

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
            <h1 className="text-xl font-semibold text-gray-900">Student Enrollments</h1>
            <p className="text-sm text-gray-500">Manage class enrollments and student registrations</p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            New Enrollment
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {Object.entries(statusCounts).map(([status, count]) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                'card p-4 text-left transition-colors',
                statusFilter === status ? 'ring-2 ring-canmp-green-500' : ''
              )}
            >
              <p className="text-2xl font-semibold">{count}</p>
              <p className="text-sm text-gray-500 capitalize">{status === 'all' ? 'Total' : status}</p>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="card p-4 mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by student or class..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        {/* Enrollments Table */}
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-canmp-green-500" />
            <span className="ml-2 text-gray-500">Loading enrollments...</span>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Enrolled</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pre-Test</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Post-Test</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Needs</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEnrollments.map((enrollment) => (
                  <tr key={enrollment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-canmp-green-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-canmp-green-700">
                            {enrollment.beneficiary?.first_name?.[0]}
                            {enrollment.beneficiary?.last_name?.[0]}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {enrollment.beneficiary?.first_name} {enrollment.beneficiary?.last_name}
                          </p>
                          <p className="text-xs text-gray-500">{enrollment.beneficiary?.email || 'No email'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-gray-900">{enrollment.section?.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{enrollment.section?.level}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {new Date(enrollment.enrolled_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                          enrollment.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : enrollment.status === 'completed'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        )}
                      >
                        {enrollment.status === 'active' ? (
                          <UserCheck className="w-3 h-3" />
                        ) : (
                          <UserX className="w-3 h-3" />
                        )}
                        {enrollment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {enrollment.pre_test_score !== null ? `${enrollment.pre_test_score}%` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {enrollment.post_test_score !== null ? `${enrollment.post_test_score}%` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-1">
                        {enrollment.needs_transportation && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">Transport</span>
                        )}
                        {enrollment.needs_childcare && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">Childcare</span>
                        )}
                        {!enrollment.needs_transportation && !enrollment.needs_childcare && (
                          <span className="text-gray-400 text-xs">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedEnrollmentId(enrollment.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredEnrollments.length === 0 && (
              <div className="p-12 text-center text-gray-400">
                No enrollments found matching your criteria.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Enrollment Detail Modal */}
      {selectedEnrollmentId && (
        <EnrollmentDetailModal
          enrollmentId={selectedEnrollmentId}
          isOpen={!!selectedEnrollmentId}
          onClose={() => setSelectedEnrollmentId(null)}
          onSave={fetchEnrollments}
        />
      )}

      {/* Add Enrollment Modal */}
      <AddEnrollmentModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchEnrollments}
      />
    </div>
  );
}

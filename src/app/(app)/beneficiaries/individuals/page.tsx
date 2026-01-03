'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users,
  User,
  FileText,
  Search,
  Plus,
  Loader2,
  Phone,
  Mail,
  Calendar,
  Briefcase,
  GraduationCap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { BeneficiaryDetailModal } from '@/components/modules/beneficiaries/BeneficiaryDetailModal';
import { AddBeneficiaryModal } from '@/components/modules/beneficiaries/AddBeneficiaryModal';
import { format } from 'date-fns';

const tabs = [
  { name: 'Households', href: '/beneficiaries', icon: Users },
  { name: 'Individuals', href: '/beneficiaries/individuals', icon: User },
  { name: 'Case Notes', href: '/beneficiaries/notes', icon: FileText },
];

interface Beneficiary {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  phone: string | null;
  email: string | null;
  is_employed: boolean;
  english_proficiency: string | null;
  household: {
    id: string;
    name: string;
  } | null;
}

export default function IndividualsPage() {
  const pathname = usePathname();
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchBeneficiaries();
  }, []);

  async function fetchBeneficiaries() {
    try {
      const { data, error } = await (supabase as any)
        .from('beneficiaries')
        .select(`
          id, first_name, last_name, date_of_birth, phone, email,
          is_employed, english_proficiency,
          household:households(id, name)
        `)
        .eq('is_active', true)
        .order('last_name');

      if (error) throw error;
      setBeneficiaries(data || []);
    } catch (err) {
      console.error('Error fetching beneficiaries:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredBeneficiaries = beneficiaries.filter(
    (b) =>
      b.first_name.toLowerCase().includes(search.toLowerCase()) ||
      b.last_name.toLowerCase().includes(search.toLowerCase()) ||
      b.household?.name.toLowerCase().includes(search.toLowerCase())
  );

  const employedCount = beneficiaries.filter((b) => b.is_employed).length;

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
            <h1 className="text-xl font-semibold text-gray-900">Individuals</h1>
            <p className="text-sm text-gray-500">
              View and manage individual beneficiary records
            </p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Add Individual
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="card p-4">
            <p className="text-sm text-gray-500">Total Individuals</p>
            <p className="text-2xl font-semibold">{beneficiaries.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Employed</p>
            <p className="text-2xl font-semibold text-green-600">{employedCount}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Seeking Work</p>
            <p className="text-2xl font-semibold text-blue-600">
              {beneficiaries.length - employedCount}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Adults</p>
            <p className="text-2xl font-semibold">
              {
                beneficiaries.filter((b) => {
                  if (!b.date_of_birth) return true;
                  const age =
                    new Date().getFullYear() - new Date(b.date_of_birth).getFullYear();
                  return age >= 18;
                }).length
              }
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="card p-4 mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or household..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        {/* Individuals List */}
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-canmp-green-500" />
            <span className="ml-2 text-gray-500">Loading...</span>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Household
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date of Birth
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    English
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Employment
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredBeneficiaries.map((beneficiary) => (
                  <tr
                    key={beneficiary.id}
                    onClick={() => setSelectedId(beneficiary.id)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-canmp-green-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-canmp-green-700">
                            {beneficiary.first_name[0]}
                            {beneficiary.last_name[0]}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {beneficiary.first_name} {beneficiary.last_name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {beneficiary.household?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        {beneficiary.phone && (
                          <div className="flex items-center gap-1 text-gray-500">
                            <Phone className="w-3 h-3" />
                            {beneficiary.phone}
                          </div>
                        )}
                        {beneficiary.email && (
                          <div className="flex items-center gap-1 text-gray-500 mt-1">
                            <Mail className="w-3 h-3" />
                            {beneficiary.email}
                          </div>
                        )}
                        {!beneficiary.phone && !beneficiary.email && (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {beneficiary.date_of_birth
                        ? format(new Date(beneficiary.date_of_birth), 'MMM d, yyyy')
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={cn(
                          'px-2 py-1 rounded-full text-xs font-medium capitalize',
                          beneficiary.english_proficiency === 'fluent' ||
                            beneficiary.english_proficiency === 'native'
                            ? 'bg-green-100 text-green-700'
                            : beneficiary.english_proficiency === 'advanced' ||
                              beneficiary.english_proficiency === 'intermediate'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        )}
                      >
                        {beneficiary.english_proficiency || 'Not assessed'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {beneficiary.is_employed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <Briefcase className="w-3 h-3" />
                          Employed
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredBeneficiaries.length === 0 && (
              <div className="p-12 text-center text-gray-400">
                No individuals found matching your search.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Beneficiary Detail Modal */}
      {selectedId && (
        <BeneficiaryDetailModal
          isOpen={!!selectedId}
          onClose={() => setSelectedId(null)}
          beneficiaryId={selectedId}
          onSave={fetchBeneficiaries}
          onDelete={fetchBeneficiaries}
        />
      )}

      {/* Add Beneficiary Modal */}
      <AddBeneficiaryModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchBeneficiaries}
      />
    </div>
  );
}

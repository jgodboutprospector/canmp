'use client';

import { useState, useMemo, memo } from 'react';
import { Plus, Search, Users, MapPin, Globe, ChevronRight, Loader2, Calendar } from 'lucide-react';
import { useHouseholds } from '@/lib/hooks/useHouseholds';
import { AddHouseholdModal } from './AddHouseholdModal';
import { HouseholdDetailModal } from './HouseholdDetailModal';
import { StatCard } from '@/components/ui/StatCard';

// Memoized household card component to prevent unnecessary re-renders
const HouseholdCard = memo(function HouseholdCard({
  household,
  onClick,
}: {
  household: ReturnType<typeof useHouseholds>['households'][0];
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="card p-5 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-canmp-green-100 flex items-center justify-center">
            <Users className="w-6 h-6 text-canmp-green-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 text-lg">{household.name}</h3>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" />
                {household.country_of_origin || 'Unknown'}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {household.site?.name || 'Unassigned'}
              </span>
              {household.date_arrived_maine && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Arrived {new Date(household.date_arrived_maine).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              {household.beneficiaries?.length || 0} members
            </p>
            <p className="text-xs text-gray-500">
              {household.primary_language || 'Language not set'}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
      </div>

      {/* Members Preview */}
      {household.beneficiaries && household.beneficiaries.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex flex-wrap gap-2">
            {household.beneficiaries.slice(0, 5).map((b) => (
              <span
                key={b.id}
                className={`text-xs px-2 py-1 rounded-full ${
                  b.relationship_type === 'head_of_household'
                    ? 'bg-canmp-green-100 text-canmp-green-700'
                    : b.relationship_type === 'spouse'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {b.first_name} {b.last_name}
                {b.relationship_type === 'head_of_household' && ' (Head)'}
              </span>
            ))}
            {household.beneficiaries.length > 5 && (
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                +{household.beneficiaries.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default function HouseholdsList() {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string | null>(null);
  const { households, loading, error, refetch } = useHouseholds();

  // Memoize filtered households to prevent recalculation on every render
  const filtered = useMemo(
    () =>
      households.filter(
        (h) =>
          h.name.toLowerCase().includes(search.toLowerCase()) ||
          h.country_of_origin?.toLowerCase().includes(search.toLowerCase()) ||
          h.primary_language?.toLowerCase().includes(search.toLowerCase())
      ),
    [households, search]
  );

  // Memoize stats calculations
  const stats = useMemo(() => {
    const totalBeneficiaries = households.reduce(
      (sum, h) => sum + (h.beneficiaries?.length || 0),
      0
    );
    const watervilleCount = households.filter((h) => h.site?.location === 'waterville').length;
    const augustaCount = households.filter((h) => h.site?.location === 'augusta').length;

    return { totalBeneficiaries, watervilleCount, augustaCount };
  }, [households]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-canmp-green-500" />
        <span className="ml-2 text-gray-500">Loading households...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="card p-6 bg-red-50 border-red-200">
          <p className="text-red-600 font-medium">Error loading households</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Households
          </h1>
          <p className="text-sm text-gray-500">Manage families and individuals in the program</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Household
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Households" value={households.length} />
        <StatCard label="Total Beneficiaries" value={stats.totalBeneficiaries} />
        <StatCard label="Waterville" value={stats.watervilleCount} variant="green" />
        <StatCard label="Augusta" value={stats.augustaCount} variant="blue" />
      </div>

      {/* Search */}
      <div className="card p-4 mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search households, countries, languages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Households List */}
      <div className="space-y-3">
        {filtered.map((household) => (
          <HouseholdCard
            key={household.id}
            household={household}
            onClick={() => setSelectedHouseholdId(household.id)}
          />
        ))}

        {filtered.length === 0 && (
          <div className="card p-12 text-center text-gray-400">
            No households found matching your search.
          </div>
        )}
      </div>

      {/* Add Household Modal */}
      <AddHouseholdModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={refetch}
      />

      {/* Household Detail Modal */}
      {selectedHouseholdId && (
        <HouseholdDetailModal
          isOpen={!!selectedHouseholdId}
          onClose={() => setSelectedHouseholdId(null)}
          householdId={selectedHouseholdId}
          onDelete={refetch}
        />
      )}
    </div>
  );
}

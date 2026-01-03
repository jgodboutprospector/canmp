'use client';

import { useState } from 'react';
import { Plus, Search, Building2, MapPin, Home, ChevronRight, Loader2 } from 'lucide-react';
import { useProperties } from '@/lib/hooks/useProperties';
import { PropertyDetailModal } from './PropertyDetailModal';
import { AddPropertyModal } from './AddPropertyModal';

export default function PropertiesList() {
  const [search, setSearch] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const { properties: dbProperties, loading, error, refetch } = useProperties();

  // Transform database properties to display format
  const properties = dbProperties.map((p) => {
    const occupiedUnits = p.units?.filter((u) => u.status === 'occupied').length || 0;
    const availableUnits = p.units?.filter((u) => u.status === 'available').length || 0;
    return {
      id: p.id,
      name: p.name,
      address: `${p.address_street}, ${p.address_city}, ${p.address_state} ${p.address_zip}`,
      type: p.property_type,
      totalUnits: p.total_units || 0,
      occupiedUnits,
      availableUnits,
      landlord: p.landlord_name,
    };
  });

  const filtered = properties.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.address.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnits = properties.reduce((sum, p) => sum + p.totalUnits, 0);
  const occupiedUnits = properties.reduce((sum, p) => sum + p.occupiedUnits, 0);
  const availableUnits = properties.reduce((sum, p) => sum + p.availableUnits, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-canmp-green-500" />
        <span className="ml-2 text-gray-500">Loading properties...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="card p-6 bg-red-50 border-red-200">
          <p className="text-red-600 font-medium">Error loading properties</p>
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
          <h1 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>Properties</h1>
          <p className="text-sm text-gray-500">Manage CANMP properties and units</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Property
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-sm text-gray-500">Total Properties</p>
          <p className="text-2xl font-semibold">{properties.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Total Units</p>
          <p className="text-2xl font-semibold">{totalUnits}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Occupied</p>
          <p className="text-2xl font-semibold text-canmp-green-600">{occupiedUnits}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Available</p>
          <p className="text-2xl font-semibold text-blue-600">{availableUnits}</p>
        </div>
      </div>

      {/* Search */}
      <div className="card p-4 mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search properties..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Properties Grid */}
      <div className="grid grid-cols-2 gap-4">
        {filtered.map((property) => (
          <div
            key={property.id}
            onClick={() => setSelectedPropertyId(property.id)}
            className="card p-5 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-canmp-green-100 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-canmp-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{property.name}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {property.address}
                  </p>
                </div>
              </div>
              <span
                className={`badge ${
                  property.type === 'canmp_owned' ? 'badge-success' : 'badge-purple'
                }`}
              >
                {property.type === 'canmp_owned' ? 'CANMP Owned' : 'Master Lease'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Home className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {property.totalUnits} unit{property.totalUnits !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-canmp-green-600 font-medium">{property.occupiedUnits}</span>
                  <span className="text-gray-400"> occupied</span>
                </div>
                {property.availableUnits > 0 && (
                  <div className="text-sm">
                    <span className="text-blue-600 font-medium">{property.availableUnits}</span>
                    <span className="text-gray-400"> available</span>
                  </div>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>

            {property.landlord && (
              <p className="text-xs text-gray-500 mt-2">Landlord: {property.landlord}</p>
            )}
          </div>
        ))}
      </div>

      {/* Add Property Modal */}
      <AddPropertyModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={refetch}
      />

      {/* Property Detail Modal */}
      {selectedPropertyId && (
        <PropertyDetailModal
          isOpen={!!selectedPropertyId}
          onClose={() => setSelectedPropertyId(null)}
          propertyId={selectedPropertyId}
          onDelete={refetch}
        />
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import {
  Package,
  Search,
  Plus,
  Loader2,
  Grid,
  List,
  Filter,
  ImageIcon,
  User,
  Calendar,
  MapPin,
  Check,
  Edit2,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { Modal } from '@/components/ui/Modal';

type DonationCategory =
  | 'furniture'
  | 'kitchen'
  | 'bedding'
  | 'bathroom'
  | 'electronics'
  | 'clothing'
  | 'baby'
  | 'household'
  | 'other';

type DonationStatus = 'available' | 'reserved' | 'claimed' | 'pending_pickup';

interface DonationItem {
  id: string;
  name: string;
  description: string | null;
  category: DonationCategory;
  condition: string | null;
  quantity: number;
  status: DonationStatus;
  location: string | null;
  bin_number: string | null;
  donor_name: string | null;
  donated_date: string | null;
  image_path: string | null;
  claimed_by_household: {
    id: string;
    name: string;
  } | null;
}

const CATEGORIES: { id: DonationCategory; label: string; icon: string }[] = [
  { id: 'furniture', label: 'Furniture', icon: '🪑' },
  { id: 'kitchen', label: 'Kitchen', icon: '🍳' },
  { id: 'bedding', label: 'Bedding', icon: '🛏️' },
  { id: 'bathroom', label: 'Bathroom', icon: '🛁' },
  { id: 'electronics', label: 'Electronics', icon: '📺' },
  { id: 'clothing', label: 'Clothing', icon: '👕' },
  { id: 'baby', label: 'Baby Items', icon: '👶' },
  { id: 'household', label: 'Household', icon: '🏠' },
  { id: 'other', label: 'Other', icon: '📦' },
];

const STATUS_COLORS: Record<DonationStatus, string> = {
  available: 'bg-green-100 text-green-700',
  reserved: 'bg-yellow-100 text-yellow-700',
  claimed: 'bg-blue-100 text-blue-700',
  pending_pickup: 'bg-purple-100 text-purple-700',
};

export default function DonationsPage() {
  const [items, setItems] = useState<DonationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<DonationCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<DonationStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DonationItem | null>(null);
  const [editingItem, setEditingItem] = useState<DonationItem | null>(null);

  // Add form state
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    category: 'furniture' as DonationCategory,
    condition: 'good',
    quantity: 1,
    location: '',
    bin_number: '',
    donor_name: '',
    donor_phone: '',
    donor_email: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    try {
      const { data, error } = await (supabase as any)
        .from('donation_items')
        .select(`
          *,
          claimed_by_household:households(id, name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error('Error fetching items:', err);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setNewItem({
      name: '',
      description: '',
      category: 'furniture',
      condition: 'good',
      quantity: 1,
      location: '',
      bin_number: '',
      donor_name: '',
      donor_phone: '',
      donor_email: '',
    });
    setEditingItem(null);
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      const itemData = {
        name: newItem.name.trim(),
        description: newItem.description.trim() || null,
        category: newItem.category,
        condition: newItem.condition,
        quantity: newItem.quantity,
        location: newItem.location.trim() || null,
        bin_number: newItem.bin_number.trim() || null,
        donor_name: newItem.donor_name.trim() || null,
        donor_phone: newItem.donor_phone.trim() || null,
        donor_email: newItem.donor_email.trim() || null,
      };

      if (editingItem) {
        const { error } = await (supabase as any)
          .from('donation_items')
          .update(itemData)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('donation_items').insert({
          ...itemData,
          status: 'available',
          donated_date: new Date().toISOString().split('T')[0],
        });
        if (error) throw error;
      }

      setShowAddModal(false);
      resetForm();
      await fetchItems();
    } catch (err) {
      console.error('Error saving item:', err);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(item: DonationItem) {
    setEditingItem(item);
    setNewItem({
      name: item.name,
      description: item.description || '',
      category: item.category,
      condition: item.condition || 'good',
      quantity: item.quantity,
      location: item.location || '',
      bin_number: item.bin_number || '',
      donor_name: item.donor_name || '',
      donor_phone: '',
      donor_email: '',
    });
    setSelectedItem(null);
    setShowAddModal(true);
  }

  async function deleteItem(itemId: string) {
    if (!confirm('Are you sure you want to delete this donation item?')) return;

    try {
      const { error } = await (supabase as any)
        .from('donation_items')
        .update({ is_active: false })
        .eq('id', itemId);
      if (error) throw error;
      await fetchItems();
      setSelectedItem(null);
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  }

  async function updateItemStatus(itemId: string, status: DonationStatus) {
    try {
      const { error } = await (supabase as any)
        .from('donation_items')
        .update({ status })
        .eq('id', itemId);

      if (error) throw error;
      await fetchItems();
      setSelectedItem(null);
    } catch (err) {
      console.error('Error updating item:', err);
    }
  }

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const availableCount = items.filter((i) => i.status === 'available').length;

  return (
    <div className="min-h-full p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Donation Hub</h1>
          <p className="text-sm text-gray-500">
            Manage donated household items for families
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-sm text-gray-500">Total Items</p>
          <p className="text-2xl font-semibold">{items.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Available</p>
          <p className="text-2xl font-semibold text-green-600">{availableCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Reserved</p>
          <p className="text-2xl font-semibold text-yellow-600">
            {items.filter((i) => i.status === 'reserved').length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Claimed</p>
          <p className="text-2xl font-semibold text-blue-600">
            {items.filter((i) => i.status === 'claimed').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as DonationCategory | 'all')}
            className="input w-40"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DonationStatus | 'all')}
            className="input w-36"
          >
            <option value="all">All Status</option>
            <option value="available">Available</option>
            <option value="reserved">Reserved</option>
            <option value="claimed">Claimed</option>
            <option value="pending_pickup">Pending Pickup</option>
          </select>

          <div className="flex border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2',
                viewMode === 'grid' ? 'bg-canmp-green-50 text-canmp-green-600' : 'text-gray-500'
              )}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2',
                viewMode === 'list' ? 'bg-canmp-green-50 text-canmp-green-600' : 'text-gray-500'
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Items */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-canmp-green-500" />
          <span className="ml-2 text-gray-500">Loading items...</span>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="card overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
            >
              {/* Image placeholder */}
              <div className="h-32 bg-gray-100 flex items-center justify-center">
                {item.image_path ? (
                  <img
                    src={item.image_path}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-4xl">
                    {CATEGORIES.find((c) => c.id === item.category)?.icon || '📦'}
                  </div>
                )}
              </div>

              <div className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-gray-900 text-sm line-clamp-1">
                    {item.name}
                  </h3>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium capitalize',
                      STATUS_COLORS[item.status]
                    )}
                  >
                    {item.status.replace('_', ' ')}
                  </span>
                </div>

                <p className="text-xs text-gray-500 capitalize mb-2">{item.category}</p>

                {item.quantity > 1 && (
                  <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
                )}

                {item.location && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <MapPin className="w-3 h-3" />
                    {item.location}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Item
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Condition
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Qty
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Location
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">
                        {CATEGORIES.find((c) => c.id === item.category)?.icon || '📦'}
                      </span>
                      <span className="font-medium text-gray-900">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 capitalize">{item.category}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 capitalize">
                    {item.condition || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.quantity}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.location || '-'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium capitalize',
                        STATUS_COLORS[item.status]
                      )}
                    >
                      {item.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredItems.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-400">
          No items found matching your filters.
        </div>
      )}

      {/* Add/Edit Item Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
        title={editingItem ? 'Edit Donation Item' : 'Add Donation Item'}
        size="lg"
      >
        <div className="px-6 pb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
              <input
                type="text"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                className="input"
                placeholder="e.g., Queen Size Mattress"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                className="input"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value as DonationCategory })}
                className="input"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
              <select
                value={newItem.condition}
                onChange={(e) => setNewItem({ ...newItem, condition: e.target.value })}
                className="input"
              >
                <option value="new">New</option>
                <option value="like_new">Like New</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                className="input"
                min={1}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={newItem.location}
                onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                className="input"
                placeholder="e.g., Storage Unit A"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bin Number</label>
              <input
                type="text"
                value={newItem.bin_number}
                onChange={(e) => setNewItem({ ...newItem, bin_number: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Donor Name</label>
              <input
                type="text"
                value={newItem.donor_name}
                onChange={(e) => setNewItem({ ...newItem, donor_name: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <button
              onClick={() => {
                setShowAddModal(false);
                resetForm();
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !newItem.name}
              className="btn-primary"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingItem ? null : <Plus className="w-4 h-4" />}
              {editingItem ? 'Update Item' : 'Add Item'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Item Detail Modal */}
      {selectedItem && (
        <Modal
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          title={selectedItem.name}
          size="lg"
        >
          <div className="px-6 pb-6">
            {/* Edit/Delete buttons */}
            <div className="flex justify-end gap-2 mb-4">
              <button
                onClick={() => startEdit(selectedItem)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                title="Edit item"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => deleteItem(selectedItem.id)}
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                title="Delete item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Category</p>
                <p className="font-medium text-gray-900 capitalize">
                  {CATEGORIES.find((c) => c.id === selectedItem.category)?.icon}{' '}
                  {selectedItem.category}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Condition</p>
                <p className="font-medium text-gray-900 capitalize">
                  {selectedItem.condition || 'Not specified'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Quantity</p>
                <p className="font-medium text-gray-900">{selectedItem.quantity}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Location</p>
                <p className="font-medium text-gray-900">
                  {selectedItem.location || 'Not specified'}
                  {selectedItem.bin_number && ` (Bin ${selectedItem.bin_number})`}
                </p>
              </div>
            </div>

            {selectedItem.description && (
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
                <p className="text-gray-600">{selectedItem.description}</p>
              </div>
            )}

            {selectedItem.donor_name && (
              <div className="bg-yellow-50 rounded-lg p-3 mb-6">
                <p className="text-xs text-yellow-700 font-medium mb-1">Donor</p>
                <p className="text-sm text-gray-900">{selectedItem.donor_name}</p>
                {selectedItem.donated_date && (
                  <p className="text-xs text-gray-500 mt-1">
                    Donated: {format(new Date(selectedItem.donated_date), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            )}

            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Update Status</p>
              <div className="flex flex-wrap gap-2">
                {(['available', 'reserved', 'pending_pickup', 'claimed'] as DonationStatus[]).map(
                  (status) => (
                    <button
                      key={status}
                      onClick={() => updateItemStatus(selectedItem.id, status)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize',
                        selectedItem.status === status
                          ? 'bg-canmp-green-500 text-white'
                          : `${STATUS_COLORS[status]} hover:ring-2 hover:ring-canmp-green-300`
                      )}
                    >
                      {status.replace('_', ' ')}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <button
                onClick={() => setSelectedItem(null)}
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

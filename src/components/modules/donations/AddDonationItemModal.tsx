'use client';

import { useState, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { Loader2, Upload, X, Image as ImageIcon } from 'lucide-react';

interface AddDonationItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  { value: 'furniture', label: 'Furniture' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'bedding', label: 'Bedding' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'baby', label: 'Baby Items' },
  { value: 'household', label: 'Household' },
  { value: 'other', label: 'Other' },
];

const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
];

interface PhotoPreview {
  file: File;
  preview: string;
}

export function AddDonationItemModal({ isOpen, onClose, onSuccess }: AddDonationItemModalProps) {
  const [loading, setLoading] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);

  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'household',
    condition: 'good',
    quantity: 1,
    location: '',
    bin_number: '',
    donor_name: '',
    donor_phone: '',
    donor_email: '',
  });

  function resetForm() {
    setForm({
      name: '',
      description: '',
      category: 'household',
      condition: 'good',
      quantity: 1,
      location: '',
      bin_number: '',
      donor_name: '',
      donor_phone: '',
      donor_email: '',
    });
    // Clean up photo previews
    photos.forEach(photo => URL.revokeObjectURL(photo.preview));
    setPhotos([]);
    setError('');
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    const newPhotos: PhotoPreview[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        newPhotos.push({
          file,
          preview: URL.createObjectURL(file),
        });
      }
    }

    setPhotos(prev => [...prev, ...newPhotos]);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function removePhoto(index: number) {
    setPhotos(prev => {
      const newPhotos = [...prev];
      URL.revokeObjectURL(newPhotos[index].preview);
      newPhotos.splice(index, 1);
      return newPhotos;
    });
  }

  async function uploadPhotosToS3(donationItemId: string): Promise<string | null> {
    if (photos.length === 0) return null;

    setUploadingPhotos(true);
    let primaryImageUrl: string | null = null;

    try {
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];

        // Upload to S3 via API route
        const formData = new FormData();
        formData.append('file', photo.file);
        formData.append('donation_item_id', donationItemId);
        formData.append('is_primary', (i === 0).toString());

        const response = await fetch('/api/donations/photos', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to upload photo');
        }

        if (i === 0 && result.data?.s3_url) {
          primaryImageUrl = result.data.s3_url;
        }
      }

      return primaryImageUrl;
    } catch (err) {
      console.error('Photo upload error:', err);
      throw err;
    } finally {
      setUploadingPhotos(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // First create the donation item
      const { data: insertedItem, error: insertError } = await (supabase as any)
        .from('donation_items')
        .insert({
          name: form.name.trim(),
          description: form.description.trim() || null,
          category: form.category,
          condition: form.condition,
          quantity: form.quantity,
          location: form.location.trim() || null,
          bin_number: form.bin_number.trim() || null,
          donor_name: form.donor_name.trim() || null,
          donor_phone: form.donor_phone.trim() || null,
          donor_email: form.donor_email.trim() || null,
          status: 'available',
          donated_date: new Date().toISOString().split('T')[0],
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Error saving item:', insertError);
        throw insertError;
      }

      // If we have photos, upload them
      if (photos.length > 0 && insertedItem?.id) {
        try {
          const primaryImageUrl = await uploadPhotosToS3(insertedItem.id);

          // Update the item with the primary image URL
          if (primaryImageUrl) {
            await (supabase as any)
              .from('donation_items')
              .update({ image_path: primaryImageUrl })
              .eq('id', insertedItem.id);
          }
        } catch (photoErr) {
          // Photos failed but item was created - show warning but don't fail
          console.error('Photo upload failed:', photoErr);
          setError('Item created but photos failed to upload. You can add photos later.');
          onSuccess();
          handleClose();
          return;
        }
      }

      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add donation item');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Donation Item" size="lg">
      <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Item Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Item Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., Queen Size Bed Frame"
            className="input"
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="input"
              required
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* Condition */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Condition <span className="text-red-500">*</span>
            </label>
            <select
              value={form.condition}
              onChange={(e) => setForm({ ...form, condition: e.target.value })}
              className="input"
              required
            >
              {CONDITIONS.map((cond) => (
                <option key={cond.value} value={cond.value}>{cond.label}</option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })}
              min={1}
              className="input"
              required
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Describe the item (color, size, brand, etc.)"
            className="input"
            rows={2}
          />
        </div>

        {/* Photo Upload Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Photos</label>

          {/* Photo previews */}
          {photos.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {photos.map((photo, index) => (
                <div key={index} className="relative group">
                  <img
                    src={photo.preview}
                    alt={`Preview ${index + 1}`}
                    className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                  />
                  {index === 0 && (
                    <span className="absolute -top-1 -left-1 bg-blue-500 text-white text-xs px-1 rounded">
                      Main
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload button */}
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="photo-upload"
            />
            <label
              htmlFor="photo-upload"
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
            >
              {photos.length === 0 ? (
                <>
                  <Upload className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Add Photos</span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Add More Photos</span>
                </>
              )}
            </label>
            {photos.length > 0 && (
              <span className="text-sm text-gray-500">{photos.length} photo{photos.length !== 1 ? 's' : ''} selected</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">First photo will be used as the main image</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Storage Location</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g., Warehouse A"
              className="input"
            />
          </div>

          {/* Bin Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bin/Shelf Number</label>
            <input
              type="text"
              value={form.bin_number}
              onChange={(e) => setForm({ ...form, bin_number: e.target.value })}
              placeholder="e.g., A-12"
              className="input"
            />
          </div>
        </div>

        {/* Donor Information */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <h4 className="text-sm font-medium text-gray-900">Donor Information (Optional)</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Donor Name</label>
              <input
                type="text"
                value={form.donor_name}
                onChange={(e) => setForm({ ...form, donor_name: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={form.donor_phone}
                onChange={(e) => setForm({ ...form, donor_phone: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.donor_email}
                onChange={(e) => setForm({ ...form, donor_email: e.target.value })}
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || uploadingPhotos || !form.name.trim()}
            className="btn-primary"
          >
            {loading || uploadingPhotos ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {uploadingPhotos ? 'Uploading Photos...' : 'Adding...'}
              </>
            ) : (
              'Add Item'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

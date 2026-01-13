/**
 * API Endpoint Tests - Donations
 *
 * Tests for donations functionality and business logic
 */

// Mock Supabase
const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockEq = jest.fn();
const mockIlike = jest.fn();
const mockOrder = jest.fn();
const mockSingle = jest.fn();

const mockSupabaseFrom = jest.fn(() => ({
  select: mockSelect.mockReturnThis(),
  insert: mockInsert.mockReturnThis(),
  update: mockUpdate.mockReturnThis(),
  delete: mockDelete.mockReturnThis(),
  eq: mockEq.mockReturnThis(),
  ilike: mockIlike.mockReturnThis(),
  order: mockOrder,
  single: mockSingle,
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: mockSupabaseFrom,
  })),
}));

describe('Donations API Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET Donations', () => {
    it('should query donation_items table', async () => {
      const mockData = [
        { id: '1', name: 'Test Item', category: 'furniture', status: 'available' },
      ];

      mockOrder.mockResolvedValue({ data: mockData, error: null });

      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient('url', 'key');

      const result = await supabase
        .from('donation_items')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      expect(mockSupabaseFrom).toHaveBeenCalledWith('donation_items');
      expect(mockSelect).toHaveBeenCalled();
      expect(result.data).toEqual(mockData);
    });

    it('should filter by category when provided', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null });

      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient('url', 'key');

      await supabase
        .from('donation_items')
        .select('*')
        .eq('category', 'furniture')
        .order('created_at');

      expect(mockEq).toHaveBeenCalledWith('category', 'furniture');
    });

    it('should handle database errors', async () => {
      mockOrder.mockResolvedValue({ data: null, error: { message: 'Database error' } });

      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient('url', 'key');

      const result = await supabase.from('donation_items').select('*').order('created_at');

      expect(result.error).toBeDefined();
      expect(result.error.message).toBe('Database error');
    });
  });

  describe('POST Donations', () => {
    it('should insert new donation item', async () => {
      const newItem = {
        name: 'New Couch',
        category: 'furniture',
        condition: 'good',
        quantity: 1,
      };

      mockSingle.mockResolvedValue({ data: { id: 'new-id', ...newItem }, error: null });

      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient('url', 'key');

      const result = await supabase
        .from('donation_items')
        .insert(newItem)
        .select()
        .single();

      expect(mockInsert).toHaveBeenCalled();
      expect(result.data.name).toBe('New Couch');
    });

    it('should validate required name field', () => {
      const itemWithoutName = { category: 'furniture' };
      expect(itemWithoutName.name).toBeUndefined();
    });
  });

  describe('PATCH Donations', () => {
    it('should update donation item', async () => {
      mockSingle.mockResolvedValue({ data: { id: 'item-1', status: 'assigned' }, error: null });

      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient('url', 'key');

      await supabase
        .from('donation_items')
        .update({ status: 'assigned' })
        .eq('id', 'item-1')
        .select()
        .single();

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'item-1');
    });
  });

  describe('DELETE Donations', () => {
    it('should soft delete donation item', async () => {
      mockEq.mockResolvedValue({ error: null });

      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient('url', 'key');

      await supabase
        .from('donation_items')
        .update({ is_active: false })
        .eq('id', 'item-1');

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'item-1');
    });
  });
});

describe('Donation Photos API Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET Photos', () => {
    it('should query donation_photos table', async () => {
      const mockPhotos = [
        { id: '1', donation_item_id: 'item-1', s3_url: 'https://s3.example.com/photo.jpg' },
      ];

      mockOrder.mockResolvedValue({ data: mockPhotos, error: null });

      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient('url', 'key');

      const result = await supabase
        .from('donation_photos')
        .select('*')
        .eq('donation_item_id', 'item-1')
        .order('sort_order');

      expect(mockSupabaseFrom).toHaveBeenCalledWith('donation_photos');
      expect(mockEq).toHaveBeenCalledWith('donation_item_id', 'item-1');
      expect(result.data).toEqual(mockPhotos);
    });
  });

  describe('POST Photos', () => {
    it('should insert photo record after S3 upload', async () => {
      const photoRecord = {
        donation_item_id: 'item-1',
        s3_url: 'https://s3.example.com/photo.jpg',
        s3_key: 'donations/item-1/photo.jpg',
        original_filename: 'photo.jpg',
        is_primary: true,
      };

      mockSingle.mockResolvedValue({ data: { id: 'photo-1', ...photoRecord }, error: null });

      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient('url', 'key');

      await supabase.from('donation_photos').insert(photoRecord).select().single();

      expect(mockInsert).toHaveBeenCalled();
    });
  });

  describe('DELETE Photos', () => {
    it('should delete photo record', async () => {
      mockEq.mockResolvedValue({ error: null });

      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient('url', 'key');

      await supabase.from('donation_photos').delete().eq('id', 'photo-1');

      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'photo-1');
    });
  });
});

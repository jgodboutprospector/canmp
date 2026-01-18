import { renderHook, waitFor, act } from '@testing-library/react';
import { useDonations } from '@/lib/hooks/useDonations';

global.fetch = jest.fn();

describe('useDonations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockDonations = [
    {
      id: 'donation-1',
      name: 'Sofa',
      description: 'Blue sofa in good condition',
      category: 'furniture' as const,
      condition: 'good',
      quantity: 1,
      status: 'available' as const,
      location: 'Warehouse A',
      bin_number: 'A-101',
      donor_name: 'John Doe',
      donated_date: '2024-01-15',
      image_path: null,
      photos: [],
      claimed_by_household: null,
    },
    {
      id: 'donation-2',
      name: 'Dining Table',
      description: 'Wooden table with 4 chairs',
      category: 'furniture' as const,
      condition: 'excellent',
      quantity: 1,
      status: 'claimed' as const,
      location: 'Warehouse B',
      bin_number: 'B-205',
      donor_name: 'Jane Smith',
      donated_date: '2024-01-20',
      image_path: null,
      photos: [],
      claimed_by_household: { id: 'household-1', name: 'Smith Family' },
    },
  ];

  it('should start with loading state', () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useDonations());

    expect(result.current.loading).toBe(true);
    expect(result.current.items).toEqual([]);
  });

  it('should fetch donations successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ success: true, data: mockDonations }),
    });

    const { result } = renderHook(() => useDonations());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.items).toEqual(mockDonations);
    expect(result.current.error).toBeNull();
  });

  it('should filter by category', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ success: true, data: mockDonations }),
    });

    renderHook(() => useDonations({ category: 'furniture' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('category=furniture'));
    });
  });

  it('should filter by status', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ success: true, data: [mockDonations[0]] }),
    });

    renderHook(() => useDonations({ status: 'available' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('status=available'));
    });
  });

  it('should support search functionality', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ success: true, data: mockDonations }),
    });

    renderHook(() => useDonations({ search: 'sofa' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('search=sofa'));
    });
  });

  it('should handle errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ success: false, error: 'Failed to fetch donations' }),
    });

    const { result } = renderHook(() => useDonations());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch donations');
    expect(result.current.items).toEqual([]);
  });

  it('should handle network errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useDonations());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to connect to API');
  });

  it('should create donation item successfully', async () => {
    const newDonation = { ...mockDonations[0], id: 'donation-3', name: 'New Chair' };
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockDonations }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: newDonation }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: [...mockDonations, newDonation] }),
      });

    const { result } = renderHook(() => useDonations());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let createdItem;
    await act(async () => {
      createdItem = await result.current.createItem({
        name: 'New Chair',
        category: 'furniture',
      });
    });

    expect(createdItem).toEqual(newDonation);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/donations',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('should update donation item successfully', async () => {
    const updatedDonation = { ...mockDonations[0], status: 'reserved' as const };
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockDonations }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: updatedDonation }),
      });

    const { result } = renderHook(() => useDonations());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let updatedItem;
    await act(async () => {
      updatedItem = await result.current.updateItem({
        id: 'donation-1',
        status: 'reserved',
      });
    });

    expect(updatedItem).toEqual(updatedDonation);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/donations',
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  it('should delete donation item successfully', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockDonations }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true }),
      });

    const { result } = renderHook(() => useDonations());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success;
    await act(async () => {
      success = await result.current.deleteItem('donation-1');
    });

    expect(success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/donations?id=donation-1'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('should update filters', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ success: true, data: mockDonations }),
    });

    const { result } = renderHook(() => useDonations());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.filters).toEqual({});

    await act(async () => {
      result.current.updateFilters({ category: 'furniture' });
    });

    await waitFor(() => {
      expect(result.current.filters.category).toBe('furniture');
    });
  });

  it('should include inactive items when filter is set', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ success: true, data: mockDonations }),
    });

    renderHook(() => useDonations({ includeInactive: true }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('include_inactive=true'));
    });
  });

  it('should not include category filter when set to all', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ success: true, data: mockDonations }),
    });

    renderHook(() => useDonations({ category: 'all' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.not.stringContaining('category='));
    });
  });
});

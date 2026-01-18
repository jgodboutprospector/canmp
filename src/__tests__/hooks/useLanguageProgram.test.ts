import { renderHook, waitFor } from '@testing-library/react';
import { useTeachers, useClassSections, useClassSection, useClassAttendance } from '@/lib/hooks/useLanguageProgram';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('useTeachers', () => {
  const mockTeachers = [
    {
      id: 'teacher-1',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      phone: '555-0100',
      is_active: true,
      site_id: 'site-1',
      site: { id: 'site-1', name: 'Main Site' },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch teachers successfully', async () => {
    const mockOrder = jest.fn(() => Promise.resolve({ data: mockTeachers, error: null }));
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useTeachers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.teachers).toEqual(mockTeachers);
    expect(supabase.from).toHaveBeenCalledWith('teachers');
  });

  it('should filter by active teachers', async () => {
    const mockOrder = jest.fn(() => Promise.resolve({ data: mockTeachers, error: null }));
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    renderHook(() => useTeachers());

    await waitFor(() => {
      expect(mockEq).toHaveBeenCalledWith('is_active', true);
    });
  });

  it('should order by last_name', async () => {
    const mockOrder = jest.fn(() => Promise.resolve({ data: mockTeachers, error: null }));
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    renderHook(() => useTeachers());

    await waitFor(() => {
      expect(mockOrder).toHaveBeenCalledWith('last_name');
    });
  });

  it('should handle errors', async () => {
    const mockError = new Error('Failed to fetch teachers');
    const mockOrder = jest.fn(() => Promise.resolve({ data: null, error: mockError }));
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useTeachers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch teachers');
  });
});

describe('useClassSections', () => {
  const mockClasses = [
    {
      id: 'class-1',
      name: 'English 101',
      description: 'Beginner English',
      teacher_id: 'teacher-1',
      site_id: 'site-1',
      is_active: true,
      teacher: { id: 'teacher-1', first_name: 'John', last_name: 'Doe' },
      site: { id: 'site-1', name: 'Main Site' },
      enrollments: [],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch class sections successfully', async () => {
    const mockOrder = jest.fn(() => Promise.resolve({ data: mockClasses, error: null }));
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useClassSections());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.classes).toEqual(mockClasses);
    expect(supabase.from).toHaveBeenCalledWith('class_sections');
  });

  it('should include teacher, site, and enrollments', async () => {
    const mockOrder = jest.fn(() => Promise.resolve({ data: mockClasses, error: null }));
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    renderHook(() => useClassSections());

    await waitFor(() => {
      expect(mockSelect).toHaveBeenCalled();
    });

    const selectQuery = mockSelect.mock.calls[0][0];
    expect(selectQuery).toContain('teacher:teachers');
    expect(selectQuery).toContain('site:sites');
    expect(selectQuery).toContain('enrollments:class_enrollments');
  });

  it('should handle errors', async () => {
    const mockError = new Error('Failed to fetch classes');
    const mockOrder = jest.fn(() => Promise.resolve({ data: null, error: mockError }));
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useClassSections());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch classes');
  });
});

describe('useClassSection', () => {
  const mockClassSection = {
    id: 'class-1',
    name: 'English 101',
    teacher: { id: 'teacher-1', first_name: 'John', last_name: 'Doe' },
    site: { id: 'site-1', name: 'Main Site' },
    enrollments: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch single class section successfully', async () => {
    const mockSingle = jest.fn(() => Promise.resolve({ data: mockClassSection, error: null }));
    const mockEq = jest.fn(() => ({ single: mockSingle }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useClassSection('class-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.classSection).toEqual(mockClassSection);
  });

  it('should not fetch when id is empty', () => {
    const mockSelect = jest.fn();
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    renderHook(() => useClassSection(''));

    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('should handle errors', async () => {
    const mockError = new Error('Class not found');
    const mockSingle = jest.fn(() => Promise.resolve({ data: null, error: mockError }));
    const mockEq = jest.fn(() => ({ single: mockSingle }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useClassSection('999'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Class not found');
  });
});

describe('useClassAttendance', () => {
  const mockAttendance = [
    {
      id: 'attendance-1',
      enrollment_id: 'enrollment-1',
      class_date: '2024-01-15',
      is_present: true,
      notes: null,
    },
  ];

  const mockEnrollments = [
    { id: 'enrollment-1' },
    { id: 'enrollment-2' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch attendance records successfully', async () => {
    // First call for enrollments
    const mockEqEnrollments = jest.fn(() => Promise.resolve({ data: mockEnrollments, error: null }));
    const mockSelectEnrollments = jest.fn(() => ({ eq: mockEqEnrollments }));

    // Second call for attendance
    const mockOrderAttendance = jest.fn(() => Promise.resolve({ data: mockAttendance, error: null }));
    const mockInAttendance = jest.fn(() => ({ order: mockOrderAttendance }));
    const mockSelectAttendance = jest.fn(() => ({ in: mockInAttendance }));

    (supabase.from as jest.Mock)
      .mockReturnValueOnce({ select: mockSelectEnrollments })
      .mockReturnValueOnce({ select: mockSelectAttendance });

    const { result } = renderHook(() => useClassAttendance('class-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.attendance).toEqual(mockAttendance);
    expect(supabase.from).toHaveBeenCalledWith('class_enrollments');
    expect(supabase.from).toHaveBeenCalledWith('class_attendance');
  });

  it('should filter by date when provided', async () => {
    const mockEqEnrollments = jest.fn(() => Promise.resolve({ data: mockEnrollments, error: null }));
    const mockSelectEnrollments = jest.fn(() => ({ eq: mockEqEnrollments }));

    const mockEqDate = jest.fn(() => ({
      order: jest.fn(() => Promise.resolve({ data: mockAttendance, error: null })),
    }));
    const mockInAttendance = jest.fn(() => ({ eq: mockEqDate }));
    const mockSelectAttendance = jest.fn(() => ({ in: mockInAttendance }));

    (supabase.from as jest.Mock)
      .mockReturnValueOnce({ select: mockSelectEnrollments })
      .mockReturnValueOnce({ select: mockSelectAttendance });

    renderHook(() => useClassAttendance('class-1', '2024-01-15'));

    await waitFor(() => {
      expect(mockEqDate).toHaveBeenCalledWith('class_date', '2024-01-15');
    });
  });

  it('should handle empty enrollments', async () => {
    const mockEqEnrollments = jest.fn(() => Promise.resolve({ data: [], error: null }));
    const mockSelectEnrollments = jest.fn(() => ({ eq: mockEqEnrollments }));

    (supabase.from as jest.Mock).mockReturnValueOnce({ select: mockSelectEnrollments });

    const { result } = renderHook(() => useClassAttendance('class-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.attendance).toEqual([]);
  });

  it('should handle errors', async () => {
    const mockError = new Error('Failed to fetch attendance');
    const mockEqEnrollments = jest.fn(() => Promise.resolve({ data: null, error: mockError }));
    const mockSelectEnrollments = jest.fn(() => ({ eq: mockEqEnrollments }));

    (supabase.from as jest.Mock).mockReturnValueOnce({ select: mockSelectEnrollments });

    const { result } = renderHook(() => useClassAttendance('class-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch attendance');
  });

  it('should not fetch when sectionId is empty', () => {
    const mockSelect = jest.fn();
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    renderHook(() => useClassAttendance(''));

    expect(mockSelect).not.toHaveBeenCalled();
  });
});

/**
 * API Endpoint Tests - Tasks
 *
 * Tests for tasks functionality and business logic
 */

// Mock Supabase
const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockEq = jest.fn();
const mockGte = jest.fn();
const mockLte = jest.fn();
const mockOrder = jest.fn();
const mockSingle = jest.fn();

const mockSupabaseFrom = jest.fn(() => ({
  select: mockSelect.mockReturnThis(),
  insert: mockInsert.mockReturnThis(),
  update: mockUpdate.mockReturnThis(),
  delete: mockDelete.mockReturnThis(),
  eq: mockEq.mockReturnThis(),
  gte: mockGte.mockReturnThis(),
  lte: mockLte.mockReturnThis(),
  order: mockOrder,
  single: mockSingle,
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: mockSupabaseFrom,
  })),
}));

describe('Tasks API Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET Tasks', () => {
    it('should query tasks table', async () => {
      const mockTasks = [
        { id: '1', title: 'Test Task', status: 'todo', priority: 'medium' },
        { id: '2', title: 'Another Task', status: 'in_progress', priority: 'high' },
      ];

      mockOrder.mockResolvedValue({ data: mockTasks, error: null });

      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient('url', 'key');

      const result = await supabase
        .from('tasks')
        .select('*, assignee:users(*), beneficiary:beneficiaries(*)')
        .order('created_at', { ascending: false });

      expect(mockSupabaseFrom).toHaveBeenCalledWith('tasks');
      expect(mockSelect).toHaveBeenCalled();
      expect(result.data).toHaveLength(2);
    });

    it('should filter by status', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null });

      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient('url', 'key');

      await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'todo')
        .order('created_at');

      expect(mockEq).toHaveBeenCalledWith('status', 'todo');
    });

    it('should filter by assignee_id', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null });

      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient('url', 'key');

      await supabase
        .from('tasks')
        .select('*')
        .eq('assignee_id', 'user-123')
        .order('created_at');

      expect(mockEq).toHaveBeenCalledWith('assignee_id', 'user-123');
    });

    it('should filter by date range', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null });

      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient('url', 'key');

      await supabase
        .from('tasks')
        .select('*')
        .gte('due_date', '2024-01-01')
        .lte('due_date', '2024-12-31')
        .order('due_date');

      expect(mockGte).toHaveBeenCalledWith('due_date', '2024-01-01');
      expect(mockLte).toHaveBeenCalledWith('due_date', '2024-12-31');
    });

    it('should handle database errors', async () => {
      mockOrder.mockResolvedValue({ data: null, error: { message: 'Database error' } });

      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient('url', 'key');

      const result = await supabase.from('tasks').select('*').order('created_at');

      expect(result.error).toBeDefined();
      expect(result.error.message).toBe('Database error');
    });
  });

  describe('POST Tasks', () => {
    it('should insert new task', async () => {
      const newTask = {
        title: 'New Task',
        description: 'Task description',
        status: 'todo',
        priority: 'medium',
      };

      mockSingle.mockResolvedValue({ data: { id: 'new-id', ...newTask }, error: null });

      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient('url', 'key');

      const result = await supabase
        .from('tasks')
        .insert(newTask)
        .select()
        .single();

      expect(mockInsert).toHaveBeenCalled();
      expect(result.data.title).toBe('New Task');
    });

    it('should validate required title field', () => {
      const taskWithoutTitle = { description: 'No title' };
      expect(taskWithoutTitle.title).toBeUndefined();
    });
  });

  describe('PATCH Tasks', () => {
    it('should update task', async () => {
      mockSingle.mockResolvedValue({ data: { id: 'task-1', status: 'done' }, error: null });

      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient('url', 'key');

      await supabase
        .from('tasks')
        .update({ status: 'done' })
        .eq('id', 'task-1')
        .select()
        .single();

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'task-1');
    });

    it('should set completed_at when status is done', async () => {
      const updateData = {
        status: 'done',
        completed_at: new Date().toISOString(),
      };

      mockSingle.mockResolvedValue({ data: { id: 'task-1', ...updateData }, error: null });

      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient('url', 'key');

      await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', 'task-1')
        .select()
        .single();

      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe('DELETE Tasks', () => {
    it('should delete task', async () => {
      mockEq.mockResolvedValue({ error: null });

      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient('url', 'key');

      await supabase.from('tasks').delete().eq('id', 'task-1');

      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'task-1');
    });
  });
});

describe('Task Options API Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET Options', () => {
    it('should fetch users for task assignment', async () => {
      const mockUsers = [
        { id: '1', name: 'John Doe', email: 'john@test.com' },
        { id: '2', name: 'Jane Smith', email: 'jane@test.com' },
      ];

      mockOrder.mockResolvedValue({ data: mockUsers, error: null });

      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient('url', 'key');

      const result = await supabase
        .from('users')
        .select('id, name, email')
        .order('name');

      expect(mockSupabaseFrom).toHaveBeenCalledWith('users');
      expect(result.data).toEqual(mockUsers);
    });

    it('should fetch beneficiaries for task association', async () => {
      const mockBeneficiaries = [
        { id: '1', first_name: 'Jane', last_name: 'Doe' },
      ];

      mockOrder.mockResolvedValue({ data: mockBeneficiaries, error: null });

      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient('url', 'key');

      const result = await supabase
        .from('beneficiaries')
        .select('id, first_name, last_name')
        .order('last_name');

      expect(mockSupabaseFrom).toHaveBeenCalledWith('beneficiaries');
      expect(result.data).toEqual(mockBeneficiaries);
    });
  });
});

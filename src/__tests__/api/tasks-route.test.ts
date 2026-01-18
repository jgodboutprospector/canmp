/**
 * Integration tests for Tasks API routes
 */

import { NextRequest } from 'next/server';
import { GET, POST, PATCH, DELETE } from '@/app/api/tasks/route';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// Mock Supabase admin
jest.mock('@/lib/supabase-admin');

const mockGetSupabaseAdmin = getSupabaseAdmin as jest.MockedFunction<typeof getSupabaseAdmin>;

describe('Tasks API', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    mockGetSupabaseAdmin.mockReturnValue(mockSupabase);
  });

  describe('GET /api/tasks', () => {
    it('should fetch tasks with default filters', async () => {
      const mockTasks = [
        { id: '1', title: 'Task 1', status: 'todo' },
        { id: '2', title: 'Task 2', status: 'in_progress' },
      ];

      mockSupabase.order.mockResolvedValue({ data: mockTasks, error: null });

      const request = new NextRequest('http://localhost/api/tasks');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockTasks);
      expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
    });

    it('should filter tasks by status', async () => {
      mockSupabase.order.mockResolvedValue({ data: [], error: null });

      const request = new NextRequest('http://localhost/api/tasks?status=done');
      await GET(request);

      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'done');
    });

    it('should filter tasks by assignee', async () => {
      mockSupabase.order.mockResolvedValue({ data: [], error: null });

      const request = new NextRequest('http://localhost/api/tasks?assignee_id=user123');
      await GET(request);

      expect(mockSupabase.eq).toHaveBeenCalledWith('assignee_id', 'user123');
    });

    it('should filter by date range', async () => {
      mockSupabase.order.mockResolvedValue({ data: [], error: null });

      const request = new NextRequest(
        'http://localhost/api/tasks?from_date=2024-01-01&to_date=2024-12-31'
      );
      await GET(request);

      expect(mockSupabase.gte).toHaveBeenCalledWith('due_date', '2024-01-01');
      expect(mockSupabase.lte).toHaveBeenCalledWith('due_date', '2024-12-31');
    });

    it('should exclude archived tasks by default', async () => {
      mockSupabase.order.mockResolvedValue({ data: [], error: null });

      const request = new NextRequest('http://localhost/api/tasks');
      await GET(request);

      expect(mockSupabase.eq).toHaveBeenCalledWith('is_archived', false);
    });

    it('should include archived tasks when requested', async () => {
      mockSupabase.order.mockResolvedValue({ data: [], error: null });

      const request = new NextRequest('http://localhost/api/tasks?include_archived=true');
      await GET(request);

      expect(mockSupabase.eq).not.toHaveBeenCalledWith('is_archived', false);
    });

    it('should handle database errors', async () => {
      mockSupabase.order.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const request = new NextRequest('http://localhost/api/tasks');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database error');
    });
  });

  describe('POST /api/tasks', () => {
    it('should create a new task', async () => {
      const newTask = {
        title: 'New Task',
        description: 'Task description',
        status: 'todo',
        priority: 'high',
        created_by_id: 'user123',
      };

      const createdTask = { id: '1', ...newTask };
      mockSupabase.single.mockResolvedValue({ data: createdTask, error: null });

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify(newTask),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(createdTask);
      expect(mockSupabase.insert).toHaveBeenCalledWith(newTask);
    });

    it('should handle creation errors', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Invalid data' },
      });

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ title: 'Task' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('PATCH /api/tasks', () => {
    it('should update a task', async () => {
      const updateData = { id: '1', title: 'Updated Task', status: 'in_progress' };
      const updatedTask = { ...updateData, updated_at: new Date().toISOString() };

      mockSupabase.single.mockResolvedValue({ data: updatedTask, error: null });

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockSupabase.update).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', '1');
    });

    it('should set completed_at when marking task as done', async () => {
      const updateData = { id: '1', status: 'done' };

      mockSupabase.single.mockResolvedValue({ data: updateData, error: null });

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });

      await PATCH(request);

      const updateCall = mockSupabase.update.mock.calls[0][0];
      expect(updateCall.completed_at).toBeDefined();
    });

    it('should require task ID', async () => {
      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'No ID' }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Task ID is required');
    });
  });

  describe('DELETE /api/tasks', () => {
    it('should delete a task', async () => {
      mockSupabase.delete.mockResolvedValue({ error: null });

      const request = new NextRequest('http://localhost/api/tasks?id=1');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', '1');
    });

    it('should require task ID', async () => {
      const request = new NextRequest('http://localhost/api/tasks');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Task ID is required');
    });

    it('should handle deletion errors', async () => {
      mockSupabase.delete.mockResolvedValue({
        error: { message: 'Cannot delete' },
      });

      const request = new NextRequest('http://localhost/api/tasks?id=1');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });
});

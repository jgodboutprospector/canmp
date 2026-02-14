/**
 * Integration tests for Tasks API routes
 */

import { NextRequest } from 'next/server';
import { GET, POST, PATCH, DELETE } from '@/app/api/tasks/route';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// Mock Supabase admin
jest.mock('@/lib/supabase-admin');

// Mock auth - include AuthError class that api-server-utils imports
jest.mock('@/lib/auth-server', () => {
  class AuthError extends Error {
    statusCode: number;
    constructor(message: string, statusCode = 401) {
      super(message);
      this.name = 'AuthError';
      this.statusCode = statusCode;
    }
  }
  return {
    requireAuthFromRequest: jest.fn().mockResolvedValue({
      userId: 'test-user-id',
      profile: { id: 'test-profile-id', role: 'admin' },
    }),
    AuthError,
  };
});

// Mock api-server-utils — use requireActual so handleApiError/successResponse work,
// but override the functions that need mocking
jest.mock('@/lib/api-server-utils', () => {
  const actual = jest.requireActual('@/lib/api-server-utils');
  return {
    ...actual,
    parseJsonBody: jest.fn(async (req: any) => {
      const text = await req.text();
      return JSON.parse(text);
    }),
    createAuditLog: jest.fn().mockResolvedValue(undefined),
    checkRateLimit: jest.fn().mockReturnValue({ allowed: true }),
    getRateLimitIdentifier: jest.fn().mockReturnValue('test-rate-limit'),
    rateLimitResponse: jest.fn(),
  };
});

// Mock validation schemas to pass through
jest.mock('@/lib/validation/schemas', () => ({
  createTaskSchema: {
    parse: jest.fn((data: any) => data),
  },
  updateTaskSchema: {
    parse: jest.fn((data: any) => data),
  },
}));

const mockGetSupabaseAdmin = getSupabaseAdmin as jest.MockedFunction<typeof getSupabaseAdmin>;

describe('Tasks API', () => {
  let mockSupabase: any;
  // Default resolved data when the chain is awaited
  let mockResolvedData: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Default resolved value
    mockResolvedData = { data: [], error: null, count: 0 };

    // Create mock Supabase client with full chaining support.
    // Every chainable method returns `this` so any combination works.
    // The mock itself is a thenable — `await mockSupabase` resolves to mockResolvedData.
    mockSupabase = {
      from: jest.fn(),
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      eq: jest.fn(),
      order: jest.fn(),
      gte: jest.fn(),
      lte: jest.fn(),
      range: jest.fn(),
      single: jest.fn(),
      // Make the object thenable so `await query` works after chaining
      then: jest.fn(function (resolve: any) { resolve(mockResolvedData); }),
    };

    // All chain methods return the mock itself by default
    for (const method of ['from', 'select', 'insert', 'update', 'delete', 'eq', 'order', 'gte', 'lte', 'range']) {
      mockSupabase[method].mockReturnValue(mockSupabase);
    }

    mockGetSupabaseAdmin.mockReturnValue(mockSupabase);
  });

  describe('GET /api/tasks', () => {
    it('should fetch tasks with default filters', async () => {
      const mockTasks = [
        { id: '1', title: 'Task 1', status: 'todo' },
        { id: '2', title: 'Task 2', status: 'in_progress' },
      ];

      mockResolvedData = { data: mockTasks, error: null, count: 2 };

      const request = new NextRequest('http://localhost/api/tasks');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
    });

    it('should filter tasks by status', async () => {
      const request = new NextRequest('http://localhost/api/tasks?status=done');
      await GET(request);

      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'done');
    });

    it('should filter tasks by assignee', async () => {
      const request = new NextRequest('http://localhost/api/tasks?assignee_id=user123');
      await GET(request);

      expect(mockSupabase.eq).toHaveBeenCalledWith('assignee_id', 'user123');
    });

    it('should filter by date range', async () => {
      const request = new NextRequest(
        'http://localhost/api/tasks?from_date=2024-01-01&to_date=2024-12-31'
      );
      await GET(request);

      expect(mockSupabase.gte).toHaveBeenCalledWith('due_date', '2024-01-01');
      expect(mockSupabase.lte).toHaveBeenCalledWith('due_date', '2024-12-31');
    });

    it('should exclude archived tasks by default', async () => {
      const request = new NextRequest('http://localhost/api/tasks');
      await GET(request);

      expect(mockSupabase.eq).toHaveBeenCalledWith('is_archived', false);
    });

    it('should handle database errors', async () => {
      mockResolvedData = {
        data: null,
        error: { message: 'Database error' },
        count: null,
      };

      const request = new NextRequest('http://localhost/api/tasks');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/tasks', () => {
    it('should create a new task', async () => {
      const newTask = {
        title: 'New Task',
        description: 'Task description',
        status: 'todo',
        priority: 'high',
      };

      const createdTask = { id: '1', ...newTask, created_by_id: 'test-profile-id' };
      // single() is terminal — override its then behavior
      mockSupabase.single.mockResolvedValue({ data: createdTask, error: null });

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify(newTask),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
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

      mockSupabase.single
        .mockResolvedValueOnce({ data: { id: '1', title: 'Old Task' }, error: null }) // fetch old
        .mockResolvedValueOnce({ data: updatedTask, error: null }); // update

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should require task ID', async () => {
      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'No ID' }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Task ID is required');
    });
  });

  describe('DELETE /api/tasks', () => {
    it('should soft delete a task', async () => {
      // Fetch old data for audit via single()
      mockSupabase.single.mockResolvedValue({ data: { id: '1', title: 'Task' }, error: null });
      // Soft delete: .update({is_archived: true}).eq('id', id) → await resolves via thenable
      mockResolvedData = { error: null };

      const request = new NextRequest('http://localhost/api/tasks?id=1');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockSupabase.update).toHaveBeenCalledWith({ is_archived: true });
    });

    it('should require task ID', async () => {
      const request = new NextRequest('http://localhost/api/tasks');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Task ID is required');
    });
  });
});

import { renderHook, waitFor, act } from '@testing-library/react';
import { useTasks } from '@/lib/hooks/useTasksData';

// Mock authFetch since the hook uses it
const mockAuthFetch = jest.fn();
jest.mock('@/lib/api-client', () => ({
  authFetch: (...args: any[]) => mockAuthFetch(...args),
}));

describe('useTasksData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockTasks = [
    {
      id: 'task-1',
      title: 'Complete project',
      description: 'Finish the project',
      status: 'todo' as const,
      priority: 'high' as const,
      due_date: '2024-12-31',
      assignee_id: 'user-1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'task-2',
      title: 'Review code',
      description: 'Code review',
      status: 'in_progress' as const,
      priority: 'medium' as const,
      due_date: '2024-12-25',
      assignee_id: 'user-2',
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    },
  ];

  it('should start with loading state', () => {
    mockAuthFetch.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useTasks());

    expect(result.current.loading).toBe(true);
    expect(result.current.tasks).toEqual([]);
  });

  it('should fetch tasks successfully', async () => {
    mockAuthFetch.mockResolvedValue({
      json: async () => ({ success: true, data: mockTasks }),
    });

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tasks).toEqual(mockTasks);
    expect(result.current.error).toBeNull();
  });

  it('should filter by status', async () => {
    mockAuthFetch.mockResolvedValue({
      json: async () => ({ success: true, data: [mockTasks[0]] }),
    });

    renderHook(() => useTasks({ status: 'todo' }));

    await waitFor(() => {
      expect(mockAuthFetch).toHaveBeenCalledWith(expect.stringContaining('status=todo'));
    });
  });

  it('should filter by assignee', async () => {
    mockAuthFetch.mockResolvedValue({
      json: async () => ({ success: true, data: mockTasks }),
    });

    renderHook(() => useTasks({ assignee_id: 'user-1' }));

    await waitFor(() => {
      expect(mockAuthFetch).toHaveBeenCalledWith(expect.stringContaining('assignee_id=user-1'));
    });
  });

  it('should handle errors', async () => {
    mockAuthFetch.mockResolvedValue({
      json: async () => ({ success: false, error: 'Failed to fetch tasks' }),
    });

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch tasks');
    expect(result.current.tasks).toEqual([]);
  });

  it('should handle network errors', async () => {
    mockAuthFetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to connect to API');
  });

  it('should create task successfully', async () => {
    const newTask = { ...mockTasks[0], id: 'task-3' };
    mockAuthFetch
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockTasks }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: newTask }),
      });

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let createdTask;
    await act(async () => {
      createdTask = await result.current.createTask({
        title: 'New task',
        description: 'Task description',
      });
    });

    expect(createdTask).toEqual(newTask);
    expect(mockAuthFetch).toHaveBeenCalledWith(
      '/api/tasks',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('should update task successfully', async () => {
    const updatedTask = { ...mockTasks[0], title: 'Updated task' };
    mockAuthFetch
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockTasks }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: updatedTask }),
      });

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let result_task;
    await act(async () => {
      result_task = await result.current.updateTask({
        id: 'task-1',
        title: 'Updated task',
      });
    });

    expect(result_task).toEqual(updatedTask);
    expect(mockAuthFetch).toHaveBeenCalledWith(
      '/api/tasks',
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  it('should delete task successfully', async () => {
    mockAuthFetch
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockTasks }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true }),
      });

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success;
    await act(async () => {
      success = await result.current.deleteTask('task-1');
    });

    expect(success).toBe(true);
    expect(mockAuthFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/tasks?id=task-1'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('should move task to new status', async () => {
    const movedTask = { ...mockTasks[0], status: 'done' as const };
    mockAuthFetch
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockTasks }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: movedTask }),
      });

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success;
    await act(async () => {
      success = await result.current.moveTask('task-1', 'done');
    });

    expect(success).toBe(true);
  });

  it('should group tasks by status', async () => {
    mockAuthFetch.mockResolvedValue({
      json: async () => ({ success: true, data: mockTasks }),
    });

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tasksByStatus.todo).toHaveLength(1);
    expect(result.current.tasksByStatus.in_progress).toHaveLength(1);
    expect(result.current.tasksByStatus.done).toHaveLength(0);
  });

  it('should get tasks for a specific date', async () => {
    mockAuthFetch.mockResolvedValue({
      json: async () => ({ success: true, data: mockTasks }),
    });

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const tasksForDate = result.current.getTasksForDate('2024-12-31');
    expect(tasksForDate).toHaveLength(1);
    expect(tasksForDate[0].id).toBe('task-1');
  });

  it('should get tasks in date range', async () => {
    mockAuthFetch.mockResolvedValue({
      json: async () => ({ success: true, data: mockTasks }),
    });

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const tasksInRange = result.current.getTasksInRange('2024-12-20', '2024-12-31');
    expect(tasksInRange).toHaveLength(2);
  });
});

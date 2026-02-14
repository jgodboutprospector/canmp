'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { authFetch } from '@/lib/api-client';

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  notes: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  completed_at: string | null;
  created_by_id: string | null;
  assignee_id: string | null;
  beneficiary_id: string | null;
  household_id: string | null;
  volunteer_id: string | null;
  class_section_id: string | null;
  event_id: string | null;
  property_id: string | null;
  sort_order: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  // Joined relations
  created_by?: { id: string; first_name: string; last_name: string; email: string } | null;
  assignee?: { id: string; first_name: string; last_name: string; email: string } | null;
  beneficiary?: { id: string; first_name: string; last_name: string } | null;
  household?: { id: string; name: string } | null;
  volunteer?: { id: string; first_name: string; last_name: string } | null;
  class_section?: { id: string; name: string } | null;
  event?: { id: string; title: string } | null;
  property?: { id: string; name: string } | null;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface TaskFilters {
  status?: TaskStatus;
  assignee_id?: string;
  beneficiary_id?: string;
  volunteer_id?: string;
  class_section_id?: string;
  event_id?: string;
  property_id?: string;
  from_date?: string;
  to_date?: string;
  include_archived?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  notes?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string;
  created_by_id?: string;
  assignee_id?: string;
  beneficiary_id?: string;
  household_id?: string;
  volunteer_id?: string;
  class_section_id?: string;
  event_id?: string;
  property_id?: string;
}

export interface UpdateTaskInput {
  id: string;
  title?: string;
  description?: string;
  notes?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  assignee_id?: string | null;
  beneficiary_id?: string | null;
  household_id?: string | null;
  volunteer_id?: string | null;
  class_section_id?: string | null;
  event_id?: string | null;
  property_id?: string | null;
  sort_order?: number;
  is_archived?: boolean;
}

export function useTasks(filters?: TaskFilters) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchTasks = useCallback(async () => {
    // Cancel any in-flight fetch so stale responses never overwrite fresh data
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.assignee_id) params.append('assignee_id', filters.assignee_id);
      if (filters?.beneficiary_id) params.append('beneficiary_id', filters.beneficiary_id);
      if (filters?.volunteer_id) params.append('volunteer_id', filters.volunteer_id);
      if (filters?.class_section_id) params.append('class_section_id', filters.class_section_id);
      if (filters?.event_id) params.append('event_id', filters.event_id);
      if (filters?.property_id) params.append('property_id', filters.property_id);
      if (filters?.from_date) params.append('from_date', filters.from_date);
      if (filters?.to_date) params.append('to_date', filters.to_date);
      if (filters?.include_archived) params.append('include_archived', 'true');
      if (filters?.page) params.append('page', String(filters.page));
      if (filters?.limit) params.append('limit', String(filters.limit));

      const response = await authFetch(`/api/tasks?${params}`, {
        signal: controller.signal,
      });
      const result = await response.json();

      // Don't update state if this request was aborted (a newer one is in flight)
      if (controller.signal.aborted) return;

      if (result.success) {
        setTasks(result.data || []);
        if (result.pagination) {
          setPagination(result.pagination);
        }
      } else {
        setError(result.error || 'Failed to fetch tasks');
      }
    } catch (err) {
      // Ignore abort errors — they're expected when filters change rapidly
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError('Failed to connect to API');
      console.error('Tasks API error:', err);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [filters?.status, filters?.assignee_id, filters?.beneficiary_id, filters?.volunteer_id,
      filters?.class_section_id, filters?.event_id, filters?.property_id,
      filters?.from_date, filters?.to_date, filters?.include_archived,
      filters?.page, filters?.limit]);

  useEffect(() => {
    fetchTasks();
    return () => { abortControllerRef.current?.abort(); };
  }, [fetchTasks]);

  const createTask = useCallback(async (input: CreateTaskInput): Promise<Task | null> => {
    try {
      const response = await authFetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const result = await response.json();

      if (result.success) {
        setTasks(prev => [result.data, ...prev]);
        return result.data;
      } else {
        setError(result.error || 'Failed to create task');
        return null;
      }
    } catch (err) {
      setError('Failed to create task');
      console.error('Create task error:', err);
      return null;
    }
  }, []);

  const updateTask = useCallback(async (input: UpdateTaskInput): Promise<Task | null> => {
    try {
      const response = await authFetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const result = await response.json();

      if (result.success) {
        setTasks(prev => prev.map(t => t.id === input.id ? result.data : t));
        return result.data;
      } else {
        setError(result.error || 'Failed to update task');
        return null;
      }
    } catch (err) {
      setError('Failed to update task');
      console.error('Update task error:', err);
      return null;
    }
  }, []);

  const deleteTask = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await authFetch(`/api/tasks?id=${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        setTasks(prev => prev.filter(t => t.id !== id));
        return true;
      } else {
        setError(result.error || 'Failed to delete task');
        return false;
      }
    } catch (err) {
      setError('Failed to delete task');
      console.error('Delete task error:', err);
      return false;
    }
  }, []);

  const moveTask = useCallback(async (taskId: string, newStatus: TaskStatus, newSortOrder?: number): Promise<boolean> => {
    const updateData: UpdateTaskInput = { id: taskId, status: newStatus };
    if (newSortOrder !== undefined) {
      updateData.sort_order = newSortOrder;
    }
    const result = await updateTask(updateData);
    return result !== null;
  }, [updateTask]);

  // Group tasks by status for Kanban view
  const tasksByStatus = {
    backlog: tasks.filter(t => t.status === 'backlog'),
    todo: tasks.filter(t => t.status === 'todo'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    review: tasks.filter(t => t.status === 'review'),
    done: tasks.filter(t => t.status === 'done'),
  };

  // Get tasks for a specific date (for calendar view)
  const getTasksForDate = useCallback((date: string) => {
    return tasks.filter(t => t.due_date === date);
  }, [tasks]);

  // Get tasks for a date range (for calendar view)
  const getTasksInRange = useCallback((startDate: string, endDate: string) => {
    return tasks.filter(t => {
      if (!t.due_date) return false;
      return t.due_date >= startDate && t.due_date <= endDate;
    });
  }, [tasks]);

  return {
    tasks,
    tasksByStatus,
    loading,
    error,
    pagination,
    refresh: fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    getTasksForDate,
    getTasksInRange,
  };
}

// Hook for fetching dropdown options (users, beneficiaries, etc.)
export function useTaskOptions() {
  const [users, setUsers] = useState<Array<{ id: string; first_name: string; last_name: string; email: string }>>([]);
  const [beneficiaries, setBeneficiaries] = useState<Array<{ id: string; first_name: string; last_name: string }>>([]);
  const [volunteers, setVolunteers] = useState<Array<{ id: string; first_name: string; last_name: string }>>([]);
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [events, setEvents] = useState<Array<{ id: string; title: string }>>([]);
  const [properties, setProperties] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const response = await authFetch('/api/tasks/options');
        const result = await response.json();

        if (result.success) {
          setUsers(result.data.users || []);
          setBeneficiaries(result.data.beneficiaries || []);
          setVolunteers(result.data.volunteers || []);
          setClasses(result.data.classes || []);
          setEvents(result.data.events || []);
          setProperties(result.data.properties || []);
        }
      } catch (err) {
        console.error('Failed to fetch task options:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOptions();
  }, []);

  return { users, beneficiaries, volunteers, classes, events, properties, loading };
}

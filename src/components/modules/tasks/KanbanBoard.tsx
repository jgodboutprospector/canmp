'use client';

import { useState, useMemo } from 'react';
import { Plus, Search, Filter, MoreHorizontal, Calendar, User, Tag, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { useTasks, Task, TaskStatus, TaskPriority } from '@/lib/hooks/useTasksData';
import { useAuth } from '@/components/providers/AuthProvider';
import { cn } from '@/lib/utils';
import AddTaskModal from './AddTaskModal';
import TaskDetailModal from './TaskDetailModal';

const statusColumns: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'backlog', label: 'Backlog', color: 'bg-gray-100' },
  { id: 'todo', label: 'To Do', color: 'bg-blue-50' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-yellow-50' },
  { id: 'review', label: 'Review', color: 'bg-purple-50' },
  { id: 'done', label: 'Done', color: 'bg-green-50' },
];

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const priorityIcons: Record<TaskPriority, React.ReactNode> = {
  low: null,
  medium: <AlertCircle className="w-3 h-3" />,
  high: <AlertCircle className="w-3 h-3" />,
  urgent: <AlertCircle className="w-3 h-3 animate-pulse" />,
};

export default function KanbanBoard() {
  const { profile } = useAuth();
  const { tasks, tasksByStatus, loading, error, createTask, updateTask, moveTask, deleteTask, refresh } = useTasks();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAssignee, setFilterAssignee] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  // Filter tasks based on search and filters
  const filteredTasksByStatus = useMemo(() => {
    const result: Record<TaskStatus, Task[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    };

    for (const status of statusColumns.map(c => c.id)) {
      result[status] = (tasksByStatus[status] || []).filter(task => {
        const matchesSearch = !searchQuery ||
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesAssignee = !filterAssignee || task.assignee_id === filterAssignee;
        return matchesSearch && matchesAssignee;
      });
    }

    return result;
  }, [tasksByStatus, searchQuery, filterAssignee]);

  // Handle drag and drop
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (draggedTask && draggedTask.status !== status) {
      await moveTask(draggedTask.id, status);
    }
    setDraggedTask(null);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const getTagLabel = (task: Task): string | null => {
    if (task.beneficiary) return `${task.beneficiary.first_name} ${task.beneficiary.last_name}`;
    if (task.volunteer) return `${task.volunteer.first_name} ${task.volunteer.last_name}`;
    if (task.class_section) return task.class_section.name;
    if (task.event) return task.event.name;
    if (task.property) return task.property.name;
    if (task.household) return task.household.name;
    return null;
  };

  const getTagColor = (task: Task): string => {
    if (task.beneficiary) return 'bg-emerald-100 text-emerald-700';
    if (task.volunteer) return 'bg-purple-100 text-purple-700';
    if (task.class_section) return 'bg-blue-100 text-blue-700';
    if (task.event) return 'bg-pink-100 text-pink-700';
    if (task.property) return 'bg-amber-100 text-amber-700';
    if (task.household) return 'bg-cyan-100 text-cyan-700';
    return 'bg-gray-100 text-gray-700';
  };

  const formatDueDate = (dateStr: string | null): { text: string; isOverdue: boolean; isToday: boolean } => {
    if (!dateStr) return { text: '', isOverdue: false, isToday: false };

    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(date);
    dueDate.setHours(0, 0, 0, 0);

    const isOverdue = dueDate < today;
    const isToday = dueDate.getTime() === today.getTime();

    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return { text: date.toLocaleDateString('en-US', options), isOverdue, isToday };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-canmp-green-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500 mt-1">
            {tasks.length} tasks total
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-canmp-green-500 text-white rounded-lg hover:bg-canmp-green-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Task
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-canmp-green-500 focus:border-transparent"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {statusColumns.map((column) => (
          <div
            key={column.id}
            className={cn(
              'flex-shrink-0 w-72 rounded-lg p-3',
              column.color,
              dragOverColumn === column.id && 'ring-2 ring-canmp-green-500'
            )}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-700">{column.label}</h3>
                <span className="text-xs bg-white px-2 py-0.5 rounded-full text-gray-500">
                  {filteredTasksByStatus[column.id].length}
                </span>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(true);
                }}
                className="p-1 hover:bg-white/50 rounded"
              >
                <Plus className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Task Cards */}
            <div className="space-y-2 min-h-[200px]">
              {filteredTasksByStatus[column.id].map((task) => {
                const tagLabel = getTagLabel(task);
                const dueInfo = formatDueDate(task.due_date);

                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    onDragEnd={handleDragEnd}
                    onClick={() => setSelectedTask(task)}
                    className={cn(
                      'bg-white rounded-lg p-3 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all',
                      draggedTask?.id === task.id && 'opacity-50'
                    )}
                  >
                    {/* Priority Badge */}
                    {task.priority !== 'low' && (
                      <div className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium mb-2',
                        priorityColors[task.priority]
                      )}>
                        {priorityIcons[task.priority]}
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </div>
                    )}

                    {/* Title */}
                    <h4 className="font-medium text-gray-900 text-sm line-clamp-2">
                      {task.title}
                    </h4>

                    {/* Description preview */}
                    {task.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    {/* Tags */}
                    {tagLabel && (
                      <div className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium mt-2',
                        getTagColor(task)
                      )}>
                        <Tag className="w-3 h-3" />
                        {tagLabel}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
                      {/* Due Date */}
                      {dueInfo.text && (
                        <div className={cn(
                          'flex items-center gap-1 text-xs',
                          dueInfo.isOverdue ? 'text-red-600' : dueInfo.isToday ? 'text-orange-600' : 'text-gray-500'
                        )}>
                          {dueInfo.isOverdue ? (
                            <AlertCircle className="w-3 h-3" />
                          ) : dueInfo.isToday ? (
                            <Clock className="w-3 h-3" />
                          ) : (
                            <Calendar className="w-3 h-3" />
                          )}
                          {dueInfo.text}
                        </div>
                      )}

                      {/* Assignee */}
                      {task.assignee && (
                        <div className="flex items-center gap-1">
                          <div className="w-5 h-5 rounded-full bg-canmp-green-100 flex items-center justify-center">
                            <span className="text-xs font-medium text-canmp-green-700">
                              {task.assignee.first_name[0]}{task.assignee.last_name[0]}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredTasksByStatus[column.id].length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No tasks
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddTaskModal
          onClose={() => setShowAddModal(false)}
          onCreate={async (input) => {
            const result = await createTask({
              ...input,
              created_by_id: profile?.id,
            });
            if (result) {
              setShowAddModal(false);
            }
          }}
        />
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={async (input) => {
            const result = await updateTask(input);
            if (result) {
              setSelectedTask(result);
            }
          }}
          onDelete={async () => {
            await deleteTask(selectedTask.id);
            setSelectedTask(null);
          }}
        />
      )}
    </div>
  );
}

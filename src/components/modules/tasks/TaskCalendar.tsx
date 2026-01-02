'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, AlertCircle, Clock } from 'lucide-react';
import { useTasks, Task, TaskPriority } from '@/lib/hooks/useTasksData';
import { useAuth } from '@/components/providers/AuthProvider';
import { cn } from '@/lib/utils';
import AddTaskModal from './AddTaskModal';
import TaskDetailModal from './TaskDetailModal';

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-gray-200 border-gray-300',
  medium: 'bg-blue-200 border-blue-300',
  high: 'bg-orange-200 border-orange-300',
  urgent: 'bg-red-200 border-red-300',
};

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function TaskCalendar() {
  const { profile } = useAuth();
  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Get calendar days
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startOffset = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Previous month days
    for (let i = startOffset - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const date = new Date(year, month, i);
      days.push({ date, isCurrentMonth: true });
    }

    // Next month days to fill the grid
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false });
    }

    return days;
  }, [currentDate]);

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    tasks.forEach(task => {
      if (task.due_date) {
        if (!grouped[task.due_date]) {
          grouped[task.due_date] = [];
        }
        grouped[task.due_date].push(task);
      }
    });
    return grouped;
  }, [tasks]);

  const formatDateKey = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleDayClick = (date: Date) => {
    const dateKey = formatDateKey(date);
    setSelectedDate(dateKey);
    setShowAddModal(true);
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
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-gray-900">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm font-medium text-canmp-green-600 hover:bg-canmp-green-50 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
        <button
          onClick={() => {
            setSelectedDate(formatDateKey(new Date()));
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-canmp-green-500 text-white rounded-lg hover:bg-canmp-green-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Task
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {daysOfWeek.map(day => (
            <div key={day} className="px-2 py-3 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const dateKey = formatDateKey(day.date);
            const dayTasks = tasksByDate[dateKey] || [];
            const today = isToday(day.date);

            return (
              <div
                key={idx}
                className={cn(
                  'min-h-[120px] border-b border-r border-gray-100 p-2',
                  !day.isCurrentMonth && 'bg-gray-50',
                  today && 'bg-canmp-green-50'
                )}
              >
                {/* Day Number */}
                <div className="flex items-center justify-between mb-1">
                  <button
                    onClick={() => handleDayClick(day.date)}
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium hover:bg-gray-200 transition-colors',
                      today ? 'bg-canmp-green-500 text-white hover:bg-canmp-green-600' : 'text-gray-700',
                      !day.isCurrentMonth && 'text-gray-400'
                    )}
                  >
                    {day.date.getDate()}
                  </button>
                  {dayTasks.length > 0 && (
                    <span className="text-xs text-gray-400">{dayTasks.length}</span>
                  )}
                </div>

                {/* Tasks */}
                <div className="space-y-1">
                  {dayTasks.slice(0, 3).map(task => (
                    <button
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className={cn(
                        'w-full text-left px-2 py-1 rounded text-xs font-medium truncate border-l-2',
                        priorityColors[task.priority]
                      )}
                    >
                      {task.status === 'done' ? (
                        <span className="line-through text-gray-500">{task.title}</span>
                      ) : (
                        task.title
                      )}
                    </button>
                  ))}
                  {dayTasks.length > 3 && (
                    <button
                      onClick={() => handleDayClick(day.date)}
                      className="w-full text-left px-2 py-0.5 text-xs text-gray-500 hover:text-gray-700"
                    >
                      +{dayTasks.length - 3} more
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-4 text-sm">
        <span className="text-gray-500">Priority:</span>
        {(['low', 'medium', 'high', 'urgent'] as TaskPriority[]).map(priority => (
          <div key={priority} className="flex items-center gap-1.5">
            <div className={cn('w-3 h-3 rounded', priorityColors[priority].split(' ')[0])} />
            <span className="capitalize text-gray-600">{priority}</span>
          </div>
        ))}
      </div>

      {/* Upcoming Tasks Sidebar */}
      <div className="mt-6">
        <h3 className="font-semibold text-gray-900 mb-3">Upcoming Due Dates</h3>
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {tasks
            .filter(t => t.due_date && t.status !== 'done')
            .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
            .slice(0, 5)
            .map(task => {
              const dueDate = new Date(task.due_date!);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const isOverdue = dueDate < today;

              return (
                <button
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className={cn('w-2 h-2 rounded-full', priorityColors[task.priority].split(' ')[0])} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{task.title}</p>
                    <p className={cn(
                      'text-xs',
                      isOverdue ? 'text-red-600' : 'text-gray-500'
                    )}>
                      {isOverdue && <AlertCircle className="w-3 h-3 inline mr-1" />}
                      {dueDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  {task.assignee && (
                    <div className="w-6 h-6 rounded-full bg-canmp-green-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-canmp-green-700">
                        {task.assignee.first_name[0]}{task.assignee.last_name[0]}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          {tasks.filter(t => t.due_date && t.status !== 'done').length === 0 && (
            <div className="p-4 text-center text-gray-500 text-sm">
              No upcoming tasks
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddTaskModal
          onClose={() => {
            setShowAddModal(false);
            setSelectedDate(null);
          }}
          onCreate={async (input) => {
            const result = await createTask({
              ...input,
              due_date: input.due_date || selectedDate || undefined,
              created_by_id: profile?.id,
            });
            if (result) {
              setShowAddModal(false);
              setSelectedDate(null);
            }
          }}
          defaultDueDate={selectedDate || undefined}
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

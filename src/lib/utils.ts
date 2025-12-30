import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, parseISO } from 'date-fns';

// Tailwind class merging utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date formatting
export const formatDate = (date: string | Date, formatStr: string = 'MMM d, yyyy'): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr);
};

export const formatDateTime = (date: string | Date): string => {
  return formatDate(date, 'MMM d, yyyy h:mm a');
};

export const formatRelativeTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
};

// Currency formatting
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatCurrencyDecimal = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

// Phone formatting
export const formatPhone = (phone: string | null | undefined): string => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

// Name formatting
export const formatFullName = (firstName: string, lastName: string): string => {
  return `${firstName} ${lastName}`.trim();
};

export const getInitials = (firstName: string, lastName: string): string => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

// Status/type label helpers
export const getLeaseTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    canmp_direct: 'CANMP Direct',
    master_sublease: 'Master Sublease',
    bridge: 'Bridge Program',
  };
  return labels[type] || type;
};

export const getLeaseStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    active: 'Active',
    completed: 'Completed',
    terminated: 'Terminated',
    pending: 'Pending',
  };
  return labels[status] || status;
};

export const getWorkOrderStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    open: 'Open',
    scheduled: 'Scheduled',
    in_progress: 'In Progress',
    on_hold: 'On Hold',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return labels[status] || status;
};

export const getPriorityLabel = (priority: string): string => {
  const labels: Record<string, string> = {
    urgent: 'Urgent',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  };
  return labels[priority] || priority;
};

// Badge variant helpers
export const getLeaseTypeBadgeVariant = (type: string): string => {
  const variants: Record<string, string> = {
    canmp_direct: 'info',
    master_sublease: 'purple',
    bridge: 'success',
  };
  return variants[type] || 'default';
};

export const getStatusBadgeVariant = (status: string): string => {
  const variants: Record<string, string> = {
    active: 'success',
    completed: 'info',
    terminated: 'danger',
    pending: 'warning',
    open: 'warning',
    scheduled: 'info',
    in_progress: 'purple',
    on_hold: 'warning',
    paid: 'success',
    late: 'danger',
  };
  return variants[status] || 'default';
};

export const getPriorityBadgeVariant = (priority: string): string => {
  const variants: Record<string, string> = {
    urgent: 'danger',
    high: 'warning',
    medium: 'info',
    low: 'default',
  };
  return variants[priority] || 'default';
};

// Category icons for work orders
export const getCategoryEmoji = (category: string): string => {
  const emojis: Record<string, string> = {
    plumbing: '🔧',
    hvac: '❄️',
    electrical: '⚡',
    appliance: '🔌',
    structural: '🏠',
    safety: '🔒',
    pest: '🐛',
    landscaping: '🌱',
    other: '📋',
  };
  return emojis[category] || '📋';
};

// Validation helpers
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 || cleaned.length === 11;
};

// Pluralization
export const pluralize = (count: number, singular: string, plural?: string): string => {
  const p = plural || `${singular}s`;
  return count === 1 ? singular : p;
};

// Truncate text
export const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

// Calculate progress percentage
export const calculateProgress = (current: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((current / total) * 100);
};

// Days until date
export const daysUntil = (date: string | Date): number => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const today = new Date();
  const diffTime = d.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

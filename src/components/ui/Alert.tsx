'use client';

import { ReactNode } from 'react';
import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlertProps {
  variant: 'error' | 'warning' | 'success' | 'info';
  title?: string;
  children: ReactNode;
  onDismiss?: () => void;
  className?: string;
}

const variantStyles = {
  error: 'bg-red-50 border-red-200 text-red-700',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  success: 'bg-green-50 border-green-200 text-green-700',
  info: 'bg-blue-50 border-blue-200 text-blue-700',
};

const variantIcons = {
  error: AlertCircle,
  warning: AlertTriangle,
  success: CheckCircle,
  info: Info,
};

export function Alert({ variant, title, children, onDismiss, className }: AlertProps) {
  const Icon = variantIcons[variant];

  return (
    <div className={cn('p-3 border rounded-lg flex gap-3', variantStyles[variant], className)}>
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        {title && <p className="font-medium mb-1">{title}</p>}
        <div className="text-sm">{children}</div>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-1 hover:bg-black/5 rounded"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

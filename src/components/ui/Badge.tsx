'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default' | 'purple';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}

const variantStyles = {
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  default: 'bg-gray-100 text-gray-600',
  purple: 'bg-purple-100 text-purple-700',
};

const sizeStyles = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-xs px-2 py-1',
};

export const Badge = memo(function Badge({
  variant = 'default',
  size = 'md',
  children,
  className
}: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full font-medium',
      variantStyles[variant],
      sizeStyles[size],
      className
    )}>
      {children}
    </span>
  );
});

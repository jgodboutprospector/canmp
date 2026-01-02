'use client';

import { ReactNode, memo } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  variant?: 'default' | 'green' | 'blue' | 'red' | 'yellow';
  className?: string;
}

function StatCardComponent({ label, value, icon, variant = 'default', className }: StatCardProps) {
  const valueColors = {
    default: 'text-gray-900',
    green: 'text-canmp-green-600',
    blue: 'text-blue-600',
    red: 'text-red-600',
    yellow: 'text-yellow-600',
  };

  return (
    <div className={cn('card p-4', className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className={cn('text-2xl font-semibold', valueColors[variant])}>{value}</p>
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export const StatCard = memo(StatCardComponent);

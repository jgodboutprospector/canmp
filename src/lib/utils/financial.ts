/**
 * Utility functions for financial data formatting and display
 */

import React from 'react';
import { CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatCurrencyWithCents = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

export const formatFullDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'cleared':
    case 'approved':
    case 'active':
    case 'completed':
      return 'bg-green-100 text-green-700';
    case 'pending':
      return 'bg-yellow-100 text-yellow-700';
    case 'declined':
    case 'rejected':
    case 'suspended':
    case 'expired':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

export const getStatusIcon = (status: string): React.ReactElement => {
  switch (status) {
    case 'cleared':
    case 'approved':
    case 'active':
    case 'completed':
      return React.createElement(CheckCircle, { className: 'w-4 h-4 text-green-500' });
    case 'pending':
      return React.createElement(Clock, { className: 'w-4 h-4 text-yellow-500' });
    case 'declined':
    case 'rejected':
    case 'suspended':
    case 'expired':
      return React.createElement(XCircle, { className: 'w-4 h-4 text-red-500' });
    default:
      return React.createElement(AlertCircle, { className: 'w-4 h-4 text-gray-500' });
  }
};

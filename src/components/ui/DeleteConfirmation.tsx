'use client';

import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';

interface RelatedItem {
  label: string;
  count: number;
}

interface DeleteConfirmationProps {
  title: string;
  message: string;
  relatedItems?: RelatedItem[];
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
  confirmLabel?: string;
}

export function DeleteConfirmation({
  title,
  message,
  relatedItems,
  onConfirm,
  onCancel,
  isDeleting,
  confirmLabel = 'Delete',
}: DeleteConfirmationProps) {
  return (
    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-red-800">{title}</h4>
          <p className="text-sm text-red-600 mt-1">{message}</p>

          {relatedItems && relatedItems.length > 0 && (
            <div className="mt-3 p-2 bg-red-100 rounded text-sm">
              <p className="font-medium text-red-800 mb-1">This will also affect:</p>
              <ul className="list-disc list-inside text-red-700 space-y-0.5">
                {relatedItems.map((item, index) => (
                  <li key={index}>
                    {item.count} {item.label}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <button
              onClick={onCancel}
              disabled={isDeleting}
              className="px-3 py-1.5 text-sm bg-white text-gray-700 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1 disabled:opacity-50"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              {isDeleting ? 'Deleting...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { History } from 'lucide-react';
import { AuditLogViewer } from '@/components/modules/admin/AuditLogViewer';

export default function AuditLogPage() {
  return (
    <div className="min-h-full p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <History className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Audit Log</h1>
            <p className="text-sm text-gray-500">
              Track all changes and actions across the system
            </p>
          </div>
        </div>
      </div>

      {/* Audit Log Viewer */}
      <AuditLogViewer />
    </div>
  );
}

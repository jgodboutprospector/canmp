'use client';

import { useState } from 'react';
import {
  History,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  User,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useAuditLogs, useAuditLogStats } from '@/lib/hooks/useAuditLogs';
import {
  formatAction,
  formatEntityType,
  getActionColor,
  type AuditAction,
  type EntityType,
} from '@/lib/audit';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const ENTITY_TYPES: EntityType[] = [
  'household',
  'beneficiary',
  'case_note',
  'property',
  'unit',
  'lease',
  'work_order',
  'event',
  'class_section',
  'teacher',
  'volunteer',
  'mentor_team',
  'donation_item',
  'user',
];

const ACTIONS: AuditAction[] = ['create', 'update', 'delete', 'view', 'login', 'logout'];

export function AuditLogViewer() {
  const [entityTypeFilter, setEntityTypeFilter] = useState<EntityType | ''>('');
  const [actionFilter, setActionFilter] = useState<AuditAction | ''>('');
  const [search, setSearch] = useState('');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  const { logs, loading, error, totalCount, refetch, loadMore, hasMore } = useAuditLogs({
    entityType: entityTypeFilter || undefined,
    action: actionFilter || undefined,
    limit: 50,
  });

  const stats = useAuditLogStats();

  const filteredLogs = logs.filter((log) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      log.entity_name?.toLowerCase().includes(searchLower) ||
      log.user_name?.toLowerCase().includes(searchLower) ||
      log.user_email?.toLowerCase().includes(searchLower) ||
      log.entity_type.toLowerCase().includes(searchLower)
    );
  });

  function toggleExpanded(logId: string) {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  }

  function renderChanges(changes: Record<string, { from: any; to: any }>) {
    return (
      <div className="mt-3 space-y-2 text-sm">
        {Object.entries(changes).map(([field, change]) => (
          <div key={field} className="flex gap-2">
            <span className="font-medium text-gray-700 min-w-32">
              {field.replace(/_/g, ' ')}:
            </span>
            <div className="flex items-center gap-2">
              <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded">
                {formatValue(change.from)}
              </span>
              <span className="text-gray-400">→</span>
              <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded">
                {formatValue(change.to)}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  function formatValue(value: any): string {
    if (value === null || value === undefined) return 'empty';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-sm text-gray-500">Total Logs</p>
          <p className="text-2xl font-semibold">
            {stats.loading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.totalLogs.toLocaleString()}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Today</p>
          <p className="text-2xl font-semibold text-canmp-green-600">
            {stats.loading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.todayCount}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">This Week</p>
          <p className="text-2xl font-semibold text-blue-600">
            {stats.loading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.weekCount}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Matching Filters</p>
          <p className="text-2xl font-semibold">{totalCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-64 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, user, or entity..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>

          {/* Entity Type Filter */}
          <select
            value={entityTypeFilter}
            onChange={(e) => setEntityTypeFilter(e.target.value as EntityType | '')}
            className="input w-44"
          >
            <option value="">All Entities</option>
            {ENTITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {formatEntityType(type)}
              </option>
            ))}
          </select>

          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as AuditAction | '')}
            className="input w-36"
          >
            <option value="">All Actions</option>
            {ACTIONS.map((action) => (
              <option key={action} value={action}>
                {formatAction(action)}
              </option>
            ))}
          </select>

          {/* Refresh */}
          <button
            onClick={() => refetch()}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Logs List */}
      {error ? (
        <div className="card p-6 bg-red-50 border-red-200">
          <p className="text-red-600 font-medium">Error loading audit logs</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
        </div>
      ) : loading && logs.length === 0 ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-canmp-green-500" />
          <span className="ml-2 text-gray-500">Loading audit logs...</span>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const isExpanded = expandedLogs.has(log.id);
            const hasChanges = log.changes && Object.keys(log.changes).length > 0;

            return (
              <div key={log.id} className="card overflow-hidden">
                <div
                  className={cn(
                    'p-4 flex items-start gap-4',
                    hasChanges && 'cursor-pointer hover:bg-gray-50'
                  )}
                  onClick={() => hasChanges && toggleExpanded(log.id)}
                >
                  {/* Expand Icon */}
                  <div className="pt-0.5">
                    {hasChanges ? (
                      isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )
                    ) : (
                      <div className="w-5 h-5" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Action Badge */}
                      <span
                        className={cn(
                          'px-2 py-1 rounded text-xs font-medium',
                          getActionColor(log.action)
                        )}
                      >
                        {formatAction(log.action)}
                      </span>

                      {/* Entity Type */}
                      <span className="text-sm font-medium text-gray-900">
                        {formatEntityType(log.entity_type)}
                      </span>

                      {/* Entity Name */}
                      {log.entity_name && (
                        <>
                          <span className="text-gray-400">-</span>
                          <span className="text-sm text-gray-600 truncate">
                            {log.entity_name}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Meta Info */}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      {/* User */}
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {log.user_name || log.user_email || 'System'}
                      </span>

                      {/* Timestamp */}
                      <span>
                        {format(new Date(log.created_at), 'MMM d, yyyy h:mm:ss a')}
                      </span>

                      {/* IP Address */}
                      {log.ip_address && (
                        <span className="text-gray-400">{log.ip_address}</span>
                      )}
                    </div>

                    {/* Expanded Changes */}
                    {isExpanded && log.changes && renderChanges(log.changes)}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredLogs.length === 0 && !loading && (
            <div className="card p-12 text-center text-gray-400">
              No audit logs found matching your filters.
            </div>
          )}

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Load More'
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

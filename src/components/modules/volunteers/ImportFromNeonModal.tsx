'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useNeonVolunteers } from '@/lib/hooks/useVolunteers';
import {
  Loader2,
  Search,
  CheckCircle,
  User,
  Mail,
  Phone,
  AlertCircle,
} from 'lucide-react';

interface ImportFromNeonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportFromNeonModal({ isOpen, onClose, onSuccess }: ImportFromNeonModalProps) {
  const { neonAccounts, loading, error, importVolunteers } = useNeonVolunteers();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    errors: Array<{ id: string; error: string }>;
  } | null>(null);

  const filteredAccounts = neonAccounts.filter((account) => {
    if (!search) return true;
    const fullName = `${account.first_name || ''} ${account.last_name || ''}`.toLowerCase();
    return (
      fullName.includes(search.toLowerCase()) ||
      account.email?.toLowerCase().includes(search.toLowerCase())
    );
  });

  function toggleSelect(neonAccountId: string) {
    const newSet = new Set(selectedIds);
    if (newSet.has(neonAccountId)) {
      newSet.delete(neonAccountId);
    } else {
      newSet.add(neonAccountId);
    }
    setSelectedIds(newSet);
  }

  function selectAll() {
    const allIds = filteredAccounts.map((a) => a.neon_account_id);
    setSelectedIds(new Set(allIds));
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  async function handleImport() {
    if (selectedIds.size === 0) return;

    setImporting(true);
    setImportResult(null);

    try {
      const result = await importVolunteers(Array.from(selectedIds));
      setImportResult(result);

      if (result.imported > 0) {
        onSuccess();
      }

      // Clear selection after import
      setSelectedIds(new Set());
    } catch (err) {
      setImportResult({
        imported: 0,
        errors: [{ id: 'general', error: err instanceof Error ? err.message : 'Import failed' }],
      });
    } finally {
      setImporting(false);
    }
  }

  function handleClose() {
    setSearch('');
    setSelectedIds(new Set());
    setImportResult(null);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Volunteers from Neon CRM" size="lg">
      <div className="px-6 pb-6">
        {/* Import Result */}
        {importResult && (
          <div className={`mb-4 p-4 rounded-lg ${
            importResult.errors.length > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'
          }`}>
            <div className="flex items-center gap-2">
              {importResult.imported > 0 ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600" />
              )}
              <span className="font-medium">
                {importResult.imported} volunteer(s) imported successfully
              </span>
            </div>
            {importResult.errors.length > 0 && (
              <div className="mt-2 text-sm text-amber-700">
                <p className="font-medium">{importResult.errors.length} error(s):</p>
                <ul className="list-disc list-inside mt-1">
                  {importResult.errors.slice(0, 3).map((err, i) => (
                    <li key={i}>{err.error}</li>
                  ))}
                  {importResult.errors.length > 3 && (
                    <li>...and {importResult.errors.length - 3} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 font-medium">Error loading Neon accounts</p>
            <p className="text-red-500 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        {/* Selection Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-600">
            {selectedIds.size} of {filteredAccounts.length} selected
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="text-sm text-canmp-green-600 hover:underline"
            >
              Select All
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={deselectAll}
              className="text-sm text-gray-500 hover:underline"
            >
              Deselect All
            </button>
          </div>
        </div>

        {/* Account List */}
        <div className="border rounded-lg max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Loading Neon accounts...</span>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              {search
                ? 'No accounts found matching your search.'
                : 'No unlinked Neon accounts found. All accounts may already be imported.'}
            </div>
          ) : (
            <div className="divide-y">
              {filteredAccounts.map((account) => (
                <div
                  key={account.neon_account_id}
                  onClick={() => toggleSelect(account.neon_account_id)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedIds.has(account.neon_account_id) ? 'bg-canmp-green-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(account.neon_account_id)}
                      onChange={() => toggleSelect(account.neon_account_id)}
                      className="w-4 h-4 rounded border-gray-300 text-canmp-green-600"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">
                        {account.first_name || 'Unknown'} {account.last_name || 'Name'}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        {account.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5" />
                            <span className="truncate">{account.email}</span>
                          </div>
                        )}
                        {account.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" />
                            {account.phone}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      Neon ID: {account.neon_account_id}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={importing || selectedIds.size === 0}
            className="btn-primary"
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importing...
              </>
            ) : (
              `Import ${selectedIds.size} Volunteer${selectedIds.size !== 1 ? 's' : ''}`
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

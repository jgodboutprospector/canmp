'use client';

import { useState } from 'react';
import {
  FileText,
  Image,
  Download,
  Trash2,
  Eye,
  Loader2,
  CheckCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFileSize, getFileUrl, isImageFile, isPdfFile } from '@/lib/storage';
import { format } from 'date-fns';

interface Document {
  id: string;
  file_name: string;
  original_file_name: string;
  storage_path: string;
  file_size: number | null;
  mime_type: string | null;
  category: string;
  title: string | null;
  document_date: string | null;
  expiry_date: string | null;
  is_verified: boolean;
  created_at: string;
}

interface DocumentListProps {
  documents: Document[];
  onDelete?: (id: string) => Promise<void>;
  showCategory?: boolean;
  showVerification?: boolean;
  emptyMessage?: string;
  className?: string;
}

const categoryLabels: Record<string, string> = {
  resume: 'Resume',
  cover_letter: 'Cover Letter',
  lease: 'Lease',
  lease_addendum: 'Lease Addendum',
  certificate: 'Certificate',
  diploma: 'Diploma',
  license: 'License',
  immigration_doc: 'Immigration Document',
  identification: 'ID Document',
  employment_verification: 'Employment Verification',
  income_verification: 'Income Verification',
  reference_letter: 'Reference Letter',
  training_completion: 'Training Completion',
  other: 'Other',
};

const categoryColors: Record<string, string> = {
  resume: 'bg-blue-100 text-blue-700',
  cover_letter: 'bg-blue-100 text-blue-700',
  lease: 'bg-purple-100 text-purple-700',
  lease_addendum: 'bg-purple-100 text-purple-700',
  certificate: 'bg-green-100 text-green-700',
  diploma: 'bg-green-100 text-green-700',
  license: 'bg-yellow-100 text-yellow-700',
  training_completion: 'bg-canmp-green-100 text-canmp-green-700',
  other: 'bg-gray-100 text-gray-700',
};

export default function DocumentList({
  documents,
  onDelete,
  showCategory = true,
  showVerification = false,
  emptyMessage = 'No documents uploaded yet',
  className,
}: DocumentListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleView = async (doc: Document) => {
    setLoadingId(doc.id);
    try {
      const url = await getFileUrl(doc.storage_path);
      if (url) {
        window.open(url, '_blank');
      }
    } catch (err) {
      console.error('Error getting file URL:', err);
    } finally {
      setLoadingId(null);
    }
  };

  const handleDownload = async (doc: Document) => {
    setLoadingId(doc.id);
    try {
      const url = await getFileUrl(doc.storage_path, 60); // Short expiry for download
      if (url) {
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.original_file_name;
        link.click();
      }
    } catch (err) {
      console.error('Error downloading file:', err);
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!onDelete) return;
    if (!confirm(`Delete "${doc.title || doc.original_file_name}"?`)) return;

    setDeletingId(doc.id);
    try {
      await onDelete(doc.id);
    } finally {
      setDeletingId(null);
    }
  };

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return <FileText className="w-5 h-5 text-gray-400" />;
    if (isImageFile(mimeType)) return <Image className="w-5 h-5 text-blue-500" />;
    if (isPdfFile(mimeType)) return <FileText className="w-5 h-5 text-red-500" />;
    return <FileText className="w-5 h-5 text-gray-500" />;
  };

  const isExpired = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const isExpiringSoon = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiry <= thirtyDaysFromNow && expiry > new Date();
  };

  if (documents.length === 0) {
    return (
      <div className={cn('text-center py-8 text-gray-400 text-sm', className)}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {/* File icon */}
          {getFileIcon(doc.mime_type)}

          {/* File info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900 truncate">
                {doc.title || doc.original_file_name}
              </p>
              {showVerification && doc.is_verified && (
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {showCategory && (
                <span className={cn('px-2 py-0.5 rounded-full text-xs', categoryColors[doc.category] || categoryColors.other)}>
                  {categoryLabels[doc.category] || doc.category}
                </span>
              )}
              {doc.file_size && <span>{formatFileSize(doc.file_size)}</span>}
              {doc.document_date && (
                <span>Dated {format(new Date(doc.document_date), 'MMM d, yyyy')}</span>
              )}
            </div>
            {/* Expiry warning */}
            {doc.expiry_date && (
              <div className={cn(
                'flex items-center gap-1 text-xs mt-1',
                isExpired(doc.expiry_date) ? 'text-red-600' : isExpiringSoon(doc.expiry_date) ? 'text-yellow-600' : 'text-gray-500'
              )}>
                {isExpired(doc.expiry_date) ? (
                  <>
                    <AlertTriangle className="w-3 h-3" />
                    Expired {format(new Date(doc.expiry_date), 'MMM d, yyyy')}
                  </>
                ) : isExpiringSoon(doc.expiry_date) ? (
                  <>
                    <Clock className="w-3 h-3" />
                    Expires {format(new Date(doc.expiry_date), 'MMM d, yyyy')}
                  </>
                ) : (
                  <>
                    <Clock className="w-3 h-3" />
                    Valid until {format(new Date(doc.expiry_date), 'MMM d, yyyy')}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {loadingId === doc.id ? (
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            ) : (
              <>
                <button
                  onClick={() => handleView(doc)}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
                  title="View"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDownload(doc)}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
                {onDelete && (
                  <button
                    onClick={() => handleDelete(doc)}
                    disabled={deletingId === doc.id}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    {deletingId === doc.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

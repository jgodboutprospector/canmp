'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, FileText, Image, Loader2, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validateFile, formatFileSize, isImageFile, isPdfFile } from '@/lib/storage';

interface FileUploadProps {
  onUpload: (file: File) => Promise<boolean>;
  accept?: string;
  maxSize?: number;
  category?: 'resume' | 'lease' | 'certificate' | 'image' | 'document';
  label?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
}

export default function FileUpload({
  onUpload,
  accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png',
  maxSize = 10 * 1024 * 1024, // 10MB
  category = 'document',
  label = 'Upload a file',
  hint,
  disabled = false,
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleFile(files[0]);
    }
  }, [disabled]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFile(files[0]);
    }
  }, []);

  const handleFile = async (file: File) => {
    setError(null);
    setSuccess(false);

    // Validate file
    const validation = validateFile(file, category, maxSize);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setUploadedFile(file);
    setIsUploading(true);

    try {
      const result = await onUpload(file);
      if (result) {
        setSuccess(true);
        setTimeout(() => {
          setUploadedFile(null);
          setSuccess(false);
        }, 2000);
      } else {
        setError('Failed to upload file');
      }
    } catch (err) {
      setError('An error occurred during upload');
    } finally {
      setIsUploading(false);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearFile = () => {
    setUploadedFile(null);
    setError(null);
    setSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = (file: File) => {
    if (isImageFile(file.type)) {
      return <Image className="w-8 h-8 text-blue-500" />;
    }
    if (isPdfFile(file.type)) {
      return <FileText className="w-8 h-8 text-red-500" />;
    }
    return <FileText className="w-8 h-8 text-gray-500" />;
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          isDragging && 'border-canmp-green-500 bg-canmp-green-50',
          !isDragging && !disabled && 'border-gray-300 hover:border-gray-400 hover:bg-gray-50',
          disabled && 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60',
          error && 'border-red-300 bg-red-50',
          success && 'border-green-300 bg-green-50'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          disabled={disabled || isUploading}
          className="hidden"
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-10 h-10 animate-spin text-canmp-green-500" />
            <p className="text-sm text-gray-600">Uploading {uploadedFile?.name}...</p>
          </div>
        ) : success ? (
          <div className="flex flex-col items-center gap-2">
            <Check className="w-10 h-10 text-green-500" />
            <p className="text-sm text-green-600">Upload successful!</p>
          </div>
        ) : uploadedFile && !error ? (
          <div className="flex items-center justify-center gap-3">
            {getFileIcon(uploadedFile)}
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                {uploadedFile.name}
              </p>
              <p className="text-xs text-gray-500">{formatFileSize(uploadedFile.size)}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className={cn('w-10 h-10', error ? 'text-red-400' : 'text-gray-400')} />
            <div>
              <p className="text-sm font-medium text-gray-700">{label}</p>
              <p className="text-xs text-gray-500 mt-1">
                {hint || `Drag & drop or click to select (max ${formatFileSize(maxSize)})`}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 mt-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

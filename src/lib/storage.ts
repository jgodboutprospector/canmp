import { supabase } from './supabase';

// Allowed file types by category
const ALLOWED_TYPES: Record<string, string[]> = {
  resume: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  lease: ['application/pdf'],
  certificate: ['application/pdf', 'image/jpeg', 'image/png'],
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface UploadResult {
  success: boolean;
  path?: string;
  error?: string;
  fileName?: string;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a file before upload
 */
export function validateFile(
  file: File,
  category: keyof typeof ALLOWED_TYPES = 'document',
  maxSize: number = MAX_FILE_SIZE
): FileValidationResult {
  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`,
    };
  }

  // Check file type
  const allowedTypes = ALLOWED_TYPES[category] || ALLOWED_TYPES.document;
  if (!allowedTypes.includes(file.type)) {
    const extensions = allowedTypes.map(t => {
      const ext = t.split('/')[1];
      return ext === 'vnd.openxmlformats-officedocument.wordprocessingml.document' ? 'docx' : ext;
    }).join(', ');
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${extensions}`,
    };
  }

  return { valid: true };
}

/**
 * Generate a unique storage path for a file
 */
export function generateStoragePath(
  folder: string,
  entityId: string,
  fileName: string
): string {
  const timestamp = Date.now();
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${folder}/${entityId}/${timestamp}_${sanitizedName}`;
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  file: File,
  folder: string,
  entityId: string,
  category: keyof typeof ALLOWED_TYPES = 'document'
): Promise<UploadResult> {
  // Validate file
  const validation = validateFile(file, category);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Generate path
  const path = generateStoragePath(folder, entityId, file.name);

  try {
    const { error } = await supabase.storage
      .from('documents')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Storage upload error:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      path,
      fileName: file.name,
    };
  } catch (err) {
    console.error('Upload error:', err);
    return { success: false, error: 'Failed to upload file' };
  }
}

/**
 * Get a signed URL for a file
 */
export async function getFileUrl(path: string, expiresIn: number = 3600): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error('Error getting signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error('Error getting file URL:', err);
    return null;
  }
}

/**
 * Delete a file from storage
 */
export async function deleteFile(path: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from('documents')
      .remove([path]);

    if (error) {
      console.error('Error deleting file:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Delete error:', err);
    return false;
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2).toLowerCase();
}

/**
 * Check if file is an image
 */
export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * Check if file is a PDF
 */
export function isPdfFile(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}

import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { AuthError } from './auth-server';

// ============================================
// STANDARD API RESPONSE FORMAT
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export function successResponse<T>(
  data: T,
  pagination?: PaginationInfo,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    { success: true, data, pagination },
    { status }
  );
}

export function errorResponse(
  message: string,
  status: number = 500,
  code?: string
): NextResponse<ApiResponse> {
  return NextResponse.json(
    { success: false, error: message, code },
    { status }
  );
}

// ============================================
// PAGINATION
// ============================================

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export function parsePagination(searchParams: URLSearchParams): PaginationParams {
  const result = paginationSchema.safeParse({
    page: searchParams.get('page') || 1,
    limit: searchParams.get('limit') || 50,
  });

  const page = result.success ? result.data.page : 1;
  const limit = result.success ? result.data.limit : 50;

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}

export function buildPaginationInfo(
  page: number,
  limit: number,
  total: number
): PaginationInfo {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasMore: page < totalPages,
  };
}

// ============================================
// RATE LIMITING (In-Memory)
// ============================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory rate limit store (use Redis in production for multi-instance)
const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Max requests per window
}

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,     // 100 requests per minute
};

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const key = identifier;
  const entry = rateLimitStore.get(key);

  // Clean up expired entries periodically
  if (rateLimitStore.size > 10000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetAt < now) {
        rateLimitStore.delete(k);
      }
    }
  }

  if (!entry || entry.resetAt < now) {
    // New window
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    rateLimitStore.set(key, newEntry);
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: newEntry.resetAt,
    };
  }

  // Existing window
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

export function getRateLimitIdentifier(request: NextRequest, userId?: string): string {
  // Prefer user ID for authenticated requests, fallback to IP
  if (userId) {
    return `user:${userId}`;
  }

  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ||
             request.headers.get('x-real-ip') ||
             'unknown';
  return `ip:${ip}`;
}

export function rateLimitResponse(resetAt: number): NextResponse {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  return NextResponse.json(
    { success: false, error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Reset': String(resetAt),
      }
    }
  );
}

// ============================================
// REQUEST BODY SIZE LIMITS
// ============================================

const DEFAULT_MAX_BODY_BYTES = 1 * 1024 * 1024; // 1 MB for JSON
const IMPORT_MAX_BODY_BYTES = 5 * 1024 * 1024;  // 5 MB for imports

/**
 * Parse JSON body with size limit enforcement.
 * Use this instead of request.json() to prevent oversized payloads.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function parseJsonBody<T = any>(
  request: Request,
  maxBytes: number = DEFAULT_MAX_BODY_BYTES
): Promise<T> {
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    throw new ApiError(
      `Request body too large. Maximum size: ${Math.round(maxBytes / 1024)}KB`,
      413,
      'BODY_TOO_LARGE'
    );
  }

  // Stream-read to enforce actual size (content-length can be spoofed)
  const reader = request.body?.getReader();
  if (!reader) {
    throw new ApiError('Request body is empty', 400, 'EMPTY_BODY');
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.length;
    if (totalBytes > maxBytes) {
      reader.cancel();
      throw new ApiError(
        `Request body too large. Maximum size: ${Math.round(maxBytes / 1024)}KB`,
        413,
        'BODY_TOO_LARGE'
      );
    }
    chunks.push(value);
  }

  const body = new TextDecoder().decode(
    chunks.length === 1 ? chunks[0] : concatUint8Arrays(chunks)
  );

  try {
    return JSON.parse(body) as T;
  } catch {
    throw new ApiError('Invalid JSON in request body', 400, 'INVALID_JSON');
  }
}

function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

export { IMPORT_MAX_BODY_BYTES };

// ============================================
// ERROR HANDLING
// ============================================

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiError(error: unknown): NextResponse<ApiResponse> {
  console.error('API Error:', error);

  if (error instanceof AuthError) {
    return errorResponse(error.message, error.statusCode, 'AUTH_ERROR');
  }

  if (error instanceof ZodError) {
    const details = error.issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return NextResponse.json(
      { success: false, error: 'Validation failed', code: 'VALIDATION_ERROR', details },
      { status: 400 }
    );
  }

  if (error instanceof ApiError) {
    return errorResponse(error.message, error.statusCode, error.code);
  }

  // Don't expose internal error details
  return errorResponse('An unexpected error occurred', 500, 'INTERNAL_ERROR');
}

// ============================================
// FILE UPLOAD VALIDATION
// ============================================

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateImageFile(
  file: File,
  maxSizeMB: number = 10
): FileValidationResult {
  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
    };
  }

  // Check file size
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${maxSizeMB}MB`,
    };
  }

  // Check file extension matches content type
  const extension = file.name.split('.').pop()?.toLowerCase();
  const typeToExt: Record<string, string[]> = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/gif': ['gif'],
    'image/webp': ['webp'],
    'image/svg+xml': ['svg'],
  };

  const allowedExtensions = typeToExt[file.type];
  if (allowedExtensions && extension && !allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: 'File extension does not match content type',
    };
  }

  return { valid: true };
}

export function validateDocumentFile(
  file: File,
  maxSizeMB: number = 25
): FileValidationResult {
  const allAllowed = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];

  if (!allAllowed.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: images, PDF, Word, Excel, CSV, text`,
    };
  }

  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
}

// ============================================
// AUDIT LOGGING HELPER
// ============================================

export interface AuditLogInput {
  userId: string;
  action: 'create' | 'update' | 'delete' | 'read';
  entityType: string;
  entityId: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// This will be implemented to use the audit_log table
export async function createAuditLog(
  supabase: any,
  input: AuditLogInput
): Promise<void> {
  try {
    await supabase.from('audit_log').insert({
      user_id: input.userId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      old_value: input.oldValue || null,
      new_value: input.newValue || null,
      metadata: input.metadata || null,
    });
  } catch (error) {
    // Log but don't fail the main operation
    console.error('Failed to create audit log:', error);
  }
}

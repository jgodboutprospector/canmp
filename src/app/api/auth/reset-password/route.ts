import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
  successResponse,
  errorResponse,
  handleApiError,
  checkRateLimit,
  parseJsonBody,
} from '@/lib/api-server-utils';

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// POST /api/auth/reset-password - Send password reset email
export async function POST(request: NextRequest) {
  try {
    // Rate limiting - strict for password reset to prevent abuse
    const ip = request.headers.get('x-forwarded-for') || 'anonymous';
    const rateLimit = checkRateLimit(`reset:${ip}`, { windowMs: 60000, maxRequests: 3 });
    if (!rateLimit.allowed) {
      return errorResponse('Too many reset attempts. Please try again later.', 429, 'RATE_LIMITED');
    }

    const body = await parseJsonBody(request);
    const { email } = resetPasswordSchema.parse(body);

    const supabase = getSupabaseAdmin();

    // Get the base URL for the redirect
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectTo = `${baseUrl}/reset-password`;

    // Send password reset email via Supabase
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      console.error('Password reset error:', error);
      // Don't reveal if email exists or not for security
      // Return success even if email doesn't exist
    }

    // Always return success to prevent email enumeration
    return successResponse({ message: 'If the email exists, a reset link has been sent.' });
  } catch (error) {
    return handleApiError(error);
  }
}

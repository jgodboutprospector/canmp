import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession, getUserProfile } from '@/lib/auth-server';

// GET /api/auth/profile - Get current user's profile
// Supports both cookie-based auth and Authorization header (for immediate post-login)
export async function GET(request: NextRequest) {
  try {
    let userId: string | null = null;
    let userEmail: string | null = null;

    // First, try to get user from Authorization header (for immediate post-login)
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      // Verify the token with Supabase
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (!error && user) {
        userId = user.id;
        userEmail = user.email || null;
      }
    }

    // If no Authorization header or it failed, try cookie-based session
    if (!userId) {
      const session = await getServerSession();
      if (session?.user) {
        userId = session.user.id;
        userEmail = session.user.email || null;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Pass email to allow auto-linking of accounts
    const profile = await getUserProfile(userId, userEmail || undefined);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    console.error('Profile API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

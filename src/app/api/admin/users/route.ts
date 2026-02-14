import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireRole } from '@/lib/auth-server';
import { createUserSchema, updateUserSchema, uuidSchema } from '@/lib/validation/schemas';
import { handleApiError } from '@/lib/api-error';

export async function POST(request: Request) {
  try {
    // Require admin role
    await requireRole(['admin']);

    const body = await request.json();

    // Validate input
    const { email, password, firstName, lastName, role } = createUserSchema.parse(body);

    // Create user with Supabase Admin API
    const supabaseAdmin = getSupabaseAdmin();
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: role || 'viewer',
      },
    });

    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    // The trigger should auto-create the profile, but let's update it to be sure
    if (authData.user) {
      const { error: profileError } = await (supabaseAdmin as any)
        .from('user_profiles')
        .upsert({
          id: authData.user.id,
          email,
          first_name: firstName,
          last_name: lastName,
          role: role || 'viewer',
          is_active: true,
        });

      if (profileError) {
        console.error('Profile error:', profileError);
        // Don't fail the request, profile might be created by trigger
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user?.id,
        email: authData.user?.email,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET() {
  try {
    // Require admin role
    await requireRole(['admin']);

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ users: data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    // Require admin role
    await requireRole(['admin']);

    const body = await request.json();
    const { userId: rawUserId } = body;

    if (!rawUserId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const userId = uuidSchema.parse(rawUserId);

    // Validate and sanitize updates - only allow specific fields
    const updates = updateUserSchema.parse(body.updates || {});

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid updates provided' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await (supabaseAdmin as any)
      .from('user_profiles')
      .update(updates)
      .eq('id', userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    // Require admin role
    await requireRole(['admin']);

    const { searchParams } = new URL(request.url);
    const rawUserId = searchParams.get('userId');

    if (!rawUserId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const userId = uuidSchema.parse(rawUserId);

    // Delete from auth
    const supabaseAdmin = getSupabaseAdmin();
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

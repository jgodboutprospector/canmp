import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// GET /api/tasks - Fetch tasks with optional filters
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const assignee_id = searchParams.get('assignee_id');
    const beneficiary_id = searchParams.get('beneficiary_id');
    const volunteer_id = searchParams.get('volunteer_id');
    const class_section_id = searchParams.get('class_section_id');
    const event_id = searchParams.get('event_id');
    const property_id = searchParams.get('property_id');
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');
    const include_archived = searchParams.get('include_archived') === 'true';

    let query = supabase
      .from('tasks')
      .select(`
        *,
        created_by:users!tasks_created_by_id_fkey(id, first_name, last_name, email),
        assignee:users!tasks_assignee_id_fkey(id, first_name, last_name, email),
        beneficiary:beneficiaries(id, first_name, last_name),
        household:households(id, name),
        volunteer:volunteers(id, first_name, last_name),
        class_section:class_sections(id, name),
        event:events(id, name),
        property:properties(id, name)
      `)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (!include_archived) {
      query = query.eq('is_archived', false);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (assignee_id) {
      query = query.eq('assignee_id', assignee_id);
    }

    if (beneficiary_id) {
      query = query.eq('beneficiary_id', beneficiary_id);
    }

    if (volunteer_id) {
      query = query.eq('volunteer_id', volunteer_id);
    }

    if (class_section_id) {
      query = query.eq('class_section_id', class_section_id);
    }

    if (event_id) {
      query = query.eq('event_id', event_id);
    }

    if (property_id) {
      query = query.eq('property_id', property_id);
    }

    if (from_date) {
      query = query.gte('due_date', from_date);
    }

    if (to_date) {
      query = query.lte('due_date', to_date);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching tasks:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in tasks GET:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();

    const { data, error } = await supabase
      .from('tasks')
      .insert(body)
      .select(`
        *,
        created_by:users!tasks_created_by_id_fkey(id, first_name, last_name, email),
        assignee:users!tasks_assignee_id_fkey(id, first_name, last_name, email),
        beneficiary:beneficiaries(id, first_name, last_name),
        household:households(id, name),
        volunteer:volunteers(id, first_name, last_name),
        class_section:class_sections(id, name),
        event:events(id, name),
        property:properties(id, name)
      `)
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in tasks POST:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/tasks - Update a task
export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Task ID is required' }, { status: 400 });
    }

    // If marking as done, set completed_at
    if (updateData.status === 'done' && !updateData.completed_at) {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await (supabase as any)
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        created_by:users!tasks_created_by_id_fkey(id, first_name, last_name, email),
        assignee:users!tasks_assignee_id_fkey(id, first_name, last_name, email),
        beneficiary:beneficiaries(id, first_name, last_name),
        household:households(id, name),
        volunteer:volunteers(id, first_name, last_name),
        class_section:class_sections(id, name),
        event:events(id, name),
        property:properties(id, name)
      `)
      .single();

    if (error) {
      console.error('Error updating task:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in tasks PATCH:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/tasks - Delete a task
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Task ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting task:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in tasks DELETE:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// GET /api/tasks/options - Fetch dropdown options for task forms
export async function GET() {
  try {
    const [usersResult, beneficiariesResult, volunteersResult, classesResult, eventsResult, propertiesResult] = await Promise.all([
      supabase.from('users').select('id, first_name, last_name, email').eq('is_active', true).order('first_name'),
      supabase.from('beneficiaries').select('id, first_name, last_name').eq('is_active', true).order('first_name'),
      supabase.from('volunteers').select('id, first_name, last_name').eq('is_active', true).order('first_name'),
      supabase.from('class_sections').select('id, name').eq('is_active', true).order('name'),
      supabase.from('events').select('id, name').order('event_date', { ascending: false }).limit(50),
      supabase.from('properties').select('id, name').eq('is_active', true).order('name'),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        users: usersResult.data || [],
        beneficiaries: beneficiariesResult.data || [],
        volunteers: volunteersResult.data || [],
        classes: classesResult.data || [],
        events: eventsResult.data || [],
        properties: propertiesResult.data || [],
      },
    });
  } catch (error) {
    console.error('Error fetching task options:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

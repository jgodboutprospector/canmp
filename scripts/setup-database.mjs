import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = 'https://jehanphxddmigpswxtxn.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplaGFucGh4ZGRtaWdwc3d4dHhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjkyODUxNSwiZXhwIjoyMDgyNTA0NTE1fQ.oGg834vCs2z0BO9kDGxSUYHBjgBrdrV9SQOA9urNkDo';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runSQL(sql, description) {
  console.log(`Running: ${description}...`);

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Try alternative method using REST API
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`
        },
        body: JSON.stringify({ sql_query: sql })
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
    }

    console.log(`✓ ${description} completed`);
    return true;
  } catch (err) {
    console.error(`✗ ${description} failed:`, err.message);
    return false;
  }
}

async function testConnection() {
  console.log('Testing Supabase connection...');

  try {
    // First check if sites table exists
    const { data, error } = await supabase.from('sites').select('count').limit(1);

    if (error && error.code === '42P01') {
      console.log('Tables do not exist yet. Need to run schema.');
      return { connected: true, tablesExist: false };
    } else if (error) {
      console.log('Connection error:', error.message);
      return { connected: false, tablesExist: false };
    }

    console.log('✓ Connected! Tables exist.');
    return { connected: true, tablesExist: true };
  } catch (err) {
    console.error('Connection failed:', err.message);
    return { connected: false, tablesExist: false };
  }
}

async function main() {
  console.log('='.repeat(50));
  console.log('CANMP Database Setup');
  console.log('='.repeat(50));
  console.log('');

  const { connected, tablesExist } = await testConnection();

  if (!connected) {
    console.log('');
    console.log('Could not connect to Supabase. Please check your credentials.');
    process.exit(1);
  }

  if (tablesExist) {
    console.log('');
    console.log('Database tables already exist!');

    // Show count of records
    const { data: sites } = await supabase.from('sites').select('*');
    const { data: households } = await supabase.from('households').select('*');
    const { data: properties } = await supabase.from('properties').select('*');

    console.log('');
    console.log('Current data:');
    console.log(`  Sites: ${sites?.length || 0}`);
    console.log(`  Households: ${households?.length || 0}`);
    console.log(`  Properties: ${properties?.length || 0}`);
  } else {
    console.log('');
    console.log('Tables need to be created.');
    console.log('');
    console.log('Please run the SQL files manually in Supabase Dashboard:');
    console.log('1. Go to: https://supabase.com/dashboard/project/jehanphxddmigpswxtxn/sql');
    console.log('2. Copy and run: database/schema.sql');
    console.log('3. Then run: database/seed.sql');
  }
}

main().catch(console.error);

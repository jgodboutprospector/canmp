import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = 'https://jehanphxddmigpswxtxn.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplaGFucGh4ZGRtaWdwc3d4dHhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjkyODUxNSwiZXhwIjoyMDgyNTA0NTE1fQ.oGg834vCs2z0BO9kDGxSUYHBjgBrdrV9SQOA9urNkDo';

// Supabase project ref extracted from URL
const PROJECT_REF = 'jehanphxddmigpswxtxn';

async function executeSqlViaApi(sql) {
  // Use the Supabase SQL API endpoint
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({})
  });

  return response;
}

async function testAndCreateTables() {
  console.log('Testing Supabase connection and checking tables...');
  console.log('');

  // Test connection by trying to access a table
  const testResponse = await fetch(`${SUPABASE_URL}/rest/v1/sites?select=*&limit=1`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
    }
  });

  if (testResponse.status === 200) {
    const data = await testResponse.json();
    console.log('✓ Sites table exists!');
    console.log(`  Found ${data.length} site(s)`);
    return true;
  } else if (testResponse.status === 404) {
    console.log('✗ Sites table does not exist');
    console.log('');
    console.log('To create the database schema, please:');
    console.log('');
    console.log('1. Go to: https://supabase.com/dashboard/project/jehanphxddmigpswxtxn/sql');
    console.log('2. Open the file: database/schema.sql');
    console.log('3. Copy ALL contents and paste into the SQL editor');
    console.log('4. Click "Run"');
    console.log('5. Then do the same for: database/seed.sql');
    return false;
  } else {
    const text = await testResponse.text();
    console.log(`Response status: ${testResponse.status}`);
    console.log(`Response: ${text}`);
    return false;
  }
}

async function checkAllTables() {
  const tables = ['sites', 'users', 'households', 'beneficiaries', 'properties', 'units', 'leases', 'work_orders'];

  console.log('');
  console.log('Checking tables...');

  for (const table of tables) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=count&limit=1`, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'count=exact'
      }
    });

    const count = response.headers.get('content-range');
    if (response.status === 200) {
      console.log(`  ✓ ${table}: ${count || 'exists'}`);
    } else {
      console.log(`  ✗ ${table}: not found`);
    }
  }
}

async function main() {
  console.log('='.repeat(50));
  console.log('CANMP Supabase Database Check');
  console.log('='.repeat(50));
  console.log('');

  const exists = await testAndCreateTables();

  if (exists) {
    await checkAllTables();
  }
}

main().catch(console.error);

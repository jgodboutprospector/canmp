import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jehanphxddmigpswxtxn.supabase.co';
const supabaseKey = 'sb_publishable_g_hGDcCQR0xyTy7ZiXfPlw_jmh4Mv-m';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase connection...');

  try {
    // Try to query a simple table
    const { data, error } = await supabase.from('sites').select('*').limit(1);

    if (error) {
      console.log('Error (table might not exist yet):', error.message);
      console.log('');
      console.log('To create the tables, go to your Supabase Dashboard:');
      console.log('https://supabase.com/dashboard/project/jehanphxddmigpswxtxn/sql');
      console.log('');
      console.log('Then run the SQL from: database/schema.sql');
      console.log('Followed by: database/seed.sql');
    } else {
      console.log('Connection successful!');
      console.log('Data:', data);
    }
  } catch (err) {
    console.error('Connection failed:', err.message);
  }
}

testConnection();

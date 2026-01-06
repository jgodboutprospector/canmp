import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function runMigration() {
  // Extract project ref from Supabase URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }

  // Extract project ref: https://PROJECT_REF.supabase.co -> PROJECT_REF
  const projectRef = supabaseUrl.replace('https://', '').split('.')[0];
  console.log('Project ref:', projectRef);

  // Get the database password (this is usually the service role key or you need a DB password)
  // For Supabase, you need to use the database password from the project settings
  // We'll use a direct connection approach

  // Try to connect via the pooler
  const connectionString = process.env.DATABASE_URL || `postgresql://postgres.${projectRef}:${process.env.SUPABASE_DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

  console.log('Note: You need to set DATABASE_URL or SUPABASE_DB_PASSWORD in .env.local');
  console.log('Get your database password from: Supabase Dashboard > Project Settings > Database > Connection string');
  console.log('');
  console.log('Alternatively, run the SQL manually in Supabase SQL Editor:');
  console.log('1. Go to https://supabase.com/dashboard/project/' + projectRef + '/sql');
  console.log('2. Copy and paste the contents of database/donations-schema-update.sql');
  console.log('3. Click "Run"');
  console.log('');

  // Read the migration SQL
  const sqlPath = path.join(process.cwd(), 'database', 'donations-schema-update.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  console.log('='.repeat(60));
  console.log('SQL Migration to run:');
  console.log('='.repeat(60));
  console.log(sql);
  console.log('='.repeat(60));

  if (process.env.DATABASE_URL) {
    console.log('\nAttempting to connect to database...');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    try {
      const client = await pool.connect();
      console.log('Connected to database');

      // Run the migration
      await client.query(sql);
      console.log('Migration completed successfully!');

      client.release();
    } catch (error) {
      console.error('Error running migration:', error);
    } finally {
      await pool.end();
    }
  } else {
    console.log('\nNo DATABASE_URL found. Please run the SQL manually in Supabase SQL Editor.');
  }
}

runMigration().catch(console.error);

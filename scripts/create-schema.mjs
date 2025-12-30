import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase direct database connection
// Format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
// Password URL-encoded: N9*kDX*-tzBVf6AdD-Ph -> N9%2AkDX%2A-tzBVf6AdD-Ph
// Using session mode pooler (port 5432) for DDL statements
const DATABASE_URL = 'postgresql://postgres.jehanphxddmigpswxtxn:N9%2AkDX%2A-tzBVf6AdD-Ph@aws-0-us-east-1.pooler.supabase.com:5432/postgres';

async function runSchema() {
  console.log('Connecting to Supabase database...');

  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');
    console.log('');

    // Read schema file
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('Running schema.sql...');
    await client.query(schema);
    console.log('✓ Schema created successfully!');
    console.log('');

    // Read seed file
    const seedPath = path.join(__dirname, '..', 'database', 'seed.sql');
    const seed = fs.readFileSync(seedPath, 'utf8');

    console.log('Running seed.sql...');
    await client.query(seed);
    console.log('✓ Seed data inserted successfully!');
    console.log('');

    // Verify
    const result = await client.query('SELECT COUNT(*) FROM sites');
    console.log(`Sites created: ${result.rows[0].count}`);

    const households = await client.query('SELECT COUNT(*) FROM households');
    console.log(`Households created: ${households.rows[0].count}`);

    const properties = await client.query('SELECT COUNT(*) FROM properties');
    console.log(`Properties created: ${properties.rows[0].count}`);

  } catch (err) {
    console.error('Error:', err.message);
    if (err.message.includes('password authentication failed')) {
      console.log('');
      console.log('The service role key cannot be used as a database password.');
      console.log('You need to use your database password from:');
      console.log('Supabase Dashboard → Settings → Database → Connection string');
    }
  } finally {
    await client.end();
  }
}

runSchema();

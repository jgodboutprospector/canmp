/**
 * Run the enrichment SQL via Supabase
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jehanphxddmigpswxtxn.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Read the SQL file
  const sqlPath = path.join(__dirname, 'beneficiaries-volunteers-enrichment.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  console.log('Running enrichment SQL...\n');

  // Split SQL into individual statements and run each
  // Remove comments and split by semicolon
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let successCount = 0;
  let errorCount = 0;

  for (const statement of statements) {
    // Skip if it's just a comment block
    if (statement.match(/^[\s\n]*--/)) continue;

    // Clean up the statement
    const cleanStatement = statement
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')
      .trim();

    if (!cleanStatement) continue;

    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: cleanStatement });

      if (error) {
        // Try direct query for DDL statements
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ sql_query: cleanStatement }),
        });

        if (!response.ok) {
          console.log(`Note: ${cleanStatement.substring(0, 50)}... - May need manual execution`);
          errorCount++;
        } else {
          successCount++;
        }
      } else {
        successCount++;
      }
    } catch (err) {
      console.log(`Note: Statement may need manual execution`);
      errorCount++;
    }
  }

  console.log(`\nCompleted: ${successCount} statements succeeded`);
  if (errorCount > 0) {
    console.log(`${errorCount} statements may need manual execution in Supabase SQL Editor`);
  }
}

main().catch(console.error);

/**
 * Setup Test Accounts Script
 *
 * This script creates test accounts in both Supabase Auth and the users table.
 *
 * Usage:
 *   npx ts-node scripts/setup-test-accounts.ts
 *
 * Or with environment variables:
 *   SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx npx ts-node scripts/setup-test-accounts.ts
 *
 * Prerequisites:
 *   - SUPABASE_SERVICE_ROLE_KEY environment variable (service role, not anon key)
 *   - NEXT_PUBLIC_SUPABASE_URL environment variable
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required environment variables:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL');
  console.error('  SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Test accounts to create
const TEST_ACCOUNTS = [
  {
    email: 'test-admin@newmainerproject.org',
    password: 'TestAdmin123!',
    firstName: 'Test',
    lastName: 'Admin',
    role: 'admin' as const,
  },
  {
    email: 'test-coordinator@newmainerproject.org',
    password: 'TestCoord123!',
    firstName: 'Test',
    lastName: 'Coordinator',
    role: 'coordinator' as const,
  },
  {
    email: 'test-teacher@newmainerproject.org',
    password: 'TestTeacher123!',
    firstName: 'Test',
    lastName: 'Teacher',
    role: 'teacher' as const,
  },
  {
    email: 'test-volunteer@newmainerproject.org',
    password: 'TestVolunteer123!',
    firstName: 'Test',
    lastName: 'Volunteer',
    role: 'volunteer' as const,
  },
];

async function setupTestAccounts() {
  console.log('Setting up test accounts...\n');

  for (const account of TEST_ACCOUNTS) {
    console.log(`Creating: ${account.email}`);

    try {
      // Step 1: Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true, // Auto-confirm email
      });

      if (authError) {
        if (authError.message.includes('already been registered')) {
          console.log(`  Auth user already exists, fetching...`);
          // Get existing user
          const { data: users } = await supabase.auth.admin.listUsers();
          const existingUser = users?.users?.find(u => u.email === account.email);
          if (existingUser) {
            await linkUserToProfile(existingUser.id, account);
          }
        } else {
          console.error(`  Error creating auth user: ${authError.message}`);
        }
        continue;
      }

      if (authData.user) {
        console.log(`  Auth user created: ${authData.user.id}`);
        await linkUserToProfile(authData.user.id, account);
      }
    } catch (error) {
      console.error(`  Error: ${error}`);
    }

    console.log('');
  }

  console.log('\nTest accounts setup complete!');
  console.log('\nCredentials:');
  console.log('============');
  for (const account of TEST_ACCOUNTS) {
    console.log(`${account.role.padEnd(12)} | ${account.email} | ${account.password}`);
  }
}

async function linkUserToProfile(authUserId: string, account: typeof TEST_ACCOUNTS[0]) {
  // Step 2: Upsert into users table
  const { error: userError } = await supabase
    .from('users')
    .upsert({
      email: account.email,
      first_name: account.firstName,
      last_name: account.lastName,
      role: account.role,
      is_active: true,
      auth_user_id: authUserId,
    }, {
      onConflict: 'email',
    });

  if (userError) {
    console.error(`  Error upserting user: ${userError.message}`);
  } else {
    console.log(`  User record linked`);
  }

  // Step 3: Upsert into user_profiles table
  const { error: profileError } = await supabase
    .from('user_profiles')
    .upsert({
      id: authUserId,
      email: account.email,
      first_name: account.firstName,
      last_name: account.lastName,
      role: account.role,
      is_active: true,
    }, {
      onConflict: 'id',
    });

  if (profileError) {
    console.error(`  Error upserting profile: ${profileError.message}`);
  } else {
    console.log(`  Profile record linked`);
  }
}

// Run the script
setupTestAccounts().catch(console.error);

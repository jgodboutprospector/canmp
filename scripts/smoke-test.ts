/**
 * Smoke Test Script
 *
 * Quick verification that the deployed app is working correctly.
 *
 * Usage:
 *   npx ts-node scripts/smoke-test.ts
 *
 * Or with custom base URL:
 *   BASE_URL=https://admin.newmainerproject.org npx ts-node scripts/smoke-test.ts
 */

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const BASE_URL = process.env.BASE_URL || 'https://admin.newmainerproject.org';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Test credentials
const TEST_EMAIL = 'test-admin@newmainerproject.org';
const TEST_PASSWORD = 'TestAdmin123!';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, passed: true, duration: Date.now() - start });
    console.log(`✓ ${name} (${Date.now() - start}ms)`);
  } catch (error) {
    results.push({
      name,
      passed: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    });
    console.log(`✗ ${name} (${Date.now() - start}ms)`);
    console.log(`  Error: ${error}`);
  }
}

async function runTests() {
  console.log(`\nSmoke Tests for ${BASE_URL}\n${'='.repeat(50)}\n`);

  // Test 1: Health endpoint
  await test('Health endpoint returns 200', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (!res.ok) throw new Error(`Status: ${res.status}`);
  });

  // Test 2: Login page loads
  await test('Login page loads', async () => {
    const res = await fetch(`${BASE_URL}/login`);
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    const html = await res.text();
    if (!html.includes('Sign in')) throw new Error('Login form not found');
  });

  // Test 3: Auth endpoint responds
  await test('Auth profile endpoint responds (401 expected)', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/profile`);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  // Test 4: Supabase auth works
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    await test('Supabase auth endpoint accessible', async () => {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
        headers: { apikey: SUPABASE_ANON_KEY },
      });
      if (!res.ok) throw new Error(`Status: ${res.status}`);
    });

    // Test 5: Login with test account
    await test('Login with test account', async () => {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error_description || error.msg || `Status: ${res.status}`);
      }

      const data = await res.json();
      if (!data.access_token) throw new Error('No access token returned');

      // Test 6: Get profile with token
      await test('Get profile with access token', async () => {
        const profileRes = await fetch(`${BASE_URL}/api/auth/profile`, {
          headers: {
            Authorization: `Bearer ${data.access_token}`,
          },
        });

        if (!profileRes.ok) throw new Error(`Status: ${profileRes.status}`);

        const profile = await profileRes.json();
        if (!profile.success) throw new Error(profile.error || 'Profile fetch failed');
        if (!profile.data?.email) throw new Error('No email in profile');
      });

      // Test 7: Access mutual-aid API
      await test('Access mutual-aid API', async () => {
        const mutualAidRes = await fetch(`${BASE_URL}/api/mutual-aid`, {
          headers: {
            Authorization: `Bearer ${data.access_token}`,
          },
        });

        if (!mutualAidRes.ok) throw new Error(`Status: ${mutualAidRes.status}`);

        const mutualAidData = await mutualAidRes.json();
        if (!mutualAidData.success) throw new Error(mutualAidData.error || 'API call failed');
      });
    });
  } else {
    console.log('\nSkipping Supabase tests (missing env vars)\n');
  }

  // Summary
  console.log(`\n${'='.repeat(50)}`);
  console.log('Summary:');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total:  ${results.length}`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
    process.exit(1);
  } else {
    console.log('\nAll tests passed!');
  }
}

runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});

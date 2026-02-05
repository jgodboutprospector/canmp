-- ============================================
-- Test Accounts Seed Script
-- ============================================
--
-- IMPORTANT: Before running this script, create the corresponding
-- Supabase Auth users via the Supabase Dashboard:
--   1. Go to Authentication > Users > Add User
--   2. Create users with the emails below
--   3. Copy the UUID from each created user
--   4. Update the auth_user_id values in this script
--
-- Test Account Credentials:
--   Admin:       test-admin@newmainerproject.org / TestAdmin123!
--   Coordinator: test-coordinator@newmainerproject.org / TestCoord123!
--   Teacher:     test-teacher@newmainerproject.org / TestTeacher123!
--   Volunteer:   test-volunteer@newmainerproject.org / TestVolunteer123!
-- ============================================

-- ============================================
-- Step 1: Insert test users into users table
-- ============================================
-- NOTE: Replace the auth_user_id placeholders with actual UUIDs from Supabase Auth

INSERT INTO users (email, first_name, last_name, role, is_active, auth_user_id)
VALUES
    ('test-admin@newmainerproject.org', 'Test', 'Admin', 'admin', true, NULL),
    ('test-coordinator@newmainerproject.org', 'Test', 'Coordinator', 'coordinator', true, NULL),
    ('test-teacher@newmainerproject.org', 'Test', 'Teacher', 'teacher', true, NULL),
    ('test-volunteer@newmainerproject.org', 'Test', 'Volunteer', 'volunteer', true, NULL)
ON CONFLICT (email) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;

-- ============================================
-- Step 2: Link auth_user_id after creating Supabase Auth users
-- ============================================
-- Run these after creating users in Supabase Auth Dashboard
-- Replace 'YOUR-AUTH-UUID-HERE' with the actual UUIDs

-- UPDATE users SET auth_user_id = 'YOUR-ADMIN-AUTH-UUID' WHERE email = 'test-admin@newmainerproject.org';
-- UPDATE users SET auth_user_id = 'YOUR-COORDINATOR-AUTH-UUID' WHERE email = 'test-coordinator@newmainerproject.org';
-- UPDATE users SET auth_user_id = 'YOUR-TEACHER-AUTH-UUID' WHERE email = 'test-teacher@newmainerproject.org';
-- UPDATE users SET auth_user_id = 'YOUR-VOLUNTEER-AUTH-UUID' WHERE email = 'test-volunteer@newmainerproject.org';

-- ============================================
-- Step 3: Create user_profiles entries (if using separate profiles table)
-- ============================================

INSERT INTO user_profiles (id, email, first_name, last_name, role, is_active)
SELECT
    gen_random_uuid(),
    email,
    first_name,
    last_name,
    role,
    is_active
FROM users
WHERE email LIKE 'test-%@newmainerproject.org'
ON CONFLICT (email) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;

-- ============================================
-- Step 4: Create test volunteer record for test-volunteer user
-- ============================================

INSERT INTO volunteers (first_name, last_name, email, is_active, skills, languages_spoken)
SELECT
    'Test',
    'Volunteer',
    'test-volunteer@newmainerproject.org',
    true,
    ARRAY['transportation', 'mentoring'],
    ARRAY['English']
WHERE NOT EXISTS (
    SELECT 1 FROM volunteers WHERE email = 'test-volunteer@newmainerproject.org'
);

-- ============================================
-- Step 5: Create test household for testing
-- ============================================

INSERT INTO households (name, primary_language, is_active, notes)
VALUES ('Test Family', 'English', true, 'Test household for QA testing')
ON CONFLICT DO NOTHING;

-- ============================================
-- Step 6: Create test beneficiary
-- ============================================

INSERT INTO beneficiaries (
    household_id,
    first_name,
    last_name,
    relationship_type,
    is_active,
    english_proficiency
)
SELECT
    h.id,
    'Test',
    'Beneficiary',
    'head_of_household',
    true,
    'intermediate'
FROM households h
WHERE h.name = 'Test Family'
AND NOT EXISTS (
    SELECT 1 FROM beneficiaries b
    WHERE b.first_name = 'Test' AND b.last_name = 'Beneficiary'
);

-- ============================================
-- Verification Queries (uncomment to run)
-- ============================================

-- SELECT id, email, first_name, last_name, role, auth_user_id FROM users WHERE email LIKE 'test-%';
-- SELECT id, email, first_name, last_name, role FROM user_profiles WHERE email LIKE 'test-%';
-- SELECT id, first_name, last_name, email FROM volunteers WHERE email LIKE 'test-%';
-- SELECT id, name FROM households WHERE name = 'Test Family';
-- SELECT id, first_name, last_name FROM beneficiaries WHERE first_name = 'Test';

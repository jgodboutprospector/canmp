-- ============================================
-- Fix Notes Author Foreign Key
-- Run this in Supabase SQL Editor
-- ============================================
-- The author_id column references users table but auth users may not be in that table
-- This fix drops the foreign key constraint to allow any UUID

-- Fix property_notes
ALTER TABLE property_notes
DROP CONSTRAINT IF EXISTS property_notes_author_id_fkey;

-- Fix beneficiary_notes
ALTER TABLE beneficiary_notes
DROP CONSTRAINT IF EXISTS beneficiary_notes_author_id_fkey;

-- Fix volunteer_notes
ALTER TABLE volunteer_notes
DROP CONSTRAINT IF EXISTS volunteer_notes_author_id_fkey;

-- Done! Notes can now be added without requiring a matching users table entry

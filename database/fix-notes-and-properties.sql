-- ============================================
-- CANMP Notes & Properties Fix Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- Ensure uuid extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ADD MISSING LANDLORD COLUMNS TO PROPERTIES
-- ============================================
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS landlord_address TEXT,
ADD COLUMN IF NOT EXISTS landlord_bank_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS landlord_bank_routing VARCHAR(20),
ADD COLUMN IF NOT EXISTS landlord_bank_account VARCHAR(30),
ADD COLUMN IF NOT EXISTS landlord_payment_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS landlord_notes TEXT;

-- ============================================
-- FIX PROPERTY NOTES TABLE & RLS
-- ============================================

-- Create table if not exists
CREATE TABLE IF NOT EXISTS property_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    note_type VARCHAR(50) DEFAULT 'general',
    is_internal BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_notes_property ON property_notes(property_id);

-- Enable RLS
ALTER TABLE property_notes ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Authenticated users can read property notes" ON property_notes;
DROP POLICY IF EXISTS "Staff can manage property notes" ON property_notes;
DROP POLICY IF EXISTS "Staff can insert property notes" ON property_notes;
DROP POLICY IF EXISTS "Staff can update property notes" ON property_notes;
DROP POLICY IF EXISTS "Staff can delete property notes" ON property_notes;
DROP POLICY IF EXISTS "All authenticated can do everything on property_notes" ON property_notes;

-- Create simple policy that allows all authenticated users
CREATE POLICY "All authenticated can do everything on property_notes" ON property_notes
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- ============================================
-- FIX BENEFICIARY NOTES TABLE & RLS
-- ============================================

CREATE TABLE IF NOT EXISTS beneficiary_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    beneficiary_id UUID REFERENCES beneficiaries(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    note_type VARCHAR(50) DEFAULT 'general',
    is_confidential BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_beneficiary_notes_beneficiary ON beneficiary_notes(beneficiary_id);

-- Enable RLS
ALTER TABLE beneficiary_notes ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Staff can view beneficiary notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Staff can manage beneficiary notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "All authenticated can do everything on beneficiary_notes" ON beneficiary_notes;

-- Create simple policy that allows all authenticated users
CREATE POLICY "All authenticated can do everything on beneficiary_notes" ON beneficiary_notes
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- ============================================
-- CREATE VOLUNTEER NOTES TABLE & RLS
-- ============================================

CREATE TABLE IF NOT EXISTS volunteer_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    volunteer_id UUID REFERENCES volunteers(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    note_type VARCHAR(50) DEFAULT 'general',
    is_internal BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_volunteer_notes_volunteer ON volunteer_notes(volunteer_id);

-- Enable RLS
ALTER TABLE volunteer_notes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "All authenticated can do everything on volunteer_notes" ON volunteer_notes;

-- Create simple policy
CREATE POLICY "All authenticated can do everything on volunteer_notes" ON volunteer_notes
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- ============================================
-- ADD BENEFICIARY SENSITIVE FIELDS
-- ============================================
ALTER TABLE beneficiaries
ADD COLUMN IF NOT EXISTS ssn_collected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS a_number_collected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ssn_last_four VARCHAR(4),
ADD COLUMN IF NOT EXISTS a_number_last_four VARCHAR(4);

-- ============================================
-- CREATE UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Property notes trigger
DROP TRIGGER IF EXISTS update_property_notes_updated_at ON property_notes;
CREATE TRIGGER update_property_notes_updated_at
    BEFORE UPDATE ON property_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Volunteer notes trigger
DROP TRIGGER IF EXISTS update_volunteer_notes_updated_at ON volunteer_notes;
CREATE TRIGGER update_volunteer_notes_updated_at
    BEFORE UPDATE ON volunteer_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT ALL ON property_notes TO authenticated;
GRANT ALL ON beneficiary_notes TO authenticated;
GRANT ALL ON volunteer_notes TO authenticated;

-- ============================================
-- DONE!
-- ============================================

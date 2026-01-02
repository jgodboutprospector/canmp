-- ============================================
-- CANMP Beneficiaries & Volunteers Schema Enrichment
-- Based on CSV data analysis
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- BENEFICIARIES TABLE ENRICHMENT
-- ============================================

-- Add new columns for data from CSV
ALTER TABLE beneficiaries
ADD COLUMN IF NOT EXISTS neon_account_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS full_address TEXT,
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS state VARCHAR(10),
ADD COLUMN IF NOT EXISTS programs_of_interest TEXT[], -- Array of program names
ADD COLUMN IF NOT EXISTS programs_other_details TEXT,
ADD COLUMN IF NOT EXISTS referral_source TEXT,
ADD COLUMN IF NOT EXISTS referral_notes TEXT,
ADD COLUMN IF NOT EXISTS country_of_origin VARCHAR(100),
ADD COLUMN IF NOT EXISTS date_arrived_us DATE,
ADD COLUMN IF NOT EXISTS date_arrived_maine DATE,
ADD COLUMN IF NOT EXISTS current_occupation VARCHAR(200),
ADD COLUMN IF NOT EXISTS previous_occupation VARCHAR(200),
ADD COLUMN IF NOT EXISTS occupation_desires TEXT,
ADD COLUMN IF NOT EXISTS esl_experience TEXT,
ADD COLUMN IF NOT EXISTS esl_class_assignments TEXT[], -- Array of class names
ADD COLUMN IF NOT EXISTS language_instruction_levels TEXT[],
ADD COLUMN IF NOT EXISTS esl_documentation_needs BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS esl_documentation_details TEXT,
ADD COLUMN IF NOT EXISTS enrollment_reason TEXT,
ADD COLUMN IF NOT EXISTS literacy_cert_date DATE,
ADD COLUMN IF NOT EXISTS support_services TEXT[], -- Non-CANMP services receiving
ADD COLUMN IF NOT EXISTS support_services_other TEXT,
ADD COLUMN IF NOT EXISTS spoken_languages TEXT[]; -- Primary spoken languages

-- Create index on neon_account_id for lookups
CREATE INDEX IF NOT EXISTS idx_beneficiaries_neon_id ON beneficiaries(neon_account_id);

-- ============================================
-- CASE WORKERS TABLE (NEW)
-- For tracking external case workers
-- ============================================

CREATE TABLE IF NOT EXISTS case_workers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    beneficiary_id UUID REFERENCES beneficiaries(id) ON DELETE CASCADE,
    name VARCHAR(200),
    agency VARCHAR(200),
    email VARCHAR(255),
    phone VARCHAR(50),
    translator_name VARCHAR(200),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_workers_beneficiary ON case_workers(beneficiary_id);

ALTER TABLE case_workers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view case workers" ON case_workers;
DROP POLICY IF EXISTS "Staff can manage case workers" ON case_workers;

CREATE POLICY "Staff can view case workers" ON case_workers
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage case workers" ON case_workers
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator')
        )
    );

-- ============================================
-- VOLUNTEERS TABLE ENRICHMENT
-- ============================================

ALTER TABLE volunteers
ADD COLUMN IF NOT EXISTS neon_account_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS full_address TEXT,
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS state VARCHAR(10),
ADD COLUMN IF NOT EXISTS company_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS support_locations TEXT[], -- waterville, augusta, virtual
ADD COLUMN IF NOT EXISTS volunteer_interests TEXT[], -- language, family mentor teams, etc.
ADD COLUMN IF NOT EXISTS time_commitment VARCHAR(50), -- 1-5 hours, 6-10 hours, etc.
ADD COLUMN IF NOT EXISTS assigned_opportunities TEXT[], -- FMT assignments, events, etc.
ADD COLUMN IF NOT EXISTS total_donations DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_donation_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS last_donation_date DATE,
ADD COLUMN IF NOT EXISTS first_donation_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS first_donation_date DATE;

-- Create index on neon_account_id for lookups
CREATE INDEX IF NOT EXISTS idx_volunteers_neon_id ON volunteers(neon_account_id);

-- ============================================
-- HOUSEHOLDS TABLE ENRICHMENT
-- ============================================

ALTER TABLE households
ADD COLUMN IF NOT EXISTS neon_account_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS full_address TEXT,
ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT 'Waterville',
ADD COLUMN IF NOT EXISTS state VARCHAR(10) DEFAULT 'ME';

-- ============================================
-- PROGRAM INTERESTS REFERENCE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS program_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(150),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed program types from CSV data
INSERT INTO program_types (name, display_name, sort_order) VALUES
('family_mentor_team', 'Family Mentor Team', 1),
('language_classes', 'Language Classes', 2),
('driving_school', 'Driving School', 3),
('transportation', 'Transportation', 4),
('better_housing', 'Better Housing Program', 5),
('window_inserts', 'Window Inserts', 6),
('baby_fund', 'Baby Fund', 7),
('emergency_assistance', 'Emergency Assistance', 8),
('employment_search', 'Employment Search/Workforce', 9),
('scholarship', 'Scholarship', 10),
('legal_consultation', 'Legal Consultation', 11),
('community_events', 'Community Events', 12),
('other', 'Other', 99)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- VOLUNTEER INTERESTS REFERENCE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS volunteer_interest_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(150),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed volunteer interest types from CSV data
INSERT INTO volunteer_interest_types (name, display_name, sort_order) VALUES
('language', 'Language Instruction', 1),
('family_mentor_teams', 'Family Mentor Teams', 2),
('transportation', 'Transportation', 3),
('community_events', 'Community Events', 4),
('administrative_support', 'Administrative Support', 5),
('better_housing', 'Better Housing Program', 6),
('fundraising', 'Fundraising', 7),
('rapid_response', 'Rapid Response Support', 8),
('donation_pickup', 'Donation Pick Up/Drop Off', 9),
('steering_committee', 'Steering Committee', 10),
('other', 'Other', 99)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- SUPPORT SERVICES REFERENCE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS support_service_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(150),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed support service types from CSV data
INSERT INTO support_service_types (name, display_name, sort_order) VALUES
('tanif', 'TANF', 1),
('snap', 'SNAP/Food Stamps', 2),
('maine_care', 'MaineCare', 3),
('housing_assistance', 'Housing Assistance', 4),
('lheap', 'LHEAP Program', 5),
('social_security', 'Social Security', 6),
('fafsa', 'FAFSA', 7),
('other', 'Other', 99)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

DROP TRIGGER IF EXISTS update_case_workers_updated_at ON case_workers;
CREATE TRIGGER update_case_workers_updated_at
    BEFORE UPDATE ON case_workers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- DONE!
-- ============================================

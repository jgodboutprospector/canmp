-- ============================================
-- CANMP Complete Notes & Ledger Migration
-- Run this in Supabase SQL Editor
-- ============================================
-- This creates all missing tables for notes across modules
-- and rent ledger functionality

-- Ensure uuid extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROPERTY NOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS property_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    note_type VARCHAR(50) DEFAULT 'general', -- general, maintenance, landlord_communication, financial
    is_internal BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_notes_property ON property_notes(property_id);

-- Enable RLS on property_notes
ALTER TABLE property_notes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can read property notes" ON property_notes;
DROP POLICY IF EXISTS "Staff can manage property notes" ON property_notes;

CREATE POLICY "Authenticated users can read property notes" ON property_notes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage property notes" ON property_notes
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator')
        )
    );

-- ============================================
-- BENEFICIARY NOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS beneficiary_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    beneficiary_id UUID REFERENCES beneficiaries(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    note_type VARCHAR(50) DEFAULT 'general', -- general, sensitive, medical, employment, housing, education
    is_confidential BOOLEAN DEFAULT false, -- Extra sensitive notes
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_beneficiary_notes_beneficiary ON beneficiary_notes(beneficiary_id);

-- Enable RLS
ALTER TABLE beneficiary_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view beneficiary notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Staff can manage beneficiary notes" ON beneficiary_notes;

CREATE POLICY "Staff can view beneficiary notes" ON beneficiary_notes
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator')
        )
    );

CREATE POLICY "Staff can manage beneficiary notes" ON beneficiary_notes
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator')
        )
    );

-- ============================================
-- BENEFICIARY DOCUMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS beneficiary_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    beneficiary_id UUID REFERENCES beneficiaries(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL, -- ssn_card, i94, ead, passport, birth_certificate, etc.
    document_name VARCHAR(255),
    expiry_date DATE,
    storage_path TEXT, -- Supabase Storage path
    notes TEXT,
    uploaded_by_id UUID REFERENCES users(id),
    is_verified BOOLEAN DEFAULT false,
    verified_by_id UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_beneficiary_documents_beneficiary ON beneficiary_documents(beneficiary_id);

-- Enable RLS
ALTER TABLE beneficiary_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view beneficiary documents" ON beneficiary_documents;
DROP POLICY IF EXISTS "Staff can manage beneficiary documents" ON beneficiary_documents;

CREATE POLICY "Staff can view beneficiary documents" ON beneficiary_documents
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator')
        )
    );

CREATE POLICY "Staff can manage beneficiary documents" ON beneficiary_documents
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator')
        )
    );

-- ============================================
-- RENT LEDGER TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS rent_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,

    -- Period
    ledger_month DATE NOT NULL, -- First of month

    -- Amounts due
    rent_due_from_tenant DECIMAL(10,2) DEFAULT 0,
    rent_due_to_landlord DECIMAL(10,2) DEFAULT 0,

    -- Amounts collected/paid
    amount_collected_from_tenant DECIMAL(10,2) DEFAULT 0,
    collection_date DATE,
    collection_method VARCHAR(50), -- cash, check, bank_transfer
    collection_reference VARCHAR(100),
    collected_by_id UUID REFERENCES users(id),

    -- Payments to landlord
    amount_paid_to_landlord DECIMAL(10,2) DEFAULT 0,
    landlord_payment_date DATE,
    landlord_payment_method VARCHAR(50),
    landlord_payment_reference VARCHAR(100), -- check #, ACH confirmation
    paid_by_id UUID REFERENCES users(id),

    -- Subsidy (if applicable)
    subsidy_amount DECIMAL(10,2) DEFAULT 0,

    -- Status flags
    tenant_paid BOOLEAN DEFAULT false,
    landlord_paid BOOLEAN DEFAULT false,

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(lease_id, ledger_month)
);

CREATE INDEX IF NOT EXISTS idx_rent_ledger_lease ON rent_ledger(lease_id);
CREATE INDEX IF NOT EXISTS idx_rent_ledger_month ON rent_ledger(ledger_month);

-- Enable RLS
ALTER TABLE rent_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view rent ledger" ON rent_ledger;
DROP POLICY IF EXISTS "Staff can manage rent ledger" ON rent_ledger;

CREATE POLICY "Staff can view rent ledger" ON rent_ledger
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator')
        )
    );

CREATE POLICY "Staff can manage rent ledger" ON rent_ledger
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator')
        )
    );

-- ============================================
-- ENHANCED LANDLORD FIELDS (if not already added)
-- ============================================
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS landlord_address TEXT,
ADD COLUMN IF NOT EXISTS landlord_bank_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS landlord_bank_routing VARCHAR(20),
ADD COLUMN IF NOT EXISTS landlord_bank_account VARCHAR(30),
ADD COLUMN IF NOT EXISTS landlord_payment_method VARCHAR(50), -- check, ach, wire
ADD COLUMN IF NOT EXISTS landlord_notes TEXT;

-- ============================================
-- BENEFICIARY SENSITIVE FIELDS (if not already added)
-- ============================================
ALTER TABLE beneficiaries
ADD COLUMN IF NOT EXISTS ssn_collected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS a_number_collected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ssn_last_four VARCHAR(4), -- For display purposes only
ADD COLUMN IF NOT EXISTS a_number_last_four VARCHAR(4); -- For display purposes only

-- ============================================
-- CREATE TRIGGERS FOR UPDATED_AT
-- ============================================

-- Check if update_updated_at function exists, if not create it
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

-- Beneficiary documents trigger
DROP TRIGGER IF EXISTS update_beneficiary_documents_updated_at ON beneficiary_documents;
CREATE TRIGGER update_beneficiary_documents_updated_at
    BEFORE UPDATE ON beneficiary_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Rent ledger trigger
DROP TRIGGER IF EXISTS update_rent_ledger_updated_at ON rent_ledger;
CREATE TRIGGER update_rent_ledger_updated_at
    BEFORE UPDATE ON rent_ledger
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- USER_PROFILES COMPATIBILITY
-- ============================================
-- Note: user_profiles may already exist as a table in your database.
-- If you need to create it as a view instead, first drop the table:
-- DROP TABLE IF EXISTS user_profiles CASCADE;
-- Then uncomment the following:
--
-- CREATE OR REPLACE VIEW user_profiles AS
-- SELECT
--     id,
--     auth_user_id,
--     email,
--     first_name,
--     last_name,
--     role,
--     phone,
--     is_active,
--     created_at,
--     updated_at
-- FROM users;
--
-- GRANT SELECT ON user_profiles TO authenticated;

-- ============================================
-- DONE!
-- ============================================

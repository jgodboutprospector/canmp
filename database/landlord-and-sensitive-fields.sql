-- ============================================
-- CANMP Landlord Details & Sensitive Fields Update
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- LANDLORD / PROPERTY ENHANCEMENTS
-- ============================================

-- Enhanced landlord information for properties
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS landlord_address TEXT,
ADD COLUMN IF NOT EXISTS landlord_bank_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS landlord_bank_routing VARCHAR(20),
ADD COLUMN IF NOT EXISTS landlord_bank_account VARCHAR(30),
ADD COLUMN IF NOT EXISTS landlord_payment_method VARCHAR(50), -- check, ach, wire
ADD COLUMN IF NOT EXISTS landlord_notes TEXT;

-- Property notes (ongoing notes similar to case notes)
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

-- Updated at trigger
CREATE OR REPLACE TRIGGER update_property_notes_updated_at
    BEFORE UPDATE ON property_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- BENEFICIARY SENSITIVE FIELDS
-- ============================================

-- Note: SSN and A# are already in the schema as encrypted fields
-- Adding additional fields for clarity and UI support

-- Add date of birth if not present (already exists but making sure)
-- Also add a way to track if sensitive data has been collected

ALTER TABLE beneficiaries
ADD COLUMN IF NOT EXISTS ssn_collected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS a_number_collected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ssn_last_four VARCHAR(4), -- For display purposes only
ADD COLUMN IF NOT EXISTS a_number_last_four VARCHAR(4); -- For display purposes only

-- Beneficiary documents (for storing document references)
CREATE TABLE IF NOT EXISTS beneficiary_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    beneficiary_id UUID REFERENCES beneficiaries(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL, -- ssn_card, i94, ead, passport, birth_certificate, etc.
    document_name VARCHAR(255),
    expiry_date DATE,
    storage_path TEXT, -- Supabase Storage path (for encrypted storage)
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

-- Beneficiary notes (case-specific notes that are more informal)
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

-- Trigger for documents
CREATE OR REPLACE TRIGGER update_beneficiary_documents_updated_at
    BEFORE UPDATE ON beneficiary_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

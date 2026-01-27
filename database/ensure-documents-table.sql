-- ============================================
-- Ensure Documents Table Exists
-- Fixes 404 error when querying documents table
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Document category enum (if not exists)
DO $$ BEGIN
    CREATE TYPE document_category AS ENUM (
        'resume',
        'cover_letter',
        'lease',
        'lease_addendum',
        'certificate',
        'diploma',
        'license',
        'immigration_doc',
        'identification',
        'employment_verification',
        'income_verification',
        'reference_letter',
        'training_completion',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create documents table if not exists
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- File info
    file_name VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    -- Categorization
    category document_category NOT NULL,
    title VARCHAR(200),
    description TEXT,
    -- Ownership - at least one should be set
    beneficiary_id UUID REFERENCES beneficiaries(id) ON DELETE CASCADE,
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
    workforce_participant_id UUID,
    class_enrollment_id UUID,
    -- Metadata
    document_date DATE,
    expiry_date DATE,
    is_verified BOOLEAN DEFAULT false,
    verified_by_id UUID,
    verified_at TIMESTAMPTZ,
    -- Status
    is_active BOOLEAN DEFAULT true,
    uploaded_by_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_documents_beneficiary ON documents(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_documents_household ON documents(household_id);
CREATE INDEX IF NOT EXISTS idx_documents_lease ON documents(lease_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_expiry ON documents(expiry_date) WHERE expiry_date IS NOT NULL;

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can view documents" ON documents;
DROP POLICY IF EXISTS "Staff can upload documents" ON documents;
DROP POLICY IF EXISTS "Staff can update documents" ON documents;
DROP POLICY IF EXISTS "Admin can delete documents" ON documents;

-- Create RLS Policies
CREATE POLICY "Authenticated users can view documents"
    ON documents FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Staff can upload documents"
    ON documents FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Staff can update documents"
    ON documents FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Admin can delete documents"
    ON documents FOR DELETE
    TO authenticated
    USING (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS documents_updated_at ON documents;
CREATE TRIGGER documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_documents_updated_at();

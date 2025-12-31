-- ============================================
-- File Uploads / Document Management Schema
-- For resumes, leases, certificates, and other documents
-- ============================================

-- Document category enum
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

-- Main documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- File info
    file_name VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL, -- Supabase storage path
    file_size INTEGER, -- Size in bytes
    mime_type VARCHAR(100),
    -- Categorization
    category document_category NOT NULL,
    title VARCHAR(200), -- User-friendly title
    description TEXT,
    -- Ownership - at least one should be set
    beneficiary_id UUID REFERENCES beneficiaries(id) ON DELETE CASCADE,
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
    workforce_participant_id UUID REFERENCES workforce_participants(id) ON DELETE CASCADE,
    -- For language program certificates
    class_enrollment_id UUID REFERENCES class_enrollments(id) ON DELETE CASCADE,
    -- Metadata
    document_date DATE, -- Date on the document (e.g., certificate issue date)
    expiry_date DATE, -- For licenses, certifications that expire
    is_verified BOOLEAN DEFAULT false,
    verified_by_id UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    -- Status
    is_active BOOLEAN DEFAULT true,
    uploaded_by_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workforce-specific document view (resumes, certifications)
CREATE OR REPLACE VIEW workforce_documents AS
SELECT
    d.*,
    wp.beneficiary_id as participant_beneficiary_id,
    b.first_name,
    b.last_name
FROM documents d
LEFT JOIN workforce_participants wp ON d.workforce_participant_id = wp.id
LEFT JOIN beneficiaries b ON wp.beneficiary_id = b.id
WHERE d.category IN ('resume', 'cover_letter', 'certificate', 'license', 'training_completion', 'reference_letter')
AND d.is_active = true;

-- Housing-specific document view (leases, addendums)
CREATE OR REPLACE VIEW housing_documents AS
SELECT
    d.*,
    l.unit_id,
    l.household_id as lease_household_id,
    h.name as household_name,
    u.unit_number,
    p.name as property_name
FROM documents d
LEFT JOIN leases l ON d.lease_id = l.id
LEFT JOIN households h ON l.household_id = h.id
LEFT JOIN units u ON l.unit_id = u.id
LEFT JOIN properties p ON u.property_id = p.id
WHERE d.category IN ('lease', 'lease_addendum')
AND d.is_active = true;

-- Language program document view (certificates, diplomas)
CREATE OR REPLACE VIEW language_documents AS
SELECT
    d.*,
    ce.beneficiary_id as enrollment_beneficiary_id,
    b.first_name,
    b.last_name,
    c.name as class_name,
    c.level as class_level
FROM documents d
LEFT JOIN class_enrollments ce ON d.class_enrollment_id = ce.id
LEFT JOIN beneficiaries b ON ce.beneficiary_id = b.id
LEFT JOIN classes c ON ce.class_id = c.id
WHERE d.category IN ('certificate', 'diploma')
AND d.is_active = true;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_beneficiary ON documents(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_documents_household ON documents(household_id);
CREATE INDEX IF NOT EXISTS idx_documents_lease ON documents(lease_id);
CREATE INDEX IF NOT EXISTS idx_documents_workforce ON documents(workforce_participant_id);
CREATE INDEX IF NOT EXISTS idx_documents_enrollment ON documents(class_enrollment_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_expiry ON documents(expiry_date) WHERE expiry_date IS NOT NULL;

-- Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view documents"
    ON documents FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Staff can upload documents"
    ON documents FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'coordinator', 'teacher')
        )
    );

CREATE POLICY "Staff can update documents"
    ON documents FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'coordinator', 'teacher')
        )
    );

CREATE POLICY "Admin can delete documents"
    ON documents FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- ============================================
-- Supabase Storage Bucket Setup Notes
-- Run these in Supabase Dashboard SQL Editor:
-- ============================================
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('documents', 'documents', false);
--
-- CREATE POLICY "Authenticated users can upload documents"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (bucket_id = 'documents');
--
-- CREATE POLICY "Authenticated users can view documents"
-- ON storage.objects FOR SELECT
-- TO authenticated
-- USING (bucket_id = 'documents');
--
-- CREATE POLICY "Staff can delete documents"
-- ON storage.objects FOR DELETE
-- TO authenticated
-- USING (
--     bucket_id = 'documents'
--     AND EXISTS (
--         SELECT 1 FROM public.users
--         WHERE users.id = auth.uid()
--         AND users.role IN ('admin', 'coordinator')
--     )
-- );

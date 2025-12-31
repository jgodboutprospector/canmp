-- ============================================
-- External Organization Contacts Schema
-- For tracking case workers, translators, and other external contacts
-- ============================================

-- Contact types enum
DO $$ BEGIN
    CREATE TYPE external_contact_type AS ENUM (
        'case_worker',
        'translator',
        'legal_services',
        'medical_provider',
        'mental_health',
        'school_contact',
        'childcare',
        'employment_services',
        'immigration_attorney',
        'social_services',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- External Organizations (agencies, clinics, schools, etc.)
CREATE TABLE IF NOT EXISTS external_organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    organization_type external_contact_type NOT NULL,
    address_line1 VARCHAR(200),
    address_line2 VARCHAR(200),
    city VARCHAR(100),
    state VARCHAR(50),
    zip VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- External Contacts (individuals at organizations or independent)
CREATE TABLE IF NOT EXISTS external_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES external_organizations(id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    title VARCHAR(100), -- Job title: "Case Manager", "Interpreter", etc.
    contact_type external_contact_type NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    -- For translators
    languages TEXT[], -- Languages they can translate
    is_certified BOOLEAN DEFAULT false,
    certification_details TEXT,
    -- Availability
    preferred_contact_method VARCHAR(50), -- phone, email, text
    availability_notes TEXT,
    -- Status
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Junction table: Beneficiary to External Contacts (many-to-many)
CREATE TABLE IF NOT EXISTS beneficiary_external_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    beneficiary_id UUID NOT NULL REFERENCES beneficiaries(id) ON DELETE CASCADE,
    external_contact_id UUID NOT NULL REFERENCES external_contacts(id) ON DELETE CASCADE,
    relationship_type external_contact_type NOT NULL, -- What role they play for this beneficiary
    is_primary BOOLEAN DEFAULT false, -- Is this the primary contact of this type?
    start_date DATE,
    end_date DATE,
    notes TEXT,
    created_by_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(beneficiary_id, external_contact_id, relationship_type)
);

-- Contact interaction log
CREATE TABLE IF NOT EXISTS external_contact_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_contact_id UUID NOT NULL REFERENCES external_contacts(id) ON DELETE CASCADE,
    beneficiary_id UUID REFERENCES beneficiaries(id) ON DELETE SET NULL,
    household_id UUID REFERENCES households(id) ON DELETE SET NULL,
    interaction_type VARCHAR(50) NOT NULL, -- call, email, in_person, video, text
    direction VARCHAR(20) NOT NULL, -- inbound, outbound
    subject VARCHAR(200),
    notes TEXT,
    interaction_date TIMESTAMPTZ DEFAULT NOW(),
    logged_by_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_external_contacts_org ON external_contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_external_contacts_type ON external_contacts(contact_type);
CREATE INDEX IF NOT EXISTS idx_beneficiary_external_contacts_beneficiary ON beneficiary_external_contacts(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_beneficiary_external_contacts_contact ON beneficiary_external_contacts(external_contact_id);
CREATE INDEX IF NOT EXISTS idx_external_contact_interactions_contact ON external_contact_interactions(external_contact_id);
CREATE INDEX IF NOT EXISTS idx_external_contact_interactions_beneficiary ON external_contact_interactions(beneficiary_id);

-- Row Level Security
ALTER TABLE external_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficiary_external_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_contact_interactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (authenticated users can read, admin/coordinator can write)
CREATE POLICY "Authenticated users can view external organizations"
    ON external_organizations FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admin and coordinator can manage external organizations"
    ON external_organizations FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'coordinator')
        )
    );

CREATE POLICY "Authenticated users can view external contacts"
    ON external_contacts FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admin and coordinator can manage external contacts"
    ON external_contacts FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'coordinator')
        )
    );

CREATE POLICY "Authenticated users can view beneficiary external contacts"
    ON beneficiary_external_contacts FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admin and coordinator can manage beneficiary external contacts"
    ON beneficiary_external_contacts FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'coordinator')
        )
    );

CREATE POLICY "Authenticated users can view contact interactions"
    ON external_contact_interactions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Staff can add contact interactions"
    ON external_contact_interactions FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'coordinator', 'teacher')
        )
    );

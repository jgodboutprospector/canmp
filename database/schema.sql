-- ============================================
-- CANMP Case Management System
-- Supabase Database Schema v1.0
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUM TYPES
-- ============================================

CREATE TYPE user_role AS ENUM ('admin', 'coordinator', 'teacher', 'board_member', 'volunteer');
CREATE TYPE site_location AS ENUM ('waterville', 'augusta');
CREATE TYPE property_type AS ENUM ('canmp_owned', 'master_lease');
CREATE TYPE unit_status AS ENUM ('available', 'occupied', 'maintenance', 'offline');
CREATE TYPE lease_type AS ENUM ('canmp_direct', 'master_sublease', 'bridge');
CREATE TYPE lease_status AS ENUM ('active', 'completed', 'terminated', 'pending');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'late', 'partial', 'waived');
CREATE TYPE work_order_category AS ENUM ('plumbing', 'hvac', 'electrical', 'appliance', 'structural', 'safety', 'pest', 'landscaping', 'other');
CREATE TYPE work_order_priority AS ENUM ('urgent', 'high', 'medium', 'low');
CREATE TYPE work_order_status AS ENUM ('open', 'scheduled', 'in_progress', 'on_hold', 'completed', 'cancelled');
CREATE TYPE language_proficiency AS ENUM ('none', 'basic', 'intermediate', 'advanced', 'fluent', 'native');
CREATE TYPE class_level AS ENUM ('basic', 'beginner', 'intermediate', 'lets_talk');
CREATE TYPE relationship_type AS ENUM ('head_of_household', 'spouse', 'child', 'parent', 'sibling', 'other_relative', 'other');
CREATE TYPE gender AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');
CREATE TYPE case_note_visibility AS ENUM ('all_staff', 'coordinators_only', 'private');

-- ============================================
-- CORE TABLES
-- ============================================

-- Sites (Waterville, Augusta locations)
CREATE TABLE sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    location site_location NOT NULL UNIQUE,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (staff, volunteers, board members)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role user_role NOT NULL DEFAULT 'volunteer',
    site_id UUID REFERENCES sites(id),
    is_active BOOLEAN DEFAULT true,
    auth_user_id UUID, -- Links to Supabase Auth
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BENEFICIARY & HOUSEHOLD TABLES
-- ============================================

-- Households (family units)
CREATE TABLE households (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL, -- e.g., "Aldeek Family"
    site_id UUID REFERENCES sites(id),
    primary_language VARCHAR(50),
    secondary_language VARCHAR(50),
    country_of_origin VARCHAR(100),
    date_arrived_us DATE,
    date_arrived_maine DATE,
    assigned_coordinator_id UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Beneficiaries (individual people)
CREATE TABLE beneficiaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    gender gender,
    relationship_type relationship_type NOT NULL DEFAULT 'head_of_household',
    email VARCHAR(255),
    phone VARCHAR(20),
    
    -- Immigration info (encrypted fields use Supabase Vault in production)
    a_number_encrypted BYTEA, -- Alien number
    ssn_encrypted BYTEA,
    immigration_status VARCHAR(100),
    work_authorization_expiry DATE,
    
    -- Education & Employment
    education_level VARCHAR(100),
    english_proficiency language_proficiency DEFAULT 'none',
    is_employed BOOLEAN DEFAULT false,
    employer_name VARCHAR(200),
    occupation VARCHAR(200),
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Beneficiary Languages (many-to-many)
CREATE TABLE beneficiary_languages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    beneficiary_id UUID REFERENCES beneficiaries(id) ON DELETE CASCADE,
    language VARCHAR(50) NOT NULL,
    proficiency language_proficiency DEFAULT 'native',
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROPERTY & HOUSING TABLES
-- ============================================

-- Properties
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID REFERENCES sites(id),
    name VARCHAR(200) NOT NULL, -- e.g., "18 Union Street"
    address_street VARCHAR(200) NOT NULL,
    address_city VARCHAR(100) DEFAULT 'Waterville',
    address_state VARCHAR(2) DEFAULT 'ME',
    address_zip VARCHAR(10),
    property_type property_type NOT NULL,
    
    -- For master lease properties
    landlord_name VARCHAR(200),
    landlord_phone VARCHAR(20),
    landlord_email VARCHAR(255),
    master_lease_start DATE,
    master_lease_end DATE,
    master_lease_rent DECIMAL(10,2),
    
    -- Property details
    year_built INTEGER,
    total_units INTEGER DEFAULT 1,
    parking_spaces INTEGER DEFAULT 0,
    notes TEXT,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Units (apartments within properties)
CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    unit_number VARCHAR(20) NOT NULL, -- e.g., "Unit 1", "2A"
    
    -- Unit specs
    bedrooms INTEGER DEFAULT 1,
    bathrooms DECIMAL(3,1) DEFAULT 1,
    square_feet INTEGER,
    floor_number INTEGER,
    
    -- Rent & status
    market_rent DECIMAL(10,2),
    program_rent DECIMAL(10,2), -- Below-market rent for program
    status unit_status DEFAULT 'available',
    
    -- Amenities (JSON for flexibility)
    amenities JSONB DEFAULT '[]',
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(property_id, unit_number)
);

-- Leases
CREATE TABLE leases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id),
    unit_id UUID REFERENCES units(id),
    
    lease_type lease_type NOT NULL,
    status lease_status DEFAULT 'active',
    
    -- Dates
    start_date DATE NOT NULL,
    end_date DATE,
    move_in_date DATE,
    move_out_date DATE,
    
    -- Financial
    monthly_rent DECIMAL(10,2) NOT NULL,
    security_deposit DECIMAL(10,2),
    subsidy_amount DECIMAL(10,2) DEFAULT 0, -- For bridge program
    tenant_pays DECIMAL(10,2), -- What tenant actually pays
    
    -- Bridge program specific
    program_start_date DATE,
    program_month INTEGER DEFAULT 0,
    total_program_months INTEGER DEFAULT 24,
    
    -- Metadata
    assigned_coordinator_id UUID REFERENCES users(id),
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bridge Program Milestones (template)
CREATE TABLE bridge_milestone_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    typical_month INTEGER, -- Suggested month to complete
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bridge Program Progress (per lease)
CREATE TABLE bridge_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
    template_id UUID REFERENCES bridge_milestone_templates(id),
    title VARCHAR(200) NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    completed_date DATE,
    completed_by_id UUID REFERENCES users(id),
    notes TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rent Payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
    
    -- Period
    payment_month DATE NOT NULL, -- First of month
    amount_due DECIMAL(10,2) NOT NULL,
    amount_paid DECIMAL(10,2) DEFAULT 0,
    
    -- Status & dates
    status payment_status DEFAULT 'pending',
    due_date DATE,
    paid_date DATE,
    
    -- Payment details
    payment_method VARCHAR(50), -- cash, check, bank transfer
    reference_number VARCHAR(100),
    received_by_id UUID REFERENCES users(id),
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Work Orders
CREATE TABLE work_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(id),
    unit_id UUID REFERENCES units(id), -- NULL if property-level issue
    household_id UUID REFERENCES households(id), -- Who reported it
    
    title VARCHAR(300) NOT NULL,
    description TEXT,
    category work_order_category NOT NULL,
    priority work_order_priority DEFAULT 'medium',
    status work_order_status DEFAULT 'open',
    
    -- People
    reported_by VARCHAR(200),
    reported_date DATE DEFAULT CURRENT_DATE,
    assigned_to VARCHAR(200), -- Contractor/vendor name
    assigned_by_id UUID REFERENCES users(id),
    
    -- Scheduling
    scheduled_date DATE,
    scheduled_time_start TIME,
    scheduled_time_end TIME,
    completed_date DATE,
    
    -- Resolution
    resolution TEXT,
    cost DECIMAL(10,2),
    invoice_number VARCHAR(100),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Work Order Comments/Activity
CREATE TABLE work_order_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    author_name VARCHAR(200), -- For external contractors
    content TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false, -- Internal notes vs visible to tenant
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Work Order Photos
CREATE TABLE work_order_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL, -- Supabase Storage path
    file_name VARCHAR(255),
    uploaded_by_id UUID REFERENCES users(id),
    caption TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CASE MANAGEMENT TABLES
-- ============================================

-- Case Notes
CREATE TABLE case_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    beneficiary_id UUID REFERENCES beneficiaries(id) ON DELETE SET NULL, -- Optional: specific person
    lease_id UUID REFERENCES leases(id) ON DELETE SET NULL, -- Optional: related to housing
    
    author_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    visibility case_note_visibility DEFAULT 'all_staff',
    
    -- Categorization
    category VARCHAR(100), -- housing, employment, education, health, etc.
    is_followup_required BOOLEAN DEFAULT false,
    followup_date DATE,
    followup_completed BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LANGUAGE PROGRAM TABLES
-- ============================================

-- Teachers
CREATE TABLE teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id), -- If staff member
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    is_volunteer BOOLEAN DEFAULT true,
    site_id UUID REFERENCES sites(id),
    languages_taught TEXT[], -- Array of languages
    certifications TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Class Sections
CREATE TABLE class_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID REFERENCES sites(id),
    name VARCHAR(200) NOT NULL, -- e.g., "Tuesday Morning Basic"
    level class_level NOT NULL,
    teacher_id UUID REFERENCES teachers(id),
    
    -- Schedule
    day_of_week INTEGER, -- 0=Sunday, 1=Monday, etc.
    start_time TIME,
    end_time TIME,
    location VARCHAR(200),
    
    -- Capacity
    max_students INTEGER DEFAULT 15,
    current_enrollment INTEGER DEFAULT 0,
    
    -- Term dates
    term_start DATE,
    term_end DATE,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Class Enrollments
CREATE TABLE class_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id UUID REFERENCES class_sections(id) ON DELETE CASCADE,
    beneficiary_id UUID REFERENCES beneficiaries(id) ON DELETE CASCADE,
    
    enrolled_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'active', -- active, completed, dropped, waitlist
    
    -- CASAS Testing
    pre_test_score INTEGER,
    pre_test_date DATE,
    post_test_score INTEGER,
    post_test_date DATE,
    
    -- Support needs
    needs_transportation BOOLEAN DEFAULT false,
    needs_childcare BOOLEAN DEFAULT false,
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(section_id, beneficiary_id)
);

-- Class Attendance
CREATE TABLE class_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID REFERENCES class_enrollments(id) ON DELETE CASCADE,
    class_date DATE NOT NULL,
    is_present BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(enrollment_id, class_date)
);

-- ============================================
-- VOLUNTEER & MENTOR TABLES
-- ============================================

-- Volunteers (synced from Neon CRM)
CREATE TABLE volunteers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    neon_id VARCHAR(100), -- External Neon CRM ID
    user_id UUID REFERENCES users(id),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    
    -- Availability & skills
    languages_spoken TEXT[],
    skills TEXT[],
    availability_notes TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    background_check_date DATE,
    orientation_date DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mentor Teams
CREATE TABLE mentor_teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200),
    household_id UUID REFERENCES households(id),
    assigned_date DATE,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mentor Team Members (volunteers on a team)
CREATE TABLE mentor_team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES mentor_teams(id) ON DELETE CASCADE,
    volunteer_id UUID REFERENCES volunteers(id) ON DELETE CASCADE,
    role VARCHAR(100) DEFAULT 'member', -- lead, member
    joined_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BOARD & DECISIONS TABLES
-- ============================================

-- Board Decisions
CREATE TABLE board_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_by_id UUID REFERENCES users(id),
    title VARCHAR(300) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- budget, policy, personnel, program, housing
    
    -- Voting
    voting_deadline DATE,
    status VARCHAR(50) DEFAULT 'draft', -- draft, open, closed, approved, rejected
    votes_yes INTEGER DEFAULT 0,
    votes_no INTEGER DEFAULT 0,
    votes_abstain INTEGER DEFAULT 0,
    
    -- Documents (links to Google Drive)
    document_links JSONB DEFAULT '[]',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Board Votes
CREATE TABLE board_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    decision_id UUID REFERENCES board_decisions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    vote VARCHAR(20) NOT NULL, -- yes, no, abstain
    comment TEXT,
    voted_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(decision_id, user_id)
);

-- ============================================
-- AUDIT & SYSTEM TABLES
-- ============================================

-- Audit Log
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
    old_values JSONB,
    new_values JSONB,
    changed_by_id UUID REFERENCES users(id),
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    link VARCHAR(500), -- URL to relevant page
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_beneficiaries_household ON beneficiaries(household_id);
CREATE INDEX idx_beneficiaries_active ON beneficiaries(is_active);
CREATE INDEX idx_households_site ON households(site_id);
CREATE INDEX idx_households_coordinator ON households(assigned_coordinator_id);
CREATE INDEX idx_units_property ON units(property_id);
CREATE INDEX idx_units_status ON units(status);
CREATE INDEX idx_leases_household ON leases(household_id);
CREATE INDEX idx_leases_unit ON leases(unit_id);
CREATE INDEX idx_leases_status ON leases(status);
CREATE INDEX idx_payments_lease ON payments(lease_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_work_orders_property ON work_orders(property_id);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_work_orders_priority ON work_orders(priority);
CREATE INDEX idx_case_notes_household ON case_notes(household_id);
CREATE INDEX idx_class_enrollments_section ON class_enrollments(section_id);
CREATE INDEX idx_class_enrollments_beneficiary ON class_enrollments(beneficiary_id);
CREATE INDEX idx_audit_log_table ON audit_log(table_name, record_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_notes ENABLE ROW LEVEL SECURITY;

-- Basic policy: authenticated users can read most data
CREATE POLICY "Authenticated users can read sites" ON sites
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read properties" ON properties
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read units" ON units
    FOR SELECT TO authenticated USING (true);

-- Admins and coordinators can modify data
CREATE POLICY "Staff can manage households" ON households
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.auth_user_id = auth.uid() 
            AND users.role IN ('admin', 'coordinator')
        )
    );

CREATE POLICY "Staff can manage beneficiaries" ON beneficiaries
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.auth_user_id = auth.uid() 
            AND users.role IN ('admin', 'coordinator')
        )
    );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON sites FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_households_updated_at BEFORE UPDATE ON households FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_beneficiaries_updated_at BEFORE UPDATE ON beneficiaries FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON units FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_leases_updated_at BEFORE UPDATE ON leases FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_work_orders_updated_at BEFORE UPDATE ON work_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_case_notes_updated_at BEFORE UPDATE ON case_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to calculate tenant payment (rent - subsidy)
CREATE OR REPLACE FUNCTION calculate_tenant_pays()
RETURNS TRIGGER AS $$
BEGIN
    NEW.tenant_pays = COALESCE(NEW.monthly_rent, 0) - COALESCE(NEW.subsidy_amount, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calc_tenant_pays BEFORE INSERT OR UPDATE ON leases FOR EACH ROW EXECUTE FUNCTION calculate_tenant_pays();

-- Function to update unit status when lease changes
CREATE OR REPLACE FUNCTION update_unit_on_lease_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
        UPDATE units SET status = 'occupied' WHERE id = NEW.unit_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.status IN ('completed', 'terminated') AND OLD.status = 'active' THEN
            UPDATE units SET status = 'available' WHERE id = NEW.unit_id;
        ELSIF NEW.status = 'active' AND OLD.status != 'active' THEN
            UPDATE units SET status = 'occupied' WHERE id = NEW.unit_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_unit_status AFTER INSERT OR UPDATE ON leases FOR EACH ROW EXECUTE FUNCTION update_unit_on_lease_change();

-- ============================================
-- SEED DATA: Bridge Milestone Templates
-- ============================================

INSERT INTO bridge_milestone_templates (title, description, typical_month, sort_order) VALUES
('Initial Orientation', 'Complete program orientation and sign agreements', 1, 1),
('Bank Account Opened', 'Open checking/savings account at local bank', 1, 2),
('Employment Secured', 'Obtain stable employment', 3, 3),
('Budgeting Workshop', 'Complete financial literacy and budgeting workshop', 6, 4),
('Credit Building Started', 'Begin credit building program (secured card, etc.)', 8, 5),
('Emergency Fund Started', 'Begin building emergency savings ($500 goal)', 12, 6),
('Landlord Communication Training', 'Complete training on tenant rights and landlord relations', 18, 7),
('Independent Lease Application', 'Apply for independent housing', 22, 8),
('Successful Transition', 'Successfully transition to independent lease', 24, 9);

COMMENT ON TABLE bridge_milestone_templates IS 'Template milestones for the Bridge Housing Program - copied to bridge_milestones when a bridge lease is created';

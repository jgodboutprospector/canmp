-- ============================================
-- Volunteer Requests Schema
-- Connects beneficiary/family needs to volunteer opportunities
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Request status enum
DO $$ BEGIN
    CREATE TYPE volunteer_request_status AS ENUM (
        'pending',
        'matched',
        'in_progress',
        'completed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Request urgency enum
DO $$ BEGIN
    CREATE TYPE request_urgency AS ENUM (
        'low',
        'medium',
        'high',
        'urgent'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- Volunteer Requests Table
-- ============================================

CREATE TABLE IF NOT EXISTS volunteer_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Who needs help
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    beneficiary_id UUID REFERENCES beneficiaries(id) ON DELETE SET NULL,
    -- Request details
    title VARCHAR(200) NOT NULL,
    description TEXT,
    request_type VARCHAR(100), -- transportation, tutoring, translation, etc.
    urgency request_urgency DEFAULT 'medium',
    status volunteer_request_status DEFAULT 'pending',
    -- Scheduling
    preferred_date DATE,
    preferred_time_start TIME,
    preferred_time_end TIME,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern VARCHAR(100), -- weekly, bi-weekly, monthly
    -- Location
    location_address TEXT,
    location_notes TEXT,
    -- Languages needed
    languages_needed TEXT[], -- Languages required for this request
    -- Assignment
    assigned_volunteer_id UUID REFERENCES volunteers(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ,
    assigned_by_id UUID REFERENCES users(id),
    -- Completion
    completed_at TIMESTAMPTZ,
    completed_by_id UUID REFERENCES users(id),
    completion_notes TEXT,
    hours_spent DECIMAL(4,2),
    -- Tracking
    created_by_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_volunteer_requests_household ON volunteer_requests(household_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_requests_beneficiary ON volunteer_requests(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_requests_status ON volunteer_requests(status);
CREATE INDEX IF NOT EXISTS idx_volunteer_requests_type ON volunteer_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_volunteer_requests_assigned ON volunteer_requests(assigned_volunteer_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_requests_date ON volunteer_requests(preferred_date);

-- Enable RLS
ALTER TABLE volunteer_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Authenticated users can view volunteer requests" ON volunteer_requests;
DROP POLICY IF EXISTS "Authenticated users can insert volunteer requests" ON volunteer_requests;
DROP POLICY IF EXISTS "Authenticated users can update volunteer requests" ON volunteer_requests;
DROP POLICY IF EXISTS "Authenticated users can delete volunteer requests" ON volunteer_requests;

CREATE POLICY "Authenticated users can view volunteer requests"
    ON volunteer_requests FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert volunteer requests"
    ON volunteer_requests FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update volunteer requests"
    ON volunteer_requests FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete volunteer requests"
    ON volunteer_requests FOR DELETE
    TO authenticated
    USING (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_volunteer_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS volunteer_requests_updated_at ON volunteer_requests;
CREATE TRIGGER volunteer_requests_updated_at
    BEFORE UPDATE ON volunteer_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_volunteer_requests_updated_at();

-- ============================================
-- Request Types Reference Table
-- ============================================

CREATE TABLE IF NOT EXISTS volunteer_request_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    typical_duration_hours DECIMAL(4,2),
    skills_required TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert common request types
INSERT INTO volunteer_request_types (name, description, typical_duration_hours, skills_required) VALUES
    ('Transportation', 'Driving clients to appointments, shopping, or events', 2.0, ARRAY['Transportation']),
    ('Translation', 'In-person or phone translation assistance', 1.5, ARRAY['Translation']),
    ('Tutoring', 'Academic tutoring or homework help', 1.5, ARRAY['Tutoring']),
    ('ESL Support', 'English language practice and conversation', 1.0, ARRAY['ESL Support']),
    ('Job Search Help', 'Resume review, job applications, interview prep', 2.0, ARRAY['Job Coaching']),
    ('Appointment Support', 'Accompanying to medical or legal appointments', 3.0, ARRAY['Translation']),
    ('Home Setup', 'Helping new arrivals set up their apartment', 3.0, ARRAY['Home Setup']),
    ('Childcare', 'Supervising children during parent activities', 2.0, ARRAY['Childcare']),
    ('Mentoring', 'Regular check-ins and guidance', 1.5, ARRAY['Mentoring']),
    ('Document Help', 'Assistance with forms and paperwork', 1.0, ARRAY['Administrative']),
    ('Computer Help', 'Technology assistance and digital literacy', 1.0, ARRAY['Administrative']),
    ('Other', 'Other volunteer assistance', NULL, ARRAY[]::TEXT[])
ON CONFLICT (name) DO NOTHING;

-- Enable RLS on request types
ALTER TABLE volunteer_request_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view request types"
    ON volunteer_request_types FOR SELECT
    TO authenticated
    USING (true);

-- ============================================
-- View for pending requests with matching info
-- ============================================

CREATE OR REPLACE VIEW volunteer_requests_with_details AS
SELECT
    vr.*,
    h.name as household_name,
    b.first_name as beneficiary_first_name,
    b.last_name as beneficiary_last_name,
    v.first_name as volunteer_first_name,
    v.last_name as volunteer_last_name,
    v.email as volunteer_email,
    v.phone as volunteer_phone,
    cb.first_name as created_by_first_name,
    cb.last_name as created_by_last_name
FROM volunteer_requests vr
LEFT JOIN households h ON vr.household_id = h.id
LEFT JOIN beneficiaries b ON vr.beneficiary_id = b.id
LEFT JOIN volunteers v ON vr.assigned_volunteer_id = v.id
LEFT JOIN users cb ON vr.created_by_id = cb.id;

-- ============================================
-- Function to find matching volunteers for a request
-- ============================================

CREATE OR REPLACE FUNCTION find_matching_volunteers(request_id UUID)
RETURNS TABLE (
    volunteer_id UUID,
    first_name VARCHAR,
    last_name VARCHAR,
    email VARCHAR,
    phone VARCHAR,
    match_score INTEGER,
    has_required_skills BOOLEAN,
    speaks_required_language BOOLEAN,
    is_available_on_day BOOLEAN
) AS $$
DECLARE
    req RECORD;
    day_num INTEGER;
BEGIN
    -- Get request details
    SELECT * INTO req FROM volunteer_requests WHERE id = request_id;

    -- Get day of week from preferred date (0=Sunday, 6=Saturday)
    IF req.preferred_date IS NOT NULL THEN
        day_num := EXTRACT(DOW FROM req.preferred_date)::INTEGER;
    ELSE
        day_num := NULL;
    END IF;

    RETURN QUERY
    SELECT
        v.id as volunteer_id,
        v.first_name,
        v.last_name,
        v.email,
        v.phone,
        -- Calculate match score
        (
            CASE WHEN v.skills && ARRAY[req.request_type] THEN 30 ELSE 0 END +
            CASE WHEN req.languages_needed IS NOT NULL AND v.languages_spoken && req.languages_needed THEN 30 ELSE 0 END +
            CASE WHEN day_num IS NOT NULL AND EXISTS (
                SELECT 1 FROM volunteer_availability va
                WHERE va.volunteer_id = v.id
                AND va.day_of_week = day_num
                AND va.is_available = true
            ) THEN 20 ELSE 0 END +
            CASE WHEN v.background_check_date IS NOT NULL THEN 10 ELSE 0 END +
            CASE WHEN v.orientation_date IS NOT NULL THEN 10 ELSE 0 END
        )::INTEGER as match_score,
        -- Skill match
        (v.skills && ARRAY[req.request_type]) as has_required_skills,
        -- Language match
        (req.languages_needed IS NULL OR v.languages_spoken && req.languages_needed) as speaks_required_language,
        -- Availability match
        (day_num IS NULL OR EXISTS (
            SELECT 1 FROM volunteer_availability va
            WHERE va.volunteer_id = v.id
            AND va.day_of_week = day_num
            AND va.is_available = true
        )) as is_available_on_day
    FROM volunteers v
    WHERE v.is_active = true
    ORDER BY match_score DESC, v.last_name;
END;
$$ LANGUAGE plpgsql;

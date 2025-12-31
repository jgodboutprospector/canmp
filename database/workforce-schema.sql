-- ============================================
-- CANMP Workforce Module Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Job Placement Status Enum
DO $$ BEGIN
    CREATE TYPE job_status AS ENUM ('intake', 'preparing', 'searching', 'interviewing', 'placed', 'employed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Workforce Participants (linked to beneficiaries)
CREATE TABLE IF NOT EXISTS workforce_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    beneficiary_id UUID REFERENCES beneficiaries(id) ON DELETE CASCADE,

    -- Current status for kanban board
    status job_status DEFAULT 'intake',

    -- Employment details
    target_occupation VARCHAR(200),
    skills TEXT[],
    work_history TEXT,
    education_level VARCHAR(100),
    certifications TEXT[],

    -- Readiness
    has_resume BOOLEAN DEFAULT false,
    has_interview_clothes BOOLEAN DEFAULT false,
    has_transportation BOOLEAN DEFAULT false,
    has_work_authorization BOOLEAN DEFAULT false,
    work_authorization_expiry DATE,

    -- Current/target employment
    current_employer VARCHAR(200),
    current_job_title VARCHAR(200),
    current_hourly_wage DECIMAL(10,2),
    current_hours_per_week INTEGER,
    employment_start_date DATE,

    -- Goals
    target_hourly_wage DECIMAL(10,2),
    target_hours_per_week INTEGER,

    -- Support needs
    needs_esl_improvement BOOLEAN DEFAULT false,
    needs_skills_training BOOLEAN DEFAULT false,
    needs_childcare BOOLEAN DEFAULT false,
    needs_transportation_support BOOLEAN DEFAULT false,

    -- Coordinator assignment
    assigned_coordinator_id UUID REFERENCES users(id),

    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workforce Notes (activity log for kanban cards)
CREATE TABLE IF NOT EXISTS workforce_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_id UUID REFERENCES workforce_participants(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    note_type VARCHAR(50) DEFAULT 'general', -- general, status_change, milestone, interview, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job Opportunities (positions available)
CREATE TABLE IF NOT EXISTS job_opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(200) NOT NULL,
    job_title VARCHAR(200) NOT NULL,
    description TEXT,
    location VARCHAR(200),
    hourly_wage_min DECIMAL(10,2),
    hourly_wage_max DECIMAL(10,2),
    hours_per_week INTEGER,
    shift_type VARCHAR(50), -- day, evening, night, rotating
    requirements TEXT,
    contact_name VARCHAR(200),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    posted_date DATE DEFAULT CURRENT_DATE,
    expiry_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job Applications (linking participants to opportunities)
CREATE TABLE IF NOT EXISTS job_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_id UUID REFERENCES workforce_participants(id) ON DELETE CASCADE,
    opportunity_id UUID REFERENCES job_opportunities(id) ON DELETE CASCADE,
    applied_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'applied', -- applied, interviewing, offered, accepted, rejected, withdrawn
    interview_date TIMESTAMPTZ,
    interview_notes TEXT,
    offer_wage DECIMAL(10,2),
    offer_hours INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Skills Training Programs
CREATE TABLE IF NOT EXISTS training_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    provider VARCHAR(200),
    description TEXT,
    duration_weeks INTEGER,
    cost DECIMAL(10,2),
    certification_offered VARCHAR(200),
    schedule_notes TEXT,
    location VARCHAR(200),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Training Enrollments
CREATE TABLE IF NOT EXISTS training_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_id UUID REFERENCES workforce_participants(id) ON DELETE CASCADE,
    program_id UUID REFERENCES training_programs(id) ON DELETE CASCADE,
    enrolled_date DATE DEFAULT CURRENT_DATE,
    completion_date DATE,
    status VARCHAR(50) DEFAULT 'enrolled', -- enrolled, in_progress, completed, dropped
    certification_earned BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workforce_participants_beneficiary ON workforce_participants(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_workforce_participants_status ON workforce_participants(status);
CREATE INDEX IF NOT EXISTS idx_workforce_notes_participant ON workforce_notes(participant_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_participant ON job_applications(participant_id);

-- Enable RLS
ALTER TABLE workforce_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE workforce_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_enrollments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can read workforce data" ON workforce_participants
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read workforce notes" ON workforce_notes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read job opportunities" ON job_opportunities
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage workforce participants" ON workforce_participants
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator')
        )
    );

CREATE POLICY "Staff can manage workforce notes" ON workforce_notes
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator')
        )
    );

-- Updated at trigger
CREATE TRIGGER update_workforce_participants_updated_at
    BEFORE UPDATE ON workforce_participants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_job_opportunities_updated_at
    BEFORE UPDATE ON job_opportunities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_job_applications_updated_at
    BEFORE UPDATE ON job_applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_training_programs_updated_at
    BEFORE UPDATE ON training_programs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_training_enrollments_updated_at
    BEFORE UPDATE ON training_enrollments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

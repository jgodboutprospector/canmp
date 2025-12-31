-- ============================================
-- CANMP Workforce Module Enhancements
-- Past Jobs History & Career Goals Tracking
-- Run this in Supabase SQL Editor
-- ============================================

-- Past Jobs / Work History
CREATE TABLE IF NOT EXISTS workforce_job_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_id UUID REFERENCES workforce_participants(id) ON DELETE CASCADE,

    -- Job details
    company_name VARCHAR(200) NOT NULL,
    job_title VARCHAR(200) NOT NULL,
    location VARCHAR(200),
    country VARCHAR(100), -- Important for immigrant work history

    -- Dates
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT false,

    -- Details
    description TEXT,
    responsibilities TEXT,
    skills_used TEXT[],
    hourly_wage DECIMAL(10,2),
    reason_for_leaving VARCHAR(200),

    -- Reference
    can_contact_employer BOOLEAN DEFAULT false,
    supervisor_name VARCHAR(200),
    supervisor_phone VARCHAR(20),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Career Goals (trackable over time)
CREATE TABLE IF NOT EXISTS workforce_career_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_id UUID REFERENCES workforce_participants(id) ON DELETE CASCADE,

    -- Goal details
    goal_type VARCHAR(50) NOT NULL, -- short_term, medium_term, long_term
    title VARCHAR(200) NOT NULL,
    description TEXT,

    -- Target occupation/industry
    target_occupation VARCHAR(200),
    target_industry VARCHAR(200),
    target_wage DECIMAL(10,2),

    -- Timeline
    target_date DATE,

    -- Progress tracking
    status VARCHAR(50) DEFAULT 'active', -- active, achieved, revised, abandoned
    progress_notes TEXT,
    achieved_date DATE,

    -- Who set/reviewed this goal
    set_by_id UUID REFERENCES users(id),
    last_reviewed_date DATE,
    last_reviewed_by_id UUID REFERENCES users(id),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goal Progress Updates (for tracking changes over time)
CREATE TABLE IF NOT EXISTS workforce_goal_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID REFERENCES workforce_career_goals(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id),

    update_type VARCHAR(50) NOT NULL, -- progress, revision, review
    content TEXT NOT NULL,
    previous_status VARCHAR(50),
    new_status VARCHAR(50),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Skills Assessment (track skills development)
CREATE TABLE IF NOT EXISTS workforce_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_id UUID REFERENCES workforce_participants(id) ON DELETE CASCADE,

    skill_name VARCHAR(200) NOT NULL,
    skill_category VARCHAR(100), -- technical, soft, language, certification
    proficiency_level VARCHAR(50), -- beginner, intermediate, advanced, expert
    years_experience DECIMAL(4,1),

    -- Verification
    is_verified BOOLEAN DEFAULT false,
    verified_date DATE,
    verified_by_id UUID REFERENCES users(id),
    certification_name VARCHAR(200),
    certification_expiry DATE,

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add additional fields to workforce_participants for career preferences
ALTER TABLE workforce_participants
ADD COLUMN IF NOT EXISTS preferred_industries TEXT[],
ADD COLUMN IF NOT EXISTS preferred_schedule VARCHAR(50), -- full_time, part_time, flexible
ADD COLUMN IF NOT EXISTS preferred_shift VARCHAR(50), -- day, evening, night, any
ADD COLUMN IF NOT EXISTS willing_to_relocate BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS max_commute_minutes INTEGER,
ADD COLUMN IF NOT EXISTS career_summary TEXT,
ADD COLUMN IF NOT EXISTS strengths TEXT[],
ADD COLUMN IF NOT EXISTS areas_for_growth TEXT[];

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workforce_job_history_participant ON workforce_job_history(participant_id);
CREATE INDEX IF NOT EXISTS idx_workforce_career_goals_participant ON workforce_career_goals(participant_id);
CREATE INDEX IF NOT EXISTS idx_workforce_career_goals_status ON workforce_career_goals(status);
CREATE INDEX IF NOT EXISTS idx_workforce_skills_participant ON workforce_skills(participant_id);

-- Enable RLS
ALTER TABLE workforce_job_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE workforce_career_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE workforce_goal_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workforce_skills ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can read job history" ON workforce_job_history
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage job history" ON workforce_job_history
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator')
        )
    );

CREATE POLICY "Authenticated users can read career goals" ON workforce_career_goals
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage career goals" ON workforce_career_goals
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator')
        )
    );

CREATE POLICY "Authenticated users can read goal updates" ON workforce_goal_updates
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage goal updates" ON workforce_goal_updates
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator')
        )
    );

CREATE POLICY "Authenticated users can read skills" ON workforce_skills
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage skills" ON workforce_skills
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator')
        )
    );

-- Triggers
CREATE TRIGGER update_workforce_job_history_updated_at
    BEFORE UPDATE ON workforce_job_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_workforce_career_goals_updated_at
    BEFORE UPDATE ON workforce_career_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_workforce_skills_updated_at
    BEFORE UPDATE ON workforce_skills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

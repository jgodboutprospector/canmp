-- ============================================
-- CANMP Consolidated Migration
-- Missing Tables for Events, Workforce, and Tasks
--
-- Run this ONCE in Supabase SQL Editor
-- Created: 2025-01-20
-- ============================================

-- ============================================
-- PART 1: EVENTS MODULE
-- ============================================

-- Event Types (with safe creation)
DO $$ BEGIN
    CREATE TYPE event_type AS ENUM ('class', 'workshop', 'community', 'orientation', 'meeting', 'celebration', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE event_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Events Table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(300) NOT NULL,
    description TEXT,
    event_type event_type NOT NULL DEFAULT 'other',
    status event_status DEFAULT 'scheduled',

    -- Location
    site_id UUID REFERENCES sites(id),
    location VARCHAR(300),
    is_virtual BOOLEAN DEFAULT false,
    virtual_link TEXT,

    -- Schedule
    start_date DATE NOT NULL,
    start_time TIME,
    end_date DATE,
    end_time TIME,
    is_all_day BOOLEAN DEFAULT false,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_rule TEXT,

    -- Capacity
    max_attendees INTEGER,
    requires_registration BOOLEAN DEFAULT false,
    registration_deadline DATE,

    -- Organizer
    organizer_id UUID REFERENCES users(id),

    -- Metadata
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event Attendees
CREATE TABLE IF NOT EXISTS event_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    beneficiary_id UUID REFERENCES beneficiaries(id) ON DELETE CASCADE,

    -- Status tracking (registered -> confirmed -> attended/no_show/cancelled)
    status VARCHAR(50) DEFAULT 'registered',
    registration_date TIMESTAMPTZ DEFAULT NOW(),
    attended BOOLEAN DEFAULT false,
    attendance_time TIMESTAMPTZ,

    -- Support needs
    needs_transportation BOOLEAN DEFAULT false,
    needs_childcare BOOLEAN DEFAULT false,
    needs_interpreter BOOLEAN DEFAULT false,
    interpreter_language VARCHAR(50),
    support_needed TEXT,

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(event_id, beneficiary_id)
);

-- Event Volunteers
CREATE TABLE IF NOT EXISTS event_volunteers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    volunteer_id UUID REFERENCES volunteers(id) ON DELETE CASCADE,
    role VARCHAR(100) DEFAULT 'helper',
    confirmed BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(event_id, volunteer_id)
);

-- Events Indexes
CREATE INDEX IF NOT EXISTS idx_events_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_site ON events(site_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_event_attendees_event ON event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_beneficiary ON event_attendees(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_event_volunteers_event ON event_volunteers(event_id);
CREATE INDEX IF NOT EXISTS idx_event_volunteers_volunteer ON event_volunteers(volunteer_id);

-- Events RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_volunteers ENABLE ROW LEVEL SECURITY;

-- Events Policies (drop first to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can read events" ON events;
DROP POLICY IF EXISTS "Staff can manage events" ON events;
DROP POLICY IF EXISTS "Authenticated users can read event_attendees" ON event_attendees;
DROP POLICY IF EXISTS "Staff can manage event_attendees" ON event_attendees;
DROP POLICY IF EXISTS "Authenticated users can read event_volunteers" ON event_volunteers;
DROP POLICY IF EXISTS "Staff can manage event_volunteers" ON event_volunteers;

CREATE POLICY "Authenticated users can read events" ON events
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage events" ON events
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator')
        )
    );

CREATE POLICY "Authenticated users can read event_attendees" ON event_attendees
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage event_attendees" ON event_attendees
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator')
        )
    );

CREATE POLICY "Authenticated users can read event_volunteers" ON event_volunteers
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage event_volunteers" ON event_volunteers
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator')
        )
    );

-- Events Trigger
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================
-- PART 2: WORKFORCE MODULE
-- ============================================

-- Job Status Enum
DO $$ BEGIN
    CREATE TYPE job_status AS ENUM ('intake', 'preparing', 'searching', 'interviewing', 'placed', 'employed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Workforce Participants
CREATE TABLE IF NOT EXISTS workforce_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    beneficiary_id UUID REFERENCES beneficiaries(id) ON DELETE CASCADE,

    status job_status DEFAULT 'intake',

    target_occupation VARCHAR(200),
    skills TEXT[],
    work_history TEXT,
    education_level VARCHAR(100),
    certifications TEXT[],

    has_resume BOOLEAN DEFAULT false,
    has_interview_clothes BOOLEAN DEFAULT false,
    has_transportation BOOLEAN DEFAULT false,
    has_work_authorization BOOLEAN DEFAULT false,
    work_authorization_expiry DATE,

    current_employer VARCHAR(200),
    current_job_title VARCHAR(200),
    current_hourly_wage DECIMAL(10,2),
    current_hours_per_week INTEGER,
    employment_start_date DATE,

    target_hourly_wage DECIMAL(10,2),
    target_hours_per_week INTEGER,

    needs_esl_improvement BOOLEAN DEFAULT false,
    needs_skills_training BOOLEAN DEFAULT false,
    needs_childcare BOOLEAN DEFAULT false,
    needs_transportation_support BOOLEAN DEFAULT false,

    assigned_coordinator_id UUID REFERENCES users(id),

    -- Additional fields for UI compatibility
    career_summary TEXT,
    preferred_industries TEXT[],
    preferred_schedule VARCHAR(100),
    strengths TEXT[],
    areas_for_growth TEXT[],

    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workforce Notes
CREATE TABLE IF NOT EXISTS workforce_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID REFERENCES workforce_participants(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    note_type VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job Opportunities
CREATE TABLE IF NOT EXISTS job_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(200) NOT NULL,
    job_title VARCHAR(200) NOT NULL,
    description TEXT,
    location VARCHAR(200),
    hourly_wage_min DECIMAL(10,2),
    hourly_wage_max DECIMAL(10,2),
    hours_per_week INTEGER,
    shift_type VARCHAR(50),
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

-- Job Applications
CREATE TABLE IF NOT EXISTS job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID REFERENCES workforce_participants(id) ON DELETE CASCADE,
    opportunity_id UUID REFERENCES job_opportunities(id) ON DELETE CASCADE,
    applied_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'applied',
    interview_date TIMESTAMPTZ,
    interview_notes TEXT,
    offer_wage DECIMAL(10,2),
    offer_hours INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Training Programs
CREATE TABLE IF NOT EXISTS training_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID REFERENCES workforce_participants(id) ON DELETE CASCADE,
    program_id UUID REFERENCES training_programs(id) ON DELETE CASCADE,
    enrolled_date DATE DEFAULT CURRENT_DATE,
    completion_date DATE,
    status VARCHAR(50) DEFAULT 'enrolled',
    certification_earned BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workforce Indexes
CREATE INDEX IF NOT EXISTS idx_workforce_participants_beneficiary ON workforce_participants(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_workforce_participants_status ON workforce_participants(status);
CREATE INDEX IF NOT EXISTS idx_workforce_notes_participant ON workforce_notes(participant_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_participant ON job_applications(participant_id);
CREATE INDEX IF NOT EXISTS idx_job_opportunities_active ON job_opportunities(is_active);
CREATE INDEX IF NOT EXISTS idx_training_programs_active ON training_programs(is_active);
CREATE INDEX IF NOT EXISTS idx_training_enrollments_participant ON training_enrollments(participant_id);

-- Workforce RLS
ALTER TABLE workforce_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE workforce_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_enrollments ENABLE ROW LEVEL SECURITY;

-- Workforce Policies (drop first)
DROP POLICY IF EXISTS "Authenticated users can read workforce_participants" ON workforce_participants;
DROP POLICY IF EXISTS "Staff can manage workforce_participants" ON workforce_participants;
DROP POLICY IF EXISTS "Authenticated users can read workforce_notes" ON workforce_notes;
DROP POLICY IF EXISTS "Staff can manage workforce_notes" ON workforce_notes;
DROP POLICY IF EXISTS "Authenticated users can read job_opportunities" ON job_opportunities;
DROP POLICY IF EXISTS "Staff can manage job_opportunities" ON job_opportunities;
DROP POLICY IF EXISTS "Authenticated users can read job_applications" ON job_applications;
DROP POLICY IF EXISTS "Staff can manage job_applications" ON job_applications;
DROP POLICY IF EXISTS "Authenticated users can read training_programs" ON training_programs;
DROP POLICY IF EXISTS "Staff can manage training_programs" ON training_programs;
DROP POLICY IF EXISTS "Authenticated users can read training_enrollments" ON training_enrollments;
DROP POLICY IF EXISTS "Staff can manage training_enrollments" ON training_enrollments;

CREATE POLICY "Authenticated users can read workforce_participants" ON workforce_participants
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage workforce_participants" ON workforce_participants
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator')
        )
    );

CREATE POLICY "Authenticated users can read workforce_notes" ON workforce_notes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage workforce_notes" ON workforce_notes
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator')
        )
    );

CREATE POLICY "Authenticated users can read job_opportunities" ON job_opportunities
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage job_opportunities" ON job_opportunities
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator')
        )
    );

CREATE POLICY "Authenticated users can read job_applications" ON job_applications
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage job_applications" ON job_applications
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator')
        )
    );

CREATE POLICY "Authenticated users can read training_programs" ON training_programs
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage training_programs" ON training_programs
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator')
        )
    );

CREATE POLICY "Authenticated users can read training_enrollments" ON training_enrollments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage training_enrollments" ON training_enrollments
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator')
        )
    );

-- Workforce Triggers
DROP TRIGGER IF EXISTS update_workforce_participants_updated_at ON workforce_participants;
CREATE TRIGGER update_workforce_participants_updated_at
    BEFORE UPDATE ON workforce_participants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_job_opportunities_updated_at ON job_opportunities;
CREATE TRIGGER update_job_opportunities_updated_at
    BEFORE UPDATE ON job_opportunities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_job_applications_updated_at ON job_applications;
CREATE TRIGGER update_job_applications_updated_at
    BEFORE UPDATE ON job_applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_training_programs_updated_at ON training_programs;
CREATE TRIGGER update_training_programs_updated_at
    BEFORE UPDATE ON training_programs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_training_enrollments_updated_at ON training_enrollments;
CREATE TRIGGER update_training_enrollments_updated_at
    BEFORE UPDATE ON training_enrollments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================
-- PART 3: TASKS MODULE
-- ============================================

-- Task Enums
DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('backlog', 'todo', 'in_progress', 'review', 'done');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    title VARCHAR(300) NOT NULL,
    description TEXT,
    notes TEXT,

    status task_status DEFAULT 'todo',
    priority task_priority DEFAULT 'medium',

    due_date DATE,
    completed_at TIMESTAMPTZ,

    created_by_id UUID REFERENCES users(id),
    assignee_id UUID REFERENCES users(id),

    beneficiary_id UUID REFERENCES beneficiaries(id) ON DELETE SET NULL,
    household_id UUID REFERENCES households(id) ON DELETE SET NULL,
    volunteer_id UUID REFERENCES volunteers(id) ON DELETE SET NULL,
    class_section_id UUID REFERENCES class_sections(id) ON DELETE SET NULL,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,

    sort_order INTEGER DEFAULT 0,
    is_archived BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Comments
CREATE TABLE IF NOT EXISTS task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_beneficiary ON tasks(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_tasks_household ON tasks(household_id);
CREATE INDEX IF NOT EXISTS idx_tasks_volunteer ON tasks(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_tasks_class ON tasks(class_section_id);
CREATE INDEX IF NOT EXISTS idx_tasks_event ON tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_tasks_property ON tasks(property_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);

-- Tasks RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Tasks Policies (drop first)
DROP POLICY IF EXISTS "Authenticated users can read tasks" ON tasks;
DROP POLICY IF EXISTS "Staff can manage tasks" ON tasks;
DROP POLICY IF EXISTS "Authenticated users can read task_comments" ON task_comments;
DROP POLICY IF EXISTS "Staff can manage task_comments" ON task_comments;

CREATE POLICY "Authenticated users can read tasks" ON tasks
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage tasks" ON tasks
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator', 'teacher', 'volunteer')
        )
    );

CREATE POLICY "Authenticated users can read task_comments" ON task_comments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage task_comments" ON task_comments
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator', 'teacher', 'volunteer')
        )
    );

-- Tasks Trigger
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '=== Migration Complete ===';
    RAISE NOTICE 'Events table: %', (SELECT COUNT(*) FROM events);
    RAISE NOTICE 'Event attendees table: %', (SELECT COUNT(*) FROM event_attendees);
    RAISE NOTICE 'Event volunteers table: %', (SELECT COUNT(*) FROM event_volunteers);
    RAISE NOTICE 'Workforce participants table: %', (SELECT COUNT(*) FROM workforce_participants);
    RAISE NOTICE 'Workforce notes table: %', (SELECT COUNT(*) FROM workforce_notes);
    RAISE NOTICE 'Job opportunities table: %', (SELECT COUNT(*) FROM job_opportunities);
    RAISE NOTICE 'Job applications table: %', (SELECT COUNT(*) FROM job_applications);
    RAISE NOTICE 'Training programs table: %', (SELECT COUNT(*) FROM training_programs);
    RAISE NOTICE 'Training enrollments table: %', (SELECT COUNT(*) FROM training_enrollments);
    RAISE NOTICE 'Tasks table: %', (SELECT COUNT(*) FROM tasks);
    RAISE NOTICE 'Task comments table: %', (SELECT COUNT(*) FROM task_comments);
    RAISE NOTICE '=== All tables created successfully ===';
END $$;

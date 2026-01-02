-- ============================================
-- CANMP Tasks/Todo Management Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Task status enum
DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('backlog', 'todo', 'in_progress', 'review', 'done');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Task priority enum
DO $$ BEGIN
    CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- TASKS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Core fields
    title VARCHAR(300) NOT NULL,
    description TEXT,
    notes TEXT, -- Running notes that can be updated over time

    -- Status and priority
    status task_status DEFAULT 'todo',
    priority task_priority DEFAULT 'medium',

    -- Dates
    due_date DATE,
    completed_at TIMESTAMPTZ,

    -- People
    created_by_id UUID REFERENCES users(id),
    assignee_id UUID REFERENCES users(id),

    -- Tags/associations (can link to various entities)
    beneficiary_id UUID REFERENCES beneficiaries(id) ON DELETE SET NULL,
    household_id UUID REFERENCES households(id) ON DELETE SET NULL,
    volunteer_id UUID REFERENCES volunteers(id) ON DELETE SET NULL,
    class_section_id UUID REFERENCES class_sections(id) ON DELETE SET NULL,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,

    -- Metadata
    sort_order INTEGER DEFAULT 0, -- For manual ordering within columns
    is_archived BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TASK COMMENTS/ACTIVITY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

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

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view tasks
DROP POLICY IF EXISTS "Authenticated users can view tasks" ON tasks;
CREATE POLICY "Authenticated users can view tasks" ON tasks
    FOR SELECT TO authenticated USING (true);

-- Staff can manage tasks
DROP POLICY IF EXISTS "Staff can manage tasks" ON tasks;
CREATE POLICY "Staff can manage tasks" ON tasks
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator', 'teacher', 'volunteer')
        )
    );

-- All authenticated users can view task comments
DROP POLICY IF EXISTS "Authenticated users can view task comments" ON task_comments;
CREATE POLICY "Authenticated users can view task comments" ON task_comments
    FOR SELECT TO authenticated USING (true);

-- Staff can manage task comments
DROP POLICY IF EXISTS "Staff can manage task comments" ON task_comments;
CREATE POLICY "Staff can manage task comments" ON task_comments
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator', 'teacher', 'volunteer')
        )
    );

-- ============================================
-- TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- DONE!
-- ============================================

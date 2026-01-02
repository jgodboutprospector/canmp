-- ============================================
-- VOLUNTEER NOTES TABLE
-- For tracking notes about volunteers
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS volunteer_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    volunteer_id UUID REFERENCES volunteers(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    note_type VARCHAR(50) DEFAULT 'general', -- general, availability, feedback, training
    is_internal BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_volunteer_notes_volunteer ON volunteer_notes(volunteer_id);

-- Enable RLS on volunteer_notes
ALTER TABLE volunteer_notes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can read volunteer notes" ON volunteer_notes;
DROP POLICY IF EXISTS "Staff can manage volunteer notes" ON volunteer_notes;

CREATE POLICY "Authenticated users can read volunteer notes" ON volunteer_notes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage volunteer notes" ON volunteer_notes
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator')
        )
    );

-- Updated at trigger
DROP TRIGGER IF EXISTS update_volunteer_notes_updated_at ON volunteer_notes;
CREATE TRIGGER update_volunteer_notes_updated_at
    BEFORE UPDATE ON volunteer_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

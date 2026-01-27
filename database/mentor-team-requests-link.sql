-- ============================================
-- Link Volunteer Requests to Mentor Teams
-- ============================================

-- Add mentor_team_id to volunteer_requests to track which team created the request
ALTER TABLE volunteer_requests
ADD COLUMN IF NOT EXISTS mentor_team_id UUID REFERENCES mentor_teams(id) ON DELETE SET NULL;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_volunteer_requests_mentor_team ON volunteer_requests(mentor_team_id);

-- ============================================
-- Mentor Team Notes Table
-- ============================================

CREATE TABLE IF NOT EXISTS mentor_team_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES mentor_teams(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    note_type VARCHAR(50) DEFAULT 'general', -- general, meeting, concern, milestone
    created_by_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_mentor_team_notes_team ON mentor_team_notes(team_id);

-- Enable RLS
ALTER TABLE mentor_team_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Authenticated users can view mentor team notes" ON mentor_team_notes;
DROP POLICY IF EXISTS "Authenticated users can insert mentor team notes" ON mentor_team_notes;
DROP POLICY IF EXISTS "Authenticated users can update mentor team notes" ON mentor_team_notes;
DROP POLICY IF EXISTS "Authenticated users can delete mentor team notes" ON mentor_team_notes;

CREATE POLICY "Authenticated users can view mentor team notes"
    ON mentor_team_notes FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert mentor team notes"
    ON mentor_team_notes FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update mentor team notes"
    ON mentor_team_notes FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete mentor team notes"
    ON mentor_team_notes FOR DELETE
    TO authenticated
    USING (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_mentor_team_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS mentor_team_notes_updated_at ON mentor_team_notes;
CREATE TRIGGER mentor_team_notes_updated_at
    BEFORE UPDATE ON mentor_team_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_mentor_team_notes_updated_at();

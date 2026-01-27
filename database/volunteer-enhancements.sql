-- ============================================
-- Volunteer Module Enhancements
-- Adds hours logging, availability, and additional fields
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Enhance volunteers table with additional fields
-- ============================================

ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS total_hours DECIMAL(8,2) DEFAULT 0;
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(200);
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(50);
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(100);
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS address_street VARCHAR(255);
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS address_city VARCHAR(100);
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS address_state VARCHAR(50);
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS address_zip VARCHAR(20);

-- ============================================
-- Volunteer Hours Logging Table
-- ============================================

CREATE TABLE IF NOT EXISTS volunteer_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    volunteer_id UUID NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    hours DECIMAL(4,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
    activity_type VARCHAR(100),
    description TEXT,
    verified_by_id UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by_id UUID REFERENCES users(id)
);

-- Indexes for volunteer_hours
CREATE INDEX IF NOT EXISTS idx_volunteer_hours_volunteer ON volunteer_hours(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_hours_date ON volunteer_hours(date);
CREATE INDEX IF NOT EXISTS idx_volunteer_hours_event ON volunteer_hours(event_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_hours_activity ON volunteer_hours(activity_type);

-- Enable RLS on volunteer_hours
ALTER TABLE volunteer_hours ENABLE ROW LEVEL SECURITY;

-- RLS Policies for volunteer_hours
DROP POLICY IF EXISTS "Authenticated users can view volunteer hours" ON volunteer_hours;
DROP POLICY IF EXISTS "Authenticated users can insert volunteer hours" ON volunteer_hours;
DROP POLICY IF EXISTS "Authenticated users can update volunteer hours" ON volunteer_hours;
DROP POLICY IF EXISTS "Authenticated users can delete volunteer hours" ON volunteer_hours;

CREATE POLICY "Authenticated users can view volunteer hours"
    ON volunteer_hours FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert volunteer hours"
    ON volunteer_hours FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update volunteer hours"
    ON volunteer_hours FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete volunteer hours"
    ON volunteer_hours FOR DELETE
    TO authenticated
    USING (true);

-- ============================================
-- Volunteer Availability Table
-- ============================================

CREATE TABLE IF NOT EXISTS volunteer_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    volunteer_id UUID NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME,
    end_time TIME,
    is_available BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(volunteer_id, day_of_week)
);

-- Index for volunteer_availability
CREATE INDEX IF NOT EXISTS idx_volunteer_availability_volunteer ON volunteer_availability(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_availability_day ON volunteer_availability(day_of_week);

-- Enable RLS on volunteer_availability
ALTER TABLE volunteer_availability ENABLE ROW LEVEL SECURITY;

-- RLS Policies for volunteer_availability
DROP POLICY IF EXISTS "Authenticated users can view volunteer availability" ON volunteer_availability;
DROP POLICY IF EXISTS "Authenticated users can insert volunteer availability" ON volunteer_availability;
DROP POLICY IF EXISTS "Authenticated users can update volunteer availability" ON volunteer_availability;
DROP POLICY IF EXISTS "Authenticated users can delete volunteer availability" ON volunteer_availability;

CREATE POLICY "Authenticated users can view volunteer availability"
    ON volunteer_availability FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert volunteer availability"
    ON volunteer_availability FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update volunteer availability"
    ON volunteer_availability FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete volunteer availability"
    ON volunteer_availability FOR DELETE
    TO authenticated
    USING (true);

-- Add updated_at trigger for volunteer_availability
CREATE OR REPLACE FUNCTION update_volunteer_availability_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS volunteer_availability_updated_at ON volunteer_availability;
CREATE TRIGGER volunteer_availability_updated_at
    BEFORE UPDATE ON volunteer_availability
    FOR EACH ROW
    EXECUTE FUNCTION update_volunteer_availability_updated_at();

-- ============================================
-- Function to update volunteer total hours
-- ============================================

CREATE OR REPLACE FUNCTION update_volunteer_total_hours()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE volunteers
        SET total_hours = (
            SELECT COALESCE(SUM(hours), 0)
            FROM volunteer_hours
            WHERE volunteer_id = NEW.volunteer_id
        )
        WHERE id = NEW.volunteer_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE volunteers
        SET total_hours = (
            SELECT COALESCE(SUM(hours), 0)
            FROM volunteer_hours
            WHERE volunteer_id = OLD.volunteer_id
        )
        WHERE id = OLD.volunteer_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_volunteer_hours_trigger ON volunteer_hours;
CREATE TRIGGER update_volunteer_hours_trigger
    AFTER INSERT OR UPDATE OR DELETE ON volunteer_hours
    FOR EACH ROW
    EXECUTE FUNCTION update_volunteer_total_hours();

-- ============================================
-- Activity Types Reference (optional, for UI dropdowns)
-- ============================================

CREATE TABLE IF NOT EXISTS volunteer_activity_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert common activity types
INSERT INTO volunteer_activity_types (name, description) VALUES
    ('Mentoring', 'One-on-one or group mentoring sessions'),
    ('Transportation', 'Driving clients to appointments or events'),
    ('Tutoring', 'Academic tutoring and homework help'),
    ('Translation', 'Language translation and interpretation'),
    ('Event Support', 'Helping at organizational events'),
    ('Administrative', 'Office and administrative tasks'),
    ('Donation Sorting', 'Sorting and organizing donations'),
    ('Meal Service', 'Preparing or serving meals'),
    ('Childcare', 'Supervising children during programs'),
    ('Home Setup', 'Helping set up apartments for new arrivals'),
    ('Job Coaching', 'Resume help, interview prep, job search assistance'),
    ('ESL Support', 'English language learning support'),
    ('Cultural Orientation', 'Helping with cultural adjustment'),
    ('Other', 'Other volunteer activities')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS on activity types
ALTER TABLE volunteer_activity_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view activity types"
    ON volunteer_activity_types FOR SELECT
    TO authenticated
    USING (true);

-- ============================================
-- Add neon linking columns if not exist
-- ============================================

-- Add volunteer_id to neon_accounts if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'neon_accounts' AND column_name = 'volunteer_id'
    ) THEN
        ALTER TABLE neon_accounts ADD COLUMN volunteer_id UUID REFERENCES volunteers(id) ON DELETE SET NULL;
        CREATE INDEX idx_neon_accounts_volunteer ON neon_accounts(volunteer_id);
    END IF;
END $$;

-- Add is_volunteer flag to neon_accounts if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'neon_accounts' AND column_name = 'is_volunteer'
    ) THEN
        ALTER TABLE neon_accounts ADD COLUMN is_volunteer BOOLEAN DEFAULT false;
    END IF;
END $$;

-- ============================================
-- View for volunteer hours summary
-- ============================================

CREATE OR REPLACE VIEW volunteer_hours_summary AS
SELECT
    v.id as volunteer_id,
    v.first_name,
    v.last_name,
    v.email,
    v.is_active,
    COALESCE(SUM(vh.hours), 0) as total_hours,
    COUNT(vh.id) as total_entries,
    MAX(vh.date) as last_volunteer_date,
    COALESCE(SUM(CASE WHEN vh.date >= DATE_TRUNC('month', CURRENT_DATE) THEN vh.hours ELSE 0 END), 0) as hours_this_month,
    COALESCE(SUM(CASE WHEN vh.date >= DATE_TRUNC('year', CURRENT_DATE) THEN vh.hours ELSE 0 END), 0) as hours_this_year
FROM volunteers v
LEFT JOIN volunteer_hours vh ON v.id = vh.volunteer_id
GROUP BY v.id, v.first_name, v.last_name, v.email, v.is_active;

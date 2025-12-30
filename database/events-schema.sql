-- ============================================
-- CANMP Events Module
-- Additional schema for events management
-- ============================================

-- Event Types
CREATE TYPE event_type AS ENUM ('class', 'workshop', 'community', 'orientation', 'meeting', 'celebration', 'other');
CREATE TYPE event_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');

-- Events Table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    recurrence_rule TEXT, -- iCal RRULE format

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

-- Event Attendees (registrations)
CREATE TABLE event_attendees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    beneficiary_id UUID REFERENCES beneficiaries(id) ON DELETE CASCADE,

    -- Status
    registration_date TIMESTAMPTZ DEFAULT NOW(),
    attended BOOLEAN DEFAULT false,
    attendance_time TIMESTAMPTZ,

    -- Needs
    needs_transportation BOOLEAN DEFAULT false,
    needs_childcare BOOLEAN DEFAULT false,
    needs_interpreter BOOLEAN DEFAULT false,
    interpreter_language VARCHAR(50),

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(event_id, beneficiary_id)
);

-- Event Volunteers (staff helping at events)
CREATE TABLE event_volunteers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    volunteer_id UUID REFERENCES volunteers(id) ON DELETE CASCADE,
    role VARCHAR(100) DEFAULT 'helper',
    confirmed BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(event_id, volunteer_id)
);

-- Indexes
CREATE INDEX idx_events_date ON events(start_date);
CREATE INDEX idx_events_site ON events(site_id);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_event_attendees_event ON event_attendees(event_id);
CREATE INDEX idx_event_attendees_beneficiary ON event_attendees(beneficiary_id);

-- RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_volunteers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read events" ON events FOR SELECT USING (true);
CREATE POLICY "Anyone can read event_attendees" ON event_attendees FOR SELECT USING (true);
CREATE POLICY "Anyone can read event_volunteers" ON event_volunteers FOR SELECT USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Sample Events Data
INSERT INTO events (id, title, description, event_type, site_id, location, start_date, start_time, end_time, max_attendees, organizer_id) VALUES
('e1111111-1111-1111-1111-111111111111', 'New Year Celebration', 'Annual New Year celebration with food, music, and cultural sharing', 'celebration', '11111111-1111-1111-1111-111111111111', 'Waterville Community Center', '2025-01-01', '14:00', '18:00', 100, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
('e2222222-2222-2222-2222-222222222222', 'Financial Literacy Workshop', 'Learn about budgeting, credit building, and banking in the US', 'workshop', '11111111-1111-1111-1111-111111111111', 'CANMP Office', '2025-01-15', '10:00', '12:00', 20, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
('e3333333-3333-3333-3333-333333333333', 'New Family Orientation', 'Orientation session for newly arrived families', 'orientation', '11111111-1111-1111-1111-111111111111', 'CANMP Office', '2025-01-20', '09:00', '11:00', 15, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

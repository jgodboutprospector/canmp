-- ============================================
-- Neon CRM Sync Tables
-- Tables for storing synced data from Neon CRM
-- ============================================

-- Neon Accounts (Individuals)
CREATE TABLE neon_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    neon_account_id VARCHAR(50) UNIQUE NOT NULL,
    account_type VARCHAR(20) DEFAULT 'INDIVIDUAL', -- INDIVIDUAL or COMPANY

    -- Personal Info
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),

    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    country VARCHAR(100),

    -- Volunteer Info
    is_volunteer BOOLEAN DEFAULT false,
    volunteer_status VARCHAR(50),
    skills TEXT[],
    languages TEXT[],
    availability TEXT,

    -- Emergency Contact
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(50),
    emergency_contact_relationship VARCHAR(100),

    -- Sync Metadata
    neon_created_date TIMESTAMPTZ,
    neon_modified_date TIMESTAMPTZ,
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    sync_status VARCHAR(20) DEFAULT 'synced', -- synced, error, pending
    sync_error TEXT,

    -- Local mapping
    volunteer_id UUID REFERENCES volunteers(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Neon Companies/Organizations
CREATE TABLE neon_companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    neon_account_id VARCHAR(50) UNIQUE NOT NULL,

    -- Company Info
    company_name VARCHAR(300) NOT NULL,
    industry VARCHAR(100),
    website VARCHAR(255),

    -- Contact Info
    email VARCHAR(255),
    phone VARCHAR(50),

    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    country VARCHAR(100),

    -- Sync Metadata
    neon_created_date TIMESTAMPTZ,
    neon_modified_date TIMESTAMPTZ,
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    sync_status VARCHAR(20) DEFAULT 'synced',
    sync_error TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Neon Volunteer Opportunities
CREATE TABLE neon_volunteer_opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    neon_opportunity_id VARCHAR(50) UNIQUE NOT NULL,

    -- Opportunity Info
    name VARCHAR(300) NOT NULL,
    description TEXT,
    location VARCHAR(300),

    -- Schedule
    start_date DATE,
    end_date DATE,
    start_time TIME,
    end_time TIME,
    is_recurring BOOLEAN DEFAULT false,

    -- Capacity
    max_participants INTEGER,
    current_participants INTEGER DEFAULT 0,

    -- Status
    status VARCHAR(50) DEFAULT 'active',

    -- Categories
    category VARCHAR(100),
    skills_required TEXT[],

    -- Sync Metadata
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    sync_status VARCHAR(20) DEFAULT 'synced',
    sync_error TEXT,

    -- Local mapping
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Neon Events (from Neon CRM)
CREATE TABLE neon_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    neon_event_id VARCHAR(50) UNIQUE NOT NULL,

    -- Event Info
    name VARCHAR(300) NOT NULL,
    summary TEXT,
    description TEXT,

    -- Location
    location_name VARCHAR(300),
    address_line1 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    is_virtual BOOLEAN DEFAULT false,

    -- Schedule
    start_date DATE,
    end_date DATE,
    start_time TIME,
    end_time TIME,
    timezone VARCHAR(50),

    -- Registration
    registration_open BOOLEAN DEFAULT true,
    registration_deadline TIMESTAMPTZ,
    max_attendees INTEGER,
    current_attendees INTEGER DEFAULT 0,

    -- Pricing
    is_free BOOLEAN DEFAULT true,
    price DECIMAL(10,2),

    -- Status
    status VARCHAR(50) DEFAULT 'published',
    event_type VARCHAR(100),

    -- Sync Metadata
    neon_created_date TIMESTAMPTZ,
    neon_modified_date TIMESTAMPTZ,
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    sync_status VARCHAR(20) DEFAULT 'synced',
    sync_error TEXT,

    -- Local mapping
    local_event_id UUID REFERENCES events(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync Log (for tracking sync operations)
CREATE TABLE neon_sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sync_type VARCHAR(50) NOT NULL, -- accounts, companies, events, opportunities, full
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'running', -- running, completed, failed

    -- Stats
    records_fetched INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,

    -- Error tracking
    errors JSONB DEFAULT '[]'::jsonb,

    -- User who triggered
    triggered_by UUID REFERENCES users(id),
    trigger_type VARCHAR(20) DEFAULT 'manual' -- manual, scheduled, webhook
);

-- Indexes
CREATE INDEX idx_neon_accounts_email ON neon_accounts(email);
CREATE INDEX idx_neon_accounts_neon_id ON neon_accounts(neon_account_id);
CREATE INDEX idx_neon_accounts_volunteer ON neon_accounts(is_volunteer) WHERE is_volunteer = true;
CREATE INDEX idx_neon_companies_name ON neon_companies(company_name);
CREATE INDEX idx_neon_opportunities_date ON neon_volunteer_opportunities(start_date);
CREATE INDEX idx_neon_events_date ON neon_events(start_date);
CREATE INDEX idx_neon_sync_log_type ON neon_sync_log(sync_type, started_at DESC);

-- RLS
ALTER TABLE neon_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE neon_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE neon_volunteer_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE neon_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE neon_sync_log ENABLE ROW LEVEL SECURITY;

-- Allow read access
CREATE POLICY "Anyone can read neon_accounts" ON neon_accounts FOR SELECT USING (true);
CREATE POLICY "Anyone can read neon_companies" ON neon_companies FOR SELECT USING (true);
CREATE POLICY "Anyone can read neon_volunteer_opportunities" ON neon_volunteer_opportunities FOR SELECT USING (true);
CREATE POLICY "Anyone can read neon_events" ON neon_events FOR SELECT USING (true);
CREATE POLICY "Anyone can read neon_sync_log" ON neon_sync_log FOR SELECT USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_neon_accounts_updated_at BEFORE UPDATE ON neon_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_neon_companies_updated_at BEFORE UPDATE ON neon_companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_neon_opportunities_updated_at BEFORE UPDATE ON neon_volunteer_opportunities FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_neon_events_updated_at BEFORE UPDATE ON neon_events FOR EACH ROW EXECUTE FUNCTION update_updated_at();

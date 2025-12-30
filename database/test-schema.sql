-- Quick test: Create a simple sites table and insert one row
-- Run this in your Supabase SQL Editor first to verify things work

-- Create the sites table
CREATE TABLE IF NOT EXISTS sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    location VARCHAR(50) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert test data
INSERT INTO sites (name, location, address, phone, email)
VALUES ('CANMP Waterville', 'waterville', '123 Main Street, Waterville, ME 04901', '(207) 555-0100', 'waterville@canmp.org')
ON CONFLICT DO NOTHING;

-- Verify it worked
SELECT * FROM sites;

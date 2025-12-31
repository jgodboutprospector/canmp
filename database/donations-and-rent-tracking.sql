-- ============================================
-- CANMP Donation Hub & Rent Tracking Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- DONATION HUB TABLES
-- ============================================

-- Donation item categories
DO $$ BEGIN
    CREATE TYPE donation_category AS ENUM (
        'furniture', 'kitchen', 'bedding', 'bathroom',
        'electronics', 'clothing', 'baby', 'household', 'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Donation item status
DO $$ BEGIN
    CREATE TYPE donation_status AS ENUM ('available', 'reserved', 'claimed', 'pending_pickup');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Donation items
CREATE TABLE IF NOT EXISTS donation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category donation_category NOT NULL,
    condition VARCHAR(50), -- new, like_new, good, fair
    quantity INTEGER DEFAULT 1,
    status donation_status DEFAULT 'available',

    -- Storage location
    location VARCHAR(200),
    bin_number VARCHAR(50),

    -- Donor info
    donor_name VARCHAR(200),
    donor_phone VARCHAR(20),
    donor_email VARCHAR(255),
    donated_date DATE DEFAULT CURRENT_DATE,

    -- Claim info
    claimed_by_household_id UUID REFERENCES households(id),
    claimed_date DATE,
    claimed_by_user_id UUID REFERENCES users(id),

    -- Image
    image_path TEXT, -- Supabase Storage path

    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donation_items_category ON donation_items(category);
CREATE INDEX IF NOT EXISTS idx_donation_items_status ON donation_items(status);

-- Enable RLS
ALTER TABLE donation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view donations" ON donation_items
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage donations" ON donation_items
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator', 'volunteer')
        )
    );

-- ============================================
-- RENT TRACKING TABLES
-- ============================================

-- Rent payment records (enhanced from existing payments table)
-- Using a new dedicated table for clearer tracking
CREATE TABLE IF NOT EXISTS rent_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,

    -- Period
    ledger_month DATE NOT NULL, -- First of month

    -- Amounts due
    rent_due_from_tenant DECIMAL(10,2) DEFAULT 0,
    rent_due_to_landlord DECIMAL(10,2) DEFAULT 0,

    -- Amounts collected/paid
    amount_collected_from_tenant DECIMAL(10,2) DEFAULT 0,
    collection_date DATE,
    collection_method VARCHAR(50), -- cash, check, bank_transfer
    collection_reference VARCHAR(100),
    collected_by_id UUID REFERENCES users(id),

    -- Payments to landlord
    amount_paid_to_landlord DECIMAL(10,2) DEFAULT 0,
    landlord_payment_date DATE,
    landlord_payment_method VARCHAR(50),
    landlord_payment_reference VARCHAR(100), -- check #, ACH confirmation
    paid_by_id UUID REFERENCES users(id),

    -- Subsidy (if applicable)
    subsidy_amount DECIMAL(10,2) DEFAULT 0,

    -- Status flags
    tenant_paid BOOLEAN DEFAULT false,
    landlord_paid BOOLEAN DEFAULT false,

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(lease_id, ledger_month)
);

CREATE INDEX IF NOT EXISTS idx_rent_ledger_lease ON rent_ledger(lease_id);
CREATE INDEX IF NOT EXISTS idx_rent_ledger_month ON rent_ledger(ledger_month);

-- Enable RLS
ALTER TABLE rent_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view rent ledger" ON rent_ledger
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator')
        )
    );

CREATE POLICY "Staff can manage rent ledger" ON rent_ledger
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator')
        )
    );

-- ============================================
-- LEASE DOCUMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS lease_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL, -- lease_agreement, amendment, addendum, move_in_checklist, etc.
    document_name VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL, -- Supabase Storage path
    file_size INTEGER,
    mime_type VARCHAR(100),

    -- Dates
    document_date DATE,
    expiry_date DATE,

    -- Upload info
    uploaded_by_id UUID REFERENCES users(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),

    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lease_documents_lease ON lease_documents(lease_id);

-- Enable RLS
ALTER TABLE lease_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view lease documents" ON lease_documents
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator')
        )
    );

CREATE POLICY "Staff can manage lease documents" ON lease_documents
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator')
        )
    );

-- Trigger for updated_at
CREATE OR REPLACE TRIGGER update_donation_items_updated_at
    BEFORE UPDATE ON donation_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER update_rent_ledger_updated_at
    BEFORE UPDATE ON rent_ledger
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

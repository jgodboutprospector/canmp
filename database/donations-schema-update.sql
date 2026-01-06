-- ============================================
-- CANMP Donation Schema Update
-- Adds support for multiple photos via S3 and expanded categories
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. UPDATE DONATION CATEGORY ENUM
-- ============================================

-- Add new values to the existing enum
ALTER TYPE donation_category ADD VALUE IF NOT EXISTS 'linens';
ALTER TYPE donation_category ADD VALUE IF NOT EXISTS 'rugs';
ALTER TYPE donation_category ADD VALUE IF NOT EXISTS 'accessories';
ALTER TYPE donation_category ADD VALUE IF NOT EXISTS 'toys';
ALTER TYPE donation_category ADD VALUE IF NOT EXISTS 'kitchenware';

-- ============================================
-- 2. CREATE DONATION PHOTOS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS donation_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    donation_item_id UUID NOT NULL REFERENCES donation_items(id) ON DELETE CASCADE,

    -- S3 Storage info
    s3_url TEXT NOT NULL,
    s3_key TEXT NOT NULL,

    -- Original file info
    original_filename TEXT,
    file_size INTEGER,
    mime_type VARCHAR(100),

    -- Display order
    sort_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donation_photos_item ON donation_photos(donation_item_id);
CREATE INDEX IF NOT EXISTS idx_donation_photos_primary ON donation_photos(donation_item_id, is_primary) WHERE is_primary = true;

-- Enable RLS
ALTER TABLE donation_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view donation photos" ON donation_photos
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage donation photos" ON donation_photos
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator', 'volunteer')
        )
    );

-- ============================================
-- 3. ADD ADDITIONAL FIELDS TO DONATION_ITEMS
-- ============================================

-- Add claim tracking fields
ALTER TABLE donation_items
ADD COLUMN IF NOT EXISTS claim_count INTEGER DEFAULT 0;

ALTER TABLE donation_items
ADD COLUMN IF NOT EXISTS most_recent_claim_date DATE;

ALTER TABLE donation_items
ADD COLUMN IF NOT EXISTS shop_display_summary TEXT;

ALTER TABLE donation_items
ADD COLUMN IF NOT EXISTS suggested_next_action TEXT;

-- Add Airtable reference for import tracking
ALTER TABLE donation_items
ADD COLUMN IF NOT EXISTS airtable_id VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_donation_items_airtable ON donation_items(airtable_id) WHERE airtable_id IS NOT NULL;

-- ============================================
-- 4. CREATE DONATION CLAIMS TABLE (optional for tracking claim history)
-- ============================================

CREATE TABLE IF NOT EXISTS donation_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    donation_item_id UUID NOT NULL REFERENCES donation_items(id) ON DELETE CASCADE,
    household_id UUID REFERENCES households(id),
    claimed_by_name VARCHAR(200),
    claim_status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, completed
    claim_date TIMESTAMPTZ DEFAULT NOW(),
    approved_date TIMESTAMPTZ,
    approved_by_id UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donation_claims_item ON donation_claims(donation_item_id);
CREATE INDEX IF NOT EXISTS idx_donation_claims_household ON donation_claims(household_id);

-- Enable RLS
ALTER TABLE donation_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view donation claims" ON donation_claims
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage donation claims" ON donation_claims
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator', 'volunteer')
        )
    );

-- Trigger for updated_at
CREATE OR REPLACE TRIGGER update_donation_claims_updated_at
    BEFORE UPDATE ON donation_claims
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 5. FUNCTION TO UPDATE CLAIM COUNT
-- ============================================

CREATE OR REPLACE FUNCTION update_donation_claim_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update claim count and most recent date on the donation item
    UPDATE donation_items
    SET
        claim_count = (
            SELECT COUNT(*) FROM donation_claims
            WHERE donation_item_id = COALESCE(NEW.donation_item_id, OLD.donation_item_id)
        ),
        most_recent_claim_date = (
            SELECT MAX(claim_date)::DATE FROM donation_claims
            WHERE donation_item_id = COALESCE(NEW.donation_item_id, OLD.donation_item_id)
        )
    WHERE id = COALESCE(NEW.donation_item_id, OLD.donation_item_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_update_donation_claim_count
    AFTER INSERT OR UPDATE OR DELETE ON donation_claims
    FOR EACH ROW EXECUTE FUNCTION update_donation_claim_count();

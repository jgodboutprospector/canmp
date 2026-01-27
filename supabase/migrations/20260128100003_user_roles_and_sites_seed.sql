-- ============================================
-- Update User Roles and Seed Sites Data
-- ============================================

-- ============================================
-- Update user roles to match jon@newmainerproject.org (admin)
-- ============================================

-- First, ensure jon@newmainerproject.org is admin (if exists)
UPDATE users
SET role = 'admin', is_active = true
WHERE email = 'jon@newmainerproject.org';

-- Update katya@newmainerproject.org to admin
UPDATE users
SET role = 'admin', is_active = true
WHERE email = 'katya@newmainerproject.org';

-- Update nour.iskandafi@newmainerproject.org to admin
UPDATE users
SET role = 'admin', is_active = true
WHERE email = 'nour.iskandafi@newmainerproject.org';

-- Update nalnaseri@newmainerproject.org to admin
UPDATE users
SET role = 'admin', is_active = true
WHERE email = 'nalnaseri@newmainerproject.org';

-- ============================================
-- Seed Sites Data
-- ============================================

INSERT INTO sites (name, location, address, phone, email) VALUES
    ('Waterville Office', 'waterville', '40 Elm St, Waterville, ME 04901', '(207) 660-9046', 'info@newmainerproject.org'),
    ('Augusta Office', 'augusta', 'Augusta, ME', NULL, 'info@newmainerproject.org')
ON CONFLICT (location) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email;

-- ============================================
-- Verify the changes (these SELECT statements help with debugging)
-- ============================================

-- The following comments show what was updated:
-- Users updated to admin role:
--   - jon@newmainerproject.org
--   - katya@newmainerproject.org
--   - nour.iskandafi@newmainerproject.org
--   - nalnaseri@newmainerproject.org
--
-- Sites seeded:
--   - Waterville Office
--   - Augusta Office

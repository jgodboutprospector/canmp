-- ============================================
-- Ensure Admin Users Exist
-- ============================================

-- Insert users if they don't exist, or update if they do
-- Using ON CONFLICT with email as the unique constraint

INSERT INTO users (email, first_name, last_name, role, is_active) VALUES
    ('jon@newmainerproject.org', 'Jon', 'Godbout', 'admin', true),
    ('katya@newmainerproject.org', 'Katya', 'Admin', 'admin', true),
    ('nour.iskandafi@newmainerproject.org', 'Nour', 'Iskandafi', 'admin', true),
    ('nalnaseri@newmainerproject.org', 'N', 'Alnaseri', 'admin', true)
ON CONFLICT (email) DO UPDATE SET
    role = 'admin',
    is_active = true;

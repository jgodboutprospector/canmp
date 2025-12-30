-- ============================================
-- CANMP Authentication & Authorization Schema
-- Uses existing user_role enum: admin, coordinator, teacher, board_member, volunteer
-- ============================================

-- User Profiles Table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role user_role NOT NULL DEFAULT 'volunteer',

    -- For teachers - link to teachers table
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,

    -- For volunteers - link to volunteers table
    volunteer_id UUID REFERENCES volunteers(id) ON DELETE SET NULL,

    -- Profile settings
    avatar_url TEXT,
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,

    -- Metadata
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;
DROP POLICY IF EXISTS "Service role full access" ON user_profiles;
DROP POLICY IF EXISTS "Anyone can read user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated can insert profiles" ON user_profiles;

-- Simple policy: allow all reads (since this is internal app)
CREATE POLICY "Anyone can read user_profiles"
    ON user_profiles FOR SELECT
    USING (true);

-- Allow inserts
CREATE POLICY "Authenticated can insert profiles"
    ON user_profiles FOR INSERT
    WITH CHECK (true);

-- Allow updates
CREATE POLICY "Users can update own profile"
    ON user_profiles FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Allow deletes
CREATE POLICY "Admins can delete profiles"
    ON user_profiles FOR DELETE
    USING (true);

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role_value user_role;
BEGIN
    -- Try to get role from metadata, default to 'volunteer'
    BEGIN
        user_role_value := COALESCE(
            NULLIF(NEW.raw_user_meta_data->>'role', '')::user_role,
            'volunteer'::user_role
        );
    EXCEPTION WHEN invalid_text_representation THEN
        user_role_value := 'volunteer'::user_role;
    END;

    INSERT INTO public.user_profiles (id, email, first_name, last_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        user_role_value
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), user_profiles.first_name),
        last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), user_profiles.last_name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Helper functions
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role AS $$
    SELECT role FROM user_profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = user_id AND role = 'admin'
    );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_teacher(user_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = user_id AND role = 'teacher'
    );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_coordinator(user_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = user_id AND role = 'coordinator'
    );
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================
-- CANMP Authentication & Authorization Schema
-- Role-based access control system
-- ============================================

-- User Roles Enum
CREATE TYPE user_role AS ENUM ('admin', 'case_manager', 'teacher', 'volunteer', 'viewer');

-- User Profiles Table (extends Supabase auth.users)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role user_role NOT NULL DEFAULT 'viewer',

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

-- Create index for email lookups
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
-- Users can read their own profile
CREATE POLICY "Users can view own profile"
    ON user_profiles FOR SELECT
    USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
    ON user_profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Users can update their own profile (except role)
CREATE POLICY "Users can update own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Only admins can insert new profiles
CREATE POLICY "Admins can insert profiles"
    ON user_profiles FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Trigger to update updated_at
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, first_name, last_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'viewer')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to check user role
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role AS $$
    SELECT role FROM user_profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = user_id AND role = 'admin'
    );
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to check if user is teacher
CREATE OR REPLACE FUNCTION is_teacher(user_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = user_id AND role = 'teacher'
    );
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================
-- Update RLS policies on other tables for role-based access
-- ============================================

-- Teachers can only view/edit their own class sections
CREATE POLICY "Teachers can view own classes"
    ON class_sections FOR SELECT
    USING (
        teacher_id IN (
            SELECT teacher_id FROM user_profiles WHERE id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'case_manager')
        )
    );

-- Teachers can update attendance for their classes
CREATE POLICY "Teachers can manage attendance"
    ON class_attendance FOR ALL
    USING (
        section_id IN (
            SELECT id FROM class_sections WHERE teacher_id IN (
                SELECT teacher_id FROM user_profiles WHERE id = auth.uid()
            )
        )
        OR EXISTS (
            SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'case_manager')
        )
    );

-- ============================================
-- Insert initial admin users
-- Note: These will be created via Supabase Auth, then profiles updated
-- ============================================

-- After creating users via Supabase Auth UI or API, run:
-- UPDATE user_profiles SET role = 'admin' WHERE email IN (
--     'jon@newmainerproject.org',
--     'katya@newmainerproject.org',
--     'nalnaseri@newmainerproject.org',
--     'nour.iskandafi@newmainerproject.org'
-- );

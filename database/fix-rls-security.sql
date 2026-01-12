-- ============================================
-- FIX RLS SECURITY ISSUES
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- PART 1: Enable RLS on all tables missing it
-- ============================================

ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficiary_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridge_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridge_milestone_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_interest_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_service_types ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 2: Add missing RLS policies for properties (your original issue)
-- ============================================

CREATE POLICY "Staff can manage properties" ON properties
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator')
        )
    );

CREATE POLICY "Staff can manage units" ON units
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator')
        )
    );

-- ============================================
-- PART 3: Add RLS policies for newly enabled tables
-- ============================================

-- Class-related tables (read for all authenticated, write for staff)
CREATE POLICY "Authenticated users can read class_enrollments" ON class_enrollments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage class_enrollments" ON class_enrollments
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role IN ('admin', 'coordinator', 'teacher')))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role IN ('admin', 'coordinator', 'teacher')));

CREATE POLICY "Authenticated users can read class_sections" ON class_sections
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage class_sections" ON class_sections
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role IN ('admin', 'coordinator')))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role IN ('admin', 'coordinator')));

CREATE POLICY "Authenticated users can read class_attendance" ON class_attendance
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage class_attendance" ON class_attendance
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role IN ('admin', 'coordinator', 'teacher')))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role IN ('admin', 'coordinator', 'teacher')));

-- Teachers
CREATE POLICY "Authenticated users can read teachers" ON teachers
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage teachers" ON teachers
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role IN ('admin', 'coordinator')))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role IN ('admin', 'coordinator')));

-- Volunteers
CREATE POLICY "Authenticated users can read volunteers" ON volunteers
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage volunteers" ON volunteers
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role IN ('admin', 'coordinator')))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role IN ('admin', 'coordinator')));

-- Mentor teams
CREATE POLICY "Authenticated users can read mentor_teams" ON mentor_teams
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage mentor_teams" ON mentor_teams
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role IN ('admin', 'coordinator')))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role IN ('admin', 'coordinator')));

CREATE POLICY "Authenticated users can read mentor_team_members" ON mentor_team_members
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage mentor_team_members" ON mentor_team_members
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role IN ('admin', 'coordinator')))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role IN ('admin', 'coordinator')));

-- Board-related tables (board members can read, admin can manage)
CREATE POLICY "Board members can read board_decisions" ON board_decisions
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role IN ('admin', 'coordinator', 'board_member')));

CREATE POLICY "Admin can manage board_decisions" ON board_decisions
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "Board members can read board_votes" ON board_votes
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role IN ('admin', 'coordinator', 'board_member')));

CREATE POLICY "Board members can manage own votes" ON board_votes
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role IN ('admin', 'board_member')))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role IN ('admin', 'board_member')));

-- Beneficiary languages
CREATE POLICY "Authenticated users can read beneficiary_languages" ON beneficiary_languages
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage beneficiary_languages" ON beneficiary_languages
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role IN ('admin', 'coordinator')))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role IN ('admin', 'coordinator')));

-- Bridge milestones
CREATE POLICY "Authenticated users can read bridge_milestones" ON bridge_milestones
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage bridge_milestones" ON bridge_milestones
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role IN ('admin', 'coordinator')))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role IN ('admin', 'coordinator')));

CREATE POLICY "Authenticated users can read bridge_milestone_templates" ON bridge_milestone_templates
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage bridge_milestone_templates" ON bridge_milestone_templates
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'admin'));

-- Work order comments and photos
CREATE POLICY "Authenticated users can read work_order_comments" ON work_order_comments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage work_order_comments" ON work_order_comments
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid()));

CREATE POLICY "Authenticated users can read work_order_photos" ON work_order_photos
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage work_order_photos" ON work_order_photos
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid()));

-- Audit log (admin only)
CREATE POLICY "Admin can read audit_log" ON audit_log
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'admin'));

-- Notifications (users can see their own)
CREATE POLICY "Users can read own notifications" ON notifications
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "System can manage notifications" ON notifications
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role IN ('admin', 'coordinator')))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role IN ('admin', 'coordinator')));

-- Lookup/reference tables (read for all authenticated, admin manages)
CREATE POLICY "Authenticated users can read program_types" ON program_types
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage program_types" ON program_types
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "Authenticated users can read volunteer_interest_types" ON volunteer_interest_types
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage volunteer_interest_types" ON volunteer_interest_types
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "Authenticated users can read support_service_types" ON support_service_types
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage support_service_types" ON support_service_types
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'admin'));

-- ============================================
-- PART 4: Fix overly permissive policies (WARNINGS)
-- Drop and recreate with proper restrictions
-- ============================================

-- Fix beneficiary_notes policy
DROP POLICY IF EXISTS "All authenticated can do everything on beneficiary_notes" ON beneficiary_notes;

CREATE POLICY "Authenticated users can read beneficiary_notes" ON beneficiary_notes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage beneficiary_notes" ON beneficiary_notes
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role IN ('admin', 'coordinator')));

CREATE POLICY "Staff can update beneficiary_notes" ON beneficiary_notes
    FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role IN ('admin', 'coordinator')))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role IN ('admin', 'coordinator')));

CREATE POLICY "Staff can delete beneficiary_notes" ON beneficiary_notes
    FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role IN ('admin', 'coordinator')));

-- Fix property_notes policy
DROP POLICY IF EXISTS "All authenticated can do everything on property_notes" ON property_notes;

CREATE POLICY "Authenticated users can read property_notes" ON property_notes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage property_notes" ON property_notes
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role IN ('admin', 'coordinator')));

CREATE POLICY "Staff can update property_notes" ON property_notes
    FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role IN ('admin', 'coordinator')))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role IN ('admin', 'coordinator')));

CREATE POLICY "Staff can delete property_notes" ON property_notes
    FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role IN ('admin', 'coordinator')));

-- Fix volunteer_notes policy
DROP POLICY IF EXISTS "All authenticated can do everything on volunteer_notes" ON volunteer_notes;

CREATE POLICY "Authenticated users can read volunteer_notes" ON volunteer_notes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage volunteer_notes" ON volunteer_notes
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role IN ('admin', 'coordinator')));

CREATE POLICY "Staff can update volunteer_notes" ON volunteer_notes
    FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role IN ('admin', 'coordinator')))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role IN ('admin', 'coordinator')));

CREATE POLICY "Staff can delete volunteer_notes" ON volunteer_notes
    FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role IN ('admin', 'coordinator')));

-- Fix user_profiles policies
-- user_profiles uses 'id' column which references auth.users(id)
DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

CREATE POLICY "Users can read own profile" ON user_profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid() OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin'));

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can manage all profiles" ON user_profiles
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin'));

-- ============================================
-- PART 5: Fix functions with mutable search_path
-- ============================================

CREATE OR REPLACE FUNCTION update_donation_claim_count()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.donations
        SET claimed_count = claimed_count + 1
        WHERE id = NEW.donation_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.donations
        SET claimed_count = claimed_count - 1
        WHERE id = OLD.donation_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_tenant_pays()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.tenant_pays = COALESCE(NEW.monthly_rent, 0) - COALESCE(NEW.subsidy_amount, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_unit_on_lease_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
        UPDATE public.units SET status = 'occupied' WHERE id = NEW.unit_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.status IN ('completed', 'terminated') AND OLD.status = 'active' THEN
            UPDATE public.units SET status = 'available' WHERE id = NEW.unit_id;
        ELSIF NEW.status = 'active' AND OLD.status != 'active' THEN
            UPDATE public.units SET status = 'occupied' WHERE id = NEW.unit_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM public.users
    WHERE auth_user_id = auth.uid();
    RETURN user_role;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE auth_user_id = auth.uid()
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION is_teacher()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE auth_user_id = auth.uid()
        AND role = 'teacher'
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION is_coordinator()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE auth_user_id = auth.uid()
        AND role = 'coordinator'
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email)
    VALUES (NEW.id, NEW.email)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- DONE!
-- For the "Leaked Password Protection" warning,
-- go to: Supabase Dashboard > Authentication > Settings
-- and enable "Leaked password protection"
-- ============================================

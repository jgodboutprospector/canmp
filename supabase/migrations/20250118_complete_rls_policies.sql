-- Migration: Complete RLS policies for all tables
-- Created: 2025-01-17
-- Description: Adds Row Level Security helper functions and policies

-- Helper function to check user role (in public schema)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role::TEXT FROM public.users WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to check if user is admin or coordinator
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_user_id = auth.uid()
    AND role IN ('admin', 'coordinator')
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_user_id = auth.uid()
    AND role = 'admin'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- USERS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can read own profile" ON users;
CREATE POLICY "Users can read own profile" ON users
    FOR SELECT TO authenticated
    USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Staff can read all users" ON users;
CREATE POLICY "Staff can read all users" ON users
    FOR SELECT TO authenticated
    USING (public.is_staff());

DROP POLICY IF EXISTS "Admins can manage users" ON users;
CREATE POLICY "Admins can manage users" ON users
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ============================================
-- LEASES TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Staff can view leases" ON leases;
CREATE POLICY "Staff can view leases" ON leases
    FOR SELECT TO authenticated
    USING (public.is_staff());

DROP POLICY IF EXISTS "Staff can manage leases" ON leases;
CREATE POLICY "Staff can manage leases" ON leases
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- ============================================
-- PAYMENTS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Staff can view payments" ON payments;
CREATE POLICY "Staff can view payments" ON payments
    FOR SELECT TO authenticated
    USING (public.is_staff());

DROP POLICY IF EXISTS "Staff can manage payments" ON payments;
CREATE POLICY "Staff can manage payments" ON payments
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- ============================================
-- WORK ORDERS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Staff can view work orders" ON work_orders;
CREATE POLICY "Staff can view work orders" ON work_orders
    FOR SELECT TO authenticated
    USING (public.is_staff());

DROP POLICY IF EXISTS "Staff can manage work orders" ON work_orders;
CREATE POLICY "Staff can manage work orders" ON work_orders
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- ============================================
-- CASE NOTES TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view case notes per visibility" ON case_notes;
CREATE POLICY "Users can view case notes per visibility" ON case_notes
    FOR SELECT TO authenticated
    USING (
        (visibility = 'all_staff' AND EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid()))
        OR (visibility = 'coordinators_only' AND public.is_staff())
        OR (visibility = 'private' AND author_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()))
        OR author_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can create case notes" ON case_notes;
CREATE POLICY "Users can create case notes" ON case_notes
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update case notes" ON case_notes;
CREATE POLICY "Users can update case notes" ON case_notes
    FOR UPDATE TO authenticated
    USING (
        author_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
        OR public.is_staff()
    );

DROP POLICY IF EXISTS "Admins can delete case notes" ON case_notes;
CREATE POLICY "Admins can delete case notes" ON case_notes
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- ============================================
-- AUDIT LOG TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_log;
CREATE POLICY "Admins can view audit logs" ON audit_log
    FOR SELECT TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "System can insert audit logs" ON audit_log;
CREATE POLICY "System can insert audit logs" ON audit_log
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- ============================================
-- DONATION ITEMS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view donation items" ON donation_items;
CREATE POLICY "Users can view donation items" ON donation_items
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Staff can manage donation items" ON donation_items;
CREATE POLICY "Staff can manage donation items" ON donation_items
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- ============================================
-- VOLUNTEERS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view volunteers" ON volunteers;
CREATE POLICY "Users can view volunteers" ON volunteers
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Staff can manage volunteers" ON volunteers;
CREATE POLICY "Staff can manage volunteers" ON volunteers
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- ============================================
-- MENTOR TEAMS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view mentor teams" ON mentor_teams;
CREATE POLICY "Users can view mentor teams" ON mentor_teams
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Staff can manage mentor teams" ON mentor_teams;
CREATE POLICY "Staff can manage mentor teams" ON mentor_teams
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

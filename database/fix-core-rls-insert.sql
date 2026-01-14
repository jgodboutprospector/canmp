-- ============================================
-- FIX RLS INSERT POLICIES FOR CORE TABLES
-- Run this in Supabase SQL Editor
--
-- This fixes the "violates row-level security policy" error
-- when trying to INSERT into core tables.
-- ============================================

-- ============================================
-- BENEFICIARIES TABLE
-- ============================================

-- Drop existing policies that don't have proper INSERT support
DROP POLICY IF EXISTS "Staff can manage beneficiaries" ON beneficiaries;
DROP POLICY IF EXISTS "Authenticated users can view beneficiaries" ON beneficiaries;
DROP POLICY IF EXISTS "Staff can view beneficiaries" ON beneficiaries;
DROP POLICY IF EXISTS "Staff can insert beneficiaries" ON beneficiaries;
DROP POLICY IF EXISTS "Staff can update beneficiaries" ON beneficiaries;
DROP POLICY IF EXISTS "Staff can delete beneficiaries" ON beneficiaries;

-- Create proper policies for beneficiaries
CREATE POLICY "Authenticated users can view beneficiaries" ON beneficiaries
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can insert beneficiaries" ON beneficiaries
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator', 'volunteer')
        )
    );

CREATE POLICY "Staff can update beneficiaries" ON beneficiaries
    FOR UPDATE TO authenticated
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

CREATE POLICY "Staff can delete beneficiaries" ON beneficiaries
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator')
        )
    );

-- ============================================
-- HOUSEHOLDS TABLE
-- ============================================

DROP POLICY IF EXISTS "Staff can manage households" ON households;
DROP POLICY IF EXISTS "Authenticated users can view households" ON households;
DROP POLICY IF EXISTS "Staff can view households" ON households;
DROP POLICY IF EXISTS "Staff can insert households" ON households;
DROP POLICY IF EXISTS "Staff can update households" ON households;
DROP POLICY IF EXISTS "Staff can delete households" ON households;

CREATE POLICY "Authenticated users can view households" ON households
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can insert households" ON households
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator', 'volunteer')
        )
    );

CREATE POLICY "Staff can update households" ON households
    FOR UPDATE TO authenticated
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

CREATE POLICY "Staff can delete households" ON households
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator')
        )
    );

-- ============================================
-- LEASES TABLE
-- ============================================

DROP POLICY IF EXISTS "Staff can manage leases" ON leases;
DROP POLICY IF EXISTS "Authenticated users can view leases" ON leases;
DROP POLICY IF EXISTS "Staff can view leases" ON leases;
DROP POLICY IF EXISTS "Staff can insert leases" ON leases;
DROP POLICY IF EXISTS "Staff can update leases" ON leases;
DROP POLICY IF EXISTS "Staff can delete leases" ON leases;

CREATE POLICY "Authenticated users can view leases" ON leases
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can insert leases" ON leases
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator')
        )
    );

CREATE POLICY "Staff can update leases" ON leases
    FOR UPDATE TO authenticated
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

CREATE POLICY "Staff can delete leases" ON leases
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- ============================================
-- PAYMENTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Staff can manage payments" ON payments;
DROP POLICY IF EXISTS "Authenticated users can view payments" ON payments;
DROP POLICY IF EXISTS "Staff can view payments" ON payments;
DROP POLICY IF EXISTS "Staff can insert payments" ON payments;
DROP POLICY IF EXISTS "Staff can update payments" ON payments;
DROP POLICY IF EXISTS "Staff can delete payments" ON payments;

CREATE POLICY "Authenticated users can view payments" ON payments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can insert payments" ON payments
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator')
        )
    );

CREATE POLICY "Staff can update payments" ON payments
    FOR UPDATE TO authenticated
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

CREATE POLICY "Staff can delete payments" ON payments
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- ============================================
-- WORK_ORDERS TABLE
-- ============================================

DROP POLICY IF EXISTS "Staff can manage work_orders" ON work_orders;
DROP POLICY IF EXISTS "Authenticated users can view work_orders" ON work_orders;
DROP POLICY IF EXISTS "Staff can view work_orders" ON work_orders;
DROP POLICY IF EXISTS "Staff can insert work_orders" ON work_orders;
DROP POLICY IF EXISTS "Staff can update work_orders" ON work_orders;
DROP POLICY IF EXISTS "Staff can delete work_orders" ON work_orders;

CREATE POLICY "Authenticated users can view work_orders" ON work_orders
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can insert work_orders" ON work_orders
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator', 'volunteer')
        )
    );

CREATE POLICY "Staff can update work_orders" ON work_orders
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator', 'volunteer')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator', 'volunteer')
        )
    );

CREATE POLICY "Staff can delete work_orders" ON work_orders
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator')
        )
    );

-- ============================================
-- TASKS TABLE (if exists)
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'tasks') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Staff can manage tasks" ON tasks';
        EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can view tasks" ON tasks';
        EXECUTE 'DROP POLICY IF EXISTS "Staff can view tasks" ON tasks';
        EXECUTE 'DROP POLICY IF EXISTS "Staff can insert tasks" ON tasks';
        EXECUTE 'DROP POLICY IF EXISTS "Staff can update tasks" ON tasks';
        EXECUTE 'DROP POLICY IF EXISTS "Staff can delete tasks" ON tasks';

        EXECUTE 'CREATE POLICY "Authenticated users can view tasks" ON tasks
            FOR SELECT TO authenticated USING (true)';

        EXECUTE 'CREATE POLICY "Staff can insert tasks" ON tasks
            FOR INSERT TO authenticated
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM users
                    WHERE users.auth_user_id = auth.uid()
                )
            )';

        EXECUTE 'CREATE POLICY "Staff can update tasks" ON tasks
            FOR UPDATE TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM users
                    WHERE users.auth_user_id = auth.uid()
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM users
                    WHERE users.auth_user_id = auth.uid()
                )
            )';

        EXECUTE 'CREATE POLICY "Staff can delete tasks" ON tasks
            FOR DELETE TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM users
                    WHERE users.auth_user_id = auth.uid()
                    AND users.role IN (''admin'', ''coordinator'')
                )
            )';
    END IF;
END $$;

-- ============================================
-- DONE!
-- ============================================
SELECT 'RLS policies updated successfully for core tables!' as status;

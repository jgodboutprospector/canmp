-- Fix RLS policies for donation_items table
-- Run this in Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view donations" ON donation_items;
DROP POLICY IF EXISTS "Staff can manage donations" ON donation_items;

-- Create new policies with proper INSERT support

-- 1. Anyone authenticated can view active donations
CREATE POLICY "Authenticated users can view donations" ON donation_items
    FOR SELECT TO authenticated
    USING (is_active = true);

-- 2. Staff can view ALL donations (including inactive)
CREATE POLICY "Staff can view all donations" ON donation_items
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator', 'volunteer')
        )
    );

-- 3. Staff can INSERT new donations
CREATE POLICY "Staff can insert donations" ON donation_items
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator', 'volunteer')
        )
    );

-- 4. Staff can UPDATE donations
CREATE POLICY "Staff can update donations" ON donation_items
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

-- 5. Staff can DELETE donations
CREATE POLICY "Staff can delete donations" ON donation_items
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'coordinator', 'volunteer')
        )
    );

-- Also fix donation_photos table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'donation_photos') THEN
        -- Enable RLS if not already enabled
        ALTER TABLE donation_photos ENABLE ROW LEVEL SECURITY;

        -- Drop existing policies
        DROP POLICY IF EXISTS "Authenticated users can view donation photos" ON donation_photos;
        DROP POLICY IF EXISTS "Staff can manage donation photos" ON donation_photos;

        -- Create new policies
        CREATE POLICY "Authenticated users can view donation photos" ON donation_photos
            FOR SELECT TO authenticated USING (true);

        CREATE POLICY "Staff can insert donation photos" ON donation_photos
            FOR INSERT TO authenticated
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM users
                    WHERE users.auth_user_id = auth.uid()
                    AND users.role IN ('admin', 'coordinator', 'volunteer')
                )
            );

        CREATE POLICY "Staff can update donation photos" ON donation_photos
            FOR UPDATE TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM users
                    WHERE users.auth_user_id = auth.uid()
                    AND users.role IN ('admin', 'coordinator', 'volunteer')
                )
            );

        CREATE POLICY "Staff can delete donation photos" ON donation_photos
            FOR DELETE TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM users
                    WHERE users.auth_user_id = auth.uid()
                    AND users.role IN ('admin', 'coordinator', 'volunteer')
                )
            );
    END IF;
END $$;

-- Update class_attendance table to support Present/Absent/Excused status
-- Run this in Supabase SQL Editor

-- Create attendance status enum
DO $$ BEGIN
    CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'excused');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new status column (keep is_present for backward compatibility)
ALTER TABLE class_attendance
ADD COLUMN IF NOT EXISTS status attendance_status DEFAULT 'absent';

-- Migrate existing data
UPDATE class_attendance
SET status = CASE WHEN is_present THEN 'present'::attendance_status ELSE 'absent'::attendance_status END
WHERE status IS NULL;

-- Add notes column if not exists
ALTER TABLE class_attendance
ADD COLUMN IF NOT EXISTS notes TEXT;

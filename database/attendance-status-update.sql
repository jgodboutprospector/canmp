-- ============================================
-- ADD STATUS COLUMN TO CLASS_ATTENDANCE
-- ============================================

-- Add status column (present, absent, excused)
ALTER TABLE class_attendance
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'present';

-- Update existing records based on is_present
UPDATE class_attendance
SET status = CASE WHEN is_present = true THEN 'present' ELSE 'absent' END
WHERE status IS NULL OR status = '';

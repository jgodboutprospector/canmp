-- ============================================
-- CLASS SCHEDULE UPDATE
-- Add support for multiple days per class
-- ============================================

-- Add schedule_days array column (keeps day_of_week for backwards compatibility)
ALTER TABLE class_sections
ADD COLUMN IF NOT EXISTS schedule_days INTEGER[] DEFAULT '{}';

-- Migrate existing day_of_week to schedule_days array
UPDATE class_sections
SET schedule_days = ARRAY[day_of_week]
WHERE day_of_week IS NOT NULL AND (schedule_days IS NULL OR schedule_days = '{}');

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_class_sections_schedule_days ON class_sections USING GIN(schedule_days);

-- ============================================
-- VERIFY: Check the update worked
-- ============================================
-- SELECT id, name, day_of_week, schedule_days FROM class_sections;

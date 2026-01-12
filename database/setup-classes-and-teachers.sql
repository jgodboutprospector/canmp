-- ============================================
-- SETUP TEACHERS AND CLASS SECTIONS
-- Run this after running class-schedule-update.sql
-- ============================================

-- Note: Sites use the site_location enum ('waterville', 'augusta')
-- Hallowell classes will use the 'augusta' site (same region)
-- Sites should already exist, but insert if needed:
INSERT INTO sites (id, name, location, address)
SELECT gen_random_uuid(), 'Waterville Office', 'waterville', 'Waterville, ME'
WHERE NOT EXISTS (SELECT 1 FROM sites WHERE location = 'waterville');

INSERT INTO sites (id, name, location, address)
SELECT gen_random_uuid(), 'Augusta Office', 'augusta', 'Augusta, ME'
WHERE NOT EXISTS (SELECT 1 FROM sites WHERE location = 'augusta');

-- ============================================
-- ADD TEACHERS
-- ============================================

-- Nancy Kelly - teaches Beginner and Intermediate in Hallowell
INSERT INTO teachers (id, first_name, last_name, is_volunteer, is_active, languages_taught)
VALUES (gen_random_uuid(), 'Nancy', 'Kelly', true, true, ARRAY['English'])
ON CONFLICT DO NOTHING;

-- Karen Kusiack - teaches Basic in Waterville
INSERT INTO teachers (id, first_name, last_name, is_volunteer, is_active, languages_taught)
VALUES (gen_random_uuid(), 'Karen', 'Kusiack', true, true, ARRAY['English'])
ON CONFLICT DO NOTHING;

-- Sylvie - teaches Basic Tue/Thu in Hallowell
INSERT INTO teachers (id, first_name, last_name, is_volunteer, is_active, languages_taught)
VALUES (gen_random_uuid(), 'Sylvie', '', true, true, ARRAY['English'])
ON CONFLICT DO NOTHING;

-- Su Locsin - teaches Basic Mon/Wed in Hallowell
INSERT INTO teachers (id, first_name, last_name, is_volunteer, is_active, languages_taught)
VALUES (gen_random_uuid(), 'Su', 'Locsin', true, true, ARRAY['English'])
ON CONFLICT DO NOTHING;

-- ============================================
-- ADD CLASS SECTIONS
-- Note: Run this after teachers are added
-- ============================================

-- Get site IDs
DO $$
DECLARE
  augusta_site_id UUID;  -- Hallowell classes use Augusta site
  waterville_site_id UUID;
  nancy_id UUID;
  karen_id UUID;
  sylvie_id UUID;
  su_id UUID;
BEGIN
  -- Get site IDs (Hallowell is in the Augusta region)
  SELECT id INTO augusta_site_id FROM sites WHERE location = 'augusta' LIMIT 1;
  SELECT id INTO waterville_site_id FROM sites WHERE location = 'waterville' LIMIT 1;

  -- Get teacher IDs
  SELECT id INTO nancy_id FROM teachers WHERE first_name = 'Nancy' AND last_name = 'Kelly' LIMIT 1;
  SELECT id INTO karen_id FROM teachers WHERE first_name = 'Karen' AND last_name = 'Kusiack' LIMIT 1;
  SELECT id INTO sylvie_id FROM teachers WHERE first_name = 'Sylvie' LIMIT 1;
  SELECT id INTO su_id FROM teachers WHERE first_name = 'Su' AND last_name = 'Locsin' LIMIT 1;

  -- 1. Basic English - Mon/Wed 10:00-11:30 in Hallowell (Su Locsin)
  INSERT INTO class_sections (id, name, level, teacher_id, site_id, day_of_week, schedule_days, start_time, end_time, location, max_students, is_active)
  VALUES (
    gen_random_uuid(),
    'Basic English - Mon/Wed Morning',
    'basic',
    su_id,
    augusta_site_id,
    1, -- Monday (first day)
    ARRAY[1, 3], -- Mon, Wed
    '10:00',
    '11:30',
    'Hallowell',
    15,
    true
  );

  -- 2. Basic English - Tue/Thu 10:00-11:30 in Hallowell (Sylvie)
  INSERT INTO class_sections (id, name, level, teacher_id, site_id, day_of_week, schedule_days, start_time, end_time, location, max_students, is_active)
  VALUES (
    gen_random_uuid(),
    'Basic English - Tue/Thu Morning',
    'basic',
    sylvie_id,
    augusta_site_id,
    2, -- Tuesday (first day)
    ARRAY[2, 4], -- Tue, Thu
    '10:00',
    '11:30',
    'Hallowell',
    15,
    true
  );

  -- 3. Intermediate English - Mon/Wed 10:00-11:30 in Hallowell (Nancy Kelly)
  INSERT INTO class_sections (id, name, level, teacher_id, site_id, day_of_week, schedule_days, start_time, end_time, location, max_students, is_active)
  VALUES (
    gen_random_uuid(),
    'Intermediate English - Mon/Wed Morning',
    'intermediate',
    nancy_id,
    augusta_site_id,
    1, -- Monday (first day)
    ARRAY[1, 3], -- Mon, Wed
    '10:00',
    '11:30',
    'Hallowell',
    15,
    true
  );

  -- 4. Beginner English - Mon/Wed 12:00-1:30 in Hallowell (Nancy Kelly)
  INSERT INTO class_sections (id, name, level, teacher_id, site_id, day_of_week, schedule_days, start_time, end_time, location, max_students, is_active)
  VALUES (
    gen_random_uuid(),
    'Beginner English - Mon/Wed Afternoon',
    'beginner',
    nancy_id,
    augusta_site_id,
    1, -- Monday (first day)
    ARRAY[1, 3], -- Mon, Wed
    '12:00',
    '13:30',
    'Hallowell',
    15,
    true
  );

  -- 5. Let's Talk - Monday 1:00-2:00 in Waterville
  INSERT INTO class_sections (id, name, level, teacher_id, site_id, day_of_week, schedule_days, start_time, end_time, location, max_students, is_active)
  VALUES (
    gen_random_uuid(),
    'Let''s Talk - Monday Afternoon',
    'lets_talk',
    NULL, -- No teacher assigned yet
    waterville_site_id,
    1, -- Monday
    ARRAY[1], -- Mon
    '13:00',
    '14:00',
    'Waterville',
    15,
    true
  );

  -- 6. Basic English - Tuesday 10:30-12:00 in Waterville (Karen Kusiack)
  INSERT INTO class_sections (id, name, level, teacher_id, site_id, day_of_week, schedule_days, start_time, end_time, location, max_students, is_active)
  VALUES (
    gen_random_uuid(),
    'Basic English - Tuesday Morning',
    'basic',
    karen_id,
    waterville_site_id,
    2, -- Tuesday
    ARRAY[2], -- Tue
    '10:30',
    '12:00',
    'Waterville',
    15,
    true
  );

  RAISE NOTICE 'Classes and teachers created successfully!';
  RAISE NOTICE 'Augusta Site ID (Hallowell classes): %', augusta_site_id;
  RAISE NOTICE 'Waterville Site ID: %', waterville_site_id;
  RAISE NOTICE 'Nancy Kelly ID: %', nancy_id;
  RAISE NOTICE 'Karen Kusiack ID: %', karen_id;
  RAISE NOTICE 'Sylvie ID: %', sylvie_id;
  RAISE NOTICE 'Su Locsin ID: %', su_id;
END $$;

-- ============================================
-- VERIFY THE SETUP
-- ============================================
-- Run these queries to verify:
-- SELECT * FROM teachers WHERE is_active = true;
-- SELECT cs.name, cs.level, cs.schedule_days, cs.start_time, cs.end_time, cs.location, t.first_name || ' ' || t.last_name as teacher
-- FROM class_sections cs
-- LEFT JOIN teachers t ON cs.teacher_id = t.id
-- WHERE cs.is_active = true;

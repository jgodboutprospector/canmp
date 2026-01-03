-- Workforce Module Database Tables
-- Run this migration to create required tables for workforce features

-- Job Listings Table
CREATE TABLE IF NOT EXISTS job_listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  hourly_wage_min DECIMAL(10, 2),
  hourly_wage_max DECIMAL(10, 2),
  schedule_type TEXT,
  description TEXT,
  requirements TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  external_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'filled', 'closed', 'on_hold')),
  openings INTEGER DEFAULT 1,
  placements INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Training Programs Table
CREATE TABLE IF NOT EXISTS training_programs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  description TEXT,
  category TEXT,
  duration_hours INTEGER,
  cost DECIMAL(10, 2),
  location TEXT,
  schedule TEXT,
  certification_offered TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  external_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'upcoming')),
  start_date DATE,
  end_date DATE,
  max_participants INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Training Enrollments Table (links participants to training)
CREATE TABLE IF NOT EXISTS training_enrollments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID NOT NULL REFERENCES workforce_participants(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'in_progress', 'completed', 'dropped')),
  completed_at TIMESTAMPTZ,
  certificate_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_id, program_id)
);

-- Job Applications/Placements Table (links participants to jobs)
CREATE TABLE IF NOT EXISTS job_placements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID NOT NULL REFERENCES workforce_participants(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES job_listings(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'applied' CHECK (status IN ('applied', 'interviewing', 'offered', 'placed', 'declined', 'withdrawn')),
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  interview_date TIMESTAMPTZ,
  offer_date TIMESTAMPTZ,
  start_date DATE,
  hourly_wage DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE job_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_placements ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated read job_listings" ON job_listings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert job_listings" ON job_listings
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update job_listings" ON job_listings
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated delete job_listings" ON job_listings
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read training_programs" ON training_programs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert training_programs" ON training_programs
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update training_programs" ON training_programs
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated delete training_programs" ON training_programs
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read training_enrollments" ON training_enrollments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert training_enrollments" ON training_enrollments
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update training_enrollments" ON training_enrollments
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated delete training_enrollments" ON training_enrollments
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read job_placements" ON job_placements
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert job_placements" ON job_placements
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update job_placements" ON job_placements
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated delete job_placements" ON job_placements
  FOR DELETE TO authenticated USING (true);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_job_listings_status ON job_listings(status);
CREATE INDEX IF NOT EXISTS idx_training_programs_status ON training_programs(status);
CREATE INDEX IF NOT EXISTS idx_training_enrollments_participant ON training_enrollments(participant_id);
CREATE INDEX IF NOT EXISTS idx_training_enrollments_program ON training_enrollments(program_id);
CREATE INDEX IF NOT EXISTS idx_job_placements_participant ON job_placements(participant_id);
CREATE INDEX IF NOT EXISTS idx_job_placements_job ON job_placements(job_id);

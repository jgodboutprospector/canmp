-- Migration: Create transportation_requests table for Mutual Aid module
-- Created: 2026-02-04

-- Create transportation_requests table
CREATE TABLE IF NOT EXISTS transportation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core Info
  title VARCHAR(200) NOT NULL,
  description TEXT,

  -- Links
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  beneficiary_id UUID REFERENCES beneficiaries(id) ON DELETE SET NULL,
  mentor_team_id UUID REFERENCES mentor_teams(id) ON DELETE SET NULL,
  assigned_volunteer_id UUID REFERENCES volunteers(id) ON DELETE SET NULL,

  -- Pickup Location
  pickup_address_street VARCHAR(255),
  pickup_address_city VARCHAR(100),
  pickup_address_state VARCHAR(2),
  pickup_address_zip VARCHAR(10),
  pickup_notes TEXT,

  -- Dropoff Location
  dropoff_address_street VARCHAR(255),
  dropoff_address_city VARCHAR(100),
  dropoff_address_state VARCHAR(2),
  dropoff_address_zip VARCHAR(10),
  dropoff_notes TEXT,

  -- Scheduling
  request_date DATE NOT NULL,
  pickup_time TIME,
  estimated_return_time TIME,

  -- Recurrence
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern VARCHAR(50), -- weekly, bi-weekly, monthly
  recurrence_end_date DATE,

  -- Status & Tracking
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'in_progress', 'completed', 'cancelled')),
  urgency VARCHAR(20) DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high', 'urgent')),

  -- Assignment Tracking
  assigned_at TIMESTAMPTZ,
  assigned_by_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Completion Tracking
  completed_at TIMESTAMPTZ,
  completed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  completion_notes TEXT,
  actual_pickup_time TIME,
  actual_dropoff_time TIME,

  -- Special Requirements
  needs_wheelchair_access BOOLEAN DEFAULT false,
  needs_car_seat BOOLEAN DEFAULT false,
  passenger_count INTEGER DEFAULT 1,
  special_instructions TEXT,

  -- Audit
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transportation_requests_household ON transportation_requests(household_id);
CREATE INDEX IF NOT EXISTS idx_transportation_requests_beneficiary ON transportation_requests(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_transportation_requests_mentor_team ON transportation_requests(mentor_team_id);
CREATE INDEX IF NOT EXISTS idx_transportation_requests_volunteer ON transportation_requests(assigned_volunteer_id);
CREATE INDEX IF NOT EXISTS idx_transportation_requests_status ON transportation_requests(status);
CREATE INDEX IF NOT EXISTS idx_transportation_requests_date ON transportation_requests(request_date);
CREATE INDEX IF NOT EXISTS idx_transportation_requests_created_at ON transportation_requests(created_at);

-- Enable Row Level Security
ALTER TABLE transportation_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can view transportation requests" ON transportation_requests;
DROP POLICY IF EXISTS "Staff can insert transportation requests" ON transportation_requests;
DROP POLICY IF EXISTS "Staff can update transportation requests" ON transportation_requests;
DROP POLICY IF EXISTS "Staff can delete transportation requests" ON transportation_requests;

-- Create RLS policies
CREATE POLICY "Authenticated users can view transportation requests"
  ON transportation_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can insert transportation requests"
  ON transportation_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'coordinator'))
  );

CREATE POLICY "Staff can update transportation requests"
  ON transportation_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'coordinator'))
  );

CREATE POLICY "Staff can delete transportation requests"
  ON transportation_requests FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'coordinator'))
  );

-- Create updated_at trigger
DROP TRIGGER IF EXISTS update_transportation_requests_updated_at ON transportation_requests;
CREATE TRIGGER update_transportation_requests_updated_at
  BEFORE UPDATE ON transportation_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add comment for documentation
COMMENT ON TABLE transportation_requests IS 'Stores transportation assistance requests for mutual aid program';

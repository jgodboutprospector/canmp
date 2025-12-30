-- ============================================
-- CANMP Case Management System
-- Seed Data v1.0
-- ============================================

-- ============================================
-- SITES
-- ============================================

INSERT INTO sites (id, name, location, address, phone, email) VALUES
('11111111-1111-1111-1111-111111111111', 'CANMP Waterville', 'waterville', '123 Main Street, Waterville, ME 04901', '(207) 555-0100', 'waterville@canmp.org'),
('22222222-2222-2222-2222-222222222222', 'CANMP Augusta', 'augusta', '456 State Street, Augusta, ME 04330', '(207) 555-0200', 'augusta@canmp.org');

-- ============================================
-- USERS
-- ============================================

INSERT INTO users (id, email, first_name, last_name, phone, role, site_id, is_active) VALUES
-- Admin
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'jon@canmp.org', 'Jon', 'Godbout', '(207) 555-0001', 'admin', '11111111-1111-1111-1111-111111111111', true),
-- Coordinators
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'sarah@canmp.org', 'Sarah', 'Mitchell', '(207) 555-0002', 'coordinator', '11111111-1111-1111-1111-111111111111', true),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'maria@canmp.org', 'Maria', 'Santos', '(207) 555-0003', 'coordinator', '22222222-2222-2222-2222-222222222222', true),
-- Board Members
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'board1@canmp.org', 'James', 'Wilson', '(207) 555-0004', 'board_member', NULL, true),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'board2@canmp.org', 'Patricia', 'Chen', '(207) 555-0005', 'board_member', NULL, true);

-- ============================================
-- PROPERTIES
-- ============================================

INSERT INTO properties (id, site_id, name, address_street, address_city, address_zip, property_type, total_units, year_built) VALUES
-- CANMP Owned
('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '18 Union Street', '18 Union Street', 'Waterville', '04901', 'canmp_owned', 2, 1920),
('a2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '20 Union Street', '20 Union Street', 'Waterville', '04901', 'canmp_owned', 3, 1915),
('a3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '12 Chapel Street', '12 Chapel Street', 'Waterville', '04901', 'canmp_owned', 1, 1925);

-- Master Lease
INSERT INTO properties (id, site_id, name, address_street, address_city, address_zip, property_type, total_units, landlord_name, landlord_phone, landlord_email, master_lease_start, master_lease_end, master_lease_rent) VALUES
('a4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', '37 Pearl Street', '37 Pearl Street', 'Waterville', '04901', 'master_lease', 1, 'Mike Patterson', '(207) 555-0199', 'mike.patterson@email.com', '2022-11-01', '2025-10-31', 1000.00);

-- ============================================
-- UNITS
-- ============================================

INSERT INTO units (id, property_id, unit_number, bedrooms, bathrooms, square_feet, market_rent, program_rent, status) VALUES
-- 18 Union Street
('c1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'Unit 1', 3, 1, 1100, 1800.00, 1600.00, 'occupied'),
('c1111111-1111-1111-1111-222222222222', 'a1111111-1111-1111-1111-111111111111', 'Unit 2', 2, 1, 850, 1500.00, 1300.00, 'available'),
-- 20 Union Street
('c2222222-2222-2222-2222-111111111111', 'a2222222-2222-2222-2222-222222222222', 'Unit 1', 2, 1, 900, 1500.00, 1300.00, 'available'),
('c2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'Unit 2', 3, 1.5, 1200, 1800.00, 1300.00, 'occupied'),
('c2222222-2222-2222-2222-333333333333', 'a2222222-2222-2222-2222-222222222222', 'Unit 3', 2, 1, 850, 1400.00, 1200.00, 'available'),
-- 12 Chapel Street
('c3333333-3333-3333-3333-111111111111', 'a3333333-3333-3333-3333-333333333333', 'Unit 1', 3, 1.5, 1300, 2000.00, 1800.00, 'occupied'),
-- 37 Pearl Street (Master Lease)
('c4444444-4444-4444-4444-111111111111', 'a4444444-4444-4444-4444-444444444444', 'Unit A', 2, 1, 950, 1400.00, 1200.00, 'occupied');

-- ============================================
-- HOUSEHOLDS
-- ============================================

INSERT INTO households (id, name, site_id, primary_language, country_of_origin, date_arrived_us, date_arrived_maine, assigned_coordinator_id, is_active) VALUES
('d1111111-1111-1111-1111-111111111111', 'Aldeek Family', '11111111-1111-1111-1111-111111111111', 'Arabic', 'Syria', '2022-06-15', '2022-09-01', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true),
('d2222222-2222-2222-2222-222222222222', 'Bozan Family', '11111111-1111-1111-1111-111111111111', 'Arabic', 'Iraq', '2022-04-20', '2022-08-15', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true),
('d3333333-3333-3333-3333-333333333333', 'Posso Family', '11111111-1111-1111-1111-111111111111', 'Spanish', 'Colombia', '2022-07-10', '2022-10-01', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true),
('d4444444-4444-4444-4444-444444444444', 'Okonkwo Family', '11111111-1111-1111-1111-111111111111', 'Igbo', 'Nigeria', '2024-01-15', '2024-03-01', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true),
('d5555555-5555-5555-5555-555555555555', 'Nguyen Family', '22222222-2222-2222-2222-222222222222', 'Vietnamese', 'Vietnam', '2023-09-01', '2023-11-15', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true),
('d6666666-6666-6666-6666-666666666666', 'Hassan Family', '22222222-2222-2222-2222-222222222222', 'Somali', 'Somalia', '2023-05-20', '2023-08-01', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);

-- ============================================
-- BENEFICIARIES
-- ============================================

-- Aldeek Family
INSERT INTO beneficiaries (id, household_id, first_name, last_name, date_of_birth, gender, relationship_type, email, phone, english_proficiency, is_employed, employer_name, occupation) VALUES
('e1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', 'Ahmad', 'Aldeek', '1979-03-15', 'male', 'head_of_household', 'ahmad.aldeek@email.com', '(207) 555-1001', 'intermediate', true, 'Hannaford', 'Grocery Stocker'),
('e1111111-1111-1111-1111-222222222222', 'd1111111-1111-1111-1111-111111111111', 'Fatima', 'Aldeek', '1982-07-22', 'female', 'spouse', NULL, '(207) 555-1002', 'basic', false, NULL, NULL),
('e1111111-1111-1111-1111-333333333333', 'd1111111-1111-1111-1111-111111111111', 'Omar', 'Aldeek', '2008-11-05', 'male', 'child', NULL, NULL, 'advanced', false, NULL, NULL);

-- Bozan Family
INSERT INTO beneficiaries (id, household_id, first_name, last_name, date_of_birth, gender, relationship_type, email, phone, english_proficiency, is_employed, employer_name, occupation) VALUES
('e2222222-2222-2222-2222-111111111111', 'd2222222-2222-2222-2222-222222222222', 'Youssef', 'Bozan', '1986-05-10', 'male', 'head_of_household', 'youssef.bozan@email.com', '(207) 555-2001', 'intermediate', true, 'Walmart Distribution', 'Warehouse Associate'),
('e2222222-2222-2222-2222-222222222222', 'd2222222-2222-2222-2222-222222222222', 'Layla', 'Bozan', '1989-09-18', 'female', 'spouse', NULL, '(207) 555-2002', 'basic', true, 'MaineGeneral Health', 'Housekeeping');

-- Posso Family
INSERT INTO beneficiaries (id, household_id, first_name, last_name, date_of_birth, gender, relationship_type, email, phone, english_proficiency, is_employed, employer_name, occupation) VALUES
('e3333333-3333-3333-3333-111111111111', 'd3333333-3333-3333-3333-333333333333', 'Carlos', 'Posso', '1992-01-25', 'male', 'head_of_household', 'carlos.posso@email.com', '(207) 555-3001', 'intermediate', true, 'Sappi Fine Paper', 'Production Worker'),
('e3333333-3333-3333-3333-222222222222', 'd3333333-3333-3333-3333-333333333333', 'Elena', 'Posso', '1994-04-12', 'female', 'spouse', NULL, '(207) 555-3002', 'basic', false, NULL, NULL),
('e3333333-3333-3333-3333-333333333333', 'd3333333-3333-3333-3333-333333333333', 'Sofia', 'Posso', '2019-08-30', 'female', 'child', NULL, NULL, 'basic', false, NULL, NULL);

-- Okonkwo Family (Bridge Program)
INSERT INTO beneficiaries (id, household_id, first_name, last_name, date_of_birth, gender, relationship_type, email, phone, english_proficiency, is_employed, employer_name, occupation) VALUES
('e4444444-4444-4444-4444-111111111111', 'd4444444-4444-4444-4444-444444444444', 'Chidi', 'Okonkwo', '1986-06-08', 'male', 'head_of_household', 'chidi.okonkwo@email.com', '(207) 555-4001', 'basic', true, 'Central Maine Motors', 'Lot Attendant'),
('e4444444-4444-4444-4444-222222222222', 'd4444444-4444-4444-4444-444444444444', 'Amara', 'Okonkwo', '1989-02-14', 'female', 'spouse', NULL, '(207) 555-4002', 'basic', false, NULL, NULL),
('e4444444-4444-4444-4444-333333333333', 'd4444444-4444-4444-4444-444444444444', 'Kemi', 'Okonkwo', '2012-10-20', 'female', 'child', NULL, NULL, 'intermediate', false, NULL, NULL),
('e4444444-4444-4444-4444-444444444444', 'd4444444-4444-4444-4444-444444444444', 'Tobi', 'Okonkwo', '2016-03-05', 'male', 'child', NULL, NULL, 'basic', false, NULL, NULL);

-- Nguyen Family
INSERT INTO beneficiaries (id, household_id, first_name, last_name, date_of_birth, gender, relationship_type, email, phone, english_proficiency, is_employed) VALUES
('e5555555-5555-5555-5555-111111111111', 'd5555555-5555-5555-5555-555555555555', 'Minh', 'Nguyen', '1980-12-03', 'male', 'head_of_household', 'minh.nguyen@email.com', '(207) 555-5001', 'intermediate', true),
('e5555555-5555-5555-5555-222222222222', 'd5555555-5555-5555-5555-555555555555', 'Linh', 'Nguyen', '1983-08-17', 'female', 'spouse', NULL, '(207) 555-5002', 'basic', false);

-- Hassan Family
INSERT INTO beneficiaries (id, household_id, first_name, last_name, date_of_birth, gender, relationship_type, email, phone, english_proficiency, is_employed) VALUES
('e6666666-6666-6666-6666-111111111111', 'd6666666-6666-6666-6666-666666666666', 'Abdi', 'Hassan', '1975-04-20', 'male', 'head_of_household', 'abdi.hassan@email.com', '(207) 555-6001', 'basic', true),
('e6666666-6666-6666-6666-222222222222', 'd6666666-6666-6666-6666-666666666666', 'Halima', 'Hassan', '1982-11-08', 'female', 'spouse', NULL, '(207) 555-6002', 'none', false);

-- ============================================
-- LEASES
-- ============================================

-- Aldeek Family - 18 Union Street Unit 1 (CANMP Direct, completed 2-year program)
INSERT INTO leases (id, household_id, unit_id, lease_type, status, start_date, end_date, monthly_rent, security_deposit, subsidy_amount, assigned_coordinator_id) VALUES
('f1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'canmp_direct', 'active', '2022-12-01', '2025-11-30', 1600.00, 1600.00, 0, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

-- Bozan Family - 12 Chapel Street (CANMP Direct, completed 2-year program)
INSERT INTO leases (id, household_id, unit_id, lease_type, status, start_date, end_date, monthly_rent, security_deposit, subsidy_amount, assigned_coordinator_id) VALUES
('f2222222-2222-2222-2222-222222222222', 'd2222222-2222-2222-2222-222222222222', 'c3333333-3333-3333-3333-111111111111', 'canmp_direct', 'active', '2022-10-15', '2025-10-14', 1800.00, 1800.00, 0, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

-- Posso Family - 37 Pearl Street (Master Sublease, completed 2-year program)
INSERT INTO leases (id, household_id, unit_id, lease_type, status, start_date, end_date, monthly_rent, security_deposit, subsidy_amount, assigned_coordinator_id) VALUES
('f3333333-3333-3333-3333-333333333333', 'd3333333-3333-3333-3333-333333333333', 'c4444444-4444-4444-4444-111111111111', 'master_sublease', 'active', '2022-11-01', '2025-10-31', 1200.00, 1200.00, 0, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

-- Okonkwo Family - 20 Union Street Unit 2 (Bridge Program, month 8 of 24)
INSERT INTO leases (id, household_id, unit_id, lease_type, status, start_date, end_date, monthly_rent, security_deposit, subsidy_amount, program_start_date, program_month, total_program_months, assigned_coordinator_id) VALUES
('f4444444-4444-4444-4444-444444444444', 'd4444444-4444-4444-4444-444444444444', 'c2222222-2222-2222-2222-222222222222', 'bridge', 'active', '2024-04-01', '2026-03-31', 1300.00, 1300.00, 400.00, '2024-04-01', 8, 24, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

-- ============================================
-- BRIDGE MILESTONES (for Okonkwo Family)
-- ============================================

INSERT INTO bridge_milestones (lease_id, title, is_completed, completed_date, sort_order) VALUES
('f4444444-4444-4444-4444-444444444444', 'Initial Orientation', true, '2024-04-05', 1),
('f4444444-4444-4444-4444-444444444444', 'Bank Account Opened', true, '2024-04-20', 2),
('f4444444-4444-4444-4444-444444444444', 'Employment Secured', true, '2024-06-15', 3),
('f4444444-4444-4444-4444-444444444444', 'Budgeting Workshop', true, '2024-07-10', 4),
('f4444444-4444-4444-4444-444444444444', 'Credit Building Started', true, '2024-08-01', 5),
('f4444444-4444-4444-4444-444444444444', 'Emergency Fund Started', false, NULL, 6),
('f4444444-4444-4444-4444-444444444444', 'Landlord Communication Training', false, NULL, 7),
('f4444444-4444-4444-4444-444444444444', 'Independent Lease Application', false, NULL, 8),
('f4444444-4444-4444-4444-444444444444', 'Successful Transition', false, NULL, 9);

-- ============================================
-- PAYMENTS (Recent months)
-- ============================================

-- Aldeek Family Payments
INSERT INTO payments (lease_id, payment_month, amount_due, amount_paid, status, due_date, paid_date) VALUES
('f1111111-1111-1111-1111-111111111111', '2024-12-01', 1600.00, 1600.00, 'paid', '2024-12-01', '2024-12-01'),
('f1111111-1111-1111-1111-111111111111', '2024-11-01', 1600.00, 1600.00, 'paid', '2024-11-01', '2024-11-01'),
('f1111111-1111-1111-1111-111111111111', '2024-10-01', 1600.00, 1600.00, 'paid', '2024-10-01', '2024-10-01');

-- Bozan Family Payments
INSERT INTO payments (lease_id, payment_month, amount_due, amount_paid, status, due_date, paid_date) VALUES
('f2222222-2222-2222-2222-222222222222', '2024-12-01', 1800.00, 1800.00, 'paid', '2024-12-01', '2024-12-01'),
('f2222222-2222-2222-2222-222222222222', '2024-11-01', 1800.00, 1800.00, 'paid', '2024-11-01', '2024-11-01'),
('f2222222-2222-2222-2222-222222222222', '2024-10-01', 1800.00, 1800.00, 'paid', '2024-10-01', '2024-10-01');

-- Posso Family Payments
INSERT INTO payments (lease_id, payment_month, amount_due, amount_paid, status, due_date, paid_date) VALUES
('f3333333-3333-3333-3333-333333333333', '2024-12-01', 1200.00, 1200.00, 'paid', '2024-12-01', '2024-12-01'),
('f3333333-3333-3333-3333-333333333333', '2024-11-01', 1200.00, 1200.00, 'paid', '2024-11-01', '2024-11-05'),
('f3333333-3333-3333-3333-333333333333', '2024-10-01', 1200.00, 1200.00, 'paid', '2024-10-01', '2024-10-01');

-- Okonkwo Family Payments (tenant pays $900, subsidy covers $400)
INSERT INTO payments (lease_id, payment_month, amount_due, amount_paid, status, due_date, paid_date) VALUES
('f4444444-4444-4444-4444-444444444444', '2024-12-01', 900.00, 900.00, 'paid', '2024-12-01', '2024-12-01'),
('f4444444-4444-4444-4444-444444444444', '2024-11-01', 900.00, 900.00, 'paid', '2024-11-01', '2024-11-01'),
('f4444444-4444-4444-4444-444444444444', '2024-10-01', 900.00, 900.00, 'paid', '2024-10-01', '2024-10-03');

-- ============================================
-- WORK ORDERS
-- ============================================

INSERT INTO work_orders (id, property_id, unit_id, household_id, title, description, category, priority, status, reported_by, reported_date, assigned_to, scheduled_date) VALUES
('ab111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111',
 'Leaking faucet in kitchen', 'Kitchen faucet has been dripping constantly. Getting worse over the past week.',
 'plumbing', 'medium', 'in_progress', 'Ahmad Aldeek', '2025-12-10', 'Jim Godbout Plumbing', '2025-12-14'),

('ab222222-2222-2222-2222-222222222222', 'a3333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-111111111111', 'd2222222-2222-2222-2222-222222222222',
 'Furnace not heating properly', 'Furnace running but not producing much heat. House is cold.',
 'hvac', 'urgent', 'open', 'Youssef Bozan', '2025-12-13', NULL, NULL),

('ab333333-3333-3333-3333-333333333333', 'a4444444-4444-4444-4444-444444444444', 'c4444444-4444-4444-4444-111111111111', 'd3333333-3333-3333-3333-333333333333',
 'Smoke detector batteries', 'Smoke detector chirping - needs new batteries.',
 'safety', 'low', 'open', 'Carlos Posso', '2025-12-08', NULL, NULL);

-- Completed work order
INSERT INTO work_orders (id, property_id, unit_id, household_id, title, description, category, priority, status, reported_by, reported_date, assigned_to, completed_date, resolution, cost) VALUES
('ab444444-4444-4444-4444-444444444444', 'a2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'd4444444-4444-4444-4444-444444444444',
 'Dishwasher not draining', 'Dishwasher fills with water but won''t drain at end of cycle.',
 'appliance', 'medium', 'completed', 'Amara Okonkwo', '2025-12-01', 'ABC Appliance', '2025-12-03',
 'Cleared clogged drain hose. Tested multiple cycles - draining normally.', 175.00);

-- ============================================
-- WORK ORDER COMMENTS
-- ============================================

INSERT INTO work_order_comments (work_order_id, user_id, content, created_at) VALUES
('ab111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Submitted work order. Will contact plumber.', '2025-12-10 10:00:00'),
('ab111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Scheduled with Jim Godbout Plumbing for Saturday 12/14.', '2025-12-11 14:30:00'),
('ab444444-4444-4444-4444-444444444444', NULL, 'Drain hose was clogged. Cleared and tested. Working properly now.', '2025-12-03 16:00:00');

-- ============================================
-- CASE NOTES
-- ============================================

INSERT INTO case_notes (household_id, author_id, content, category, created_at) VALUES
('d1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
 'Rent increased from $1,300 to $1,600 as family completed 2-year program period. Family is doing well and stable.',
 'housing', '2024-12-01 09:00:00'),

('d2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
 'Rent increased from $1,400 to $1,800 as family completed 2-year program period. Both adults employed.',
 'housing', '2024-12-01 09:30:00'),

('d3333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
 'Rent increased from $1,000 to $1,200 as family completed 2-year program period. Carlos stable at Sappi.',
 'housing', '2024-12-01 10:00:00'),

('d4444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
 'Family doing well. Chidi received a raise at work. Planning to start credit building workshop next month.',
 'general', '2024-11-15 14:00:00'),

('d4444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
 'Completed budgeting workshop. Amara interested in job training program.',
 'employment', '2024-07-10 11:00:00');

-- ============================================
-- TEACHERS
-- ============================================

INSERT INTO teachers (id, first_name, last_name, email, phone, is_volunteer, site_id, languages_taught) VALUES
('ac111111-1111-1111-1111-111111111111', 'Jennifer', 'Adams', 'jadams@canmp.org', '(207) 555-7001', false, '11111111-1111-1111-1111-111111111111', ARRAY['English']),
('ac222222-2222-2222-2222-222222222222', 'Robert', 'Kim', 'rkim@volunteer.org', '(207) 555-7002', true, '11111111-1111-1111-1111-111111111111', ARRAY['English', 'Korean']),
('ac333333-3333-3333-3333-333333333333', 'Linda', 'Garcia', 'lgarcia@canmp.org', '(207) 555-7003', false, '22222222-2222-2222-2222-222222222222', ARRAY['English', 'Spanish']);

-- ============================================
-- CLASS SECTIONS
-- ============================================

INSERT INTO class_sections (id, site_id, name, level, teacher_id, day_of_week, start_time, end_time, location, max_students, term_start, term_end) VALUES
('ad111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Tuesday Morning Basic', 'basic', 'ac111111-1111-1111-1111-111111111111', 2, '09:00', '11:00', 'Waterville Community Center', 12, '2024-09-01', '2025-06-30'),
('ad222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Thursday Evening Beginner', 'beginner', 'ac222222-2222-2222-2222-222222222222', 4, '18:00', '20:00', 'Waterville Public Library', 10, '2024-09-01', '2025-06-30'),
('ad333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Monday Intermediate', 'intermediate', 'ac333333-3333-3333-3333-333333333333', 1, '10:00', '12:00', 'Augusta Adult Ed Center', 15, '2024-09-01', '2025-06-30');

-- ============================================
-- CLASS ENROLLMENTS
-- ============================================

INSERT INTO class_enrollments (section_id, beneficiary_id, enrolled_date, status, needs_childcare) VALUES
('ad111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-222222222222', '2024-09-05', 'active', false), -- Fatima Aldeek
('ad111111-1111-1111-1111-111111111111', 'e4444444-4444-4444-4444-222222222222', '2024-09-05', 'active', true),  -- Amara Okonkwo
('ad222222-2222-2222-2222-222222222222', 'e3333333-3333-3333-3333-222222222222', '2024-09-10', 'active', true),  -- Elena Posso
('ad333333-3333-3333-3333-333333333333', 'e5555555-5555-5555-5555-222222222222', '2024-09-08', 'active', false); -- Linh Nguyen

-- ============================================
-- VOLUNTEERS
-- ============================================

INSERT INTO volunteers (id, first_name, last_name, email, phone, languages_spoken, skills, is_active, background_check_date, orientation_date) VALUES
('ae111111-1111-1111-1111-111111111111', 'Michael', 'Thompson', 'mthompson@email.com', '(207) 555-8001', ARRAY['English'], ARRAY['tutoring', 'transportation'], true, '2024-01-15', '2024-01-20'),
('ae222222-2222-2222-2222-222222222222', 'Susan', 'Lee', 'slee@email.com', '(207) 555-8002', ARRAY['English', 'Mandarin'], ARRAY['tutoring', 'job coaching'], true, '2024-02-10', '2024-02-15'),
('ae333333-3333-3333-3333-333333333333', 'David', 'Martinez', 'dmartinez@email.com', '(207) 555-8003', ARRAY['English', 'Spanish'], ARRAY['translation', 'mentoring'], true, '2024-03-05', '2024-03-10'),
('ae444444-4444-4444-4444-444444444444', 'Emily', 'Johnson', 'ejohnson@email.com', '(207) 555-8004', ARRAY['English'], ARRAY['childcare', 'event support'], true, '2024-04-01', '2024-04-05');

-- ============================================
-- MENTOR TEAMS
-- ============================================

INSERT INTO mentor_teams (id, name, household_id, assigned_date, is_active) VALUES
('af111111-1111-1111-1111-111111111111', 'Team Okonkwo', 'd4444444-4444-4444-4444-444444444444', '2024-04-15', true);

INSERT INTO mentor_team_members (team_id, volunteer_id, role, joined_date) VALUES
('af111111-1111-1111-1111-111111111111', 'ae111111-1111-1111-1111-111111111111', 'lead', '2024-04-15'),
('af111111-1111-1111-1111-111111111111', 'ae444444-4444-4444-4444-444444444444', 'member', '2024-04-15');

-- ============================================
-- VERIFY DATA
-- ============================================

-- Quick counts to verify seed data
DO $$
BEGIN
    RAISE NOTICE 'Seed data loaded successfully!';
    RAISE NOTICE 'Sites: %', (SELECT COUNT(*) FROM sites);
    RAISE NOTICE 'Users: %', (SELECT COUNT(*) FROM users);
    RAISE NOTICE 'Properties: %', (SELECT COUNT(*) FROM properties);
    RAISE NOTICE 'Units: %', (SELECT COUNT(*) FROM units);
    RAISE NOTICE 'Households: %', (SELECT COUNT(*) FROM households);
    RAISE NOTICE 'Beneficiaries: %', (SELECT COUNT(*) FROM beneficiaries);
    RAISE NOTICE 'Leases: %', (SELECT COUNT(*) FROM leases);
    RAISE NOTICE 'Work Orders: %', (SELECT COUNT(*) FROM work_orders);
    RAISE NOTICE 'Teachers: %', (SELECT COUNT(*) FROM teachers);
    RAISE NOTICE 'Class Sections: %', (SELECT COUNT(*) FROM class_sections);
    RAISE NOTICE 'Volunteers: %', (SELECT COUNT(*) FROM volunteers);
END $$;

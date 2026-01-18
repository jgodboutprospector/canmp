-- Migration: Add missing indexes for performance
-- Created: 2025-01-17
-- Description: Adds indexes on core tables

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Beneficiaries indexes
CREATE INDEX IF NOT EXISTS idx_beneficiaries_household_id ON beneficiaries(household_id);

-- Households indexes
CREATE INDEX IF NOT EXISTS idx_households_is_active ON households(is_active);

-- Case notes indexes
CREATE INDEX IF NOT EXISTS idx_case_notes_beneficiary_id ON case_notes(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_case_notes_household_id ON case_notes(household_id);

-- Leases indexes
CREATE INDEX IF NOT EXISTS idx_leases_household_id ON leases(household_id);
CREATE INDEX IF NOT EXISTS idx_leases_unit_id ON leases(unit_id);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_lease_id ON payments(lease_id);

-- Work orders indexes
CREATE INDEX IF NOT EXISTS idx_work_orders_property_id ON work_orders(property_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_unit_id ON work_orders(unit_id);

-- Properties indexes
CREATE INDEX IF NOT EXISTS idx_properties_site_id ON properties(site_id);

-- Units indexes
CREATE INDEX IF NOT EXISTS idx_units_property_id ON units(property_id);

-- Volunteers indexes
CREATE INDEX IF NOT EXISTS idx_volunteers_is_active ON volunteers(is_active);

-- Mentor teams indexes
CREATE INDEX IF NOT EXISTS idx_mentor_teams_household_id ON mentor_teams(household_id);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_record_id ON audit_log(record_id);

-- Bridge milestones indexes
CREATE INDEX IF NOT EXISTS idx_bridge_milestones_lease_id ON bridge_milestones(lease_id);

-- Migration: Drop unused indexes
-- Created: 2026-02-13
-- Description: Removes indexes with 0 index scans to reduce write overhead.
--   At 16 MB total database size, these indexes provide no measurable read benefit
--   but add overhead on every INSERT/UPDATE/DELETE.
--
-- Categories:
--   1. Duplicate indexes (same column indexed twice — drop the redundant copy)
--   2. Filter/status indexes on small tables (low-cardinality, never used by planner)
--   3. Unused FK indexes on empty/unused tables
--
-- NOT dropped:
--   - Primary key (_pkey) and unique constraint (_key) indexes (enforce integrity)
--   - Indexes with >0 scans (actively used by queries)
--   - FK indexes on core tables (keep for future growth)
--
-- All dropped indexes can be recreated with CREATE INDEX IF NOT EXISTS.

BEGIN;

-- ============================================================
-- 1. DUPLICATE INDEXES (same column indexed twice)
-- ============================================================

-- idx_units_property has 185 scans; idx_units_property_id has 0 — exact duplicate
DROP INDEX IF EXISTS idx_units_property_id;

-- Both unused, same column — keep idx_work_orders_property, drop _id variant
DROP INDEX IF EXISTS idx_work_orders_property_id;

-- Both unused, same column — keep idx_leases_household, drop _id variant
DROP INDEX IF EXISTS idx_leases_household_id;

-- Both unused, same column — keep idx_payments_lease, drop _id variant
DROP INDEX IF EXISTS idx_payments_lease_id;

-- Both unused, same column — keep idx_case_notes_household, drop _id variant
DROP INDEX IF EXISTS idx_case_notes_household_id;

-- Both unused, same column — keep idx_leases_unit, drop _id variant
DROP INDEX IF EXISTS idx_leases_unit_id;

-- idx_audit_log_table duplicates idx_audit_log_table_name — drop one
DROP INDEX IF EXISTS idx_audit_log_table;

-- ============================================================
-- 2. FILTER/STATUS INDEXES (low-cardinality, never used by query planner)
-- ============================================================

DROP INDEX IF EXISTS idx_payments_status;
DROP INDEX IF EXISTS idx_user_profiles_role;
DROP INDEX IF EXISTS idx_user_profiles_email;
DROP INDEX IF EXISTS idx_tasks_status;
DROP INDEX IF EXISTS idx_donation_items_status;
DROP INDEX IF EXISTS idx_donation_items_category;
DROP INDEX IF EXISTS idx_donation_photos_primary;
DROP INDEX IF EXISTS idx_beneficiaries_active;
DROP INDEX IF EXISTS idx_households_is_active;
DROP INDEX IF EXISTS idx_units_status;
DROP INDEX IF EXISTS idx_volunteers_is_active;
DROP INDEX IF EXISTS idx_work_orders_priority;
DROP INDEX IF EXISTS idx_class_sections_schedule_days;
DROP INDEX IF EXISTS idx_events_status;
DROP INDEX IF EXISTS idx_events_type;
DROP INDEX IF EXISTS idx_rent_ledger_month;
DROP INDEX IF EXISTS idx_training_programs_active;
DROP INDEX IF EXISTS idx_job_opportunities_active;
DROP INDEX IF EXISTS idx_workforce_participants_status;
DROP INDEX IF EXISTS idx_volunteer_requests_status;
DROP INDEX IF EXISTS idx_transportation_requests_status;
DROP INDEX IF EXISTS idx_users_email;

-- ============================================================
-- 3. UNUSED FK INDEXES ON EMPTY/LOW-USE TABLES
--    These tables have no data or minimal usage — re-add when needed.
-- ============================================================

-- Tasks table (all FK indexes have 0 scans)
DROP INDEX IF EXISTS idx_tasks_household;
DROP INDEX IF EXISTS idx_tasks_class;
DROP INDEX IF EXISTS idx_tasks_property;
DROP INDEX IF EXISTS idx_tasks_assignee;
DROP INDEX IF EXISTS idx_tasks_beneficiary;
DROP INDEX IF EXISTS idx_tasks_event;
DROP INDEX IF EXISTS idx_tasks_volunteer;
DROP INDEX IF EXISTS idx_tasks_created_by;
DROP INDEX IF EXISTS idx_tasks_due_date;

-- Volunteer hours (empty table)
DROP INDEX IF EXISTS idx_volunteer_hours_activity;
DROP INDEX IF EXISTS idx_volunteer_hours_event;
DROP INDEX IF EXISTS idx_volunteer_hours_volunteer;
DROP INDEX IF EXISTS idx_volunteer_hours_date;

-- Volunteer notes (empty table)
DROP INDEX IF EXISTS idx_volunteer_notes_volunteer;

-- Volunteer availability (empty table)
DROP INDEX IF EXISTS idx_volunteer_availability_volunteer;
DROP INDEX IF EXISTS idx_volunteer_availability_day;

-- Volunteer requests (0-scan FK indexes only — keeping idx_volunteer_requests_household which has 4 scans)
DROP INDEX IF EXISTS idx_volunteer_requests_beneficiary;
DROP INDEX IF EXISTS idx_volunteer_requests_assigned;
DROP INDEX IF EXISTS idx_volunteer_requests_date;
DROP INDEX IF EXISTS idx_volunteer_requests_type;
DROP INDEX IF EXISTS idx_volunteer_requests_mentor_team;

-- Event volunteers (empty table)
DROP INDEX IF EXISTS idx_event_volunteers_event;
DROP INDEX IF EXISTS idx_event_volunteers_volunteer;

-- Event attendees (empty table)
DROP INDEX IF EXISTS idx_event_attendees_event;
DROP INDEX IF EXISTS idx_event_attendees_beneficiary;

-- Events (keeping idx_events_date which has 3 scans)
DROP INDEX IF EXISTS idx_events_site;

-- Workforce (empty tables)
DROP INDEX IF EXISTS idx_workforce_participants_beneficiary;
DROP INDEX IF EXISTS idx_workforce_notes_participant;
DROP INDEX IF EXISTS idx_training_enrollments_participant;
DROP INDEX IF EXISTS idx_job_applications_participant;

-- Transportation requests (empty table)
DROP INDEX IF EXISTS idx_transportation_requests_beneficiary;
DROP INDEX IF EXISTS idx_transportation_requests_volunteer;
DROP INDEX IF EXISTS idx_transportation_requests_household;
DROP INDEX IF EXISTS idx_transportation_requests_mentor_team;
DROP INDEX IF EXISTS idx_transportation_requests_date;
DROP INDEX IF EXISTS idx_transportation_requests_created_at;

-- Task comments (empty table)
DROP INDEX IF EXISTS idx_task_comments_task;

-- Donation claims (keeping idx_donation_claims_household which has 4 scans)
DROP INDEX IF EXISTS idx_donation_claims_item;

-- Other unused FK indexes
DROP INDEX IF EXISTS idx_class_enrollments_beneficiary;
DROP INDEX IF EXISTS idx_households_coordinator;
DROP INDEX IF EXISTS idx_households_site;
DROP INDEX IF EXISTS idx_mentor_teams_household_id;
DROP INDEX IF EXISTS idx_case_workers_beneficiary;
DROP INDEX IF EXISTS idx_bridge_milestones_lease_id;
DROP INDEX IF EXISTS idx_beneficiaries_neon_id;
DROP INDEX IF EXISTS idx_properties_site_id;
DROP INDEX IF EXISTS idx_case_notes_beneficiary_id;

-- Audit log (very small, rarely queried)
DROP INDEX IF EXISTS idx_audit_log_table_name;
DROP INDEX IF EXISTS idx_audit_log_record_id;

COMMIT;

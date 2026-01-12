// ============================================
// CANMP Database Types
// Generated from Supabase schema
// ============================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// Enum types
export type UserRole = 'admin' | 'coordinator' | 'teacher' | 'board_member' | 'volunteer';
export type SiteLocation = 'waterville' | 'augusta';
export type PropertyType = 'canmp_owned' | 'master_lease';
export type UnitStatus = 'available' | 'occupied' | 'maintenance' | 'offline';
export type LeaseType = 'canmp_direct' | 'master_sublease' | 'bridge';
export type LeaseStatus = 'active' | 'completed' | 'terminated' | 'pending';
export type PaymentStatus = 'pending' | 'paid' | 'late' | 'partial' | 'waived';
export type WorkOrderCategory = 'plumbing' | 'hvac' | 'electrical' | 'appliance' | 'structural' | 'safety' | 'pest' | 'landscaping' | 'other';
export type WorkOrderPriority = 'urgent' | 'high' | 'medium' | 'low';
export type WorkOrderStatus = 'open' | 'scheduled' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
export type LanguageProficiency = 'none' | 'basic' | 'intermediate' | 'advanced' | 'fluent' | 'native';
export type ClassLevel = 'basic' | 'beginner' | 'intermediate' | 'lets_talk';
export type RelationshipType = 'head_of_household' | 'spouse' | 'child' | 'parent' | 'sibling' | 'other_relative' | 'other';
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';
export type CaseNoteVisibility = 'all_staff' | 'coordinators_only' | 'private';

// Donation types
export type DonationCategory =
  | 'furniture'
  | 'kitchen'
  | 'kitchenware'
  | 'bedding'
  | 'bathroom'
  | 'electronics'
  | 'clothing'
  | 'baby'
  | 'household'
  | 'linens'
  | 'rugs'
  | 'accessories'
  | 'toys'
  | 'other';

export type DonationStatus = 'available' | 'reserved' | 'claimed' | 'pending_pickup';

export type DonationCondition = 'new' | 'like_new' | 'gently_used' | 'used' | 'needs_repair';

// Database interface for Supabase client
export interface Database {
  public: {
    Tables: {
      sites: {
        Row: Site;
        Insert: Omit<Site, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Site, 'id'>>;
      };
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<User, 'id'>>;
      };
      households: {
        Row: Household;
        Insert: Omit<Household, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Household, 'id'>>;
      };
      beneficiaries: {
        Row: Beneficiary;
        Insert: Omit<Beneficiary, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Beneficiary, 'id'>>;
      };
      properties: {
        Row: Property;
        Insert: Omit<Property, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Property, 'id'>>;
      };
      units: {
        Row: Unit;
        Insert: Omit<Unit, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Unit, 'id'>>;
      };
      leases: {
        Row: Lease;
        Insert: Omit<Lease, 'id' | 'created_at' | 'updated_at' | 'tenant_pays'>;
        Update: Partial<Omit<Lease, 'id' | 'tenant_pays'>>;
      };
      payments: {
        Row: Payment;
        Insert: Omit<Payment, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Payment, 'id'>>;
      };
      work_orders: {
        Row: WorkOrder;
        Insert: Omit<WorkOrder, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<WorkOrder, 'id'>>;
      };
      case_notes: {
        Row: CaseNote;
        Insert: Omit<CaseNote, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<CaseNote, 'id'>>;
      };
      user_profiles: {
        Row: UserProfile;
        Insert: Omit<UserProfile, 'created_at' | 'updated_at'>;
        Update: Partial<UserProfile>;
      };
    };
  };
}

// ============================================
// Table Types
// ============================================

export interface Site {
  id: string;
  name: string;
  location: SiteLocation;
  address: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: UserRole;
  site_id: string | null;
  is_active: boolean;
  auth_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: UserRole;
  teacher_id: string | null;
  volunteer_id: string | null;
  avatar_url: string | null;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface Household {
  id: string;
  name: string;
  site_id: string | null;
  primary_language: string | null;
  secondary_language: string | null;
  country_of_origin: string | null;
  date_arrived_us: string | null;
  date_arrived_maine: string | null;
  assigned_coordinator_id: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Beneficiary {
  id: string;
  household_id: string | null;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: Gender | null;
  relationship_type: RelationshipType;
  email: string | null;
  phone: string | null;
  a_number_encrypted: string | null;
  ssn_encrypted: string | null;
  immigration_status: string | null;
  work_authorization_expiry: string | null;
  education_level: string | null;
  english_proficiency: LanguageProficiency;
  is_employed: boolean;
  employer_name: string | null;
  occupation: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  site_id: string | null;
  name: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string | null;
  property_type: PropertyType;
  landlord_name: string | null;
  landlord_phone: string | null;
  landlord_email: string | null;
  master_lease_start: string | null;
  master_lease_end: string | null;
  master_lease_rent: number | null;
  year_built: number | null;
  total_units: number;
  parking_spaces: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: string;
  property_id: string;
  unit_number: string;
  bedrooms: number;
  bathrooms: number;
  square_feet: number | null;
  floor_number: number | null;
  market_rent: number | null;
  program_rent: number | null;
  status: UnitStatus;
  amenities: Json;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lease {
  id: string;
  household_id: string | null;
  unit_id: string | null;
  lease_type: LeaseType;
  status: LeaseStatus;
  start_date: string;
  end_date: string | null;
  move_in_date: string | null;
  move_out_date: string | null;
  monthly_rent: number;
  security_deposit: number | null;
  subsidy_amount: number;
  tenant_pays: number;
  program_start_date: string | null;
  program_month: number;
  total_program_months: number;
  assigned_coordinator_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BridgeMilestone {
  id: string;
  lease_id: string;
  template_id: string | null;
  title: string;
  is_completed: boolean;
  completed_date: string | null;
  completed_by_id: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  lease_id: string;
  payment_month: string;
  amount_due: number;
  amount_paid: number;
  status: PaymentStatus;
  due_date: string | null;
  paid_date: string | null;
  payment_method: string | null;
  reference_number: string | null;
  received_by_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkOrder {
  id: string;
  property_id: string | null;
  unit_id: string | null;
  household_id: string | null;
  title: string;
  description: string | null;
  category: WorkOrderCategory;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  reported_by: string | null;
  reported_date: string;
  assigned_to: string | null;
  assigned_by_id: string | null;
  scheduled_date: string | null;
  scheduled_time_start: string | null;
  scheduled_time_end: string | null;
  completed_date: string | null;
  resolution: string | null;
  cost: number | null;
  invoice_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkOrderComment {
  id: string;
  work_order_id: string;
  user_id: string | null;
  author_name: string | null;
  content: string;
  is_internal: boolean;
  created_at: string;
}

export interface CaseNote {
  id: string;
  household_id: string;
  beneficiary_id: string | null;
  lease_id: string | null;
  author_id: string | null;
  content: string;
  visibility: CaseNoteVisibility;
  category: string | null;
  is_followup_required: boolean;
  followup_date: string | null;
  followup_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Teacher {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  is_volunteer: boolean;
  site_id: string | null;
  languages_taught: string[];
  certifications: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClassSection {
  id: string;
  site_id: string | null;
  name: string;
  level: ClassLevel;
  teacher_id: string | null;
  day_of_week: number | null;
  schedule_days: number[] | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  max_students: number;
  current_enrollment: number;
  term_start: string | null;
  term_end: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Volunteer {
  id: string;
  neon_id: string | null;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  languages_spoken: string[];
  skills: string[];
  availability_notes: string | null;
  is_active: boolean;
  background_check_date: string | null;
  orientation_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface DonationItem {
  id: string;
  name: string;
  description: string | null;
  category: DonationCategory;
  condition: string | null;
  quantity: number;
  status: DonationStatus;
  location: string | null;
  bin_number: string | null;
  donor_name: string | null;
  donor_phone: string | null;
  donor_email: string | null;
  donated_date: string | null;
  claimed_by_household_id: string | null;
  claimed_date: string | null;
  claimed_by_user_id: string | null;
  image_path: string | null;
  claim_count: number;
  most_recent_claim_date: string | null;
  shop_display_summary: string | null;
  suggested_next_action: string | null;
  airtable_id: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DonationPhoto {
  id: string;
  donation_item_id: string;
  s3_url: string;
  s3_key: string;
  original_filename: string | null;
  file_size: number | null;
  mime_type: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface DonationClaim {
  id: string;
  donation_item_id: string;
  household_id: string | null;
  claimed_by_name: string | null;
  claim_status: string;
  claim_date: string;
  approved_date: string | null;
  approved_by_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Extended Types (with relations)
// ============================================

export interface LeaseWithRelations extends Lease {
  household?: Household;
  unit?: Unit & { property?: Property };
  milestones?: BridgeMilestone[];
  payments?: Payment[];
  coordinator?: User;
}

export interface WorkOrderWithRelations extends WorkOrder {
  property?: Property;
  unit?: Unit;
  household?: Household;
  comments?: WorkOrderComment[];
}

export interface HouseholdWithRelations extends Household {
  beneficiaries?: Beneficiary[];
  leases?: Lease[];
  coordinator?: User;
  site?: Site;
}

export interface BeneficiaryWithRelations extends Beneficiary {
  household?: Household;
  languages?: { language: string; proficiency: LanguageProficiency; is_primary: boolean }[];
}

export interface DonationItemWithRelations extends DonationItem {
  photos?: DonationPhoto[];
  claims?: DonationClaim[];
  claimed_by_household?: Household;
}

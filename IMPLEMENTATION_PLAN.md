# Implementation Plan: Add/Edit Dialogs for All Pages

## Overview

This plan covers implementing dialog boxes for adding new data and viewing/editing existing data across all pages in the CANMP application.

## Existing Patterns (Will Follow)

Based on codebase analysis, we'll use these established patterns:

- **Modal Component**: Custom `Modal.tsx` wrapper with `isOpen`, `onClose`, `title`, `size` props
- **Form State**: Native React `useState` hooks (no react-hook-form)
- **Styling**: TailwindCSS with `cn()` utility for conditional classes
- **Icons**: `lucide-react`
- **Data Operations**: Direct Supabase client calls with try/catch
- **View/Edit Toggle**: `editing` state with `editForm` object
- **Tabs**: `activeTab` state for multi-section modals

---

## Phase 1: Beneficiaries Module

### 1.1 AddHouseholdModal
**File**: `src/components/modules/beneficiaries/AddHouseholdModal.tsx`

**Fields**:
- Household name (required)
- Country of origin (select dropdown)
- Primary language (select dropdown)
- Date arrived in Maine (date picker)
- Site assignment (select: Waterville/Augusta)

**Supabase Table**: `households`

### 1.2 HouseholdDetailModal
**File**: `src/components/modules/beneficiaries/HouseholdDetailModal.tsx`

**Tabs**: Overview | Members | Notes

**Features**:
- View/edit household info
- List beneficiary members with links
- Add/remove members
- Case notes section

### 1.3 AddIndividualModal
**File**: `src/components/modules/beneficiaries/AddIndividualModal.tsx`

**Fields**:
- First name, Last name (required)
- Date of birth
- Phone, Email
- English proficiency (select: none/basic/intermediate/advanced)
- Is employed (checkbox)
- Household assignment (select with search)
- Relationship type (head_of_household/spouse/child/other)

**Supabase Table**: `beneficiaries`

### 1.4 AddCaseNoteModal
**File**: `src/components/modules/beneficiaries/AddCaseNoteModal.tsx`

**Fields**:
- Content (textarea, required)
- Category (select: general/housing/employment/education/health/legal/financial)
- Visibility (select: all_staff/coordinators_only/private)
- Household (select, required)
- Beneficiary (select, optional)
- Follow-up required (checkbox)
- Follow-up date (conditional date picker)

**Supabase Table**: `case_notes`

---

## Phase 2: Housing Module

### 2.1 AddPropertyModal
**File**: `src/components/modules/housing/AddPropertyModal.tsx`

**Fields**:
- Property name (required)
- Street address
- City, State, Zip
- Property type (select: canmp_owned/master_lease)
- Total units
- Landlord name (conditional on type)

**Supabase Table**: `properties`

### 2.2 AddLeaseModal
**File**: `src/components/modules/housing/AddLeaseModal.tsx`

**Fields**:
- Lease type (select: canmp_direct/master_sublease/bridge)
- Household (select with search)
- Property → Unit (cascading selects)
- Monthly rent, Tenant pays, Subsidy amount
- Start date
- Program months (for bridge leases)
- Status (select: active/pending/terminated)

**Supabase Table**: `leases`

### 2.3 AddWorkOrderModal
**File**: `src/components/modules/housing/AddWorkOrderModal.tsx`

**Fields**:
- Issue title (required)
- Description (textarea)
- Category (select: plumbing/electrical/hvac/appliance/safety/other)
- Priority (select: low/medium/urgent)
- Property → Unit (cascading selects)
- Household (auto-fill from unit)
- Assigned to (select)
- Scheduled date (optional)

**Supabase Table**: `work_orders` (needs to be created or using mock data)

### 2.4 WorkOrderDetailModal
**File**: `src/components/modules/housing/WorkOrderDetailModal.tsx`

**Tabs**: Details | Updates | Documents

**Features**:
- View/edit work order info
- Status updates timeline
- Cost tracking
- Completion notes

---

## Phase 3: Events Module

### 3.1 AddEventModal
**File**: `src/components/modules/events/AddEventModal.tsx`

**Fields**:
- Event title (required)
- Description (textarea)
- Event type (select: class/workshop/community/orientation/meeting/celebration/other)
- Start date, Start time, End time
- Location
- Is virtual (checkbox)
- Virtual meeting link (conditional)
- Max attendees
- Requires registration (checkbox)
- Status (select: scheduled/in_progress/completed/cancelled)

**Supabase Table**: `events`

### 3.2 EventDetailModal
**File**: `src/components/modules/events/EventDetailModal.tsx`

**Tabs**: Details | Attendees | Volunteers

**Features**:
- View/edit event info
- Manage attendee list
- Check-in attendees
- Add/remove volunteers

---

## Phase 4: Language Program Module

### 4.1 AddClassModal
**File**: `src/components/modules/language/AddClassModal.tsx`

**Fields**:
- Class name (required)
- Level (select: basic/beginner/intermediate/lets_talk)
- Teacher (select from teachers)
- Day of week (select)
- Start time, End time
- Location
- Max students

**Supabase Table**: `class_sections`

### 4.2 ClassDetailModal
**File**: `src/components/modules/language/ClassDetailModal.tsx`

**Tabs**: Details | Enrollments | Attendance

**Features**:
- View/edit class info
- Enrolled students list
- Attendance history

### 4.3 AddTeacherModal
**File**: `src/components/modules/language/AddTeacherModal.tsx`

**Fields**:
- First name, Last name (required)
- Email, Phone
- Is volunteer (checkbox)
- Site (select)
- Languages taught (multi-select)

**Supabase Table**: `teachers`

### 4.4 AddEnrollmentModal
**File**: `src/components/modules/language/AddEnrollmentModal.tsx`

**Fields**:
- Student/Beneficiary (select with search)
- Class section (select)
- Enrollment date
- Status (select: active/completed/withdrawn)
- Needs transportation (checkbox)
- Needs childcare (checkbox)
- Pre-test score (optional)

**Supabase Table**: `class_enrollments`

---

## Phase 5: Mentors Module

### 5.1 AddVolunteerModal
**File**: `src/components/modules/mentors/AddVolunteerModal.tsx`

**Fields**:
- First name, Last name (required)
- Email, Phone
- Is active (checkbox)
- Languages spoken (multi-select)
- Skills (multi-select/tags)
- Background check date
- Orientation date

**Supabase Table**: `volunteers`

### 5.2 VolunteerDetailModal
**File**: `src/components/modules/mentors/VolunteerDetailModal.tsx`

**Tabs**: Profile | Teams | Notes

**Features**:
- View/edit volunteer info
- Teams they're assigned to
- Activity history

### 5.3 AddMentorTeamModal
**File**: `src/components/modules/mentors/AddMentorTeamModal.tsx`

**Fields**:
- Team name (required)
- Household (select)
- Lead volunteer (select)
- Team members (multi-select)
- Assigned date

**Supabase Table**: `mentor_teams`, `mentor_team_members`

### 5.4 MentorTeamDetailModal
**File**: `src/components/modules/mentors/MentorTeamDetailModal.tsx`

**Tabs**: Overview | Members | Activities

**Features**:
- View/edit team info
- Manage team membership
- Log activities/meetings

---

## Phase 6: Workforce Module

### 6.1 AddParticipantModal
**File**: `src/components/modules/workforce/AddParticipantModal.tsx`

**Fields**:
- Beneficiary (select with search, required)
- Target occupation
- Current employer
- Current job title
- Current hourly wage
- Preferred industries (multi-select)
- Preferred schedule
- Career summary (textarea)
- Strengths (tags)
- Areas for growth (tags)

**Supabase Table**: `workforce_participants`

---

## Phase 7: Donations Module

### 7.1 AddDonationItemModal
**File**: `src/components/modules/donations/AddDonationItemModal.tsx`

**Fields**:
- Item name (required)
- Description (textarea)
- Category (select: furniture/kitchen/bedding/bathroom/electronics/clothing/baby/household/other)
- Condition (select: new/like_new/good/fair)
- Quantity
- Location, Bin number
- Donor name
- Donor phone, Donor email (internal)
- Image upload (optional)

**Supabase Table**: `donation_items`

### 7.2 DonationItemDetailModal
**File**: `src/components/modules/donations/DonationItemDetailModal.tsx`

**Features**:
- View/edit item info
- Status management (available → reserved → claimed)
- Assign to household
- Photo gallery

---

## Implementation Order (Priority)

1. **Week 1**: Beneficiaries (Households, Individuals, Case Notes)
2. **Week 2**: Housing (Properties, Leases, Work Orders)
3. **Week 3**: Events + Language Program
4. **Week 4**: Mentors + Workforce + Donations

---

## Component Template Structure

Each "Add" modal will follow this structure:

```tsx
'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

interface AddXModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddXModal({ isOpen, onClose, onSuccess }: AddXModalProps) {
  const [form, setForm] = useState({
    // fields...
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.from('table_name').insert(form);
      if (error) throw error;
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add X" size="md">
      <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Form fields */}

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
```

---

## List Page Integration

Each list component needs to be updated to:

1. Add modal state: `const [showAddModal, setShowAddModal] = useState(false);`
2. Add detail modal state: `const [selectedId, setSelectedId] = useState<string | null>(null);`
3. Connect button: `onClick={() => setShowAddModal(true)}`
4. Connect row click: `onClick={() => setSelectedId(item.id)}`
5. Render modals at bottom of component
6. Pass `onSuccess` callback to refetch data

---

## Database Considerations

Some tables may need to be created or updated:
- `work_orders` - check if exists or using mock data
- Ensure all foreign key relationships are set up
- Add any missing columns for new fields

---

## Total New Files: ~20 modal components

**Add Modals (11)**:
- AddHouseholdModal
- AddIndividualModal (may extend existing BeneficiaryDetailModal)
- AddCaseNoteModal
- AddPropertyModal
- AddLeaseModal
- AddWorkOrderModal
- AddEventModal
- AddClassModal
- AddTeacherModal
- AddEnrollmentModal (may extend existing)
- AddVolunteerModal
- AddMentorTeamModal
- AddParticipantModal (may extend existing)
- AddDonationItemModal

**Detail Modals (7 new, 4 existing to enhance)**:
- HouseholdDetailModal (new)
- ClassDetailModal (new)
- VolunteerDetailModal (new)
- MentorTeamDetailModal (new)
- WorkOrderDetailModal (new)
- EventDetailModal (new)
- DonationItemDetailModal (new)
- PropertyDetailModal (enhance)
- LeaseDetailModal (enhance)
- EnrollmentDetailModal (enhance)
- ParticipantDetailModal (enhance)

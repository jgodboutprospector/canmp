# Beneficiaries Module - Full Implementation Plan

## Overview
This plan covers the complete implementation of the Beneficiaries module including:
- Households, Individuals, and Case Notes CRUD operations
- Data refresh verification
- User audit logging system
- Testing strategy
- Deployment

---

## Phase 1: Audit Log System (Foundation)

### 1.1 Database Schema - audit_logs table

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  action VARCHAR(50) NOT NULL,  -- 'create', 'update', 'delete', 'view'
  entity_type VARCHAR(50) NOT NULL,  -- 'household', 'beneficiary', 'case_note', etc.
  entity_id UUID NOT NULL,
  entity_name VARCHAR(255),  -- Human-readable name for reference
  old_values JSONB,  -- Previous state (for updates)
  new_values JSONB,  -- New state (for creates/updates)
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

### 1.2 Files to Create

1. **src/lib/audit.ts** - Audit logging utility
   - `logAudit(action, entityType, entityId, entityName, oldValues, newValues)`
   - Captures user context from session
   - Handles async logging without blocking UI

2. **src/lib/hooks/useAuditLogs.ts** - Hook for fetching audit history
   - `useAuditLogs(entityType?, entityId?)` - Get logs for specific entity
   - `useUserAuditLogs(userId)` - Get all logs for a user
   - Pagination support

3. **src/components/modules/admin/AuditLogViewer.tsx** - Admin UI component
   - Table view with filtering
   - Entity type filter
   - User filter
   - Date range filter
   - JSON diff viewer for changes

---

## Phase 2: Beneficiaries Module Components

### 2.1 Add Individual (Beneficiary) Modal

**File:** `src/components/modules/beneficiaries/AddBeneficiaryModal.tsx`

**Fields:**
- First name (required)
- Last name (required)
- Household selection (required) - Dropdown with search
- Relationship type (required) - head_of_household, spouse, child, parent, sibling, other
- Date of birth
- Gender - male, female, other, prefer_not_to_say
- Phone
- Email
- English proficiency - none, basic, conversational, fluent, native
- Education level
- Notes

**Features:**
- Auto-sets household from context if opened from household detail
- Validates unique household head constraint
- Logs to audit on success

### 2.2 Edit Beneficiary Modal

**Update:** `src/components/modules/beneficiaries/BeneficiaryDetailModal.tsx`

**Enhancements:**
- Add "Edit" button in header (currently only view mode exists)
- Enable household transfer (change household_id)
- Add "Deactivate" button with confirmation
- Show audit history in a new tab

### 2.3 Edit Case Note Modal

**File:** `src/components/modules/beneficiaries/EditCaseNoteModal.tsx`

**Features:**
- Pre-populate all fields from existing note
- Allow changing category, visibility, content
- Toggle follow-up status
- Mark follow-up as completed
- Delete note option (soft delete)
- Audit logging for all changes

### 2.4 Update Case Notes List

**Update:** `src/components/modules/beneficiaries/CaseNotesList.tsx`

**Enhancements:**
- Click note card to open EditCaseNoteModal
- Add "Mark Complete" quick action for pending follow-ups
- Show note author and last edited by
- Add "View History" option to see audit trail

---

## Phase 3: Data Refresh Verification

### 3.1 Components to Verify

| Component | Add Refresh | Edit Refresh | Delete Refresh |
|-----------|-------------|--------------|----------------|
| HouseholdsList | ✅ Implemented | ✅ Verify | ❌ Add |
| CaseNotesList | ✅ Implemented | ❌ Add | ❌ Add |
| Individuals page | ❌ Add | ✅ Verify | ❌ Add |
| HouseholdDetailModal (members) | ❌ Add | ✅ Verify | ❌ Add |
| HouseholdDetailModal (notes) | ✅ Implemented | ❌ Add | ❌ Add |

### 3.2 Refresh Pattern Implementation

Each hook should expose:
```typescript
return {
  data,
  loading,
  error,
  refetch,  // Manual refresh
  mutate    // Optimistic updates (optional)
};
```

Each modal should:
1. Call `onSuccess()` after successful operation
2. Parent component maps `onSuccess` to `refetch()`
3. Loading state shown during refetch

---

## Phase 4: Missing CRUD Operations

### 4.1 Household Operations

| Operation | Status | Implementation |
|-----------|--------|----------------|
| Create | ✅ Done | AddHouseholdModal |
| Read | ✅ Done | HouseholdsList, HouseholdDetailModal |
| Update | ✅ Done | HouseholdDetailModal inline edit |
| Delete | ❌ Missing | Add soft delete (is_active = false) |

**To Add:**
- "Deactivate Household" button in HouseholdDetailModal
- Confirmation modal with member count warning
- Cascade deactivate all beneficiaries (with option to transfer)

### 4.2 Beneficiary Operations

| Operation | Status | Implementation |
|-----------|--------|----------------|
| Create | ❌ Missing | AddBeneficiaryModal (new) |
| Read | ✅ Done | BeneficiaryDetailModal |
| Update | ✅ Partial | BeneficiaryDetailModal (enhance) |
| Delete | ❌ Missing | Add soft delete |

**To Add:**
- Wire "Add Individual" button on individuals page
- AddBeneficiaryModal component
- Delete/deactivate in BeneficiaryDetailModal

### 4.3 Case Note Operations

| Operation | Status | Implementation |
|-----------|--------|----------------|
| Create | ✅ Done | AddCaseNoteModal |
| Read | ✅ Done | CaseNotesList |
| Update | ❌ Missing | EditCaseNoteModal (new) |
| Delete | ❌ Missing | Soft delete option |

**To Add:**
- EditCaseNoteModal component
- Click to edit on note cards
- Delete with confirmation

---

## Phase 5: Testing Strategy

### 5.1 Unit Tests

**Location:** `src/__tests__/`

**Files to Create:**
```
src/__tests__/
  hooks/
    useHouseholds.test.ts
    useAuditLogs.test.ts
  components/
    beneficiaries/
      AddHouseholdModal.test.tsx
      AddBeneficiaryModal.test.tsx
      AddCaseNoteModal.test.tsx
      EditCaseNoteModal.test.tsx
      HouseholdDetailModal.test.tsx
      BeneficiaryDetailModal.test.tsx
  lib/
    audit.test.ts
```

**Test Coverage:**
- Form validation
- API calls mocked with MSW
- Success/error states
- Refresh callbacks triggered
- Audit logging called

### 5.2 Integration Tests

**Scenarios:**
1. Create household → Verify appears in list
2. Add beneficiary to household → Verify count updates
3. Edit household → Verify changes persist
4. Add case note → Verify appears in notes list
5. Edit case note → Verify changes visible
6. Deactivate household → Verify removed from active list

### 5.3 E2E Tests (Playwright)

**Location:** `e2e/beneficiaries.spec.ts`

**Test Flows:**
```typescript
test('complete household lifecycle', async ({ page }) => {
  // Create household
  // Add beneficiary
  // Add case note
  // Edit household
  // Edit beneficiary
  // Edit case note
  // Deactivate household
  // Verify in audit log
});
```

---

## Phase 6: Implementation Order

### Sprint 1: Foundation (Day 1-2)
1. Create audit_logs table migration
2. Implement audit.ts utility
3. Create useAuditLogs hook
4. Add AuditLogViewer component

### Sprint 2: Beneficiary CRUD (Day 3-4)
1. Create AddBeneficiaryModal
2. Wire "Add Individual" button
3. Enhance BeneficiaryDetailModal with edit mode
4. Add deactivate functionality

### Sprint 3: Case Notes CRUD (Day 5-6)
1. Create EditCaseNoteModal
2. Update CaseNotesList for click-to-edit
3. Add delete functionality
4. Add "Mark Complete" quick action

### Sprint 4: Refresh & Validation (Day 7)
1. Verify all refresh patterns
2. Fix any missing refetch calls
3. Add optimistic updates where beneficial

### Sprint 5: Testing (Day 8-9)
1. Write unit tests
2. Write integration tests
3. Write E2E tests
4. Fix any bugs found

### Sprint 6: Deploy (Day 10)
1. Run full test suite
2. Deploy to staging
3. Manual QA
4. Deploy to production
5. Monitor audit logs

---

## Phase 7: Files to Create/Modify

### New Files
```
src/lib/audit.ts
src/lib/hooks/useAuditLogs.ts
src/components/modules/beneficiaries/AddBeneficiaryModal.tsx
src/components/modules/beneficiaries/EditCaseNoteModal.tsx
src/components/modules/admin/AuditLogViewer.tsx
src/app/(app)/admin/audit/page.tsx
src/__tests__/... (multiple test files)
e2e/beneficiaries.spec.ts
supabase/migrations/YYYYMMDD_create_audit_logs.sql
```

### Files to Modify
```
src/components/modules/beneficiaries/BeneficiaryDetailModal.tsx
src/components/modules/beneficiaries/CaseNotesList.tsx
src/components/modules/beneficiaries/HouseholdDetailModal.tsx
src/components/modules/beneficiaries/HouseholdsList.tsx
src/app/(app)/beneficiaries/individuals/page.tsx
src/lib/hooks/useHouseholds.ts
```

---

## Audit Log Integration Points

Every create/update/delete operation should log:

```typescript
// Example: Creating a household
const { error } = await supabase.from('households').insert(data);
if (!error) {
  await logAudit('create', 'household', newId, data.name, null, data);
}

// Example: Updating a beneficiary
const { error } = await supabase.from('beneficiaries').update(data).eq('id', id);
if (!error) {
  await logAudit('update', 'beneficiary', id, `${data.first_name} ${data.last_name}`, oldData, data);
}

// Example: Soft delete
const { error } = await supabase.from('households').update({ is_active: false }).eq('id', id);
if (!error) {
  await logAudit('delete', 'household', id, household.name, { is_active: true }, { is_active: false });
}
```

---

## Success Criteria

1. **CRUD Operations:** All create, read, update, delete operations work for households, beneficiaries, and case notes
2. **Data Refresh:** All lists refresh immediately after any data change
3. **Audit Trail:** Every data change is logged with user, timestamp, and before/after values
4. **Test Coverage:** >80% coverage on new components
5. **Zero Regressions:** All existing functionality continues to work
6. **Deployment:** Successfully deployed to production with no errors

---

## Next Steps

1. Review and approve this plan
2. Create database migration for audit_logs
3. Begin Sprint 1 implementation

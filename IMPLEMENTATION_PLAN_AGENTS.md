# CANMP Improvement Implementation Plan

## Overview

This plan outlines the specific changes that 5 parallel Claude agents will make to improve the CANMP codebase. Each section details exactly what files will be created/modified, the changes being made, and why.

**Estimated Execution Time:** 45-60 minutes (parallel execution)

---

## Agent 1: Frontend Agent

### Objective
Create missing reusable UI components, standardize modal usage, and add accessibility attributes.

### Files to CREATE

#### 1.1 `src/components/ui/FormField.tsx`
```tsx
// Reusable form field wrapper with label, error, and hint support
// - Consistent label styling
// - Required field indicator
// - Error message display
// - Hint text support
// - Proper htmlFor/id association for accessibility
```

#### 1.2 `src/components/ui/Badge.tsx`
```tsx
// Status badge component with variants
// - Variants: success, warning, danger, info, default, purple
// - Consistent sizing and styling
// - Memoized for performance
```

#### 1.3 `src/components/ui/Alert.tsx`
```tsx
// Alert/notification component
// - Variants: error, warning, success, info
// - Optional title
// - Dismissible option
// - Icon support
```

#### 1.4 `src/components/ui/EmptyState.tsx`
```tsx
// Empty state placeholder component
// - Icon slot
// - Message text
// - Optional action button
// - Consistent styling across app
```

#### 1.5 `src/components/ui/LoadingSpinner.tsx`
```tsx
// Standardized loading indicator
// - Size variants: sm, md, lg
// - Optional loading message
// - Uses Lucide Loader2 icon
```

#### 1.6 `src/lib/constants/index.ts`
```tsx
// Centralized constants extracted from components
// - RELATIONSHIP_TYPES
// - GENDERS
// - ENGLISH_PROFICIENCY
// - EDUCATION_LEVELS
// - US_STATES
// - EVENT_TYPES
// - WORK_ORDER_PRIORITIES
// - LEASE_STATUSES
```

### Files to MODIFY

#### 1.7 `src/components/ui/Modal.tsx`
**Changes:**
- Add `role="dialog"` and `aria-modal="true"`
- Add `aria-labelledby` pointing to title
- Add `aria-label="Close dialog"` to close button
- Add `aria-hidden="true"` to backdrop
- Add keyboard trap (Escape to close)
- Add focus management (focus close button on open)
- Prevent body scroll when open

#### 1.8 `src/components/modules/tasks/AddTaskModal.tsx`
**Changes:**
- Refactor to use shared `Modal` component instead of custom implementation
- Reduces ~50 lines of duplicate modal code
- Ensures consistent modal behavior

#### 1.9 `src/components/layout/Header.tsx`
**Changes:**
- Add `aria-label` to search input
- Add `id` and `htmlFor` association
- Add screen-reader-only label

#### 1.10 `src/components/layout/Sidebar.tsx`
**Changes:**
- Move inline `style={{ fontFamily: 'DM Sans' }}` to Tailwind class
- Add `aria-current="page"` to active nav items
- Add `aria-label` to navigation

### Why These Changes?
- **Consistency**: Single source of truth for UI patterns
- **Accessibility**: WCAG 2.1 AA compliance
- **Maintainability**: DRY principle - fix bugs in one place
- **Performance**: Memoized components reduce re-renders

---

## Agent 2: Backend Agent

### Objective
Add authentication/authorization to all API routes, implement input validation, and fix security vulnerabilities.

### Files to CREATE

#### 2.1 `src/lib/auth-server.ts`
```typescript
// Server-side authentication utilities
// - getServerSession(): Get current session from cookies
// - requireAuth(): Throw if not authenticated
// - requireRole(roles[]): Throw if user doesn't have required role
// - secureCompare(): Timing-safe string comparison for API keys
```

#### 2.2 `src/lib/validation/schemas.ts`
```typescript
// Zod validation schemas for all API inputs
// - createUserSchema
// - createDonationSchema
// - createTaskSchema
// - importDonationsSchema
// - syncRequestSchema
// - Password strength requirements
// - Email validation
// - UUID validation
```

#### 2.3 `src/lib/api-error.ts`
```typescript
// Standardized API error handling
// - ApiError class with status code, message, code
// - handleApiError(): Consistent error response formatting
// - Sanitizes error messages (no implementation details leaked)
```

### Files to MODIFY

#### 2.4 `src/app/api/admin/users/route.ts`
**Changes:**
- Add `requireRole(['admin'])` check at start of POST/DELETE
- Add Zod validation for request body
- Add timing-safe comparison for any API key checks
- Add audit logging for user creation/deletion
- Implement strong password requirements

#### 2.5 `src/app/api/donations/route.ts`
**Changes:**
- Add `requireAuth()` check
- Add Zod validation for POST body
- Sanitize search parameter to prevent SQL injection
- Add proper error handling

#### 2.6 `src/app/api/donations/import/route.ts`
**Changes:**
- Replace simple `===` with `secureCompare()` for API key
- Add Zod validation for import data structure
- Add rate limiting consideration (comment for future)

#### 2.7 `src/app/api/donations/photos/route.ts`
**Changes:**
- Add `requireAuth()` check
- Validate file type and size
- Add audit logging

#### 2.8 `src/app/api/financial/aplos/route.ts`
**Changes:**
- Add `requireRole(['admin', 'coordinator', 'board_member'])` check
- Add proper error handling (don't expose API details)

#### 2.9 `src/app/api/financial/neon/route.ts`
**Changes:**
- Add `requireRole(['admin', 'coordinator', 'board_member'])` check
- Add proper error handling

#### 2.10 `src/app/api/financial/ramp/route.ts`
**Changes:**
- Add `requireRole(['admin', 'coordinator', 'board_member'])` check
- Add proper error handling

#### 2.11 `src/app/api/sync/neon/route.ts`
**Changes:**
- Replace simple `===` with `secureCompare()` for API key
- Add request logging for audit trail

#### 2.12 `src/app/api/tasks/route.ts`
**Changes:**
- Add `requireAuth()` check
- Add Zod validation for POST/PUT bodies
- Sanitize query parameters

#### 2.13 `src/app/api/tasks/options/route.ts`
**Changes:**
- Add `requireAuth()` check

### Files to CREATE (Database)

#### 2.14 `database/add-indexes.sql`
```sql
-- Missing indexes for performance
CREATE INDEX idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_beneficiaries_email ON beneficiaries(email) WHERE email IS NOT NULL;
CREATE INDEX idx_case_notes_author ON case_notes(author_id);
CREATE INDEX idx_case_notes_beneficiary ON case_notes(beneficiary_id);
CREATE INDEX idx_payments_month ON payments(payment_month);
CREATE INDEX idx_work_orders_scheduled ON work_orders(scheduled_date);
-- etc.
```

#### 2.15 `database/complete-rls-policies.sql`
```sql
-- Complete RLS policies for all tables
-- Users table policies
-- Payments table policies
-- Work orders table policies
-- Case notes visibility policies
-- etc.
```

### Why These Changes?
- **Security**: Prevent unauthorized access to sensitive data
- **Data Integrity**: Validate all inputs before processing
- **Compliance**: Audit trail for sensitive operations
- **Performance**: Indexes speed up common queries

---

## Agent 3: Tester Agent

### Objective
Create comprehensive test coverage for hooks, services, and critical components.

### Files to CREATE

#### 3.1 `src/__tests__/hooks/useLeases.test.ts`
```typescript
// Tests for useLeases hook
// - Initial loading state
// - Successful data fetch
// - Error handling
// - Refetch functionality
// - Data transformation
```

#### 3.2 `src/__tests__/hooks/useWorkOrders.test.ts`
```typescript
// Tests for useWorkOrders hook
// - Filter by property
// - Filter by status
// - Sort functionality
// - Create/update operations
```

#### 3.3 `src/__tests__/hooks/useHouseholds.test.ts`
```typescript
// Tests for useHouseholds hook
// - List all households
// - Filter by site
// - Include beneficiaries relation
// - Search functionality
```

#### 3.4 `src/__tests__/hooks/useEvents.test.ts`
```typescript
// Tests for useEvents hook
// - List events
// - Filter by date range
// - Filter by type
// - Attendance tracking
```

#### 3.5 `src/__tests__/hooks/useLanguageProgram.test.ts`
```typescript
// Tests for useLanguageProgram hook
// - Classes list
// - Teachers list
// - Enrollments
// - Attendance
```

#### 3.6 `src/__tests__/hooks/useMentorTeams.test.ts`
```typescript
// Tests for useMentorTeams hook
// - Teams list
// - Volunteers list
// - Assignments
```

#### 3.7 `src/__tests__/hooks/useTasksData.test.ts`
```typescript
// Tests for useTasksData hook
// - Tasks by status
// - Filter by assignee
// - Create task
// - Update task status
```

#### 3.8 `src/__tests__/hooks/useDonations.test.ts`
```typescript
// Tests for useDonations hook
// - List donations
// - Filter by category
// - Filter by date range
// - Create donation
```

#### 3.9 `src/__tests__/hooks/useAuditLogs.test.ts`
```typescript
// Tests for useAuditLogs hook
// - List logs
// - Filter by table
// - Filter by user
// - Date range filtering
```

#### 3.10 `src/__tests__/services/neon.test.ts`
```typescript
// Tests for Neon CRM service
// - Authentication flow
// - Session management
// - getDonors()
// - getDonations()
// - Error handling
// - Rate limit handling
```

#### 3.11 `src/__tests__/services/aplos.test.ts`
```typescript
// Tests for Aplos service
// - Token encryption/decryption
// - Authentication flow
// - getFunds()
// - getTransactions()
// - getTrialBalance()
// - Error handling
```

#### 3.12 `src/__tests__/services/ramp.test.ts`
```typescript
// Tests for Ramp service
// - OAuth flow
// - Token refresh
// - getCards()
// - getTransactions()
// - Error handling
```

#### 3.13 `src/__tests__/services/s3.test.ts`
```typescript
// Tests for S3 service
// - File validation
// - Upload flow
// - Signed URL generation
// - Delete operation
// - Error handling
```

#### 3.14 `src/__tests__/components/ui/Modal.test.tsx`
```typescript
// Tests for Modal component
// - Renders when open
// - Hidden when closed
// - Calls onClose on backdrop click
// - Calls onClose on Escape key
// - Focus management
// - Accessibility attributes
```

#### 3.15 `src/__tests__/components/ui/FormField.test.tsx`
```typescript
// Tests for FormField component
// - Renders label
// - Shows required indicator
// - Shows error message
// - Shows hint text
// - Associates label with input
```

#### 3.16 `src/__tests__/providers/AuthProvider.test.tsx`
```typescript
// Tests for AuthProvider
// - Initial loading state
// - Successful authentication
// - Failed authentication
// - Logout flow
// - Permission checking
```

### Why These Changes?
- **Coverage**: From ~35% to ~65% coverage
- **Regression Prevention**: Catch bugs before production
- **Documentation**: Tests document expected behavior
- **Refactoring Safety**: Enables confident code changes

---

## Agent 4: Deployment Agent

### Objective
Harden deployment configuration for security and reliability.

### Files to MODIFY

#### 4.1 `Dockerfile`
**Changes:**
- Add HEALTHCHECK directive
- Add non-root user to build stages
- Add security comment about CVE reversion
- Make PORT/HOSTNAME configurable

```dockerfile
# Add after EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1
```

#### 4.2 `docker-compose.yml`
**Changes:**
- Remove deprecated `version: '3.8'`
- Add resource limits (CPU/memory)
- Add logging configuration with rotation
- Add healthcheck configuration
- Add network isolation

```yaml
services:
  canmp:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

#### 4.3 `nginx.conf`
**Changes:**
- Add Content-Security-Policy header
- Add Referrer-Policy header
- Add Permissions-Policy header
- Upgrade to TLS 1.3 (keep 1.2 for compatibility)
- Add SSL session caching
- Add gzip compression
- Add static asset caching for `/_next/static/`
- Add `client_max_body_size 10M`
- Block access to hidden files (`.env`, `.git`)
- Enhanced rate limiting for login endpoints

### Files to CREATE

#### 4.4 `src/app/api/health/route.ts`
```typescript
// Health check endpoint for Docker/monitoring
// - Returns 200 if healthy
// - Checks database connectivity
// - Returns memory/uptime stats
// - Returns 503 if unhealthy
```

#### 4.5 `.github/dependabot.yml`
```yaml
# Automated dependency updates
# - npm packages weekly
# - Docker images weekly
# - GitHub Actions weekly
```

#### 4.6 `.github/workflows/security-scan.yml`
```yaml
# Security scanning workflow
# - CodeQL analysis
# - npm audit
# - Runs on push and weekly schedule
```

#### 4.7 `DISASTER_RECOVERY.md`
```markdown
# Disaster Recovery Plan
# - RTO: 2 hours
# - RPO: 24 hours
# - EC2 instance failure recovery steps
# - Database corruption recovery steps
# - Backup restoration procedures
```

### Files to MODIFY

#### 4.8 `.github/workflows/deploy-ec2.yml`
**Changes:**
- Add proper SSH host key verification (remove StrictHostKeyChecking=no)
- Add SSH key cleanup step
- Add deployment notification (commented, needs Slack webhook)
- Add test coverage enforcement (commented, optional)
- Add rollback instructions in comments

### Why These Changes?
- **Security**: Proper TLS, security headers, blocked sensitive paths
- **Reliability**: Health checks, resource limits, log rotation
- **Observability**: Structured logging, monitoring endpoints
- **Maintainability**: Automated dependency updates, security scanning

---

## Agent 5: Integration Agent

### Objective
Improve reliability and security of external API integrations.

### Files to MODIFY

#### 5.1 `src/lib/services/aplos.ts`
**Changes:**
- Add `AbortSignal.timeout(30000)` to all fetch calls
- Add retry logic with exponential backoff (3 retries)
- Sanitize error messages (no token/key exposure)
- Add structured logging (commented, needs logger)
- Fix token caching race condition with promise deduplication

```typescript
// Example timeout addition
const response = await fetch(url, {
  ...options,
  signal: AbortSignal.timeout(30000),
});
```

#### 5.2 `src/lib/services/neon.ts`
**Changes:**
- Add request timeouts
- Remove debug console.log statements (or guard with NODE_ENV)
- Add retry logic
- Sanitize error messages
- Fix session management race condition

#### 5.3 `src/lib/services/ramp.ts`
**Changes:**
- Add request timeouts
- Add retry logic
- Add response validation comments (Zod schema example)
- Sanitize error messages

#### 5.4 `src/lib/services/s3.ts`
**Changes:**
- **CRITICAL**: Remove `ACL: 'public-read'` from PutObjectCommand
- Add `getSignedDownloadUrl()` function for secure access
- Update `getPublicUrl()` to use signed URLs
- Add retry configuration to S3Client
- Add file size validation for migrations

#### 5.5 `src/lib/services/neoncrm.ts`
**Changes:**
- Add batch processing for sync (process N records at a time)
- Add memory-safe pagination (don't load all pages into memory)
- Add sync deduplication check
- Add transaction-like behavior (collect errors, report at end)

### Files to CREATE

#### 5.6 `src/lib/api-utils.ts`
```typescript
// Shared utilities for API calls
// - fetchWithTimeout(): Fetch with configurable timeout
// - fetchWithRetry(): Fetch with exponential backoff
// - sanitizeError(): Remove sensitive data from errors
// - CircuitBreaker class (basic implementation)
```

### Why These Changes?
- **Reliability**: Timeouts prevent hangs, retries handle transient failures
- **Security**: No public S3 access, no sensitive data in logs
- **Performance**: Memory-safe sync operations
- **Observability**: Better error context for debugging

---

## Execution Order

### Wave 1: Parallel Execution (~45 minutes)

All 5 agents run simultaneously:

```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Frontend Agent  │ │ Backend Agent   │ │ Tester Agent    │
│                 │ │                 │ │                 │
│ • 6 new files   │ │ • 3 new files   │ │ • 16 new files  │
│ • 4 modified    │ │ • 12 modified   │ │                 │
│                 │ │ • 2 SQL files   │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘

┌─────────────────┐ ┌─────────────────┐
│ Deployment Agent│ │Integration Agent│
│                 │ │                 │
│ • 4 new files   │ │ • 1 new file    │
│ • 4 modified    │ │ • 5 modified    │
└─────────────────┘ └─────────────────┘
```

### Wave 2: Verification (~10 minutes)

After all agents complete:
1. Run `npm run lint` to check for errors
2. Run `npm test` to verify tests pass
3. Run `npm run build` to ensure build succeeds

### Wave 3: Human Review Required

Items that need manual intervention:
- [ ] Review and apply `database/add-indexes.sql` to Supabase
- [ ] Review and apply `database/complete-rls-policies.sql` to Supabase
- [ ] Set up AWS SSM Parameter Store for secrets (optional, recommended)
- [ ] Configure GitHub environment protection rules
- [ ] Set up external monitoring (UptimeRobot, Sentry)

---

## Summary of Changes

| Category | New Files | Modified Files | Lines Changed (Est.) |
|----------|-----------|----------------|---------------------|
| Frontend | 6 | 4 | ~600 |
| Backend | 5 | 10 | ~800 |
| Testing | 16 | 0 | ~2,000 |
| Deployment | 4 | 4 | ~400 |
| Integration | 1 | 5 | ~300 |
| **Total** | **32** | **23** | **~4,100** |

---

## Risk Assessment

### Low Risk Changes
- Creating new UI components (additive)
- Creating new test files (additive)
- Adding health check endpoint (additive)
- Adding security headers to nginx (config only)

### Medium Risk Changes
- Modifying Modal.tsx (existing component)
- Adding auth to API routes (may break unauthenticated access)
- Modifying S3 service (changes file access pattern)

### Mitigation
- All changes are code-level (no database schema changes in Wave 1)
- Tests verify existing functionality still works
- Changes can be reverted via git if issues found

---

## Approval Checklist

Please review and approve:

- [ ] **Frontend Agent** scope and files
- [ ] **Backend Agent** scope and files (includes auth changes)
- [ ] **Tester Agent** scope and files
- [ ] **Deployment Agent** scope and files
- [ ] **Integration Agent** scope and files (includes S3 ACL removal)

### Questions Before Proceeding

1. **S3 Access**: Removing public ACL means existing image URLs may break. Should we:
   - (A) Update to use signed URLs (breaking change, more secure)
   - (B) Keep public ACL but add as comment for future (no breaking change)

2. **API Auth**: Adding auth to all routes means unauthenticated requests will fail. Confirm:
   - (A) Yes, all routes should require authentication
   - (B) Some routes should remain public (specify which)

3. **Database Changes**: The SQL files will be created but NOT executed. Confirm:
   - (A) Create SQL files only, I'll apply manually
   - (B) Skip database changes entirely for now

---

## Ready to Execute

Once you approve this plan, I will launch all 5 agents in parallel. You'll see progress as each agent completes its tasks.

**Estimated completion time: 45-60 minutes**

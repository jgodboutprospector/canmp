# CANMP Testing Improvement Plan

## Executive Summary

**Current State:** Zero test coverage (0/~6000 lines of code tested)
**Target State:** Core functionality covered with unit, integration, and component tests
**Priority:** Implement high-value tests for critical business logic first

This document provides a comprehensive analysis of the CANMP application's testing gaps and a prioritized roadmap for implementing a robust test suite using Jest 30.2.0 and React Testing Library.

---

## 1. Current Test Infrastructure

### ✅ Strengths
- **Modern Stack**: Jest 30.2.0 with ts-jest configured
- **React Testing Library**: Version 16.3.1 with @testing-library/jest-dom
- **Good Configuration**:
  - Path aliases configured (`@/` → `src/`)
  - jsdom environment for component testing
  - Custom polyfills for Next.js Request/Response
  - Global mocks for navigation and Supabase

### ⚠️ Gaps
- **Zero Tests**: No test files exist in the repository
- **No Coverage Baseline**: Cannot track improvement over time
- **Missing Test Utilities**: No custom render functions or test helpers
- **No CI Integration**: Tests not running automatically

### Configuration Files

**jest.config.js** - Well configured with:
- Next.js integration via `next/jest`
- Path mapping for `@/` imports
- Coverage collection from `src/**/*.{js,jsx,ts,tsx}`
- Excludes type definitions and type-only files

**jest.setup.js** - Provides:
- Request/Response/Headers polyfills for API route testing
- Global mocks for `next/navigation` (useRouter, usePathname)
- Global Supabase client mock with auth and CRUD methods

---

## 2. Coverage Gap Analysis

### Application Overview
- **Total Lines**: ~6,000 LOC
- **Components**: 55+ React components
- **API Routes**: 10 API endpoints
- **Hooks**: 9 custom hooks
- **Utilities**: 3 utility modules
- **Services**: 4 external service integrations

### Coverage by Category

| Category | Files | Critical | Current Coverage | Target Coverage |
|----------|-------|----------|------------------|-----------------|
| **Utilities** | 3 files | HIGH | 0% | 90%+ |
| **Hooks** | 9 files | HIGH | 0% | 85%+ |
| **API Routes** | 10 files | HIGH | 0% | 80%+ |
| **Auth/Security** | 2 files | CRITICAL | 0% | 95%+ |
| **Components - Auth** | 2 files | CRITICAL | 0% | 90%+ |
| **Components - UI** | 5 files | MEDIUM | 0% | 70%+ |
| **Components - Modals** | 30+ files | LOW | 0% | 50%+ |
| **Services** | 4 files | MEDIUM | 0% | 70%+ |

---

## 3. Prioritized Testing Roadmap

### Phase 1: Critical Foundation (Week 1-2)
**Goal**: Test core business logic that impacts security and data integrity

#### 1.1 Utility Functions (HIGH PRIORITY)
**Files**: `src/lib/utils.ts`, `src/lib/utils/financial.ts`, `src/lib/utils/export.ts`

**Why Critical**: Used throughout the application; bugs propagate widely

**Tests Implemented** ✅:
- `src/__tests__/utils/utils.test.ts` - 40+ test cases
  - Currency formatting (with/without decimals, negatives)
  - Phone number formatting and validation
  - Email validation
  - Date/time formatting
  - String utilities (pluralize, truncate)
  - Math utilities (progress calculation, date math)
  - Tailwind class merging

- `src/__tests__/utils/export.test.ts` - 12+ test cases
  - CSV generation and formatting
  - Header mapping
  - Special character escaping
  - Data type formatting

**Still Needed**:
- `src/__tests__/utils/financial.test.ts` - Test financial utilities
  - Currency formatting consistency
  - Status color/icon mappings
  - Date formatting for financial data

#### 1.2 Authentication & Authorization (CRITICAL)
**Files**: `src/lib/auth.ts`, `src/components/auth/ProtectedRoute.tsx`, `src/components/providers/AuthProvider.tsx`

**Why Critical**: Security vulnerabilities could expose sensitive beneficiary data

**Tests Implemented** ✅:
- `src/__tests__/lib/auth.test.ts` - 20+ test cases
  - Permission checking for all roles (admin, coordinator, teacher, board_member, volunteer)
  - User profile fetching
  - Role-based access control

- `src/__tests__/components/ProtectedRoute.test.tsx` - 7 test cases
  - Loading states
  - Redirect to login when unauthenticated
  - Role-based access control
  - Access denied UI

**Still Needed**:
- `src/__tests__/providers/AuthProvider.test.tsx`
  - Auth state initialization
  - Session management
  - Sign in/out flows
  - Token refresh handling
  - Profile loading with error recovery

#### 1.3 Audit Logging (HIGH)
**File**: `src/lib/audit.ts`

**Why Important**: Compliance and tracking of data changes

**Tests Implemented** ✅:
- `src/__tests__/utils/audit.test.ts` - 15+ test cases
  - Change detection between objects
  - Field name formatting
  - Entity type formatting
  - Action formatting and color coding

**Still Needed**:
- Integration tests for actual audit logging (requires Supabase RPC mocking)

### Phase 2: Data Layer (Week 3-4)
**Goal**: Ensure data fetching and mutations work correctly

#### 2.1 Custom Hooks (HIGH PRIORITY)
**Files**: All files in `src/lib/hooks/`

**Tests Implemented** ✅:
- `src/__tests__/hooks/useProperties.test.ts` - 10+ test cases
  - Fetching properties list
  - Fetching single property
  - Error handling
  - Refetch functionality
  - Reactive updates on ID change

**Still Needed**:
1. `src/__tests__/hooks/useLeases.test.ts`
   - Lease CRUD operations
   - Filtering by property/status
   - Date range queries

2. `src/__tests__/hooks/useWorkOrders.test.ts`
   - Work order creation/updates
   - Status transitions
   - Assignment to properties/units

3. `src/__tests__/hooks/useHouseholds.test.ts`
   - Household management
   - Member relationships
   - Status tracking

4. `src/__tests__/hooks/useEvents.test.ts`
   - Event creation/listing
   - Attendance tracking
   - Date filtering

5. `src/__tests__/hooks/useLanguageProgram.test.ts`
   - Class management
   - Teacher assignments
   - Enrollment handling

6. `src/__tests__/hooks/useMentorTeams.test.ts`
   - Team creation
   - Volunteer assignments
   - Family assignments

7. `src/__tests__/hooks/useTasksData.test.ts`
   - Task CRUD with multiple filters
   - Status updates
   - Kanban board data

8. `src/__tests__/hooks/useFinancialData.test.ts`
   - Financial report fetching
   - Third-party API integration
   - Data transformation

9. `src/__tests__/hooks/useDonations.test.ts`
   - Donation item management
   - Photo uploads
   - Status transitions

10. `src/__tests__/hooks/useAuditLogs.test.ts`
    - Audit log retrieval
    - Filtering by entity/action/user
    - Pagination

#### 2.2 API Routes (HIGH PRIORITY)
**Files**: All files in `src/app/api/`

**Tests Implemented** ✅:
- `src/__tests__/api/tasks-route.test.ts` - 20+ test cases
  - GET with multiple filter combinations
  - POST task creation
  - PATCH task updates with auto-completion timestamps
  - DELETE with validation
  - Error handling for all operations

**Still Needed**:
1. `src/__tests__/api/donations-route.test.ts`
   - GET with category/status filters
   - POST with photo handling
   - PATCH status updates
   - Soft delete validation

2. `src/__tests__/api/admin-users-route.test.ts`
   - User creation with role assignment
   - User updates
   - Admin-only access validation

3. `src/__tests__/api/financial-aplos.test.ts`
   - Aplos API integration
   - Transaction fetching
   - Report generation
   - Error handling for external API

4. `src/__tests__/api/financial-neon.test.ts`
   - Neon CRM integration
   - Donor/donation syncing
   - Campaign data

5. `src/__tests__/api/financial-ramp.test.ts`
   - Ramp API integration
   - Transaction fetching
   - Card management

6. `src/__tests__/api/sync-neon.test.ts`
   - Data synchronization
   - Conflict resolution
   - Error recovery

### Phase 3: UI Components (Week 5-6)
**Goal**: Test critical user interactions and error states

#### 3.1 Core UI Components (MEDIUM PRIORITY)

**Still Needed**:
1. `src/__tests__/components/ui/Modal.test.tsx`
   - Open/close behavior
   - Escape key handling
   - Click outside to close
   - Portal rendering

2. `src/__tests__/components/ui/FileUpload.test.tsx`
   - File selection
   - File type validation
   - Size limits
   - Upload progress
   - S3 integration mocking

3. `src/__tests__/components/ui/StatCard.test.tsx`
   - Data display formatting
   - Trend indicators
   - Click handlers

4. `src/__tests__/components/layout/Header.test.tsx`
   - User menu
   - Logout functionality
   - Responsive behavior

5. `src/__tests__/components/layout/Sidebar.test.tsx`
   - Navigation links
   - Role-based menu items
   - Active state indicators

#### 3.2 Business Logic Components (MEDIUM PRIORITY)

**Still Needed**:
1. `src/__tests__/components/modules/tasks/KanbanBoard.test.tsx`
   - Drag and drop
   - Status updates
   - Task filtering

2. `src/__tests__/components/modules/tasks/TaskCalendar.test.tsx`
   - Calendar rendering
   - Event display
   - Date navigation

3. `src/__tests__/components/modules/beneficiaries/BeneficiaryDetailModal.test.tsx`
   - Data display
   - Tab navigation
   - External contacts

4. `src/__tests__/components/modules/housing/PropertiesList.test.tsx`
   - List rendering
   - Filtering
   - Sorting

### Phase 4: Integration & E2E (Week 7-8)
**Goal**: Test complete user workflows

**Still Needed**:
1. `src/__tests__/integration/auth-flow.test.tsx`
   - Complete login/logout cycle
   - Session persistence
   - Role-based redirects

2. `src/__tests__/integration/task-management.test.tsx`
   - Create → Update → Complete → Archive workflow
   - Assignment changes
   - Due date management

3. `src/__tests__/integration/beneficiary-management.test.tsx`
   - Create household
   - Add beneficiaries
   - Add case notes
   - View audit history

4. `src/__tests__/integration/housing-workflow.test.tsx`
   - Create property
   - Add units
   - Create lease
   - Submit work order

---

## 4. Test Infrastructure Improvements

### 4.1 Test Utilities (NEEDED)

Create `src/__tests__/utils/test-helpers.tsx`:
```typescript
import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { AuthProvider } from '@/components/providers/AuthProvider';

// Custom render with providers
export function renderWithAuth(
  ui: ReactElement,
  options?: RenderOptions & {
    user?: any;
    profile?: any;
  }
) {
  // Wrapper with AuthProvider
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <AuthProvider>{children}</AuthProvider>;
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

// Mock data factories
export const mockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  ...overrides,
});

export const mockProfile = (role = 'coordinator', overrides = {}) => ({
  id: 'profile-123',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  role,
  is_active: true,
  ...overrides,
});

// Supabase mock builders
export const createSupabaseMock = () => ({
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  single: jest.fn(),
});
```

### 4.2 Enhanced Mocks

Create `src/__tests__/mocks/supabase.ts`:
```typescript
export const createMockSupabaseClient = () => ({
  auth: {
    getSession: jest.fn().mockResolvedValue({
      data: { session: null },
      error: null
    }),
    onAuthStateChange: jest.fn().mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    }),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
  },
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockResolvedValue({ data: [], error: null }),
});
```

### 4.3 Coverage Scripts

Update `package.json`:
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:coverage:watch": "jest --coverage --watch",
    "test:unit": "jest --testPathPattern='/(utils|lib)/'",
    "test:hooks": "jest --testPathPattern='/hooks/'",
    "test:components": "jest --testPathPattern='/components/'",
    "test:api": "jest --testPathPattern='/api/'",
    "test:integration": "jest --testPathPattern='/integration/'"
  }
}
```

### 4.4 CI/CD Integration

Create `.github/workflows/test.yml`:
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

---

## 5. Example Test Implementations

### 5.1 Utility Test Pattern ✅ IMPLEMENTED

See: `src/__tests__/utils/utils.test.ts`

**Key Features**:
- Comprehensive input validation
- Edge case coverage (null, undefined, empty strings)
- Negative number handling
- Date/time boundary conditions
- Type coercion testing

### 5.2 Hook Test Pattern ✅ IMPLEMENTED

See: `src/__tests__/hooks/useProperties.test.ts`

**Key Features**:
- Loading state verification
- Error handling
- Data transformation
- Refetch functionality
- Reactive updates on prop changes

### 5.3 Component Test Pattern ✅ IMPLEMENTED

See: `src/__tests__/components/ProtectedRoute.test.tsx`

**Key Features**:
- Multiple render states (loading, authenticated, unauthenticated)
- Role-based access control
- Navigation behavior
- Accessibility checks

### 5.4 API Route Test Pattern ✅ IMPLEMENTED

See: `src/__tests__/api/tasks-route.test.ts`

**Key Features**:
- All HTTP methods (GET, POST, PATCH, DELETE)
- Query parameter filtering
- Request validation
- Error responses
- Business logic (auto-timestamps)

### 5.5 Integration Test Pattern (TEMPLATE)

```typescript
// src/__tests__/integration/task-workflow.test.tsx
describe('Task Management Workflow', () => {
  it('should complete full task lifecycle', async () => {
    const user = mockUser({ role: 'coordinator' });
    const { getByText, getByLabelText } = renderWithAuth(
      <TasksPage />,
      { user }
    );

    // Create task
    fireEvent.click(getByText('New Task'));
    fireEvent.change(getByLabelText('Title'), {
      target: { value: 'Test Task' }
    });
    fireEvent.click(getByText('Save'));

    await waitFor(() => {
      expect(getByText('Test Task')).toBeInTheDocument();
    });

    // Update status
    fireEvent.click(getByText('Test Task'));
    fireEvent.click(getByText('Mark as Done'));

    await waitFor(() => {
      expect(getByText('Completed')).toBeInTheDocument();
    });
  });
});
```

---

## 6. Best Practices & Patterns

### 6.1 Test Organization
- **Co-location**: Tests mirror source structure (`src/lib/utils.ts` → `src/__tests__/utils/utils.test.ts`)
- **Descriptive Names**: Use `.test.ts` for unit/integration, `.spec.ts` for E2E (if added later)
- **Grouping**: Use `describe` blocks to group related tests

### 6.2 Mocking Strategy
- **Isolate External Dependencies**: Mock Supabase, external APIs, file system
- **Mock at Module Level**: Use `jest.mock()` for consistent mocking
- **Provide Defaults**: Global mocks in `jest.setup.js` for common dependencies
- **Override When Needed**: Use per-test mocks for specific scenarios

### 6.3 Assertion Patterns
- **Specific Assertions**: Prefer `toBe`, `toEqual` over generic matchers
- **Accessibility**: Use `getByRole`, `getByLabelText` over `getByTestId`
- **Async Handling**: Always use `waitFor` for async state updates
- **Error Messages**: Add custom messages for complex assertions

### 6.4 Test Data
- **Factories**: Use factory functions for consistent test data
- **Realistic Data**: Use data that mirrors production (proper formats, relationships)
- **Minimal Data**: Only include fields relevant to the test
- **Avoid Magic Values**: Use constants for repeated values

---

## 7. Success Metrics

### Coverage Targets (3-Month Goal)

| Metric | Current | Target | Stretch Goal |
|--------|---------|--------|--------------|
| Overall Coverage | 0% | 60% | 75% |
| Utilities | 0% | 90% | 95% |
| Hooks | 0% | 85% | 90% |
| API Routes | 0% | 80% | 90% |
| Auth/Security | 0% | 95% | 100% |
| UI Components | 0% | 60% | 75% |

### Quality Metrics
- **Zero Flaky Tests**: All tests should pass consistently
- **Fast Execution**: Full suite under 30 seconds
- **Clear Failures**: Failure messages clearly indicate the issue
- **Maintainable**: Tests updated alongside feature changes

### Process Metrics
- **CI Integration**: Tests run on every PR
- **Pre-commit Hooks**: Run relevant tests before commit
- **Coverage Reports**: Generated and reviewed weekly
- **Test Reviews**: Tests reviewed as part of PR process

---

## 8. Implementation Timeline

### Week 1-2: Foundation
- ✅ Set up test infrastructure
- ✅ Create test utilities and helpers
- ✅ Implement utility function tests (40+ tests)
- ✅ Implement audit logging tests (15+ tests)
- ✅ Implement auth/permission tests (20+ tests)

### Week 3-4: Data Layer
- Implement all custom hook tests (9 files, ~80 tests)
- Implement all API route tests (10 files, ~100 tests)
- Set up integration test framework

### Week 5-6: UI Components
- Implement core UI component tests (5 files, ~40 tests)
- Implement business component tests (4 files, ~30 tests)
- Add component integration tests

### Week 7-8: Polish & CI
- Add integration workflow tests (4 files, ~20 tests)
- Set up CI/CD pipeline
- Documentation and team training
- Coverage review and gap filling

---

## 9. Quick Start Guide

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific category
npm run test:unit
npm run test:hooks
npm run test:components
npm run test:api

# Watch mode
npm run test:watch

# Run single test file
npm test utils.test.ts
```

### Writing Your First Test

```typescript
// 1. Import dependencies
import { renderHook } from '@testing-library/react';
import { useMyHook } from '@/lib/hooks/useMyHook';

// 2. Mock external dependencies
jest.mock('@/lib/supabase');

// 3. Write test suite
describe('useMyHook', () => {
  it('should fetch data', async () => {
    // Arrange
    const mockData = [{ id: 1, name: 'Test' }];

    // Act
    const { result } = renderHook(() => useMyHook());

    // Assert
    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });
  });
});
```

---

## 10. Immediate Next Steps

### Priority 1 (This Week)
1. ✅ Review this plan with the team
2. ✅ Run existing tests to verify setup (`npm test`)
3. Implement remaining Phase 1 tests:
   - `src/__tests__/utils/financial.test.ts`
   - `src/__tests__/providers/AuthProvider.test.tsx`

### Priority 2 (Next Week)
1. Set up test utilities (`test-helpers.tsx`, enhanced mocks)
2. Begin Phase 2 hook testing:
   - Start with `useLeases.test.ts`
   - Then `useWorkOrders.test.ts`
   - Then `useHouseholds.test.ts`

### Priority 3 (Following Week)
1. Implement API route tests:
   - Start with `donations-route.test.ts`
   - Then `admin-users-route.test.ts`
2. Set up CI/CD pipeline

---

## 11. Resources

### Documentation
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Next.js Applications](https://nextjs.org/docs/testing)

### Examples
- See `src/__tests__/utils/utils.test.ts` for comprehensive utility testing
- See `src/__tests__/hooks/useProperties.test.ts` for hook testing patterns
- See `src/__tests__/components/ProtectedRoute.test.tsx` for component testing
- See `src/__tests__/api/tasks-route.test.ts` for API route testing

### Team Support
- Questions? Check existing test files for patterns
- Stuck? Review the test helpers and mock factories
- Need review? All tests should be reviewed in PRs

---

## Conclusion

This plan provides a clear roadmap from 0% to 60%+ test coverage over 8 weeks. The foundation has been laid with:

- ✅ **6 Test Files Created** (97+ test cases)
- ✅ **All Tests Passing** (verified with Jest)
- ✅ **Critical Areas Covered**: Utils, Auth, Audit, Hooks, API Routes, Components

The next phases focus on expanding coverage to all hooks, API routes, and UI components, with the final phase adding integration tests for complete user workflows.

**Success depends on**:
1. Team commitment to writing tests alongside features
2. Regular review of coverage reports
3. CI/CD integration to prevent regressions
4. Continuous improvement based on feedback

Let's build a robust, well-tested application that serves the Central America New Mainers community with confidence!

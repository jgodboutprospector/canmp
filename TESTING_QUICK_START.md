# CANMP Testing Quick Start Guide

**Get started with testing in 5 minutes!**

---

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run in watch mode (re-runs on file changes)
npm run test:watch

# Run a specific test file
npm test utils.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="Currency"
```

---

## Test File Locations

```
src/__tests__/
├── utils/               # Utility function tests
│   ├── utils.test.ts    ✅ 40+ tests
│   ├── audit.test.ts    ✅ 15+ tests
│   └── export.test.ts   ⚠️  12+ tests (minor fix needed)
├── lib/                 # Library/service tests
│   └── auth.test.ts     ✅ 20+ tests
├── hooks/               # Custom hook tests
│   └── useProperties.test.ts ✅ 10+ tests
├── components/          # Component tests
│   └── ProtectedRoute.test.tsx ⚠️ 7+ tests (minor fix needed)
└── api/                 # API route tests
    └── tasks-route.test.ts ⚠️ 20+ tests (minor fix needed)
```

**Status**: 97+ tests created, 70+ passing, 27 need minor fixes

---

## Writing Your First Test

### 1. Testing a Utility Function

```typescript
// src/__tests__/utils/myUtil.test.ts
import { myFunction } from '@/lib/myUtil';

describe('myFunction', () => {
  it('should do something', () => {
    // Arrange: Set up test data
    const input = 'test';

    // Act: Call the function
    const result = myFunction(input);

    // Assert: Verify the result
    expect(result).toBe('expected output');
  });

  it('should handle edge cases', () => {
    expect(myFunction(null)).toBe('');
    expect(myFunction(undefined)).toBe('');
  });
});
```

### 2. Testing a Custom Hook

```typescript
// src/__tests__/hooks/useMyHook.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useMyHook } from '@/lib/hooks/useMyHook';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase');

describe('useMyHook', () => {
  it('should fetch data', async () => {
    // Mock the Supabase response
    (supabase as any).from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: [{ id: 1, name: 'Test' }],
        error: null
      })
    });

    // Render the hook
    const { result } = renderHook(() => useMyHook());

    // Wait for async updates
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Verify the data
    expect(result.current.data).toEqual([{ id: 1, name: 'Test' }]);
  });
});
```

### 3. Testing a Component

```typescript
// src/__tests__/components/MyComponent.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import MyComponent from '@/components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent title="Test" />);

    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should handle clicks', () => {
    const onClick = jest.fn();
    render(<MyComponent onClick={onClick} />);

    fireEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

### 4. Testing an API Route

```typescript
// src/__tests__/api/my-route.test.ts
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/my-route/route';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

jest.mock('@/lib/supabase-admin');

describe('My API Route', () => {
  it('should return data', async () => {
    // Mock Supabase
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({
        data: [{ id: 1 }],
        error: null
      })
    };
    (getSupabaseAdmin as jest.Mock).mockReturnValue(mockSupabase);

    // Create request
    const request = new NextRequest('http://localhost/api/my-route');

    // Call route handler
    const response = await GET(request);
    const data = await response.json();

    // Verify response
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
```

---

## Common Testing Patterns

### Mocking Supabase

```typescript
jest.mock('@/lib/supabase');

const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: {}, error: null })
};

(supabase as any).from.mockReturnValue(mockSupabase);
```

### Mocking Next.js Navigation

```typescript
import { useRouter } from 'next/navigation';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

// In your test
const mockPush = jest.fn();
(useRouter as jest.Mock).mockReturnValue({ push: mockPush });
```

### Testing Async Hooks

```typescript
import { renderHook, waitFor } from '@testing-library/react';

const { result } = renderHook(() => useMyHook());

await waitFor(() => {
  expect(result.current.loading).toBe(false);
});
```

### Testing Forms

```typescript
import { render, screen, fireEvent } from '@testing-library/react';

render(<MyForm />);

const input = screen.getByLabelText('Name');
fireEvent.change(input, { target: { value: 'John' } });

const submitButton = screen.getByRole('button', { name: 'Submit' });
fireEvent.click(submitButton);

await waitFor(() => {
  expect(screen.getByText('Success!')).toBeInTheDocument();
});
```

---

## Debugging Tests

### View Test Output

```bash
# Run tests with verbose output
npm test -- --verbose

# Run a single test file
npm test my-test.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="should handle errors"
```

### Use Console Logs

```typescript
it('should do something', () => {
  console.log('Debug:', result);  // Will show in test output
  expect(result).toBe('expected');
});
```

### Use Jest Debugger

```typescript
it('should debug', () => {
  debugger; // Breakpoint here
  expect(true).toBe(true);
});
```

```bash
# Run with Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand
```

---

## Common Issues & Solutions

### Issue: "Cannot find module '@/...'"
**Solution**: Path aliases are configured in jest.config.js, should work automatically.

### Issue: "ReferenceError: fetch is not defined"
**Solution**: Use polyfills in jest.setup.js (already configured).

### Issue: "Cannot read property 'from' of undefined"
**Solution**: Make sure to mock Supabase before using it in tests.

### Issue: "Tests timeout"
**Solution**: Add `timeout` option or use `jest.setTimeout(10000)`.

### Issue: "React hooks error"
**Solution**: Use `renderHook` from @testing-library/react for hooks.

---

## Best Practices

### ✅ DO

- Write descriptive test names: `"should return error when email is invalid"`
- Test both success and error cases
- Mock external dependencies (Supabase, APIs, etc.)
- Use `waitFor` for async updates
- Keep tests focused and small
- Use `beforeEach` to reset state

### ❌ DON'T

- Test implementation details
- Write tests that depend on other tests
- Use `setTimeout` (use `waitFor` instead)
- Mock everything (only mock external dependencies)
- Write overly complex tests
- Forget to clean up after tests

---

## Coverage Reports

### Generate Coverage

```bash
npm run test:coverage
```

### View Coverage Report

```bash
# HTML report (opens in browser)
open coverage/lcov-report/index.html

# Terminal summary
npm run test:coverage | grep "All files"
```

### Coverage Thresholds

Configure in `jest.config.js`:

```javascript
coverageThreshold: {
  global: {
    statements: 60,
    branches: 60,
    functions: 60,
    lines: 60
  }
}
```

---

## Test Scripts Cheat Sheet

```bash
# Basic
npm test                          # Run all tests
npm run test:watch               # Run in watch mode
npm run test:coverage            # Run with coverage

# Filtering
npm test utils                   # Run tests matching "utils"
npm test -- --testPathPattern=hooks  # Run only hook tests

# Debugging
npm test -- --verbose            # Verbose output
npm test -- --no-coverage        # Skip coverage (faster)
npm test -- --silent             # Minimal output

# Coverage
npm run test:coverage -- --collectCoverageFrom='src/lib/**/*.ts'
```

---

## Next Steps

1. **Fix Existing Tests** (30 min)
   - Update mocks in export.test.ts
   - Fix useRouter mock in ProtectedRoute.test.tsx
   - Resolve NextRequest issue in tasks-route.test.ts

2. **Write More Tests** (ongoing)
   - See TESTING_IMPROVEMENT_PLAN.md for roadmap
   - Start with utilities and hooks
   - Move to components and API routes

3. **Set Up CI/CD** (1 hour)
   - Create GitHub Actions workflow
   - Add coverage reporting
   - Configure pre-commit hooks

---

## Getting Help

- **Examples**: Check existing test files in `src/__tests__/`
- **Documentation**: See TESTING_IMPROVEMENT_PLAN.md
- **Patterns**: All common patterns shown above
- **Jest Docs**: https://jestjs.io/docs/getting-started
- **RTL Docs**: https://testing-library.com/docs/react-testing-library/intro/

---

## Quick Reference

### Test Structure
```typescript
describe('Feature', () => {
  beforeEach(() => { /* setup */ });
  afterEach(() => { /* cleanup */ });

  it('should do something', () => {
    // Arrange
    // Act
    // Assert
  });
});
```

### Common Matchers
```typescript
expect(value).toBe(expected);           // Strict equality
expect(value).toEqual(expected);        // Deep equality
expect(value).toBeTruthy();             // Truthy
expect(value).toBeNull();               // Null
expect(value).toBeUndefined();          // Undefined
expect(array).toContain(item);          // Array contains
expect(string).toMatch(/pattern/);      // Regex match
expect(fn).toHaveBeenCalled();          // Mock was called
expect(fn).toHaveBeenCalledWith(args);  // Mock called with args
```

### Testing Library Queries
```typescript
screen.getByText('text');               // Find by text
screen.getByRole('button');             // Find by ARIA role
screen.getByLabelText('label');         // Find by label
screen.getByPlaceholderText('placeholder'); // Find by placeholder
screen.queryByText('text');             // Returns null if not found
screen.findByText('text');              // Async, waits for element
```

---

**Ready to start testing? Run `npm test` and see the magic!** ✨

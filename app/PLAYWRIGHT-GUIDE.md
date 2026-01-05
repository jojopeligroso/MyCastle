# Playwright E2E Testing Guide

## Quick Start

### Run All Tests
```bash
npm run test:e2e
```

### Run in Interactive UI Mode (Recommended for Development)
```bash
npm run test:e2e:ui
```

### Run Specific Test File
```bash
npx playwright test e2e/admin-student-registry.spec.ts
```

### Debug Tests Step-by-Step
```bash
npm run test:e2e:debug
```

### View Test Report
```bash
npm run test:e2e:report
```

---

## What Gets Tested

✅ **Complete Application Functionality:**
- User interactions (clicks, typing, form submission)
- Navigation between pages
- API calls and data loading
- Form validation
- Responsive design (mobile, tablet, desktop)
- Keyboard navigation
- Error handling
- Loading states

✅ **Across Multiple Browsers:**
- Chrome (Chromium)
- Firefox
- Safari (WebKit)
- Mobile Chrome
- Mobile Safari

---

## Test File Structure

### Current Test Files

1. **`e2e/auth.spec.ts`** - Authentication flows
   - Login/logout
   - Magic link
   - Form validation

2. **`e2e/teacher-attendance.spec.ts`** - Teacher attendance marking
   - Register viewing
   - Mark attendance (P/A/L)
   - Keyboard shortcuts
   - Hash chain verification

3. **`e2e/teacher-lesson-planner.spec.ts`** - AI lesson planning
   - Generate lesson plans
   - CEFR descriptor selection
   - Plan caching

4. **`e2e/teacher-timetable.spec.ts`** - Timetable viewing
   - Personal timetable
   - Week navigation
   - Session details

5. **`e2e/admin-student-registry.spec.ts`** ⭐ NEW
   - Student list and filters
   - Create student (manual + diagnostic)
   - Student detail drawer
   - Edit functionality
   - Search and pagination
   - Responsive design

---

## Writing Your Own Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Run before each test
    await page.goto('/my-page');
  });

  test('should do something', async ({ page }) => {
    // Your test code
    await page.getByRole('button', { name: /click me/i }).click();
    await expect(page.getByText('Success')).toBeVisible();
  });
});
```

### Common Patterns

#### 1. Finding Elements

```typescript
// By role (preferred - most accessible)
await page.getByRole('button', { name: /submit/i });
await page.getByRole('heading', { name: /title/i });
await page.getByRole('textbox', { name: /email/i });

// By label (for form inputs)
await page.getByLabel(/email address/i);

// By placeholder
await page.getByPlaceholder(/search/i);

// By test ID (use sparingly)
await page.locator('[data-testid="student-row"]');

// By text
await page.getByText('Specific Text');
```

#### 2. User Interactions

```typescript
// Click
await page.getByRole('button', { name: /submit/i }).click();

// Fill input
await page.getByLabel(/name/i).fill('John Doe');

// Select dropdown
await page.getByLabel(/level/i).selectOption('B1');

// Check checkbox/radio
await page.getByLabel(/agree/i).check();

// Keyboard
await page.keyboard.press('Enter');
await page.keyboard.press('Escape');
```

#### 3. Assertions

```typescript
// Visibility
await expect(page.getByText('Hello')).toBeVisible();
await expect(page.getByText('Hidden')).not.toBeVisible();

// URL
await expect(page).toHaveURL('/dashboard');
await expect(page).toHaveURL(/\/students$/);

// Text content
await expect(page.getByRole('heading')).toHaveText('Welcome');

// Count
const rows = page.locator('[data-testid="row"]');
await expect(rows).toHaveCount(10);

// Editable
await expect(page.getByLabel(/name/i)).toBeEditable();
```

#### 4. Waiting

```typescript
// Wait for network idle (after filters, API calls)
await page.waitForLoadState('networkidle');

// Wait for element
await page.waitForSelector('[data-testid="loaded"]');

// Playwright auto-waits, but sometimes you need explicit waits
await page.waitForTimeout(1000); // Use sparingly!
```

---

## Testing Your Student Registry

### Before Running Tests

1. **Start your dev server** (or let Playwright auto-start it):
   ```bash
   npm run dev
   ```

2. **Run migrations** (critical!):
   - Ensure all 5 migrations are run on Supabase
   - See STATUS.md Task 1.1

3. **Seed test data**:
   ```bash
   npm run seed:students
   ```

### Running Student Registry Tests

```bash
# Run just the student registry tests
npx playwright test e2e/admin-student-registry.spec.ts

# Run in UI mode (see tests visually)
npx playwright test e2e/admin-student-registry.spec.ts --ui

# Run specific test
npx playwright test e2e/admin-student-registry.spec.ts -g "should create new student"

# Debug a failing test
npx playwright test e2e/admin-student-registry.spec.ts --debug
```

### What to Expect

✅ **29 tests** covering:
- List view and filters (8 tests)
- Student detail drawer (4 tests)
- Create student forms (5 tests)
- Form validation (3 tests)
- Visa tracking (1 test)
- Responsive design (2 tests)
- Accessibility (1 test)
- Pagination (1 test)
- Edit functionality (4 tests)

---

## Debugging Failed Tests

### 1. Use UI Mode
```bash
npm run test:e2e:ui
```
- See tests running in browser
- Step through each action
- Inspect element states
- Rerun individual tests

### 2. Use Debug Mode
```bash
npm run test:e2e:debug
```
- Pause on each step
- Open DevTools
- Inspect page state
- Set breakpoints

### 3. Check Screenshots & Videos

Failed tests automatically save:
- **Screenshots**: `playwright-report/screenshots/`
- **Videos**: `playwright-report/videos/`
- **Traces**: `playwright-report/traces/` (use trace viewer)

### 4. View Trace
```bash
npx playwright show-trace playwright-report/traces/trace.zip
```
- See timeline of actions
- Network requests
- DOM snapshots
- Console logs

---

## Test Data IDs

Add these to your components for reliable testing:

```tsx
// Good: Stable test IDs
<div data-testid="student-row">...</div>
<span data-testid="student-name">{name}</span>
<span data-testid="student-level">{level}</span>

// Better: Role-based selectors (no test IDs needed)
<button>Add Student</button>  // Found with getByRole('button', { name: /add student/i })
<h1>Students</h1>             // Found with getByRole('heading', { name: /students/i })
```

---

## CI/CD Integration

Tests run automatically on GitHub Actions:

```yaml
# .github/workflows/e2e-tests.yml
- name: Run Playwright tests
  run: npm run test:e2e
  env:
    PLAYWRIGHT_BASE_URL: ${{ secrets.PREVIEW_URL }}
```

---

## Performance Tips

1. **Run tests in parallel** (default):
   - Playwright runs tests across multiple browsers simultaneously
   - Faster feedback

2. **Focus on critical paths**:
   - Don't test every edge case in E2E
   - Use unit tests for detailed logic
   - E2E for user workflows

3. **Reuse authentication**:
   - Set up auth once, save state
   - Reuse in subsequent tests

4. **Avoid hard waits**:
   - Let Playwright auto-wait
   - Use `waitForLoadState('networkidle')` for dynamic content

---

## Next Steps

1. ✅ **Run the new Student Registry tests**:
   ```bash
   npm run test:e2e:ui e2e/admin-student-registry.spec.ts
   ```

2. ✅ **Add test IDs to your components** (if tests fail):
   - Add `data-testid="student-row"` etc.
   - See test file for required IDs

3. ✅ **Write tests for your next feature**:
   - Copy the pattern from `admin-student-registry.spec.ts`
   - Test enrollment management next

4. ✅ **Set up CI/CD** (when ready):
   - Tests run on every PR
   - Catch regressions early

---

## Troubleshooting

### "Element not found"
- Use UI mode to see what's on the page
- Check if element has different text/role
- Try more flexible selectors: `/name/i` instead of `"Name"`

### "Timeout waiting for element"
- Increase timeout: `{ timeout: 10000 }`
- Check if API is slow/failing
- Use `waitForLoadState('networkidle')`

### "Test passes locally but fails in CI"
- Check for timing issues (add waits)
- Verify test data is seeded
- Check environment variables

### "Can't connect to database"
- Ensure `.env.local` has correct `DATABASE_URL`
- Run migrations on Supabase
- Seed test data

---

## Resources

- **Playwright Docs**: https://playwright.dev/
- **Best Practices**: https://playwright.dev/docs/best-practices
- **API Reference**: https://playwright.dev/docs/api/class-test
- **Selectors Guide**: https://playwright.dev/docs/selectors

---

**Happy Testing! 🎭**

Your tests ensure the Student Registry works perfectly across all browsers and devices.

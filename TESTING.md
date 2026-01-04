---
status: APPROVED
last_updated: 2026-01-02
next_review: 2026-01-16
owner: Development Team
---

# Testing Guide for MyCastle

This comprehensive guide covers all testing procedures for the MyCastle project, from unit tests to E2E tests to manual testing procedures.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Prerequisites](#prerequisites)
3. [Unit Testing](#unit-testing)
4. [E2E Testing (Playwright)](#e2e-testing-playwright)
5. [Database & Schema Testing](#database--schema-testing)
6. [RLS Policy Testing](#rls-policy-testing)
7. [Server Actions Testing](#server-actions-testing)
8. [Manual UI Testing Checklist](#manual-ui-testing-checklist)
9. [Performance Testing](#performance-testing)
10. [Quality Checks (All-in-One)](#quality-checks-all-in-one)
11. [Troubleshooting](#troubleshooting)

---

## Quick Start

**Run all quality checks (recommended before commits):**
```bash
cd /home/eoin/Work/MyCastle/app
npm run check  # Runs format, lint, test, build
```

**Run specific test suites:**
```bash
npm test               # Unit tests only
npm run test:e2e       # E2E tests only
npm run test:coverage  # Unit tests with coverage report
```

---

## Prerequisites

### Check if Node.js is installed

```bash
node --version  # Should show v20.x.x or higher
```

### Installing Node.js (if needed)

**On macOS:**
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install node
```

**On Arch Linux:**
```bash
sudo pacman -S nodejs npm
```

**On Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install nodejs npm
```

---

## Unit Testing

### Run All Unit Tests

```bash
cd /home/eoin/Work/MyCastle/app
npm install  # Ensure dependencies installed
npm test     # Run all unit tests
```

**With coverage report:**
```bash
npm run test:coverage
```

### Run Tests for Specific Modules

```bash
# Admin API tests
npm test -- students.test.ts
npm test -- enrollments.test.ts
npm test -- invoices.test.ts
npm test -- payments.test.ts
npm test -- programmes.test.ts
npm test -- courses.test.ts
npm test -- teachers.test.ts
npm test -- audit-log.test.ts
npm test -- search.test.ts

# Core functionality tests
npm test -- auth.test.ts
npm test -- database.test.ts
```

### Watch Mode (Auto-Rerun on Changes)

```bash
npm test -- --watch
# Press Ctrl+C to exit
```

### Unit Test Coverage

**Current Status:**
- **30 API endpoints:** 100% coverage
- **Database schema:** 19 tables tested
- **Auth utilities:** 7 tests passing
- **RLS policies:** 47 tests passing

---

## E2E Testing (Playwright)

### First-Time Setup

```bash
cd /home/eoin/Work/MyCastle/app
npx playwright install        # Install browsers
npx playwright install-deps   # Install system dependencies
```

### Run All E2E Tests

```bash
npm run test:e2e  # Headless mode (CI)
```

### Interactive Mode (with UI)

```bash
npm run test:e2e:ui  # Opens Playwright UI
```

### Debug Mode

```bash
npm run test:e2e:debug  # Run with debugger
```

### View Test Report

```bash
npm run test:e2e:report
```

### E2E Test Suites

**Current Tests (39 total):**
- Authentication: 6 tests
- Teacher Timetable: 10 tests
- Teacher Attendance: 12 tests
- Teacher Lesson Planner: 11 tests

### Run Specific E2E Test File

```bash
npx playwright test tests/auth.spec.ts
npx playwright test tests/teacher-timetable.spec.ts
```

---

## Database & Schema Testing

### Step 1: Run Database Migrations

**Option A: Supabase Dashboard (Recommended)**

1. Open SQL Editor:
   ```
   https://pdeornivbyfvpqabgscr.supabase.com/project/pdeornivbyfvpqabgscr/sql/new
   ```

2. Run migrations in order:
   - `app/migrations/0004_add_programmes_table.sql`
   - `app/migrations/0005_add_courses_table.sql`
   - `app/migrations/0006_extend_users_for_students.sql`
   - `app/migrations/0007_student_registry_views.sql`
   - `app/migrations/0008_add_enrollment_flexibility.sql`

3. Verify migrations:
   ```sql
   SELECT 'programmes' as table_name, COUNT(*) as count FROM programmes
   UNION ALL
   SELECT 'courses', COUNT(*) FROM courses
   UNION ALL
   SELECT 'v_students_with_metadata', COUNT(*) FROM v_students_with_metadata;
   ```

**Option B: psql (if installed)**

```bash
cd /home/eoin/Work/MyCastle/app
source .env.local
./scripts/run-migrations.sh
```

**Expected Results:**
- ✅ programmes table: 5 records
- ✅ courses table: 20+ records
- ✅ users table: 5 new columns added
- ✅ 3 database views created
- ✅ enrollment_amendments table created

### Step 2: Generate TypeScript Types

```bash
cd /home/eoin/Work/MyCastle/app
npm run db:generate
```

**Verify:**
```bash
npx tsc --noEmit  # Should show 0 errors
```

### Step 3: Seed Sample Data

```bash
npm run seed:students  # Creates 10 test students
```

**Expected Output:**
```
🌱 Seeding student data...
✅ Created 10 students

Breakdown:
  Status: 8 active, 1 suspended, 1 archived
  Levels: 8 confirmed, 2 provisional
  Visas: 6 with visa info (2 expiring soon)
```

**Verify in database:**
```sql
SELECT name, email, current_level, level_status, status
FROM users
WHERE role = 'student'
ORDER BY name;
```

### Step 4: Test Database Views

**Test v_students_with_metadata:**
```sql
SELECT
  name,
  current_level,
  level_status,
  active_enrollments,
  attendance_rate,
  visa_expiring_soon,
  at_risk_attendance
FROM v_students_with_metadata
LIMIT 10;
```

**Test v_student_visa_status:**
```sql
SELECT
  name,
  visa_type,
  visa_expiry,
  days_until_expiry,
  visa_status,
  alert_priority
FROM v_student_visa_status
ORDER BY days_until_expiry ASC NULLS LAST;
```

**Test v_student_duplicate_candidates:**
```sql
SELECT
  student1_name,
  student2_name,
  match_score,
  match_reasons
FROM v_student_duplicate_candidates
ORDER BY match_score DESC;
```

---

## RLS Policy Testing

### Test Tenant Isolation

```sql
-- Set user context for tenant 1
SELECT set_user_context(
  (SELECT id FROM users WHERE role='admin' LIMIT 1)::uuid,
  (SELECT id FROM tenants LIMIT 1)::uuid,
  'admin'
);

-- These queries should only return data for this tenant
SELECT COUNT(*) FROM programmes;
SELECT COUNT(*) FROM courses;
SELECT COUNT(*) FROM users WHERE role='student';

-- Reset context
RESET app.current_user_id;
RESET app.current_tenant_id;
RESET app.current_role;
```

### Automated RLS Tests

```bash
npm run test:rls  # Run RLS policy tests (47 tests)
```

**Coverage:**
- Teacher sees only assigned classes
- Students see only enrolled classes
- Admins see org-wide data
- Tenant isolation enforced

---

## Server Actions Testing

### Run Automated Server Action Tests

```bash
cd /home/eoin/Work/MyCastle/app
tsx scripts/test-student-actions.ts
```

**Tests Performed (7 total):**
1. ✅ Create student with confirmed level (manual assignment)
2. ✅ Create student with provisional level (diagnostic test)
3. ✅ Approve provisional level
4. ✅ Update student details
5. ✅ Archive student
6. ✅ Get duplicate candidates
7. ✅ Duplicate email validation (should reject)

**Expected Output:**
```
🧪 Testing Student Server Actions

📝 Test 1: Create student with confirmed level
   ✅ PASS - Student created

📝 Test 2: Create student with diagnostic test
   ✅ PASS - Student created with provisional level

... (all 7 tests)

📊 Test Summary:
   Total Tests: 7
   ✅ Passed: 7
   ❌ Failed: 0
   Success Rate: 100%
```

---

## Manual UI Testing Checklist

### Student Registry Testing

#### Stats Dashboard
- [ ] 4 stat cards display (Total, Active, Visa Expiring, At Risk)
- [ ] Numbers match database counts
- [ ] Cards are clickable and filter correctly

#### Saved Views
- [ ] "All Students" shows all students
- [ ] "Active" shows only active students
- [ ] "Visa Expiring" shows visas expiring within 30 days
- [ ] "New This Week" shows students created in last 7 days
- [ ] "At Risk" shows students with attendance < 80%

#### Filters
- [ ] Status dropdown filters correctly
- [ ] CEFR Level dropdown filters correctly
- [ ] Search by name works (partial match)
- [ ] Search by email works (partial match)
- [ ] Multiple filters combine with AND logic
- [ ] "Clear Filters" button resets all
- [ ] Active filter chips appear
- [ ] Clicking chip removes individual filter
- [ ] URL params update with filter state
- [ ] Filter state persists on page refresh

#### Student List
- [ ] Students display in table format
- [ ] Columns: Student, Level, Enrollments, Attendance, Visa Status, Status
- [ ] Avatars show or initials fallback
- [ ] CEFR level badges color-coded (A1=green, B1=blue, C1=purple)
- [ ] Provisional level indicator (⚠️) appears correctly
- [ ] Pending approval indicator (⏳) appears correctly
- [ ] Visa status badges correct color (green/amber/red)
- [ ] Attendance % color-coded
- [ ] Row hover effect works
- [ ] Clicking row opens detail drawer
- [ ] Mobile view shows card layout
- [ ] Empty state displays when no matches

#### Detail Drawer
- [ ] Drawer slides in from right (300ms animation)
- [ ] Backdrop overlay appears
- [ ] Clicking backdrop closes drawer
- [ ] ESC key closes drawer
- [ ] Body scroll locked when drawer open
- [ ] Student header shows avatar, name, email, level
- [ ] Tab navigation shows all 6 tabs
- [ ] Clicking tabs switches content
- [ ] Active tab highlighted
- [ ] URL updates with tab param

#### Personal Info Tab
- [ ] Basic information section displays
- [ ] Email clickable (mailto link)
- [ ] Phone clickable (tel link)
- [ ] CEFR level section shows current + initial
- [ ] Level status badge correct:
  - [ ] Confirmed: Green checkmark
  - [ ] Provisional: Amber warning + "Approve Level" button
  - [ ] Pending: Blue spinner
- [ ] "Approve Level" button for admins only
- [ ] Clicking "Approve Level" changes status to confirmed
- [ ] Visa information section appears if visa data exists
- [ ] Visa expiry badge correct (Valid/Expiring/Expired)
- [ ] Metadata section displays JSON if present
- [ ] All dates formatted as "DD MMM YYYY"

#### Other Tabs
- [ ] Course History: Shows enrollments and amendments
- [ ] Attendance Summary: Shows attendance % and sessions
- [ ] Assessments: Shows grades and submissions
- [ ] Notes: Shows notes list (admin only)
- [ ] Documents: Shows documents list

#### Create Student Form
- [ ] "Add Student" button in header works
- [ ] Navigates to `/admin/students/create`
- [ ] Back link works
- [ ] Form displays all sections
- [ ] Name field required
- [ ] Email field required and validates format
- [ ] Phone field optional
- [ ] Level assignment method radio buttons work
- [ ] **Manual selection path:**
  - [ ] Current level dropdown shows all CEFR levels
  - [ ] Initial level dropdown optional
  - [ ] Selecting level enables submit
- [ ] **Diagnostic test path:**
  - [ ] Score field accepts numbers
  - [ ] Max score defaults to 100
  - [ ] Suggested level dropdown shows all CEFR levels
  - [ ] Warning note about provisional status
- [ ] Visa type field optional
- [ ] Visa expiry date picker works
- [ ] Cancel button goes back
- [ ] Submit button disabled while submitting
- [ ] Submit button shows "Creating Student..." during submission
- [ ] Success redirects to student list
- [ ] New student appears in list
- [ ] Error messages for validation failures
- [ ] Duplicate email shows error message

#### Role-Based Permissions
**Admin/DOS:**
- [ ] "Approve Level" button appears for provisional students
- [ ] Clicking approve works
- [ ] Notes tab allows viewing/adding

**Teacher:**
- [ ] "Approve Level" button does NOT appear
- [ ] Notes tab shows permission warning

#### Responsive Design
- [ ] Mobile (< 640px): Drawer full width, cards not table
- [ ] Tablet (640-1024px): Drawer 2/3 width, table view
- [ ] Desktop (1024-1280px): Drawer 1/2 width
- [ ] Large (> 1280px): Drawer 2/5 width
- [ ] All components readable at all sizes

#### Accessibility
- [ ] Tab key navigates through interactive elements
- [ ] Focus indicators visible
- [ ] ESC key closes drawer
- [ ] Screen reader announces tab changes
- [ ] All buttons have descriptive labels
- [ ] Form inputs have associated labels
- [ ] Touch targets ≥ 44px on mobile

---

## Performance Testing

### View Performance

```sql
-- Time the main student view query
EXPLAIN ANALYZE
SELECT * FROM v_students_with_metadata
LIMIT 100;
```

**Expected:** Query completes in < 100ms

### Page Load Benchmarks

Expected performance metrics:
- **Page Load:** < 1 second
- **Filter Application:** < 100ms
- **Drawer Open/Close:** 300ms (animation)
- **Student Creation:** < 2 seconds (includes DB write)
- **Search Query:** < 200ms
- **List Rendering:** < 500ms for 100 students

### Performance Debugging

If performance is slower than expected:
1. Check database query performance
2. Review network tab for slow API calls
3. Consider implementing pagination for > 500 students
4. Check for unnecessary re-renders in React DevTools

---

## Quality Checks (All-in-One)

### Run All Quality Checks

```bash
cd /home/eoin/Work/MyCastle/app

# Option 1: Standard checks (format, lint, test, build)
npm run check

# Option 2: Full checks including E2E
npm run check-full
```

**What `npm run check` does:**
1. Format check (Prettier)
2. Lint check (ESLint)
3. Type check (TypeScript)
4. Unit tests (Jest)
5. Build (Next.js production build)

**What `npm run check-full` adds:**
6. E2E tests (Playwright)

### Individual Quality Commands

```bash
npm run format        # Format code with Prettier
npm run lint          # Run ESLint
npm run typecheck     # Check TypeScript types
npm test              # Run unit tests
npm run build         # Production build
npm run test:e2e      # E2E tests
```

---

## Troubleshooting

### Problem: "relation does not exist" error

**Cause:** Migration not run or failed

**Solution:**
```sql
-- Check if tables exist
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- If missing, re-run migrations in order
```

### Problem: "column does not exist" error on users table

**Cause:** Migration 0006 not run

**Solution:**
```sql
-- Check if columns exist
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('current_level', 'level_status', 'visa_type');

-- If empty, run migration 0006
```

### Problem: TypeScript errors after db:generate

**Cause:** Schema mismatch or import errors

**Solution:**
```bash
# Restart TypeScript server in your editor
# Then re-run type generation
npm run db:generate

# Check for specific errors
npx tsc --noEmit
```

### Problem: Students not appearing in list

**Cause:** No students in database or RLS blocking

**Solution:**
```bash
# Seed students
npm run seed:students

# Check RLS policies (run in Supabase SQL editor)
SELECT * FROM users WHERE role = 'student';
```

### Problem: "Approve Level" button doesn't work

**Cause:** User role not admin/DOS or action failing

**Solution:**
1. Check current user role in context
2. Verify `approveLevelStatus` action exists
3. Check browser console for errors
4. Verify student has `level_status = 'provisional'`

### Problem: Filters not working

**Cause:** URL params not updating or filter logic error

**Solution:**
1. Check browser URL for query params
2. Open browser console for errors
3. Verify `useSearchParams` hook working
4. Check filter conditions in `StudentRegistry.tsx`

### Problem: Playwright tests fail

**Cause:** Browsers not installed or server not running

**Solution:**
```bash
# Reinstall browsers
npx playwright install

# Ensure dev server running
npm run dev

# Run tests in debug mode
npm run test:e2e:debug
```

---

## Success Criteria

### Foundation Complete
- ✅ All migrations applied
- ✅ TypeScript types generated (0 errors)
- ✅ Sample data seeded
- ✅ Database views working
- ✅ RLS policies enforced

### Code Quality
- ✅ All unit tests passing (100%)
- ✅ All E2E tests passing (39 tests)
- ✅ No TypeScript errors
- ✅ No ESLint errors
- ✅ Production build succeeds

### UI Functionality
- ✅ All filters work correctly
- ✅ Detail drawer opens/closes smoothly
- ✅ Create student form works for both paths
- ✅ Responsive design works on all screen sizes
- ✅ No console errors in browser

### Performance
- ✅ Page loads < 1s
- ✅ Filter application < 100ms
- ✅ Student creation < 2s
- ✅ View queries < 100ms
- ✅ List renders < 500ms (100 students)

---

## Deployment Checklist

Before deploying to production:

- [ ] All migrations run successfully
- [ ] All tests pass (unit + E2E + RLS)
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Environment variables set in production
- [ ] Database backups configured
- [ ] RLS policies tested
- [ ] Performance tested with production data volume
- [ ] Accessibility tested with screen reader
- [ ] Cross-browser testing completed
- [ ] Mobile testing on real devices
- [ ] User acceptance testing completed
- [ ] Documentation reviewed
- [ ] Team trained on new features

---

## Related Documentation

- **STATUS.md** - Current project status and immediate tasks
- **ROADMAP.md** - Full project roadmap (Phases 1-4)
- **DEPLOYMENT.md** - Production deployment guide
- **SETUP.md** - Development environment setup
- **REQ.md** - Requirements specification
- **DESIGN.md** - Technical design specification

---

**Last Updated:** 2026-01-02
**Maintained By:** Development Team
**Review Schedule:** Bi-weekly

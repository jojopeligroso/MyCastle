# Student Registry - Testing Checklist

## Phase 1-3 Foundation Testing

Before building UI components, validate the database, schemas, and server actions.

---

## ✅ Step 1: Database Migrations

### Run all 8 migrations

```bash
cd /home/eoin/Work/MyCastle/app

# Run migrations in order
psql $DATABASE_URL -f migrations/0004_add_programmes_table.sql
psql $DATABASE_URL -f migrations/0005_add_courses_table.sql
psql $DATABASE_URL -f migrations/0006_extend_users_for_students.sql
psql $DATABASE_URL -f migrations/0007_student_registry_views.sql
psql $DATABASE_URL -f migrations/0008_add_enrollment_flexibility.sql
```

**Expected Results:**
- ✅ `programmes` table created with 5 sample programmes
- ✅ `courses` table created with ~21 sample courses
- ✅ `users` table extended with 5 new columns (current_level, initial_level, level_status, visa_type, visa_expiry)
- ✅ 3 database views created (v_students_with_metadata, v_student_duplicate_candidates, v_student_visa_status)
- ✅ `enrollments` table extended with flexible duration fields
- ✅ `enrollment_amendments` table created

**Verify with:**
```bash
# Open database studio
npm run db:studio

# Or query directly
psql $DATABASE_URL -c "\dt"  # List all tables
psql $DATABASE_URL -c "SELECT * FROM programmes;"
psql $DATABASE_URL -c "SELECT * FROM courses LIMIT 5;"
```

---

## ✅ Step 2: Generate TypeScript Types

```bash
npm run db:generate
```

**Expected Results:**
- ✅ Drizzle generates types from schema files
- ✅ No TypeScript errors
- ✅ New types available: `Programme`, `Course`, `EnrollmentAmendment`

**Verify with:**
```bash
# Check for TypeScript errors
npx tsc --noEmit
```

---

## ✅ Step 3: Seed Sample Data

```bash
npm run seed:students
```

**Expected Results:**
- ✅ 10 sample students created
- ✅ Mix of: active/suspended, confirmed/provisional levels, with/without visas
- ✅ Console shows breakdown of created students

**Verify with:**
```bash
psql $DATABASE_URL -c "SELECT name, email, current_level, level_status, visa_expiry FROM users WHERE role='student';"
```

---

## ✅ Step 4: Test Database Views

### Test v_students_with_metadata
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
LIMIT 5;
```

**Expected:** Student data with calculated metrics

### Test v_student_visa_status
```sql
SELECT
  name,
  visa_type,
  visa_expiry,
  days_until_expiry,
  visa_status,
  alert_priority
FROM v_student_visa_status
ORDER BY visa_expiry;
```

**Expected:** Students with visa info, sorted by urgency

### Test v_student_duplicate_candidates
```sql
SELECT * FROM v_student_duplicate_candidates;
```

**Expected:** Empty or potential duplicates (if any similar names/emails)

---

## ✅ Step 5: Test Server Actions

Create a test file to verify server actions work:

**File:** `app/scripts/test-student-actions.ts`

```typescript
import { createStudent, updateStudent, approveLevelStatus } from '@/app/admin/students/_actions/studentActions';

async function testStudentActions() {
  console.log('🧪 Testing Student Server Actions\n');

  // Test 1: Create student with manual level
  console.log('Test 1: Create student with confirmed level...');
  const result1 = await createStudent({
    name: 'Test Student Manual',
    email: 'test.manual@example.com',
    phone: '+44 7700 900000',
    current_level: 'B1',
    initial_level: 'A2',
    level_status: 'confirmed',
  });
  console.log(result1.success ? '✅ PASS' : '❌ FAIL:', result1);

  // Test 2: Create student with diagnostic test
  console.log('\nTest 2: Create student with diagnostic test...');
  const result2 = await createStudent({
    name: 'Test Student Diagnostic',
    email: 'test.diagnostic@example.com',
    phone: '+44 7700 900001',
    diagnostic_test: {
      score: 65,
      max_score: 100,
      suggested_level: 'B1',
    },
  });
  console.log(result2.success ? '✅ PASS' : '❌ FAIL:', result2);
  const diagnosticStudentId = result2.studentId;

  // Test 3: Approve provisional level
  if (diagnosticStudentId) {
    console.log('\nTest 3: Approve provisional level...');
    const result3 = await approveLevelStatus(diagnosticStudentId);
    console.log(result3.success ? '✅ PASS' : '❌ FAIL:', result3);
  }

  // Test 4: Update student
  if (result1.studentId) {
    console.log('\nTest 4: Update student...');
    const result4 = await updateStudent(result1.studentId, {
      phone: '+44 7700 900002',
      current_level: 'B2',
    });
    console.log(result4.success ? '✅ PASS' : '❌ FAIL:', result4);
  }

  console.log('\n✅ All tests complete!');
}

testStudentActions();
```

**Run with:**
```bash
tsx scripts/test-student-actions.ts
```

**Expected Results:**
- ✅ Student created with confirmed level
- ✅ Student created with provisional level (from diagnostic)
- ✅ Provisional level approved successfully
- ✅ Student updated successfully
- ✅ Audit logs created for all actions

---

## ✅ Step 6: Verify Audit Logs

```sql
SELECT
  action,
  resource_type,
  resource_id,
  changes,
  created_at
FROM audit_logs
WHERE action LIKE 'student%'
ORDER BY created_at DESC
LIMIT 10;
```

**Expected:** Logs for student.create, student.update, student.level_approved

---

## ✅ Step 7: Test Flexible Enrollments

### Create test enrollment with custom duration

```sql
-- Get a test student and class
INSERT INTO enrollments (
  tenant_id,
  student_id,
  class_id,
  enrollment_date,
  expected_end_date,
  booked_weeks,
  status
)
SELECT
  (SELECT id FROM tenants LIMIT 1),
  (SELECT id FROM users WHERE role='student' LIMIT 1),
  (SELECT id FROM classes LIMIT 1),
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '8 weeks',  -- Shorter than standard
  8,
  'active';

-- Verify
SELECT
  e.id,
  u.name as student_name,
  c.name as class_name,
  e.enrollment_date,
  e.expected_end_date,
  e.booked_weeks,
  c.start_date as class_start,
  c.end_date as class_end
FROM enrollments e
JOIN users u ON u.id = e.student_id
JOIN classes c ON c.id = e.class_id
WHERE e.booked_weeks IS NOT NULL;
```

**Expected:** Enrollment with custom 8-week duration, different from class duration

---

## ✅ Step 8: Check TypeScript Compilation

```bash
# Build the project
npm run build
```

**Expected Results:**
- ✅ No TypeScript errors
- ✅ No schema import errors
- ✅ Clean build output

---

## ✅ Step 9: Verify RLS Policies

Test that tenant isolation works:

```sql
-- Set user context for tenant 1
SELECT set_user_context(
  (SELECT id FROM users WHERE role='admin' LIMIT 1)::uuid,
  (SELECT id FROM tenants LIMIT 1)::uuid,
  'admin'
);

-- Query should only return data for this tenant
SELECT COUNT(*) FROM programmes;
SELECT COUNT(*) FROM courses;
SELECT COUNT(*) FROM users WHERE role='student';

-- Reset context
RESET app.current_user_id;
RESET app.current_tenant_id;
RESET app.current_role;
```

---

## ✅ Step 10: Performance Check

Test view performance with sample data:

```sql
-- Time the main student view query
EXPLAIN ANALYZE
SELECT * FROM v_students_with_metadata
LIMIT 100;
```

**Expected:** Query completes in < 100ms with sample data

---

## 🐛 Troubleshooting

### Issue: "relation does not exist"
**Solution:** Run migrations in order (0004 → 0005 → 0006 → 0007 → 0008)

### Issue: "function set_user_context does not exist"
**Solution:** Run base migration 0001 first (creates RLS functions)

### Issue: "duplicate key value violates unique constraint"
**Solution:** Student with that email already exists, use different email

### Issue: TypeScript errors after db:generate
**Solution:** Restart TypeScript server in your editor

---

## 📊 Success Criteria

All green checkmarks means foundation is solid:

- ✅ 8 migrations applied successfully
- ✅ 5 programmes + 21 courses created
- ✅ 10 sample students seeded
- ✅ 3 database views working
- ✅ Server actions creating/updating students
- ✅ Audit logs tracking all changes
- ✅ Flexible enrollments supported
- ✅ TypeScript types generated
- ✅ Build succeeds with no errors
- ✅ RLS policies enforcing tenant isolation

**If all pass → Ready for Phase 4 (UI Components)**
**If any fail → Fix before proceeding**

---

## Next Steps After Testing

1. Review test results
2. Fix any issues found
3. Commit database migrations
4. Proceed to Phase 4: Component implementation

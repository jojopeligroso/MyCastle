# MyCastle - Remaining Work to Complete Admin UI

**Created:** 2026-01-19
**Context:** After implementing dev auth bypass and database views (FRESH_0003)

---

## Current State Summary

### ✅ What's Working
- **Dev auth bypass** active (logged in as eoinmaleoin@gmail.com - admin)
- **Admin dashboard** (`/admin`) loads without view errors
- **Database views** created (7 views with stub implementations)
- **Core tables** exist: tenants, users, students, bookings, payments, agencies, courses, accommodation_types, user_roles

### ❌ What's Broken
- **Multiple admin pages** query missing database tables directly
- **Database views** return stub/empty data (need real tables to function properly)
- **Academic/attendance features** completely non-functional due to missing tables

---

## Priority 1: Missing Database Tables (CRITICAL)

The following tables are referenced in the codebase but **do not exist in the database**:

### Academic Tables
1. **`classes`** - Class definitions (name, code, teacher_id, schedule, capacity)
   - Referenced by: `/admin/classes`, `/admin/teachers`, enrollment reports
   - Schema exists: `src/db/schema/academic.ts`
   - Need to migrate from old schema or create fresh

2. **`enrollments`** - Student enrollment in classes
   - Referenced by: `/admin/enrolments`, class rosters, student profiles
   - Schema exists: `src/db/schema/academic.ts`
   - Depends on: classes, students

3. **`enrollment_amendments`** - Enrollment change history
   - Referenced by: `/admin/enrolments/[id]`
   - Schema exists: `src/db/schema/academic.ts`
   - Depends on: enrollments

4. **`class_sessions`** - Individual class meeting times
   - Referenced by: `/admin/attendance`, calendar views
   - Schema exists: `src/db/schema/academic.ts`
   - Depends on: classes

5. **`attendance`** - Student attendance records
   - Referenced by: `/admin/attendance`, reports, KPIs
   - Schema exists: `src/db/schema/academic.ts`
   - Depends on: class_sessions, enrollments, students

### Academic Support Tables
6. **`assignments`** - Homework/assignments
   - Schema exists: `src/db/schema/academic.ts`
   - Depends on: classes

7. **`submissions`** - Student assignment submissions
   - Schema exists: `src/db/schema/academic.ts`
   - Depends on: assignments, students

8. **`grades`** - Student grades
   - Schema exists: `src/db/schema/academic.ts`
   - Depends on: submissions OR enrollments

### System Tables
9. **`audit_logs`** - System audit trail
   - Referenced by: admin dashboard (v_audit_events_recent view)
   - Schema exists: `src/db/schema/system.ts`
   - Critical for: compliance, security, debugging

10. **`invoices`** - Financial invoices (separate from bookings)
    - Schema exists: `src/db/schema/system.ts`
    - Depends on: students, bookings (optional)

11. **`conversations`** - User conversations/messages
    - Schema exists: `src/db/schema/system.ts`
    - Feature not yet implemented in UI

12. **`exports`** - Data export tracking
    - Schema exists: `src/db/schema/system.ts`
    - Feature not yet implemented in UI

### Curriculum Tables
13. **`cefr_descriptors`** - CEFR level descriptors (A1-C2)
    - Schema exists: `src/db/schema/curriculum.ts`
    - Seed data available: `scripts/seed-cefr.ts`

14. **`lesson_plans`** - Teacher lesson plans
    - Schema exists: `src/db/schema/curriculum.ts`
    - Depends on: classes, cefr_descriptors

15. **`materials`** - Teaching materials library
    - Schema exists: `src/db/schema/curriculum.ts`

16. **`lesson_plan_materials`** - Join table for lesson plans & materials
    - Schema exists: `src/db/schema/curriculum.ts`
    - Depends on: lesson_plans, materials

### Programme Tables
17. **`programmes`** - Academic programmes (e.g., "General English", "IELTS Prep")
    - Schema exists: `src/db/schema/programmes.ts`
    - Note: Different from `courses` table

18. **`courses`** (programmes schema) - Course offerings within programmes
    - Schema conflict: Also exists in `src/db/schema/business.ts`
    - Need to resolve: Are these the same table or different tables?

---

## Priority 2: Create FRESH_0004 Migration

**Create:** `migrations/FRESH_0004_academic_tables.sql`

This migration should:

1. **Create academic tables** in the correct dependency order:
   ```sql
   -- Order matters!
   1. classes (no dependencies beyond tenants/users)
   2. enrollments (depends on: classes, students)
   3. enrollment_amendments (depends on: enrollments)
   4. class_sessions (depends on: classes)
   5. attendance (depends on: class_sessions, enrollments)
   6. assignments (depends on: classes)
   7. submissions (depends on: assignments, students)
   8. grades (depends on: submissions/enrollments)
   ```

2. **Follow FRESH schema conventions:**
   - All columns in snake_case
   - Include tenant_id on every table
   - Add created_at, updated_at timestamps
   - Use proper foreign keys with ON DELETE CASCADE/RESTRICT
   - Add indexes for foreign keys and commonly queried columns

3. **Copy from existing schemas:**
   - Use `src/db/schema/academic.ts` as the source of truth
   - Ensure column names match what Drizzle expects
   - Don't modify TypeScript schemas - they're correct

4. **Test the migration:**
   ```bash
   # Run in Supabase SQL Editor
   \i migrations/FRESH_0004_academic_tables.sql

   # Verify tables created
   SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

   # Regenerate TypeScript types
   npm run db:generate
   ```

---

## Priority 3: Create FRESH_0005 Migration (System Tables)

**Create:** `migrations/FRESH_0005_system_tables.sql`

Include:
1. `audit_logs` - **High priority** (needed for admin dashboard)
2. `invoices` - Medium priority
3. `conversations` - Low priority (feature not built)
4. `exports` - Low priority (feature not built)

---

## Priority 4: Create FRESH_0006 Migration (Curriculum Tables)

**Create:** `migrations/FRESH_0006_curriculum_tables.sql`

Include:
1. `cefr_descriptors`
2. `lesson_plans`
3. `materials`
4. `lesson_plan_materials`

Run seed script after migration:
```bash
npm run seed:cefr
```

---

## Priority 5: Resolve Programme/Course Schema Conflict

**Issue:** `courses` table exists in two schemas:
- `src/db/schema/business.ts` - Booking/purchase context (course offerings for sale)
- `src/db/schema/programmes.ts` - Academic context (course within a programme)

**Decision needed:**
1. Are these the same table? (probably not - different purposes)
2. If different, rename one (e.g., `business.ts` → `course_offerings`, `programmes.ts` → `programme_courses`)
3. Update all references in codebase

---

## Priority 6: Enhance Database Views

After tables are created, update `migrations/FRESH_0003_views.sql`:

### v_admin_kpis_daily
```sql
-- Current: Returns 0 for attendance/classes
-- Enhanced: Query real data from attendance, class_sessions, enrollments tables
attendance_rate_7d: SELECT AVG(...) FROM attendance WHERE attended_at >= NOW() - INTERVAL '7 days'
classes_running_today: SELECT COUNT(*) FROM class_sessions WHERE DATE = CURRENT_DATE
capacity_utilisation: SELECT (enrollments / max_students) FROM classes
new_enrolments_7d: SELECT COUNT(*) FROM enrollments WHERE created_at >= NOW() - INTERVAL '7 days'
```

### v_audit_events_recent
```sql
-- Current: Empty stub
-- Enhanced: JOIN audit_logs with users table
SELECT al.*, u.name, u.email FROM audit_logs al JOIN users u ON al.actor_id = u.id
```

### v_users_with_metadata
```sql
-- Current: Returns 0 for enrollment_count, class_count
-- Enhanced: COUNT from enrollments and classes tables
enrollment_count: COUNT(*) FROM enrollments JOIN students ON user_id
class_count: COUNT(*) FROM classes WHERE teacher_id = user_id
```

**Script to update:**
```bash
# Update migrations/FRESH_0003_views.sql
# Re-run: npx tsx scripts/create-views.ts
```

---

## Priority 7: Fix Broken Admin Pages

Once tables exist, test these pages:

### High Priority
1. **`/admin/attendance`** - Attendance dashboard
   - Needs: class_sessions, classes, attendance tables
   - Error: "relation 'class_sessions' does not exist"

2. **`/admin/classes`** - Classes management
   - Needs: classes, enrollments tables

3. **`/admin/enrolments`** - Enrollment management
   - Needs: enrollments, enrollment_amendments tables

### Medium Priority
4. **`/admin/teachers`** - Teachers list
   - Currently works but class_count is 0 (needs classes table)

5. **`/admin/reports/attendance`** - Attendance reports
   - Needs: attendance, class_sessions tables

6. **`/admin/reports/enrollment`** - Enrollment reports
   - Needs: enrollments, classes tables

### Low Priority
7. **`/admin/audit-log`** - Audit log viewer
   - Needs: audit_logs table

8. **`/admin/users`** - User management
   - Works but shows 0 enrollments/classes (needs those tables)

---

## Priority 8: RLS Policies for New Tables

After creating tables, add RLS policies in `migrations/FRESH_0007_rls_additional.sql`:

### Required for ALL new tables:
```sql
-- Enable RLS
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
-- ... etc for all tables

-- Tenant isolation policy
CREATE POLICY "tenant_isolation" ON classes
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- Insert policy
CREATE POLICY "tenant_insert" ON classes
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant')::uuid);
```

### Test RLS:
```sql
-- Set context
SELECT set_user_context(
  '00000000-0000-0000-0000-000000000010'::uuid,  -- user_id
  '00000000-0000-0000-0000-000000000001'::uuid,  -- tenant_id
  'admin'
);

-- Query should work
SELECT * FROM classes LIMIT 10;

-- Without context should fail
RESET app.current_tenant;
SELECT * FROM classes; -- Should return empty or error
```

---

## Priority 9: Seed Data for Testing

Create seed scripts for new tables:

1. **`scripts/seed-classes.ts`** - Create sample classes
2. **`scripts/seed-enrollments.ts`** - Enroll students in classes
3. **`scripts/seed-attendance.ts`** - Generate attendance records
4. **`scripts/seed-audit.ts`** - Generate sample audit logs

**Run all seeds:**
```bash
npm run seed:classes
npm run seed:enrollments
npm run seed:attendance
npm run seed:audit
```

---

## Priority 10: End-to-End Testing

After everything is in place:

1. **Test admin dashboard** - All KPIs should show real data
2. **Test each admin page** - No "relation does not exist" errors
3. **Test user workflows:**
   - Create a new class
   - Enroll students
   - Take attendance
   - View reports
4. **Test RLS isolation:**
   - Switch to different tenant context
   - Verify data isolation
5. **Test dev auth bypass:**
   - Verify admin access
   - Test with DEV_AUTH_BYPASS disabled

---

## Quick Reference: Table Migration Order

```
Phase 1: Core Tables (Already Done)
✅ tenants
✅ users
✅ user_roles
✅ students
✅ agencies
✅ accommodation_types
✅ courses (business)
✅ bookings
✅ payments

Phase 2: Academic Tables (FRESH_0004)
❌ classes
❌ enrollments
❌ enrollment_amendments
❌ class_sessions
❌ attendance
❌ assignments
❌ submissions
❌ grades

Phase 3: System Tables (FRESH_0005)
❌ audit_logs (HIGH PRIORITY)
❌ invoices
❌ conversations
❌ exports

Phase 4: Curriculum Tables (FRESH_0006)
❌ cefr_descriptors
❌ lesson_plans
❌ materials
❌ lesson_plan_materials

Phase 5: Programme Tables (FRESH_0007)
❌ programmes
❌ programme_courses (resolve naming conflict)
```

---

## Estimated Time to Complete

**Migrations:** 4-6 hours
- FRESH_0004 (Academic): 2-3 hours
- FRESH_0005 (System): 1 hour
- FRESH_0006 (Curriculum): 30 minutes
- FRESH_0007 (Programmes): 30 minutes
- RLS policies: 1 hour

**View enhancements:** 1-2 hours
**Seed data:** 2-3 hours
**Testing:** 2-3 hours

**Total:** ~10-15 hours to fully functional admin UI

---

## Next Immediate Steps

1. ✅ Commit and push current work (DONE)
2. 📝 Create `migrations/FRESH_0004_academic_tables.sql`
3. 📝 Run migration in Supabase SQL Editor
4. 📝 Test that classes/attendance pages load
5. 📝 Continue with remaining migrations

---

## Notes

- **Don't modify TypeScript schemas** - They're already correct in `src/db/schema/`
- **Use snake_case in SQL** - All database identifiers must be snake_case
- **Test each migration independently** - Don't run all at once
- **Backup database before migrations** - Use Supabase dashboard backup feature
- **Follow dependency order** - Some tables depend on others existing first

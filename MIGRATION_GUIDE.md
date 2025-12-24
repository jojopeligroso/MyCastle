# Running Student Registry Migrations

Since the development environment doesn't have direct network access to Supabase, you'll need to run the migrations from your local machine or via the Supabase Dashboard.

## Option 1: Supabase Dashboard (Easiest)

### Step 1: Open SQL Editor
1. Go to: https://pdeornivbyfvpqabgscr.supabase.com/project/pdeornivbyfvpqabgscr/sql/new
2. You'll see an SQL editor

### Step 2: Run Migrations in Order

Copy and paste each migration file below into the SQL editor and click "Run" (or press Ctrl+Enter).

**IMPORTANT: Run them in this exact order!**

---

#### Migration 1: Programmes Table

Open: `migrations/0004_add_programmes_table.sql`

Copy the entire contents and run in SQL editor.

**Expected Result**:
- ✅ `programmes` table created
- ✅ 5 sample programmes inserted (GE, BE, EXAM, AE, IE)
- ✅ Message: "INSERT 0 5"

---

#### Migration 2: Courses Table

Open: `migrations/0005_add_courses_table.sql`

Copy the entire contents and run in SQL editor.

**Expected Result**:
- ✅ `courses` table created
- ✅ ~21-25 courses inserted (one for each CEFR level per programme)
- ✅ Message shows number of rows inserted

---

#### Migration 3: Extend Users Table

Open: `migrations/0006_extend_users_for_students.sql`

Copy the entire contents and run in SQL editor.

**Expected Result**:
- ✅ 5 new columns added to `users` table:
  - `current_level`
  - `initial_level`
  - `level_status`
  - `visa_type`
  - `visa_expiry`
- ✅ Constraints and indexes created
- ✅ Existing students updated with default `level_status = 'confirmed'`

---

#### Migration 4: Student Registry Views

Open: `migrations/0007_student_registry_views.sql`

Copy the entire contents and run in SQL editor.

**Expected Result**:
- ✅ 3 views created:
  - `v_students_with_metadata`
  - `v_student_duplicate_candidates`
  - `v_student_visa_status`
- ✅ No errors

---

#### Migration 5: Flexible Enrollments

Open: `migrations/0008_add_enrollment_flexibility.sql`

Copy the entire contents and run in SQL editor.

**Expected Result**:
- ✅ 4 new columns added to `enrollments` table:
  - `expected_end_date`
  - `booked_weeks`
  - `is_amended`
  - `extensions_count`
- ✅ `enrollment_amendments` table created
- ✅ Trigger function created: `update_enrollment_amended_status()`
- ✅ Existing enrollments backfilled with calculated values

---

### Step 3: Verify Migrations

Run this query to verify everything was created:

```sql
-- Check programmes
SELECT code, name, duration_weeks FROM programmes ORDER BY code;

-- Check courses (first 10)
SELECT code, name, cefr_level, programme_id FROM courses ORDER BY code LIMIT 10;

-- Check users table extensions
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('current_level', 'initial_level', 'level_status', 'visa_type', 'visa_expiry');

-- Check views
SELECT viewname
FROM pg_views
WHERE viewname LIKE 'v_student%';

-- Check enrollment_amendments table
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'enrollment_amendments';
```

**Expected Results**:
- 5 programmes
- 20+ courses
- 5 user columns
- 3 views
- 1 enrollment_amendments table

---

## Option 2: Local Machine (If psql is installed)

If you have PostgreSQL's `psql` client installed on your local machine:

```bash
cd /home/eoin/Work/MyCastle/app

# Load environment variables
source .env.local

# Run the migration script
./scripts/run-migrations.sh
```

The script will:
- Run all 5 migrations in order
- Verify each one succeeded
- Show summary of created objects

---

## Option 3: Supabase CLI (If installed)

If you have the Supabase CLI:

```bash
cd /home/eoin/Work/MyCastle/app
supabase db push
```

---

## After Migrations Complete

Once all migrations are successfully run, proceed with:

```bash
# 1. Generate TypeScript types from database schema
npm run db:generate

# 2. Seed sample student data
npm run seed:students

# 3. Test server actions
tsx scripts/test-student-actions.ts
```

---

## Troubleshooting

### "relation already exists"
**Cause**: Migration was partially run before
**Fix**: Check which tables exist, drop them if needed, or skip that migration

### "column already exists"
**Cause**: Column was added in a previous attempt
**Fix**: Check existing columns with:
```sql
SELECT column_name FROM information_schema.columns WHERE table_name = 'users';
```

### "permission denied"
**Cause**: Insufficient database permissions
**Fix**: Ensure you're using the service role key, not the anon key

### "tenant_id" constraint violation
**Cause**: No tenant exists in the database
**Fix**: Check if tenants table has at least one record:
```sql
SELECT id, name FROM tenants;
```

---

## Next Steps

After migrations are complete, refer to `TESTING_CHECKLIST.md` for comprehensive testing steps.

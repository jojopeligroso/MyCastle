# Fresh Schema Migration Guide

**Date:** 2026-01-13
**Purpose:** Apply fresh database schema aligned with Ireland ESL school business logic

---

## ⚠️ Important Notes

- **This is a destructive operation** - All existing tables will be dropped
- Your test user (eoinmaleoin@gmail.com) will be recreated with proper multi-role support
- No existing data is preserved (you confirmed database has no relevant data)
- Migrations include RLS policies, triggers, and seed data

---

## 📋 Pre-Migration Checklist

- [ ] `.env.local` configured and working (✅ Already done)
- [ ] Database connection verified (✅ Already done)
- [ ] Backup current database (⚠️ Optional - skip if no relevant data)
- [ ] Review schema design: `/docs/FRESH_SCHEMA_DESIGN.md`

---

## 🚀 Migration Steps

### Step 1: Open Supabase SQL Editor

Go to: https://app.supabase.com/project/pdeornivbyfvpqabgscr/sql/new

---

### Step 2: Run Migration 0001 (Schema)

**File:** `app/migrations/FRESH_0001_core_schema.sql`

1. Open the file in your editor
2. **Copy the entire file contents** (Ctrl+A, Ctrl+C)
3. Paste into Supabase SQL Editor
4. Click **"Run"** button
5. Wait for completion (should take 5-10 seconds)

**Expected Output:**

```
Migration FRESH_0001 completed successfully!
Next steps:
1. Run FRESH_0002_seed_data.sql to populate default data
2. Update Drizzle schema definitions
3. Test admin UI
```

**What this does:**

- Drops all existing tables (fresh start)
- Creates 9 core tables (tenants, users, user_roles, agencies, courses, accommodation_types, students, bookings, payments)
- Sets up indexes for performance
- Enables Row-Level Security (RLS)
- Creates triggers (payment tracking, updated_at auto-update)

---

### Step 3: Run Migration 0002 (Seed Data)

**File:** `app/migrations/FRESH_0002_seed_data.sql`

1. Open the file in your editor
2. **Copy the entire file contents**
3. Paste into Supabase SQL Editor (clear previous query first)
4. Click **"Run"** button
5. Wait for completion (should take 3-5 seconds)

**Expected Output:**

```
======================================
Migration FRESH_0002 completed successfully!
======================================

Seed Data Summary:
- Tenant: MyCastle Default
- Agencies: 1 (Direct)
- Courses: 6 (A1-C1 + IELTS)
- Accommodation Types: 4
- Users: 3 (Eoin, Maria, John)
- Students: 3
- Bookings: 3
- Payments: 1

Test User Login:
  Email: eoinmaleoin@gmail.com
  Roles: admin + teacher + student

Next steps:
1. Update Drizzle schema definitions
2. Generate TypeScript types: npm run db:generate
3. Launch admin UI: npm run dev
```

**What this does:**

- Creates default tenant
- Seeds 6 courses (General English A1-C1 + IELTS)
- Seeds 4 accommodation types (Host Family, Residence, Student House, Studio)
- Creates "Direct" agency for non-agency sales
- **Creates your test user with 3 roles** (admin + teacher + student)
- Creates 2 additional sample students (1 visa student, 1 EU student)
- Creates 3 sample bookings with financial data
- Creates 1 sample payment

---

### Step 4: Verify Migrations

Run the verification script:

```bash
cd ~/Work/MyCastle/app
npm run verify:schema
```

**Expected Output:**

```
🔍 Verifying Fresh Schema Migrations...

============================================================
📊 TEST RESULTS
============================================================

✅ Tables Exist
   All 9 tables created successfully

✅ Default Tenant
   Tenant "MyCastle Default" created successfully

✅ Multi-Role Test User
   User has all 3 roles: admin, student, teacher

✅ Test User Student Record
   Student record exists: STU-2026-001

✅ Courses Seeded
   6 active courses found (expected: 6)

✅ Accommodation Types Seeded
   4 accommodation types found (expected: 4)

✅ Default Agency (Direct)
   Direct agency created successfully

✅ Sample Students
   3 students created (1 visa, 2 non-visa)

✅ Sample Bookings
   3 bookings created

✅ Payment Tracking & Triggers
   Payment totals correctly calculated via trigger

✅ Row-Level Security (RLS)
   RLS enabled on all 6 core tables

✅ Database Triggers
   9 triggers found (payment trigger: ✓)

============================================================
SUMMARY: 12/12 tests passed, 0 failed
============================================================

🎉 All tests passed! Schema is ready to use.

Next steps:
1. Update Drizzle schema definitions
2. Run: npm run db:generate
3. Run: npm run dev
```

If any tests fail, review the error messages and check migration logs in Supabase.

---

## ✅ Post-Migration Steps

Once migrations are verified:

1. **Update Drizzle schema** - Define TypeScript schema matching new database
2. **Generate types** - `npm run db:generate`
3. **Update admin UI code** - Adjust queries/components for new schema
4. **Test locally** - `npm run dev`
5. **Test multi-role switcher** - Log in as eoinmaleoin@gmail.com and verify role switching

---

## 🔍 What Changed?

### Old Schema → New Schema

| Aspect                 | Old                       | New                                                   |
| ---------------------- | ------------------------- | ----------------------------------------------------- |
| **User Roles**         | Single role per user      | Multi-role support (user_roles table)                 |
| **Enrollments**        | Generic enrollments table | Business-specific bookings table                      |
| **Financial Tracking** | Limited                   | Full breakdown: course, accommodation, fees, payments |
| **Visa Tracking**      | Basic                     | Ireland-specific (First Time/Renewal 1/Renewal 2)     |
| **Payments**           | ❌ No history             | ✅ Full payment history with auto-totals              |
| **Agencies**           | ❌ Not tracked            | ✅ Sales source tracking                              |
| **Accommodation**      | Basic                     | Catalog with pricing                                  |
| **Proxy Booking**      | ❌ Not supported          | ✅ One person can book for others                     |

---

## 🎯 Test User Details

**Email:** eoinmaleoin@gmail.com
**Roles:** admin, teacher, student
**Primary Role:** admin (default UI view)
**Student Number:** STU-2026-001
**Sample Booking:** BK-2026-001 (12 weeks B1 course + Host Family)

**Sample Data:**

- 2 additional students: Maria Silva (visa student), John Mueller (EU student)
- 3 bookings with various statuses
- 1 payment recorded

---

## 🆘 Troubleshooting

### Migration 0001 fails with "relation already exists"

- Expected! The migration drops tables first with `DROP TABLE IF EXISTS`
- If it still fails, manually drop problematic tables in Supabase SQL Editor

### Migration 0002 fails with "duplicate key value"

- Tables may already have data from previous runs
- Solution: Re-run Migration 0001 first to get clean slate

### Verification script fails with "DATABASE_URL not found"

- Check `.env.local` exists and has correct DATABASE_URL
- Try: `cat ~/Work/MyCastle/app/.env.local | grep DATABASE_URL`

### RLS tests fail

- RLS policies may not have been created
- Check Supabase logs for errors during Migration 0001

### Can't connect to database after migration

- Connection string may be wrong
- Verify: `npm run test:db`

---

## 📞 Need Help?

If migrations fail or verification doesn't pass:

1. Check Supabase SQL Editor logs for specific errors
2. Review migration file syntax
3. Verify database credentials in `.env.local`
4. Check Supabase project status (not paused/suspended)

---

## 🔄 Rolling Back (If Needed)

To revert to previous state:

1. Restore from Supabase backup (if created)
2. Or re-run old migrations from `app/migrations/0001-0008` folder

**Note:** Old migrations may have schema conflicts with code expectations.

---

**Ready?** Run Migration 0001, then 0002, then verify!

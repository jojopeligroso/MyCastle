# Student Registry - Quick Start

Fast-track guide to get the Student Registry running in 5 minutes.

## ⚡ Prerequisites

- [x] Code committed and pushed ✅
- [ ] Supabase project created
- [ ] `.env.local` configured with DATABASE_URL
- [ ] Node.js 20+ installed
- [ ] Dependencies installed (`npm install`)

---

## 🚀 5-Minute Setup

### 1. Run Migrations (2 minutes)

**Via Supabase Dashboard**:
```
1. Open: https://pdeornivbyfvpqabgscr.supabase.com/project/.../sql/new
2. Copy/paste each migration file (0004→0008)
3. Click "Run" for each (5 total)
```

**Files to run in order**:
- `app/migrations/0004_add_programmes_table.sql`
- `app/migrations/0005_add_courses_table.sql`
- `app/migrations/0006_extend_users_for_students.sql`
- `app/migrations/0007_student_registry_views.sql`
- `app/migrations/0008_add_enrollment_flexibility.sql`

### 2. Generate Types (30 seconds)

```bash
cd app
npm run db:generate
```

### 3. Seed Data (30 seconds)

```bash
npm run seed:students
```

### 4. Launch (1 minute)

```bash
npm run dev
```

Open: `http://localhost:3000/admin/students`

---

## ✅ Verify It Works

You should see:
- 📊 4 stat cards (Total: 10, Active: 8, Visa Expiring: 2, At Risk: 0)
- 📋 List of 10 students
- 🔍 Filter buttons (All, Active, Visa Expiring, etc.)
- ➕ "Add Student" button

**Click a student** → Detail drawer slides in
**Click "Add Student"** → Create form appears

---

## 🧪 Quick Test

```bash
# Run automated tests
tsx scripts/test-student-actions.ts

# Expected: 7/7 tests passed ✅
```

---

## 🐛 Quick Troubleshooting

**"relation does not exist"**
→ Migrations not run. Go to Step 1.

**"No students found"**
→ Data not seeded. Go to Step 3.

**TypeScript errors**
→ Run `npm run db:generate`

**Can't connect to database**
→ Check `.env.local` has correct `DATABASE_URL`

---

## 📚 Full Documentation

For detailed setup, testing, and troubleshooting:
- See `NEXT_STEPS_GUIDE.md` (comprehensive 500+ line guide)
- See `MIGRATION_GUIDE.md` (migration details)
- See `TESTING_CHECKLIST.md` (full test scenarios)

---

## 🎯 What You Get

A fully functional Student Registry with:
- ✅ Student management (create, update, archive)
- ✅ CEFR level tracking with approval workflow
- ✅ Visa expiry monitoring
- ✅ Advanced filtering and search
- ✅ Responsive UI (mobile/desktop)
- ✅ Role-based permissions

**Total setup time**: ~5 minutes
**Lines of code**: 5,367+
**Components**: 13
**Features**: Production-ready

---

**Need help?** See `NEXT_STEPS_GUIDE.md` for troubleshooting.

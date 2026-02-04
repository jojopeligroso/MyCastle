---
status: APPROVED
last_updated: 2026-01-02
next_review: 2026-01-16
owner: Eoin Malone
---

# Getting Started with MyCastle

Welcome to MyCastle! This guide will get you up and running quickly, whether you're a developer, stakeholder, or new team member.

**Choose your path:**
- **[5-Minute Quick Start](#5-minute-quick-start)** - Developers: Get running ASAP
- **[Project Overview](#project-overview)** - Stakeholders: Understand what we're building
- **[Detailed Setup](#detailed-setup)** - New developers: Complete environment setup

---

## 5-Minute Quick Start

Fast-track for developers who want to see the Student Registry running immediately.

### Prerequisites Checklist
- [x] Code cloned ✅
- [ ] Supabase project access
- [ ] `.env.local` configured with DIRECT_URL (Session Mode Pooler, port 5432)
- [ ] Node.js 20+ installed
- [ ] Dependencies installed (`npm install`)

### Step 1: Run Migrations (2 minutes)

**Via Supabase Dashboard:**
1. Open: https://pdeornivbyfvpqabgscr.supabase.com/project/pdeornivbyfvpqabgscr/sql/new
2. Copy/paste each migration file (0004→0008) from `app/migrations/`
3. Click "Run" for each (5 total)

**Files to run in order:**
- `0004_add_programmes_table.sql`
- `0005_add_courses_table.sql`
- `0006_extend_users_for_students.sql`
- `0007_student_registry_views.sql`
- `0008_add_enrollment_flexibility.sql`

### Step 2: Generate Types (30 seconds)

```bash
cd app
npm run db:generate
```

### Step 3: Seed Data (30 seconds)

```bash
npm run seed:students
```

### Step 4: Launch (1 minute)

```bash
npm run dev
```

Open: **http://localhost:3000/admin/students**

### Verify It Works ✅

You should see:
- 📊 4 stat cards (Total: 10, Active: 8, Visa Expiring: 2, At Risk: 0)
- 📋 List of 10 students
- 🔍 Filter buttons (All, Active, Visa Expiring, etc.)
- ➕ "Add Student" button

**Try these:**
- Click a student → Detail drawer slides in
- Click "Add Student" → Create form appears
- Run tests: `tsx scripts/test-student-actions.ts` (Expected: 7/7 passed ✅)

### Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| "relation does not exist" | Migrations not run. Go to Step 1. |
| "No students found" | Data not seeded. Go to Step 3. |
| TypeScript errors | Run `npm run db:generate` |
| "Failed query: SET app.user_email" | Using wrong pooler type. Use Session Mode (port 5432) not Transaction Mode (port 6543). See [Database Requirements](#22-understanding-database-connection-requirements) |
| Can't connect to database | Check `.env.local` has `DIRECT_URL` with Session Mode Pooler |

**Next:** See [Detailed Setup](#detailed-setup) for full environment configuration.

---

## Project Overview

### What is MyCastle?

MyCastle is a comprehensive **ESL (English as a Second Language) school management platform** with AI-assisted teaching workflows.

**Target Users:**
- **Teachers:** Lesson planning, timetables, attendance, student progress
- **Admins:** Student registry, enrollments, finance, compliance, reporting
- **Students:** Timetable, materials, progress tracking, AI tutor (future)

### Current Status (Jan 2, 2026)

**Phase 1: Admin UI/UX - 35% Complete**

| Module | Status | Description |
|--------|--------|-------------|
| Admin Dashboard | ✅ Complete | KPIs, alerts, work queue, activity feed |
| User Management | ✅ Complete | User roles, permissions, audit trail |
| Student Registry | 🟡 In Progress | CRUD, visa tracking, level management |
| Enrollments | ⏳ Pending | Student-class relationships, amendments |
| Finance | 🟡 API Complete | Invoices, payments, financial tracking |
| Compliance | ⏳ Pending | Visa alerts, regulatory reports |
| Programmes & Courses | 🟡 API Complete | Academic curriculum structure |

**Recent Achievements:**
- ✅ 30 API endpoints for admin modules
- ✅ Student Registry UI with 6-tab detail drawer
- ✅ Comprehensive unit test coverage (100% API)
- ✅ Production-ready database migrations

### Architecture Highlights

**Tech Stack:**
- **Frontend:** Next.js 16, React 19, Tailwind CSS 4
- **Backend:** Next.js App Router, Server Actions
- **Database:** PostgreSQL (Supabase), Drizzle ORM
- **AI:** OpenAI GPT-4o for lesson generation
- **Auth:** Supabase Auth with RLS policies

**MCP (Model Context Protocol) Architecture (v3.0):**
- 8 domain-driven MCP servers (Teacher, Admin, Student, Identity, Finance, Academic, Compliance, Timetable)
- ≤10 tools per MCP for optimal performance
- Role-based scoping for security
- Future extensibility for Parent, Partner, Analytics MCPs

**Key Features:**
- Multi-tenancy with tenant isolation
- Hash-chained attendance (tamper-evident)
- Flexible enrollment durations with amendments
- CEFR-aligned curriculum (A1-C2)
- Real-time visa expiry tracking
- Comprehensive audit logging
- WCAG 2.2 AA accessibility

### Documentation Structure

**Core "Spine" Documents:**
1. **README.md** - Navigation hub
2. **REQ.md** - Requirements specification (user stories, GIVEN-WHEN-THEN)
3. **DESIGN.md** - Technical design (architecture, database, API)
4. **TASKS.md** - Work breakdown structure (42 tasks across 11 epics)

**Living Documents:**
- **STATUS.md** - Current sprint tasks with 20-min subtasks
- **ROADMAP.md** - Phases 1-4 (105 tasks)
- **TESTING.md** - All testing procedures

**Guides:**
- **DEPLOYMENT.md** - Production deployment
- **GETTING-STARTED.md** - This document

**Reference:**
- **docs/reference/** - Architecture decisions, business priorities
- **docs/archive/** - Historical sprint reports, gap analyses
- **spec/** - Detailed technical specifications

### Success Metrics

**Phase 1 Goals (Target: Jan 31, 2026):**
- [ ] 21 admin pages functional
- [ ] Full CRUD for students, enrollments, finance
- [ ] Visa compliance tracking
- [ ] 100% test coverage
- [ ] Ready for UAT

**Long-term Vision:**
- **Phase 2:** Teacher workflows (lesson planning, grading, communication)
- **Phase 3:** Student portal (timetable, materials, AI tutor)
- **Phase 4:** Advanced features (analytics, parent portal, integrations)

---

## Detailed Setup

Complete environment setup for new developers.

### Prerequisites

**Required:**
- **Node.js 20+** - [Download](https://nodejs.org/)
- **Git** - [Download](https://git-scm.com/)
- **Supabase account** - [Sign up](https://supabase.com/)
- **OpenAI API key** - [Get one](https://platform.openai.com/api-keys)

**Optional:**
- **PostgreSQL client** (psql) - For local database queries
- **VS Code** - Recommended editor with extensions:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - Drizzle ORM

### Step 1: Clone Repository

```bash
git clone https://github.com/yourusername/mycastle.git
cd mycastle/app
npm install
```

### Step 2: Supabase Configuration

#### 2.1 Get Your Supabase Credentials

1. Go to https://supabase.com/dashboard
2. Select your project (or create new: "MyCastle Dev")
3. Navigate to **Settings** → **API**
4. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJhbG...`)
   - **service_role key** (starts with `eyJhbG...`) - **Keep this secret!**

5. Navigate to **Settings** → **Database**
6. Copy the **Connection string** (Transaction mode):
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```

#### 2.2 Get OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Create new API key: "MyCastle Dev"
3. Copy it immediately (you can't see it again)

#### 2.3 Configure .env.local

```bash
cd app
cp .env.local.example .env.local
```

Edit `.env.local` with your credentials:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI Configuration
OPENAI_API_KEY=sk-proj-...

# Database Configuration
# ⚠️ CRITICAL: Use Session Mode Pooler (port 5432) for RLS support!
DIRECT_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres

# Next.js Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Environment
NODE_ENV=development
```

**⚠️ Important:** Never commit `.env.local` to git! It's already in `.gitignore`.

#### 2.2 Understanding Database Connection Requirements

**CRITICAL: RLS Session Variable Support**

MyCastle uses Row Level Security (RLS) with session variables to enforce data isolation. This requires a specific type of database connection.

**Supabase offers 3 connection types:**

| Connection Type | Port | Session Variables | Use for MyCastle |
|----------------|------|-------------------|------------------|
| **Session Mode Pooler** | 5432 | ✅ Supported | **✅ REQUIRED** |
| Direct Connection | 5432 | ✅ Supported | ✅ Alternative |
| Transaction Mode Pooler | 6543 | ❌ Not Supported | ❌ **BREAKS APP** |

**How to get Session Mode Pooler connection:**

1. In Supabase Dashboard, go to **Settings** → **Database**
2. Scroll to **Connection Pooling** section
3. Select **Session** mode (not Transaction!)
4. Copy the connection string
5. Use this as your `DIRECT_URL` in `.env.local`

**Why Transaction Mode fails:**

Transaction Mode Pooler (port 6543) routes each query to different PostgreSQL backends, so session state is lost. You'll see this error:
```
Failed query: SET app.user_email = 'user@example.com'
```

This causes complete navigation failure across the entire application.

**Verification:**

Your connection string should contain:
- ✅ Port `5432` (not 6543)
- ✅ Either `pooler.supabase.com:5432` (Session Mode) or `db.xxxx.supabase.co:5432` (Direct)
- ❌ NOT `pooler.supabase.com:6543` (Transaction Mode)

### Step 3: Test Database Connection

```bash
npm run test:db
```

**Expected output:**
```
🔍 Testing database connection...
✅ Connection established!
✅ All checks passed!
```

### Step 4: Run Database Migrations

**Option A: Supabase Dashboard (Recommended)**

See [5-Minute Quick Start Step 1](#step-1-run-migrations-2-minutes)

**Option B: psql (if installed)**

```bash
source .env.local
psql $DATABASE_URL -f migrations/0004_add_programmes_table.sql
psql $DATABASE_URL -f migrations/0005_add_courses_table.sql
psql $DATABASE_URL -f migrations/0006_extend_users_for_students.sql
psql $DATABASE_URL -f migrations/0007_student_registry_views.sql
psql $DATABASE_URL -f migrations/0008_add_enrollment_flexibility.sql
```

**Verify migrations:**
```bash
npm run db:studio  # Opens Drizzle Studio
```

### Step 5: Generate TypeScript Types

```bash
npm run db:generate
```

**Verify:**
```bash
npx tsc --noEmit  # Should show 0 errors
```

### Step 6: Seed Sample Data

```bash
# Seed CEFR descriptors (42 descriptors)
npm run seed:cefr

# Seed sample students (10 students)
npm run seed:students
```

### Step 7: Run Development Server

```bash
npm run dev
```

**Open in browser:**
- Main app: http://localhost:3000
- Student Registry: http://localhost:3000/admin/students
- Admin Dashboard: http://localhost:3000/admin

### Step 8: Verify Setup

**Run all quality checks:**
```bash
npm run check  # Runs format, lint, typecheck, test, build
```

**Expected:**
- ✅ Format: No changes needed
- ✅ Lint: 0 errors
- ✅ TypeCheck: 0 errors
- ✅ Tests: All passing
- ✅ Build: Successful

### Step 9: Run Tests

**Unit tests:**
```bash
npm test  # Jest
```

**E2E tests:**
```bash
npx playwright install  # First time only
npm run test:e2e
```

**Server action tests:**
```bash
tsx scripts/test-student-actions.ts
```

### Step 10: Explore the Codebase

**Key directories:**
```
app/
├── src/
│   ├── app/             # Next.js app router
│   │   ├── admin/       # Admin pages
│   │   ├── teacher/     # Teacher pages
│   │   └── api/         # API routes
│   ├── components/      # React components
│   ├── db/              # Database (Drizzle)
│   │   └── schema/      # Table definitions
│   ├── lib/             # Utilities
│   └── hooks/           # Custom React hooks
├── migrations/          # SQL migrations
├── scripts/             # Utility scripts
└── tests/               # E2E tests
```

**Important files:**
- `src/db/schema/` - All table definitions
- `src/app/admin/students/` - Student Registry
- `src/components/admin/` - Admin UI components
- `drizzle.config.ts` - Database config
- `tailwind.config.ts` - Styling config

---

## Next Steps

### For Developers

1. **Read the documentation:**
   - **STATUS.md** - See current sprint tasks
   - **ROADMAP.md** - Understand the full project plan
   - **REQ.md** - Learn the requirements
   - **DESIGN.md** - Study the architecture

2. **Pick up a task:**
   - Check STATUS.md for current sprint tasks
   - Each task has 20-minute subtasks for easy tracking
   - Follow the Definition of Done in TASKS.md

3. **Development workflow:**
   - Create feature branch from `main`
   - Make changes with frequent commits
   - Run `npm run check` before committing
   - Create PR with clear description
   - Link to task/issue in PR description

4. **Testing requirements:**
   - Unit tests for all API endpoints
   - E2E tests for user workflows
   - RLS policy tests for security
   - Performance tests for queries

### For Stakeholders

1. **Track progress:**
   - **STATUS.md** - Weekly updates on current work
   - **ROADMAP.md** - Milestone tracking (Phases 1-4)
   - **GitHub Issues** - Detailed task tracking

2. **Review deliverables:**
   - End of sprint demos
   - UAT sessions for completed features
   - Documentation reviews

3. **Provide feedback:**
   - Requirements clarification (REQ.md)
   - Design decisions (DESIGN.md)
   - Priority adjustments (ROADMAP.md)

---

## Getting Help

**Documentation:**
- **TESTING.md** - All testing procedures
- **DEPLOYMENT.md** - Production deployment guide
- **docs/archive/** - Historical reference

**Common Issues:**
- Check TESTING.md "Troubleshooting" section
- Review GitHub Issues for known problems
- Check commit history for recent changes

**Contact:**
- Project Owner: Eoin Malone
- Repository: https://github.com/yourusername/mycastle
- Issues: https://github.com/yourusername/mycastle/issues

---

## Success Checklist

### I can...
- [ ] Clone and install dependencies
- [ ] Configure `.env.local` with all credentials
- [ ] Run database migrations successfully
- [ ] Generate TypeScript types without errors
- [ ] Seed sample data
- [ ] Start development server
- [ ] View Student Registry at /admin/students
- [ ] Run all tests (unit + E2E) successfully
- [ ] Make a code change and see it hot-reload
- [ ] Run quality checks before committing

### The system shows...
- [ ] 10 sample students in Student Registry
- [ ] Correct stat cards (Total: 10, Active: 8)
- [ ] Working filters and search
- [ ] Detail drawer opens smoothly
- [ ] Create student form works
- [ ] No console errors
- [ ] All tests passing (100%)
- [ ] TypeScript 0 errors
- [ ] ESLint 0 errors

**If all checked → You're ready to contribute! 🎉**

---

**Last Updated:** 2026-01-02
**Maintained By:** Eoin Malone
**Review Schedule:** Monthly

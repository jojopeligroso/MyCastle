# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Purpose:** Primary instructions for Claude Code working with MyCastle
> **Last Updated:** 2026-02-11
> **Keep it under 250 lines** - Use progressive disclosure for details

---

## 🏰 Project Identity

**MyCastle** is an ESL school operations platform with **8-domain MCP architecture**:
- Identity & Access, Academic Operations, Attendance/Compliance, Finance, Student Services, Operations/Quality, Teacher Portal, Student Portal

**Stack:** Next.js 16 (App Router), Supabase (PostgreSQL + Auth), Drizzle ORM, TypeScript, Playwright

**Key Principle:** Domain-driven design with proper MCP protocol (JSON-RPC 2.0 over stdio)

---

## 📌 MVP Readiness + Policy (SSOT)

**Readiness hierarchy (source of truth):**
- **MVP_SPEC_REVIEW.md = Authority (SSOT for readiness)**
- STATUS.md = Signal (derived)
- ROADMAP.md = Intent (future)
- project-review.md = Learning (post-hoc)

**MVP policy decisions:**
- **/api/admin/* routes are admin-only** (enforce role checks server-side)
- **Admin attendance does NOT require hash-chain compliance for MVP**

---

## 🚨 CRITICAL: Repository Structure

**⚠️ IMPORTANT - READ THIS FIRST:**

This repository has a **monorepo-style structure**:
```
/home/eoin/Work/MyCastle/          # Root - contains documentation only
├── CLAUDE.md                       # This file
├── STATUS.md                       # Project status
├── REQ.md, DESIGN.md, etc.        # Specification docs
└── app/                            # ⭐ Next.js application lives HERE
    ├── package.json                # ⭐ npm commands run from HERE
    ├── src/                        # Source code
    ├── migrations/                 # Database migrations
    └── scripts/                    # Utility scripts
```

**CRITICAL RULES:**
1. **ALL npm commands MUST be run from `/home/eoin/Work/MyCastle/app`** (not root!)
2. **Git commands run from root** (`/home/eoin/Work/MyCastle`)
3. **When navigating with Bash, ALWAYS `cd ~/Work/MyCastle/app` before running npm**

**Example (CORRECT):**
```bash
cd ~/Work/MyCastle/app && npm run dev      # ✅ CORRECT
cd ~/Work/MyCastle/app && npm run check    # ✅ CORRECT
```

**Example (WRONG - will fail):**
```bash
cd ~/Work/MyCastle && npm run dev          # ❌ WRONG! No package.json here
npm run dev                                 # ❌ WRONG! Depends on pwd
```

---

## ⚠️ CRITICAL WORKFLOWS

### 1. STATUS.md Update Discipline (THE MOST IMPORTANT RULE)

**WHEN TO UPDATE:**
- ✅ After completing any task (not weekly, not "later" - IMMEDIATELY)
- ✅ At end of each work session (even if incomplete)
- ✅ Before running `/MyCastle-standup` or `/MyCastle-context`
- ✅ Before committing code that completes a task

**WHAT TO UPDATE:**
```markdown
1. Mark completed tasks: ⏳ → ✅
2. Update phase completion percentage (X/60 tasks)
3. Update "In Progress This Week" section
4. Update last_updated date in frontmatter
5. Move completed work to "Recent Wins"
6. Update/remove blockers when resolved
```

**Git hooks installed:** Pre-commit warns if STATUS.md >7 days old, post-commit reminds if not updated

### 2. Commit Workflow (Definition of Done)

**BEFORE EVERY COMMIT:**
```bash
# 1. Code quality checks
npm run format          # Prettier formatting
npm run lint            # ESLint check
npm test                # Unit tests
npx tsc --noEmit       # Type check

# Or use shortcut:
npm run check           # Runs all of above + build

# 2. Update STATUS.md (if task complete)
# Edit STATUS.md to reflect completed work

# 3. Commit with co-author
git add .
git commit -m "feat: description

Updates STATUS.md to reflect completion of Task X.X

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

**OR use skill:** `/commit` (orchestrates all steps)

### 3. Database Migrations (ORDER MATTERS!)

**Migration sequence** (MUST run in order):
```bash
# In Supabase SQL Editor:
FRESH_0000_drop_all.sql      # (dev only - drops everything)
FRESH_0001_core_schema.sql   # Core tables + multi-tenant structure
FRESH_0002_rls_policies.sql  # Row-Level Security policies

# After migrations (run from /app directory):
cd ~/Work/MyCastle/app
npm run db:generate     # Regenerate TypeScript types
npx tsc --noEmit       # Verify no type errors
npm run dev            # Restart dev server
```

**Migration files location:** `/app/migrations/`
**Detailed guide:** `/app/migrations/README.md`

### 4. RLS Context (ALWAYS SET FIRST!)

**CRITICAL:** Every database query MUST set RLS context first:

```typescript
import { db } from '@/db';
import { sql } from 'drizzle-orm';

// ALWAYS do this BEFORE any query:
await db.execute(sql`
  SELECT set_user_context(
    ${userId}::uuid,
    ${tenantId}::uuid,
    ${role}
  )
`);

// Now all queries are automatically scoped:
const data = await db.select().from(table);
```

**Why:** Supabase RLS policies enforce data isolation. Without context = empty results or permission denied.
**Guide:** `/app/docs/RLS-POLICIES.md`

### 5. Database Naming Convention & Drizzle ORM (CRITICAL!)

**CRITICAL RULE: Always use camelCase when accessing Drizzle schema properties in TypeScript code.**

**Stack architecture:**
- **Database layer (Supabase/PostgreSQL):** Uses snake_case for column names (SQL standard)
- **TypeScript layer (Application code):** Uses camelCase for properties (JavaScript convention)
- **Drizzle ORM:** Automatically bridges the two conventions

**How Drizzle schema works:**
```typescript
// In schema files (src/db/schema/*.ts):
export const users = pgTable('users', {
  tenantId: uuid('tenant_id'),        // TS property: camelCase, DB column: snake_case
  primaryRole: varchar('primary_role'),
  createdAt: timestamp('created_at'),
});
```

**In your application code - ALWAYS use camelCase:**
```typescript
// ✅ CORRECT - Use camelCase schema properties:
const user = await db.select({
  id: users.id,
  name: users.name,
  tenantId: users.tenantId,        // ✅ camelCase
  primaryRole: users.primaryRole,  // ✅ camelCase
  createdAt: users.createdAt,      // ✅ camelCase
}).from(users);

// ❌ WRONG - Don't use snake_case (properties don't exist):
const user = await db.select({
  tenant_id: users.tenant_id,      // ❌ TypeScript error: Property doesn't exist
  primary_role: users.primary_role, // ❌ TypeScript error: Property doesn't exist
  created_at: users.created_at,    // ❌ TypeScript error: Property doesn't exist
}).from(users);
```

**Drizzle automatically generates SQL with snake_case:**
```sql
-- Generated SQL (automatic conversion):
SELECT id, name, tenant_id, primary_role, created_at FROM users;
```

**Common mapping reference:**
| TypeScript (camelCase) | Database (snake_case) |
|------------------------|----------------------|
| `users.tenantId` | `tenant_id` |
| `users.primaryRole` | `primary_role` |
| `users.createdAt` | `created_at` |
| `users.updatedAt` | `updated_at` |
| `users.deletedAt` | `deleted_at` |
| `users.lastLogin` | `last_login` |
| `users.emailVerified` | `email_verified` |
| `users.avatarUrl` | `avatar_url` |
| `users.dateOfBirth` | `date_of_birth` |
| `students.userId` | `user_id` |
| `students.studentNumber` | `student_number` |
| `students.visaType` | `visa_type` |
| `classes.teacherId` | `teacher_id` |
| `classes.startDate` | `start_date` |
| `classes.enrolledCount` | `enrolled_count` |

**When writing raw SQL (migrations, views):**
- ALWAYS use snake_case for column names (database convention)
- ALWAYS use snake_case for table names
- ALWAYS use snake_case for view names
- Convention: Views prefix with `v_` (e.g., `v_admin_kpis_daily`)

**Why this matters:**
- Using wrong property names causes TypeScript compilation errors
- Runtime errors from accessing undefined properties
- This was the root cause of admin UI instability (Jan 2026)

### 6. Testing Requirements

**Unit Tests (Jest) - 337 test files:**
```bash
npm test                # Run unit tests
npm run test:watch      # Watch mode
npm run test:coverage   # With coverage report
```

**E2E Tests (Playwright) - 5 test specs:**
```bash
npm run test:e2e:ui     # Interactive mode (RECOMMENDED)
npm run test:e2e        # Headless mode
npm run test:e2e:debug  # Step-by-step debugging
```

**Test BOTH mobile + desktop** (5 browsers: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari)

**Before merging to main:**
```bash
npm run check           # Format, lint, test, type-check, build
# Note: check:full exists but not yet defined in package.json
```

**Guide:** `/app/PLAYWRIGHT-GUIDE.md` (when created)

---

## 📁 Codebase Structure

```
MyCastle/
├── app/                              # Next.js application
│   ├── src/
│   │   ├── app/                      # App Router pages & API routes
│   │   │   ├── admin/               # Admin UI (30+ routes)
│   │   │   ├── teacher/             # Teacher portal
│   │   │   ├── api/                 # API routes & MCP orchestration
│   │   │   └── auth/                # Auth callback handlers
│   │   ├── components/              # React components
│   │   │   ├── admin/              # Admin-specific components
│   │   │   ├── ui/                 # Shared UI components
│   │   │   └── [domain]/           # Domain-specific components
│   │   ├── db/
│   │   │   ├── schema/
│   │   │   │   ├── index.ts        # Schema exports
│   │   │   │   ├── core.ts         # Users, tenants, audit logs
│   │   │   │   └── business.ts     # Students, bookings, payments
│   │   │   └── index.ts            # Database client & connection
│   │   ├── lib/
│   │   │   ├── auth/               # Authentication utilities
│   │   │   ├── mcp/                # MCP architecture
│   │   │   │   ├── host/           # MCP host orchestration
│   │   │   │   └── servers/        # 5 MCP servers (identity, finance, etc.)
│   │   │   ├── supabase/           # Supabase client
│   │   │   └── security/           # Security utilities
│   │   └── __tests__/              # 337 unit tests
│   ├── e2e/                         # 5 Playwright E2E tests
│   ├── migrations/                  # SQL migration files
│   ├── scripts/                     # Utility scripts (seed, test)
│   └── package.json
│
├── Core Specification ("The Spine")
├── REQ.md                           # Requirements (What & Why)
├── DESIGN.md                        # Design (How - Architecture)
├── TASKS.md                         # Work breakdown (42 core + 34 migration)
├── STATUS.md                        # ⭐ Current sprint (KEEP UPDATED!)
├── ROADMAP.md                       # 4 phases, 105 tasks
│
└── Guides & Documentation
    ├── GETTING-STARTED.md           # Quick start
    ├── TESTING.md                   # Testing strategy
    ├── DEPLOYMENT.md                # Production deployment
    ├── docs/                        # Additional documentation
    └── spec/                        # Detailed MCP specs
```

**Key File Locations:**
- Database schema: `app/src/db/schema/` (modular: core.ts, business.ts)
- Database client: `app/src/db/index.ts`
- MCP servers: `app/src/lib/mcp/servers/` (identity, finance, academic, attendance, teacher)
- Admin routes: `app/src/app/admin/` (30+ feature routes)
- E2E tests: `app/e2e/` (5 specs covering auth, admin, teacher flows)

---

## 🚀 Quick Command Reference

### Development
```bash
npm run dev             # Start dev server (localhost:3000)
npm run db:studio       # Open Drizzle Studio (database GUI)
npm run build           # Production build
```

### Code Quality
```bash
npm run format          # Format with Prettier
npm run format:check    # Check formatting (no changes)
npm run lint            # ESLint check
npm test                # Jest unit tests
npm run check           # All checks + build (pre-commit)
```

### Database
```bash
npm run db:generate     # Generate types from schema
npm run db:migrate      # Run migrations (prefer manual via Supabase SQL Editor)
npm run db:push         # Push schema changes (dev only)
npm run test:db         # Test database connection
npm run verify:schema   # Verify schema matches database
npm run migrate:fresh   # Run fresh migrations (dev only)
```

### Seeding
```bash
npm run seed:admin      # Seed admin user
npm run seed:cefr       # Seed CEFR descriptors
npm run seed:students   # Seed sample students
```

### Testing
```bash
npm test                # Unit tests
npm run test:watch      # Unit tests (watch mode)
npm run test:coverage   # Unit tests with coverage
npm run test:e2e        # E2E tests (headless)
npm run test:e2e:ui     # E2E tests (interactive UI)
npm run test:e2e:debug  # E2E tests (step debugger)
npm run test:e2e:report # Show E2E test report
```

### MCP Servers (Run standalone)
```bash
npm run mcp:identity    # Identity & Access MCP
npm run mcp:finance     # Finance MCP
npm run mcp:academic    # Academic Operations MCP
npm run mcp:attendance  # Attendance/Compliance MCP
npm run mcp:teacher     # Teacher MCP
```

---

## 🎯 Claude Skills for MyCastle

| Skill | Purpose | When to Use |
|-------|---------|-------------|
| `/MyCastle` | Navigate + git pull | Start of session |
| `/MyCastle-next-task` | **Minimal task focus** | **Daily work (FASTEST)** |
| `/MyCastle-standup` | Daily standup view | Start of workday |
| `/MyCastle-status` | Quick health check | After milestones |
| `/MyCastle-context` | Full project context | Before new epic |
| `/MyCastle-align [task]` | Deep spec alignment | Before complex task |
| `/commit` | Orchestrated commit | After feature complete |
| `/check` | All quality checks | Before push |
| `/test` | Run tests with coverage | During development |
| `/dev` | Start dev server | Testing locally |

---

## 📚 Navigation Map (Progressive Disclosure)

### Specifications (The Spine)
- **Requirements:** `REQ.md` (What & Why)
- **Design:** `DESIGN.md` (How - Architecture, MCP domains, data model)
- **Tasks:** `TASKS.md` (Work breakdown, DoR/DoD)
- **Current Status:** `STATUS.md` (Current sprint, next task)
- **Roadmap:** `ROADMAP.md` (Phases 1-4, 105 tasks)

### Detailed Guides (When You Need Deep Dives)
- **Getting Started:** `GETTING-STARTED.md`
- **Testing:** `TESTING.md`
- **Deployment:** `DEPLOYMENT.md`
- **RLS Policies:** `app/docs/RLS-POLICIES.md`
- **MCP Architecture:** `app/docs/MCP_ARCHITECTURE.md`
- **Magic Link Auth:** `app/docs/MAGIC_LINK_AUTH.md`
- **Migrations:** `app/migrations/README.md`

### API Reference
- **API Docs:** `docs/API_REFERENCE.md`
- **Integration Guide:** `docs/INTEGRATION_GUIDE.md`

---

## ❌ Anti-Patterns (Critical Mistakes to Avoid)

1. **❌ Forgetting STATUS.md updates** → Causes project drift (git hooks will remind you)
2. **❌ Querying without RLS context** → Silent data loss, permission errors
3. **❌ Running migrations out of order** → Schema corruption
4. **❌ Pushing without `/check`** → CI fails, wasted time
5. **❌ Testing desktop only** → Mobile issues missed (test 5 browsers!)
6. **❌ Committing without unit tests** → DoD not met
7. **❌ Modifying RLS policies without security review** → Data leak risk
8. **❌ Writing >10 tools per MCP** → Breaks domain isolation principle
9. **❌ Importing from wrong db path** → Use `@/db` not relative paths
10. **❌ Pushing to wrong branch** → CI runs on `main`, `develop`, `claude/**` only
11. **❌ Updating only dashboard cards** → MUST also update Navigation.tsx and Sidebar.tsx
    - Dashboard cards: `app/src/app/dashboard/page.tsx`
    - Top navigation (hamburger menu): `app/src/components/layout/Navigation.tsx`
    - Admin sidebar: `app/src/components/admin/Sidebar.tsx`

---

## 🔧 Git Hooks & CI/CD

**Git Hooks (Local):**
- **Pre-Commit:** Warns if STATUS.md >7 days old
- **Post-Commit:** Reminds if STATUS.md not included in commit
- **Location:** `.git/hooks/pre-commit`, `.git/hooks/post-commit`

**CI/CD (GitHub Actions):**
- **Triggers:** Push to `main`, `develop`, or `claude/**` branches
- **Jobs:** Lint, type-check, build, test
- **Deployment:** Vercel on push to `main`
- **Config:** `.github/workflows/ci.yml`

---

## 🎯 Session Workflow

**Start of Session:**
```bash
/MyCastle              # Navigate + git pull
/MyCastle-next-task    # Load ONLY the current task (minimal context)
```

**Alternative (for broader context):**
```bash
/MyCastle-standup      # Review entire sprint (heavier context)
```

**During Work:**
```bash
npm run dev            # Development server
npm test               # Unit tests as you go
npm run test:e2e:ui    # E2E tests (when needed)
```

**End of Session / Task Completion:**
```bash
npm run check          # Verify quality (format, lint, test, typecheck, build)
# Update STATUS.md     # Mark task ✅, update progress %
/commit                # Orchestrated commit
/clear                 # Clear context
/MyCastle-next-task    # Load next task
```

### Context Window Management (AUTO-COMPACT)

**CRITICAL RULE:** When context window exceeds **100k tokens**, Claude MUST:

1. **Commit current work** with a detailed message describing:
   - What was completed
   - What's still in progress
   - Any blockers or issues discovered
   - Files modified

2. **Sign off** with model name (e.g., "— Claude Opus 4.5")

3. **Run `/compact`** to summarize and clear context

This prevents context overflow and ensures work is never lost. The compacted summary preserves continuity for the next session.

---

## 📊 Definition of Done Checklist

Before marking any task complete:
- [ ] Code formatted (`npm run format`)
- [ ] Linting passes (`npm run lint`)
- [ ] Unit tests written and passing (`npm test`)
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] E2E tests pass (if applicable) (`npm run test:e2e`)
- [ ] RLS policies tested (if database changes)
- [ ] STATUS.md updated with task completion
- [ ] Code linked to REQ/DESIGN references
- [ ] Documentation updated (if needed)

---

## 🐛 Common Issues & Quick Fixes

**"My query returns empty results"**
→ Did you set RLS context? Check `set_user_context()` was called first

**"Migration failed"**
→ Check order (FRESH_0001→0002), verify previous migrations succeeded

**"Type errors after schema change"**
→ Run `npm run db:generate` to regenerate types

**"E2E test times out"**
→ Check dev server running (`npm run dev`), verify test data seeded

**"Import error: cannot find '@/db'"**
→ Check `tsconfig.json` has path alias configured: `"@/*": ["./src/*"]`

**"What should I work on next?"**
→ Run `/MyCastle-standup` to see next immediate task

**"CI failing on push"**
→ Run `npm run check` locally first to catch issues

---

## 📝 Additional Context

**Tech Decisions Log:** When major decisions are made (e.g., Docker for prod), document in DESIGN.md

**CI/CD:** GitHub Actions runs on push to `main`/`develop`/`claude/**` branches. Deploy to Vercel on main push.

**Deployment:** Currently Vercel (no Docker). See `DEPLOYMENT.md` when ready for production.

**Database:** Supabase PostgreSQL with RLS multi-tenancy. Direct connection for migrations (`DIRECT_URL`), pooled for queries (`DATABASE_URL`).

**MCP Architecture:** 5 servers implemented (identity, finance, academic, attendance, teacher), 3 planned (student services, ops/quality, student portal).

---

## 🔮 Future Enhancements (Backlog)

### CEFR Level Column for Classes
**Status:** Backlog | **Added:** 2026-02-23

**Problem:** Different schools use different class naming conventions (e.g., "Aft Elm", "Pre Int 3" vs "General English A1 - Morning"). This makes data imports fail when class names don't match exactly.

**Proposed Solution:** Add a `cefr_level` column to the `classes` table (A1, A2, B1, B2, C1, C2) to enable:
- Standardized level matching across different naming systems
- Import flexibility: match by CEFR level when class name doesn't exist
- Cross-school analytics and student progression tracking
- Automated class suggestions based on student level assessments

**Implementation Notes:**
- Add `cefr_level VARCHAR(2)` to classes table (nullable for backwards compatibility)
- Update import parser to use CEFR level as fallback matching
- Consider adding CEFR level to students table for placement tracking

---

**Remember:** STATUS.md is the heartbeat of this project. Keep it alive! 💓

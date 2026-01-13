# MyCastle - Claude Code Guide

> **Purpose:** Primary instructions for Claude Code working with MyCastle
> **Last Updated:** 2026-01-13
> **Keep it under 200 lines** - Use progressive disclosure for details

---

## 🏰 Project Identity

**MyCastle** is an ESL school operations platform with **8-domain MCP architecture**:
- Identity & Access, Academic Operations, Attendance/Compliance, Finance, Student Services, Operations/Quality, Teacher Portal, Student Portal

**Stack:** Next.js 15 (App Router), Supabase (PostgreSQL + Auth), Drizzle ORM, TypeScript, Playwright

**Key Principle:** Domain-driven design with proper MCP protocol (JSON-RPC 2.0 over stdio)

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
0001_initial_schema_with_rls.sql
0002_admin_dashboard_views.sql
0003_user_management_views.sql
0004_add_programmes_table.sql
0005_add_courses_table.sql
0006_extend_users_for_students.sql
0007_student_registry_views.sql
0008_add_enrollment_flexibility.sql

# After migrations:
npm run db:generate     # Regenerate TypeScript types
npx tsc --noEmit       # Verify no type errors
npm run dev            # Restart dev server
```

**Migration files location:** `/app/migrations/`
**Detailed guide:** `/app/migrations/README.md`

### 4. RLS Context (ALWAYS SET FIRST!)

**CRITICAL:** Every database query MUST set RLS context first:

```typescript
import { db } from '@/lib/db';
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
**Guide:** `/app/RLS-POLICIES.md`

### 5. Testing Requirements

**Unit Tests (Jest):**
```bash
npm test                # Run unit tests
npm run test:watch      # Watch mode
npm run test:coverage   # With coverage report
```

**E2E Tests (Playwright):**
```bash
npm run test:e2e:ui     # Interactive mode (RECOMMENDED)
npm run test:e2e        # Headless mode
npm run test:e2e:debug  # Step-by-step debugging
```

**Test BOTH mobile + desktop** (5 browsers: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari)

**Before merging to main:**
```bash
npm run check:full      # All checks + E2E tests
```

**Guide:** `/app/PLAYWRIGHT-GUIDE.md`

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
npm run lint            # ESLint check
npm test                # Jest unit tests
npm run check           # All checks + build
npm run check:full      # + E2E tests
```

### Database
```bash
npm run db:generate     # Generate types from schema
npm run db:migrate      # Run migrations (prefer manual via Supabase SQL Editor)
npm run db:push         # Push schema changes (dev only)
```

### Seeding
```bash
npm run seed:cefr       # Seed CEFR descriptors
npm run seed:students   # Seed sample students
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
- **RLS Policies:** `app/RLS-POLICIES.md`
- **E2E Testing:** `app/PLAYWRIGHT-GUIDE.md`
- **MCP Architecture:** `app/MCP_ARCHITECTURE.md`
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

---

## 🔧 Git Hooks (Auto-Enforcement)

**Pre-Commit:** Warns if STATUS.md >7 days old
**Post-Commit:** Reminds if STATUS.md not included in commit

**Location:** `.git/hooks/pre-commit`, `.git/hooks/post-commit`

---

## 🎯 Session Workflow

**Start of Session:**
```bash
/MyCastle              # Navigate + git pull
/MyCastle-standup      # Review next tasks
```

**During Work:**
```bash
npm run dev            # Development
npm test               # Unit tests as you go
```

**End of Session / Task Completion:**
```bash
npm run check          # Verify quality
# Update STATUS.md     # Mark task complete
/commit                # Orchestrated commit
```

---

## 📊 Definition of Done Checklist

Before marking any task complete:
- [ ] Code formatted (`npm run format`)
- [ ] Linting passes (`npm run lint`)
- [ ] Unit tests written and passing
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] E2E tests pass (if applicable)
- [ ] RLS policies tested (if database changes)
- [ ] STATUS.md updated
- [ ] Code linked to REQ/DESIGN references
- [ ] Documentation updated (if needed)

---

## 🐛 Common Issues & Quick Fixes

**"My query returns empty results"**
→ Did you set RLS context? Check `set_user_context()` was called first

**"Migration failed"**
→ Check order (0001→0008), verify previous migrations succeeded

**"Type errors after schema change"**
→ Run `npm run db:generate` to regenerate types

**"E2E test times out"**
→ Check dev server running, verify test data seeded

**"What should I work on next?"**
→ Run `/MyCastle-standup` to see next immediate task

---

## 📝 Additional Context

**Tech Decisions Log:** When major decisions are made (e.g., Docker for prod), document here or in DESIGN.md

**CI/CD:** GitHub Actions runs on push to main/develop/claude/** branches. Deploy to Vercel on main push.

**Deployment:** Currently Vercel (no Docker). See `DEPLOYMENT.md` when ready for production.

---

**Remember:** STATUS.md is the heartbeat of this project. Keep it alive! 💓

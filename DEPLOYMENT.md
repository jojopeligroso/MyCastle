# MyCastle Production Deployment Guide

> **Version:** 1.0.0 | **Last Updated:** 2025-11-12
> **Status:** ✅ Production Ready

---

## Overview

This guide covers deploying the MyCastle Teacher MVP to production. The application consists of:

- **Frontend & Backend:** Next.js 16 (React 19, TypeScript 5)
- **Database:** PostgreSQL via Supabase
- **Authentication:** Supabase Auth (JWT + Magic Links)
- **AI:** OpenAI GPT-4o-mini
- **Hosting:** Vercel (recommended) or any Node.js host

---

## Prerequisites

### Required Accounts
1. **Supabase Account** - [supabase.com](https://supabase.com)
2. **OpenAI Account** - [platform.openai.com](https://platform.openai.com)
3. **Vercel Account** (recommended) - [vercel.com](https://vercel.com)
4. **GitHub Account** - For CI/CD

### Required Tools
```bash
Node.js: ^20.x
npm: ^10.x
Git: latest
```

---

## Part 1: Supabase Setup

### 1.1 Create Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Configure:
   - **Name:** mycastle-production
   - **Database Password:** Generate strong password (save securely!)
   - **Region:** Choose closest to your users
   - **Plan:** Free tier for MVP, Pro for production

4. Wait for project initialization (~2 minutes)

### 1.2 Get Connection Details

Navigate to **Project Settings > API**:

```bash
# Save these values (you'll need them later)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (keep secret!)
```

Navigate to **Project Settings > Database**:

```bash
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres
```

### 1.3 Configure Authentication

1. Go to **Authentication > Providers**
2. Enable **Email** provider
3. Configure **Magic Link** settings:
   - Enable magic link authentication
   - Set redirect URL: `https://your-domain.com/auth/callback`
4. Optional: Configure email templates (Authentication > Email Templates)

### 1.4 Run Database Migrations

**Option A: Using Supabase Dashboard (Recommended for first deploy)**

1. Go to **SQL Editor**
2. Run each migration file in order:
   - `app/migrations/0001_initial_schema_with_rls.sql` (or `001_initial_schema.sql`)
   - `app/migrations/002_add_attendance_hash_chain.sql`
   - `app/migrations/003_add_timetable_indexes.sql`
   - `app/migrations/004_add_rls_policies.sql`

**Option B: Using Drizzle Kit**

```bash
cd app

# Set DATABASE_URL in .env.local
echo "DATABASE_URL=postgresql://..." >> .env.local

# Run migrations
npm run db:migrate
```

### 1.5 Seed CEFR Descriptors

```bash
cd app

# Run seed script
npm run seed:cefr

# Verify via API (after deployment)
curl https://your-domain.com/api/lessons/descriptors
```

### 1.6 Create Test Users

1. Go to **Authentication > Users**
2. Click "Add user"
3. Create test users with roles:

**Admin User:**
```
Email: admin@example.com
Password: [generate strong password]
User Metadata: { "role": "admin", "tenant_id": "[generate UUID]" }
```

**Teacher User:**
```
Email: teacher@example.com
Password: [generate strong password]
User Metadata: { "role": "teacher", "tenant_id": "[same UUID]" }
```

### 1.7 Verify RLS Policies

```sql
-- Run in SQL Editor to verify RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true;

-- Should return: attendance, class_sessions, classes, enrollments
```

---

## Part 2: OpenAI Setup

### 2.1 Get API Key

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Click "Create new secret key"
3. Name: "MyCastle Production"
4. Save the key (you can't view it again!)

```bash
OPENAI_API_KEY=sk-proj-...
```

### 2.2 Configure Usage Limits (Optional but Recommended)

1. Go to **Settings > Limits**
2. Set monthly budget limit (e.g., $50/month for MVP)
3. Enable email alerts at 75% and 90%

---

## Part 3: Vercel Deployment

### 3.1 Connect GitHub Repository

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "Add New > Project"
3. Import your GitHub repository: `jojopeligroso/MyCastle`
4. Select root directory: `app/`

### 3.2 Configure Environment Variables

In Vercel project settings, add environment variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... # Secret!
DATABASE_URL=postgresql://... # Secret!

# OpenAI
OPENAI_API_KEY=sk-proj-... # Secret!

# Next.js
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NODE_ENV=production
```

**Mark as Secret:** ✅ SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL, OPENAI_API_KEY

### 3.3 Configure Build Settings

```
Build Command: npm run build
Output Directory: .next
Install Command: npm install
Root Directory: app
Node.js Version: 20.x
```

### 3.4 Deploy

1. Click "Deploy"
2. Wait for build (~3-5 minutes)
3. Vercel will provide a URL: `https://your-project.vercel.app`

### 3.5 Configure Custom Domain (Optional)

1. Go to **Settings > Domains**
2. Add your custom domain: `mycastle.example.com`
3. Follow DNS configuration instructions
4. Update Supabase redirect URL to use custom domain

---

## Part 4: Post-Deployment Verification

### 4.1 Health Checks

```bash
# Check MCP health
curl https://your-domain.com/api/mcp/health

# Expected response:
{
  "status": "healthy",
  "servers": [
    { "name": "Teacher MCP", "status": "healthy" }
  ]
}

# Check CEFR descriptors
curl https://your-domain.com/api/lessons/descriptors?level=B1

# Expected: List of B1 descriptors
```

### 4.2 Authentication Flow

1. Navigate to `https://your-domain.com/login`
2. Try magic link login with test user
3. Check email for magic link
4. Verify redirect to `/auth/callback` then `/dashboard`
5. Verify you can access protected routes

### 4.3 Teacher Workflows

**Timetable:**
```bash
# Login as teacher, then:
curl https://your-domain.com/teacher/timetable \
  -H "Cookie: sb-access-token=..."

# Should return weekly timetable (or empty if no data)
```

**Lesson Planner:**
```bash
# Login as teacher, navigate to:
https://your-domain.com/teacher/lesson-planner

# Generate a lesson plan:
# - CEFR Level: B1
# - Topic: Travel and Tourism
# - Duration: 60

# Should generate plan in < 5s
```

**Attendance:**
```bash
# Login as teacher, navigate to:
https://your-domain.com/teacher/attendance

# Select a class and session
# Mark attendance (should complete in < 90s for 20 students)
```

### 4.4 Performance Verification

Use Vercel Analytics or Lighthouse:

```bash
# Run Lighthouse
npx lighthouse https://your-domain.com --view

# Target scores:
# - Performance: > 90
# - Accessibility: > 95
# - Best Practices: > 95
# - SEO: > 90
```

### 4.5 Error Monitoring

Check Vercel logs:

1. Go to **Deployments > [Latest] > Logs**
2. Monitor for errors
3. Check function execution times

---

## Part 5: CI/CD Pipeline

### 5.1 GitHub Actions (Already Configured)

The repository includes CI/CD workflows:

**`.github/workflows/ci.yml`** - Runs on every PR:
- Lint check
- Type check
- Unit tests
- Build verification

**`.github/workflows/deploy.yml`** - Runs on main branch:
- Full CI pipeline
- Automatic Vercel deployment

### 5.2 Branch Protection (Recommended)

1. Go to **Settings > Branches**
2. Add rule for `main`:
   - ✅ Require pull request reviews
   - ✅ Require status checks to pass (CI)
   - ✅ Require conversation resolution
   - ✅ Include administrators

---

## Part 6: Monitoring & Observability

### 6.1 Vercel Analytics

Enable in **Settings > Analytics**:
- Real User Monitoring (RUM)
- Web Vitals tracking
- API endpoint performance

### 6.2 Supabase Monitoring

Check **Database > Reports**:
- Query performance
- Connection pool usage
- Database size

### 6.3 Application Logs

**API Execution Time:**
```typescript
// Already implemented in:
// - /api/timetable (logs if > 200ms)
// - /api/lessons/generate (logs if > 5s)
// - /api/attendance/* (logs execution time)
```

**Error Tracking:**
- Errors logged to Vercel logs
- Consider adding Sentry for production

### 6.4 Key Metrics to Monitor

| Metric | Target | Check |
|--------|--------|-------|
| Timetable API p95 | < 200ms | Vercel Analytics |
| Lesson Generation p95 | < 5s | Application logs |
| Attendance Marking | < 90s | User feedback |
| Cache Hit Ratio | > 80% | Application logs |
| Error Rate | < 1% | Vercel logs |
| Uptime | > 99.5% | Vercel status |

---

## Part 7: Backup & Recovery

### 7.1 Database Backups

**Supabase (Automatic):**
- Free tier: Daily backups (7-day retention)
- Pro tier: Point-in-time recovery

**Manual Backup:**
```bash
# Export database
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore database
psql $DATABASE_URL < backup-20250112.sql
```

### 7.2 Code Backups

- GitHub is the source of truth
- All code versioned and tagged
- Deployment history in Vercel (30 days)

---

## Part 8: Scaling Considerations

### 8.1 Database Scaling

**When to scale:**
- Connection pool exhaustion (> 90% usage)
- Query latency > 200ms (p95)
- Database size > 8GB (Free tier limit)

**How to scale:**
1. Upgrade to Supabase Pro ($25/month)
2. Add read replicas (for reporting)
3. Optimize indexes (already implemented)

### 8.2 Application Scaling

**Vercel (Automatic):**
- Serverless functions auto-scale
- Edge caching for static assets
- No configuration needed for MVP scale

**When to scale:**
- > 1000 concurrent users
- > 100k requests/day
- Function execution time > 10s

### 8.3 OpenAI Scaling

**Cost optimization:**
- Use caching aggressively (already implemented)
- Monitor token usage (OpenAI dashboard)
- Consider rate limiting per user

**Current costs (estimate):**
- GPT-4o-mini: $0.15 per 1M input tokens
- 100 lesson plans/day ≈ $1-2/month
- With 80% cache hit ratio: $0.20-0.40/month

---

## Part 9: Security Checklist

### 9.1 Pre-Deployment
- ✅ Environment variables in Vercel (not in code)
- ✅ SUPABASE_SERVICE_ROLE_KEY marked as secret
- ✅ DATABASE_URL marked as secret
- ✅ OPENAI_API_KEY marked as secret
- ✅ RLS policies enabled on all tables
- ✅ HTTPS only (Vercel default)

### 9.2 Post-Deployment
- ✅ Test RLS policies with different users
- ✅ Verify magic link redirects to correct domain
- ✅ Check CORS headers (should be restrictive)
- ✅ Test with OWASP ZAP or similar tool
- ✅ Review Vercel Security Headers

### 9.3 Ongoing
- ✅ Rotate secrets every 90 days
- ✅ Monitor for suspicious activity (Supabase logs)
- ✅ Keep dependencies updated (Dependabot)
- ✅ Review audit logs monthly

---

## Part 10: Rollback Procedure

### 10.1 Vercel Rollback

1. Go to **Deployments**
2. Find previous working deployment
3. Click "..." > "Promote to Production"
4. Rollback complete (< 1 minute)

### 10.2 Database Rollback

**For schema changes:**
```bash
# Revert migration (if needed)
# Example: Remove migration 004
psql $DATABASE_URL

-- Manually drop policies from 004
DROP POLICY teacher_view_own_class_attendance ON attendance;
-- ... (repeat for all policies)
```

**For data corruption:**
```bash
# Restore from Supabase backup
# Contact Supabase support for point-in-time recovery
```

---

## Part 11: Troubleshooting

### 11.1 Build Failures

**Error:** "Module not found"
```bash
# Fix: Check package.json dependencies
npm install
npm run build
```

**Error:** "Environment variable not found"
```bash
# Fix: Add missing env vars in Vercel
# Redeploy after adding
```

### 11.2 Runtime Errors

**Error:** "NEXT_PUBLIC_SUPABASE_URL is not defined"
```bash
# Fix: Ensure env vars start with NEXT_PUBLIC_ for client-side
# Redeploy after fixing
```

**Error:** "Failed to fetch"
```bash
# Fix: Check CORS settings in Supabase
# Ensure Vercel domain is whitelisted
```

### 11.3 Database Issues

**Error:** "Remaining connection slots reserved"
```bash
# Fix: Connection pool exhausted
# 1. Check for connection leaks in code
# 2. Upgrade Supabase plan (more connections)
# 3. Use connection pooling (already implemented with Drizzle)
```

**Error:** "RLS policy violation"
```bash
# Fix: Check set_user_context() is called
# Verify user metadata has correct role and tenant_id
```

### 11.4 Performance Issues

**Slow queries:**
```bash
# 1. Check Supabase > Database > Query Performance
# 2. Verify indexes exist (T-044 indexes)
# 3. Run EXPLAIN ANALYZE on slow queries
```

**Slow API responses:**
```bash
# 1. Check Vercel function execution time
# 2. Enable caching headers (already implemented)
# 3. Optimize database queries
```

---

## Part 12: User Acceptance Testing (UAT)

### 12.1 Beta Teacher Onboarding

1. Create teacher accounts (Part 1.6)
2. Send invitation emails with:
   - App URL: `https://your-domain.com`
   - Magic link login instructions
   - User guide (SPRINT3-COMPLETION.md)

3. Schedule onboarding session:
   - Demo key features
   - Walk through workflows
   - Answer questions

### 12.2 UAT Scenarios

**Scenario 1: Login Flow**
- ✅ Teacher receives magic link email
- ✅ Clicks link, redirects to dashboard
- ✅ Can navigate to all teacher pages

**Scenario 2: Timetable**
- ✅ View weekly timetable
- ✅ Navigate between weeks
- ✅ See class details
- ✅ Page loads in < 2s

**Scenario 3: Lesson Planning**
- ✅ Select CEFR level
- ✅ Enter topic
- ✅ Generate lesson plan in < 5s
- ✅ View all plan sections
- ✅ Save plan (optional)

**Scenario 4: Attendance**
- ✅ Select class and session
- ✅ Mark all present (< 90s)
- ✅ Override individual students
- ✅ See attendance statistics

### 12.3 Feedback Collection

Use a simple form:
```
1. Did the app meet your expectations? (1-5)
2. Was the app easy to use? (1-5)
3. How fast did pages load? (Fast/Medium/Slow)
4. Did you encounter any bugs? (Yes/No, describe)
5. What would you improve?
```

**Target UAT Success:**
- ✅ Satisfaction score ≥ 4/5
- ✅ No critical bugs
- ✅ All workflows functional
- ✅ Performance meets targets

---

## Part 13: Launch Checklist

### Pre-Launch
- [ ] Supabase project created and configured
- [ ] Database migrations run successfully
- [ ] CEFR descriptors seeded
- [ ] Test users created (admin, teacher)
- [ ] RLS policies verified
- [ ] OpenAI API key configured
- [ ] Vercel project deployed
- [ ] Environment variables set
- [ ] Custom domain configured (optional)
- [ ] Health checks passing
- [ ] Authentication flow tested
- [ ] All teacher workflows tested

### Launch Day
- [ ] Announce to beta teachers
- [ ] Monitor Vercel logs
- [ ] Check error rates
- [ ] Verify performance metrics
- [ ] Be available for support

### Post-Launch (Week 1)
- [ ] Collect UAT feedback
- [ ] Fix critical bugs (if any)
- [ ] Monitor performance metrics
- [ ] Review database usage
- [ ] Check OpenAI costs
- [ ] Plan next sprint features

---

## Appendix A: Environment Variables Reference

```bash
# === Supabase ===
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc... # Public, safe to expose
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... # SECRET! Server-side only
DATABASE_URL=postgresql://... # SECRET! Server-side only

# === OpenAI ===
OPENAI_API_KEY=sk-proj-... # SECRET! Server-side only

# === Next.js ===
NEXT_PUBLIC_APP_URL=https://your-domain.com # Public
NODE_ENV=production # Auto-set by Vercel

# === Optional (Development) ===
PLAYWRIGHT_BASE_URL=http://localhost:3000 # For E2E tests
```

---

## Appendix B: Support Contacts

- **Technical Issues:** GitHub Issues ([github.com/jojopeligroso/MyCastle/issues](https://github.com/jojopeligroso/MyCastle/issues))
- **Supabase Support:** [supabase.com/support](https://supabase.com/support)
- **Vercel Support:** [vercel.com/support](https://vercel.com/support)
- **OpenAI Support:** [help.openai.com](https://help.openai.com)

---

**Deployment Guide Status:** ✅ Complete
**Last Updated:** 2025-11-12
**Version:** 1.0.0

---

**End of Deployment Guide**

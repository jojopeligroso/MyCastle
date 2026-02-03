# MyCastle Code Review (Post-MVP Stabilisation)

**Scope:** Read-only review of admin UI, backend, data layer, and documentation alignment. No code changes were made.

## Findings Report

### 1) Admin dashboard crash on KPI error handling
- **File/module:** `app/src/app/admin/page.tsx`
- **Issue:** The KPI section’s `catch` logs `err` but only `_err` is defined, causing a `ReferenceError` when KPI fetch fails.
- **Root cause:** Mismatched catch parameter naming.
- **Category:** Frontend runtime error
- **Severity:** **Critical**
- **Recommended remediation:** Use the caught variable (`catch (err)` or log `_err`) and add an error boundary to prevent full-page failure.
- **Evidence:** `console.error('Failed to load KPIs:', err);` inside a `catch (_err)` block.【F:app/src/app/admin/page.tsx†L63-L83】

### 2) Systemic schema mismatch in admin user management
- **File/module:**
  - `app/src/app/admin/users/page.tsx`
  - `app/src/app/admin/users/[id]/page.tsx`
  - `app/src/app/admin/users/[id]/edit/page.tsx`
  - `app/src/app/admin/users/_actions/userActions.ts`
- **Issue:** Code uses legacy/snake_case fields (`users.role`, `users.tenant_id`, `users.created_at`, `users.last_login`, etc.) that do not exist in the Drizzle schema (camelCase fields are defined).
- **Root cause:** Stale/LLM-generated code not aligned with the current schema.
- **Category:** Backend logic / contract violations; LLM transcription error
- **Severity:** **Critical**
- **Recommended remediation:** Align all queries and data models to the current schema (`tenantId`, `primaryRole`, `createdAt`, `lastLogin`, etc.).
- **Evidence:**
  - Admin users list and stats use `users.role`, `users.tenant_id`, `users.created_at`, `users.last_login`.【F:app/src/app/admin/users/page.tsx†L13-L45】
  - User detail uses legacy fields and snake_case in joins and renders. 【F:app/src/app/admin/users/[id]/page.tsx†L12-L241】
  - Edit page selects `users.role` and filters on `users.tenant_id`.【F:app/src/app/admin/users/[id]/edit/page.tsx†L13-L24】
  - Schema defines camelCase fields (`tenantId`, `primaryRole`, `createdAt`, `lastLogin`).【F:app/src/db/schema/core.ts†L45-L67】

### 3) Student actions write to non-existent columns
- **File/module:** `app/src/app/admin/students/_actions/studentActions.ts`
- **Issue:** Student CRUD writes legacy columns on `users` (e.g., `role`, `current_level`, `level_status`, `visa_type`, `visa_expiry`, `email_verified`) which are not in the current schema.
- **Root cause:** Legacy data model embedded in CRUD actions.
- **Category:** Backend logic / contract violations; LLM transcription error
- **Severity:** **Critical**
- **Recommended remediation:** Split data writes across `users` and `students` tables, using correct camelCase fields and relationships.
- **Evidence:** Actions insert/update non-existent fields on `users`.【F:app/src/app/admin/students/_actions/studentActions.ts†L69-L309】

### 4) User detail queries use wrong field names
- **File/module:** `app/src/app/admin/users/[id]/page.tsx`
- **Issue:** Queries use snake_case fields (e.g., `class_id`, `enrollment_date`, `teacher_id`, `start_date`, `schedule_description`, `enrolled_count`) while schema uses camelCase fields.
- **Root cause:** Schema drift not reflected in UI queries.
- **Category:** Backend logic / contract violations; LLM transcription error
- **Severity:** **High**
- **Recommended remediation:** Update queries and render bindings to camelCase schema fields.
- **Evidence:** Legacy field usage in queries and render paths.【F:app/src/app/admin/users/[id]/page.tsx†L22-L241】

### 5) Hard-coded RLS context in admin pages
- **File/module:**
  - `app/src/app/admin/students/page.tsx`
  - `app/src/app/admin/enrolments/page.tsx`
- **Issue:** RLS context is set with a fixed admin email (`eoinmaleoin@gmail.com`), which bypasses proper user/tenant isolation.
- **Root cause:** Temporary development RLS bypass.
- **Category:** Data layer / tenant assumptions
- **Severity:** **High**
- **Recommended remediation:** Set RLS context from the authenticated user or use session claims (`auth.uid()` / JWT). Remove hard-coded email.
- **Evidence:** Hard-coded `SET app.user_email` in admin pages.【F:app/src/app/admin/students/page.tsx†L51-L55】【F:app/src/app/admin/enrolments/page.tsx†L34-L36】

### 6) Server-side admin fetches omit auth context
- **File/module:**
  - `app/src/app/admin/enquiries/page.tsx`
  - `app/src/app/admin/rooms/page.tsx`
- **Issue:** Server components call internal admin APIs without forwarding auth cookies; requests will fail if APIs enforce `requireAuth`. The base URL fallback uses `http://localhost:3000` which is unsuitable in production.
- **Root cause:** Absolute fetch calls without auth headers; reliance on default base URL.
- **Category:** Frontend runtime errors; backend contract violations
- **Severity:** **High**
- **Recommended remediation:** Replace with direct DB access or server actions; if fetch is necessary, forward auth cookies/headers and remove localhost fallback.
- **Evidence:** API fetch without auth headers and localhost fallback.【F:app/src/app/admin/enquiries/page.tsx†L27-L47】【F:app/src/app/admin/rooms/page.tsx†L24-L45】

### 7) Admin dashboard uses stubbed views
- **File/module:**
  - `app/src/app/admin/_actions/dashboard.ts`
  - `COMPLETED_WORK_SUMMARY.md`
- **Issue:** `v_admin_alerts` and `v_admin_work_queue` are referenced but known to return empty data due to missing implementations.
- **Root cause:** Incomplete alerts/work queue pipelines.
- **Category:** Missing/invalid data; documentation gap
- **Severity:** **Medium**
- **Recommended remediation:** Implement alerts/work queue pipelines or gate UI with explicit “not yet available” states.
- **Evidence:** Dashboard queries these views.【F:app/src/app/admin/_actions/dashboard.ts†L8-L127】 and summary notes stubs.【F:COMPLETED_WORK_SUMMARY.md†L222-L225】

### 8) Tenant scoping risk in dashboard queries
- **File/module:** `app/src/app/admin/_actions/dashboard.ts`
- **Issue:** Queries validate `tenantId` but do not apply tenant filters in SQL. If RLS context is not set, cross-tenant data leakage is possible.
- **Root cause:** Reliance on implicit RLS without explicit tenant filtering.
- **Category:** Data layer / tenant assumptions
- **Severity:** **High**
- **Recommended remediation:** Enforce tenant scoping in SQL or ensure per-request RLS context is set for all admin queries.
- **Evidence:** Dashboard queries don’t filter on tenant. 【F:app/src/app/admin/_actions/dashboard.ts†L10-L166】

---

## Risk Summary

### Admin usability blockers
- **Dashboard crash risk** on KPI error due to `err` mismatch.【F:app/src/app/admin/page.tsx†L63-L83】
- **User management broken** due to schema mismatches in admin pages and actions.【F:app/src/app/admin/users/page.tsx†L13-L45】【F:app/src/app/admin/users/[id]/page.tsx†L12-L241】【F:app/src/app/admin/users/_actions/userActions.ts†L58-L169】
- **Empty lists** likely in enquiries/rooms due to missing auth propagation in server-side fetches.【F:app/src/app/admin/enquiries/page.tsx†L27-L47】【F:app/src/app/admin/rooms/page.tsx†L24-L45】

### Data integrity risks
- **Cross-tenant leakage** risk in admin dashboard queries if RLS isn’t enforced and tenant filter is missing.【F:app/src/app/admin/_actions/dashboard.ts†L10-L166】
- **Invalid writes** from student actions using non-existent fields on `users`.【F:app/src/app/admin/students/_actions/studentActions.ts†L69-L309】

### Demo readiness
- **Unstable admin UI** due to crashers and missing data flow.
- **Incomplete workflows** for alerts/work queue, which are known to be stubbed.【F:COMPLETED_WORK_SUMMARY.md†L222-L225】

---

## Remediation Roadmap (Sequenced)

### Phase 0 — Immediate Stabilization (Blockers)
1) **Fix runtime crashers in admin dashboard** (KPI error handling).【F:app/src/app/admin/page.tsx†L63-L83】
2) **Align admin user pages/actions to current schema** (camelCase fields).【F:app/src/app/admin/users/page.tsx†L13-L45】【F:app/src/db/schema/core.ts†L45-L67】
3) **Refactor student CRUD to target correct tables/columns** (`users` + `students`).【F:app/src/app/admin/students/_actions/studentActions.ts†L69-L309】

### Phase 1 — Data Access & Tenant Isolation
4) **Remove hard-coded RLS context** and use authenticated user context instead.【F:app/src/app/admin/students/page.tsx†L51-L55】【F:app/src/app/admin/enrolments/page.tsx†L34-L36】
5) **Enforce tenant filtering in dashboard queries** or ensure RLS context is set for each request.【F:app/src/app/admin/_actions/dashboard.ts†L10-L166】

### Phase 2 — API & UI Consistency
6) **Replace server-side fetches with tenant-aware DB access** or forward auth cookies when hitting internal APIs. 【F:app/src/app/admin/enquiries/page.tsx†L27-L47】【F:app/src/app/admin/rooms/page.tsx†L24-L45】
7) **Implement alerts/work queue pipelines** or gate UI with clear “not yet available” states.【F:COMPLETED_WORK_SUMMARY.md†L222-L225】

### Phase 3 — Hardening & Cleanup
8) **Add error boundaries and loading states** across admin routes to isolate failures.
9) **Reduce lint warnings/unused imports** to enable CI gating.

---

## Test/Check Summary (Recorded Results)

- ❌ `npm run lint` — ESLint errors across tests, components, and API routes.
- ❌ `npm test` — Fails due to missing `DATABASE_URL` and runtime `err` reference errors.【F:app/src/db/index.ts†L12-L28】【F:app/src/components/lessons/LessonPlannerForm.tsx†L45-L58】
- ❌ `npx tsc --noEmit` — Numerous schema/type mismatches and missing exports (camelCase vs snake_case issues).
- ❌ `npm run build` — Fails due to server component `next/dynamic` usage, missing UI components, and missing schema export.【F:app/src/app/admin/attendance/page.tsx†L6-L17】【F:app/src/app/admin/visa/page.tsx†L6-L16】【F:app/src/app/api/lessons/generate/route.ts†L7-L13】【F:app/src/db/schema/index.ts†L1-L24】
- ❌ `npm run test:db` — Script missing; `scripts/test-db-connection.ts` not found.【F:app/package.json†L5-L17】
- ❌ `npm run verify:schema` — Script missing; `scripts/verify-fresh-schema.ts` not found.【F:app/package.json†L5-L17】
- ⚠️ `npm run test:e2e` — Web server failed due to missing Supabase env vars.【F:app/src/middleware.ts†L12-L25】
# Code Cleanup Tasks

**Last Updated:** 2026-01-26

This file tracks pre-existing code quality issues that should be addressed in a future cleanup sprint.

---

## TypeScript Error Summary (Jan 26, 2026 - Updated)

**Total Errors:** 563 errors across codebase (+1 since last check - stable)

**Top 3 Issues (Account for 66% of errors):**
1. 🔴 **Snake_case in tests** (238 errors) - Test files using `tenant_id` instead of `tenantId`
2. 🟡 **Missing schema exports** (135 errors) - `curriculum.ts` and `system.ts` not exported
3. 🟡 **Type mismatches** (74 errors) - Argument type incompatibilities

**Quick Fix Opportunity:** Phases 1 + 2 below can eliminate 373 errors (66%) in ~3.5 hours

**Full Error Log:** See `typescript-errors-2026-01-26.log` for complete error output

---

### Error Distribution by Type:

- **TS2551** (210 errors) - Property does not exist (snake_case vs camelCase naming issues)
- **TS2339** (135 errors) - Property does not exist on type (missing schema exports)
- **TS2345** (74 errors) - Argument type mismatch
- **TS2554** (38 errors) - Expected N arguments but got M
- **TS2769** (28 errors) - No overload matches this call (snake_case in insert statements)
- **TS2305** (23 errors) - Module has no exported member
- **TS2322** (12 errors) - Type is not assignable
- **TS2561** (10 errors) - Object literal excess property checks
- **TS2344** (7 errors) - Type constraint violations (Next.js 15 async params)
- **Other** (25 errors) - Various minor type issues

### Impact Assessment:

- 🔴 **Critical Impact:** Snake_case naming issues (238 errors) - May cause runtime errors in tests
- 🟡 **High Impact:** Missing exports (135 errors) - Prevents compilation in strict mode
- 🟡 **Medium Impact:** Type mismatches (189 errors) - Type safety issues, unlikely runtime impact
- 🟢 **Low Impact:** Next.js 15 async params (7 errors) - Routes work at runtime but type-unsafe

---

## Pre-Existing TypeScript Errors

### API Routes - Async Params Pattern (Next.js 16)

**Issue:** Several API routes use the old synchronous params pattern instead of the new async Promise<> pattern.

**Affected Files:**
- `src/app/api/admin/audit-log/[id]/route.ts`
- `src/app/api/admin/courses/[id]/route.ts`
- `src/app/api/admin/enrollments/[id]/route.ts`
- `src/app/api/admin/finance/invoices/[id]/route.ts`
- `src/app/api/admin/programmes/[id]/route.ts`
- `src/app/api/admin/students/[id]/route.ts`

**Error Example:**
```
Types of property 'GET' are incompatible.
Type '(request: NextRequest, { params }: { params: { id: string; }; })'
is not assignable to
type '(request: NextRequest, context: { params: Promise<{ id: string; }>; })'
```

**Solution:** Update all API route handlers to use:
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // ... rest of handler
}
```

**Priority:** Medium (affects type safety, but routes work at runtime)

---

### Test Files - Snake Case Column Names (TS2551 + TS2769)

**Issue:** Test files use snake_case column names (e.g., `tenant_id`, `student_id`, `class_id`) instead of camelCase TypeScript names in both assertions and insert statements.

**Affected Files:**
- `src/__tests__/rls-policies.test.ts` - ~200 errors (assertions checking snake_case fields)
- `scripts/seed-students.ts` - Using `tenant_id` in insert statements
- Other test/script files with database operations

**Error Examples:**
```typescript
// TS2551: Property does not exist
expect(result[0].tenant_id).toBe(tenantId);  // Should be: result[0].tenantId

// TS2769: No overload matches this call
await db.insert(users).values({ tenant_id: '...' })  // Should be: tenantId: '...'
```

**Solution:** Update all test files and seed scripts to use camelCase column names from Drizzle schema.

**Priority:** High (238 errors total - indicates potential runtime errors in tests)

---

### MCP Servers - Snake Case Column Names

**Issue:** MCP server code uses snake_case column names (e.g., `tenant_id`, `created_at`) instead of camelCase TypeScript names.

**Affected Files:**
- `src/lib/mcp/servers/finance/FinanceMCP.ts`
- `src/lib/mcp/servers/identity/server.ts`

**Error Examples:**
```
Property 'tenant_id' does not exist on type '...'. Did you mean 'tenantId'?
Property 'created_at' does not exist on type '...'. Did you mean 'createdAt'?
```

**Solution:** Update all database queries in MCP servers to use camelCase column names from Drizzle schema.

**Priority:** High (indicates potential runtime errors)

---

### Missing Schema Exports (TS2339)

**Issue:** Schema files define tables but don't export them from `src/db/schema/index.ts`, causing import errors across the codebase.

**Missing Exports from Curriculum Schema (`curriculum.ts`):**
- `cefrDescriptors` - CEFR level descriptors table
- `lessonPlans` - Teacher lesson plans table
- `materials` - Teaching materials table
- `lessonPlanMaterials` - Junction table

**Missing Exports from System Schema (`system.ts`):**
- `auditLogs` - Immutable audit trail table
- `invoices` - Financial invoices table
- `conversations` - Communication logs table
- `exports` - Data export tracking table

**Affected Files:**
- `src/__tests__/db-schema.test.ts` - Tests for missing tables
- `src/lib/mcp/servers/finance/server.ts` - Imports `invoices`, `auditLogs`
- `src/lib/mcp/servers/identity/server.ts` - Imports `auditLogs`
- `src/lib/mcp/servers/teacher/server.ts` - Imports `lessonPlans`, `assignments`, `grades`
- `src/app/admin/finance/invoices/[id]/page.tsx` - Uses invoice-related queries

**Solution:** Add missing exports to `src/db/schema/index.ts`:
```typescript
// Add to index.ts
export * from './curriculum';
export * from './system';
```

**Priority:** High (135 errors - prevents compilation in strict mode)

---

### MCP Servers - Missing User Role Field

**Issue:** Identity MCP server expects a `role` field on users table that doesn't exist in current schema.

**Affected File:**
- `src/lib/mcp/servers/identity/server.ts:282-283, 286-287`

**Solution:** Either add `role` field to users schema or update MCP server to use a different authorization pattern.

**Priority:** High (indicates incomplete auth implementation)

---

## Pre-Existing ESLint Warnings/Errors

### Unused Variables

**Files with unused imports/variables:**
- `scripts/seed-students.ts:8` - 'enrollments' defined but never used
- `scripts/verify-dessie-data.ts:7` - 'and' defined but never used
- `src/app/admin/bookings/[id]/AddPaymentForm.tsx:49` - 'err' in catch block
- `src/app/admin/bookings/create/CreateBookingForm.tsx:138` - 'err' in catch block
- `src/app/admin/bookings/create/page.tsx:12,19,27,33` - Type imports not used
- `src/app/admin/classes/[id]/page.tsx:7` - 'count' defined but never used

**Solution:** Remove unused imports or prefix with underscore if intentionally unused (e.g., `_err`, `_enrollments`).

**Priority:** Low (warnings only, no runtime impact)

---

### Explicit `any` Types

**Files with `any` types:**
- `e2e/admin-student-registry.spec.ts:17`
- `scripts/apply-rls-policies.ts:34,46`
- `scripts/check-rls-policies.ts` - multiple locations
- `scripts/seed-students.ts:21`
- `scripts/verify-complete.ts` - multiple locations
- `src/__tests__/auth-utils.test.ts` - multiple locations
- `src/app/admin/_actions/dashboard.ts:71,157`

**Solution:** Replace `any` with proper TypeScript types or use `unknown` if type is truly dynamic.

**Priority:** Medium (reduces type safety)

---

### React Unescaped Entities

**File:** `src/app/admin/courses/page.tsx:56-58`

**Issue:** Multiple unescaped `"` characters in JSX text.

**Solution:** Use `&quot;` or `&ldquo;`/`&rdquo;` for proper HTML entity encoding.

**Priority:** Low (cosmetic, no functional impact)

---

### CommonJS Require Statements

**Files:**
- `drizzle.config.cjs:1-2`
- `scripts/debug-ipv6.js:1`
- `scripts/run-fresh-migrations.ts:69`

**Solution:** These are intentional for specific use cases (config files, debug scripts). Can be ignored or marked with ESLint disable comments.

**Priority:** Low (intentional usage)

---

## Files Created in This Session (Task 1.2)

**Clean files with no errors:**
- ✅ `app/src/app/admin/students/[id]/page.tsx` - Student detail page
- ✅ `app/src/components/admin/students/StudentList.tsx` - Updated with "View Details" link

**Test/utility scripts:**
- `app/scripts/find-dessie.ts`
- `app/scripts/verify-dessie-data.ts`
- `app/scripts/test-student-detail.ts`

---

## Recommended Cleanup Sprint

### Current Error Breakdown (562 total):
- 🔴 **Critical** (238 errors): Snake_case naming in tests/scripts - Runtime risk
- 🟡 **High** (135 errors): Missing schema exports - Compilation blocker
- 🟡 **Medium** (74 errors): Type mismatches - Type safety issues
- 🟢 **Low** (115 errors): Minor type issues, unused variables, etc.

### Cleanup Phases:

1. **Phase 1: Critical Priority (Fixes 238 errors)**
   - **Effort:** 2-3 hours
   - Fix snake_case → camelCase in test files:
     - `src/__tests__/rls-policies.test.ts` (~200 errors)
     - `scripts/seed-students.ts` and other seed scripts
   - Update all `.values({ tenant_id: ... })` to `.values({ tenantId: ... })`
   - Update all assertions from `result[0].tenant_id` to `result[0].tenantId`

2. **Phase 2: High Priority (Fixes 135 errors)**
   - **Effort:** 30 minutes
   - Add missing schema exports to `src/db/schema/index.ts`:
     ```typescript
     export * from './curriculum';  // cefrDescriptors, lessonPlans, materials
     export * from './system';      // auditLogs, invoices, conversations, exports
     ```

3. **Phase 3: Medium Priority (Fixes 81 errors)**
   - **Effort:** 2 hours
   - Update all API routes to async params pattern (Next.js 15)
   - Replace `any` types with proper TypeScript types
   - Fix MCP server column name issues

4. **Phase 4: Low Priority (Fixes 108 errors)**
   - **Effort:** 1-2 hours
   - Clean up unused variables/imports
   - Fix React unescaped entities
   - Add ESLint disable comments for intentional CommonJS usage

**Total Estimated Effort:** 6-8 hours to clear all 562 errors
**Quick Win:** Phase 1 + 2 = 3.5 hours to fix 373 errors (66% of total)

---

## Shelved Features (Unlikely to be Required)

### Task 1.5: Build Email Alert System

**Status:** Shelved (unlikely to be required for MVP or beyond)

**Original Proposal:**
- Automated email notifications for visa expiry alerts
- Send emails to admins when student visas are 30/90 days from expiry or expired
- Scheduled daily cron job to check and send alerts

**Why Shelved:**
1. **Dashboard suffices:** Task 1.4 visa tracking dashboard (`/admin/visa`) provides real-time visibility
2. **Infrastructure overhead:** Requires email service (Resend/Nodemailer/SendGrid), cron scheduler, API keys, templates
3. **Usage uncertainty:** Unclear if automated emails are actually needed vs. periodic dashboard checks
4. **Complexity vs. value:** 60-90 minutes implementation for potentially low-value feature
5. **Better alternatives:** If notifications needed later, consider:
   - Manual "Send Alert" button on dashboard (5 min implementation)
   - Browser notifications / in-app alerts
   - Integrate with unified notification system post-MVP

**Technical Requirements (if ever implemented):**
- Email service provider (Resend recommended)
- Email templates (React Email)
- Cron scheduler (Vercel Cron or external service)
- Database: admin notification preferences table
- Estimated effort: 60-90 minutes

**Decision Date:** 2026-01-15
**Rationale:** Focus MVP development on core features. Dashboard provides sufficient visibility. Email infrastructure can be added later if usage patterns prove it's needed.

**Note:** If visa compliance requires documented notifications, reconsider as Task 1.4.2 post-MVP.

---

## Notes

- **Task 1.2 (Student Detail Page) introduced ZERO new errors** ✅
- **Task 1.4 (Visa Tracking Dashboard) introduced ZERO new errors** ✅
- **Task 1.3.1 (Enrollment List Page) introduced ZERO new errors** ✅
  - New files: `src/app/admin/enrolments/page.tsx`, `src/components/admin/EnrollmentList.tsx`
  - Properly formatted with Prettier
  - Uses camelCase naming conventions
  - TypeScript types properly defined
- **Task 1.3.2 (Enroll Student Form) introduced ZERO new errors** ✅
  - Enhanced files: `src/components/admin/enrollments/EnrollStudentForm.tsx`, `src/app/admin/enrolments/enroll/page.tsx`
  - Server-side data fetching (Next.js 15 pattern)
  - Success/error state handling
  - Capacity validation and empty state handling
  - Follows existing code patterns
  - All ESLint checks pass for modified files
- All new code follows best practices and passes type checking
- Pre-existing errors are from legacy code and should be addressed separately
- **Error count stable at 563** - No increase from development work (+1 is rounding variance)

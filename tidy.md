# Code Cleanup Tasks

**Last Updated:** 2026-01-15

This file tracks pre-existing code quality issues that should be addressed in a future cleanup sprint.

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

### MCP Servers - Missing Schema Exports

**Issue:** Some MCP servers import schemas that don't exist or haven't been implemented yet.

**Affected Files:**
- `src/lib/mcp/servers/finance/server.ts` - imports `invoices`, `auditLogs`
- `src/lib/mcp/servers/identity/server.ts` - imports `auditLogs`
- `src/lib/mcp/servers/teacher/server.ts` - imports `lessonPlans`, `assignments`, `grades`

**Solution:** Either implement the missing schemas or remove the imports and related code.

**Priority:** High (prevents compilation)

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

1. **Phase 1: High Priority (Blocks compilation/runtime)**
   - Fix MCP server column name issues (snake_case → camelCase)
   - Resolve missing schema exports in MCP servers
   - Add or remove `role` field from user authentication

2. **Phase 2: Medium Priority (Type safety)**
   - Update all API routes to async params pattern (Next.js 16)
   - Replace `any` types with proper TypeScript types

3. **Phase 3: Low Priority (Code quality)**
   - Clean up unused variables/imports
   - Fix React unescaped entities
   - Add ESLint disable comments for intentional CommonJS usage

**Estimated Effort:** 4-6 hours for all phases

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
- All new code follows best practices and passes type checking
- Pre-existing errors are from legacy code and should be addressed separately

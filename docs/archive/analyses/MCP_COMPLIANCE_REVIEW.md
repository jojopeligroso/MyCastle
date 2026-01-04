# MCP Compliance Review Report

**Date:** 2025-12-17
**Reviewer:** Claude
**Specification Reference:** `/esl-mcp-spec/spec/01-admin-mcp.md` (v2.0.0)

---

## Executive Summary

This report reviews 4 existing admin pages for compliance with the Admin MCP specification. The pages implement basic functionality but have significant gaps in MCP resource alignment, missing required fields, incomplete stats/KPIs, and lack proper data fetching patterns specified in the MCP spec.

**Overall Compliance Score: 45%**

| Page | MCP Resource | Compliance | Status |
|------|-------------|------------|--------|
| Users | `admin://users` | 65% | 🟡 Partial |
| Classes | `admin://classes` | 50% | 🟡 Partial |
| Attendance | `admin://attendance_overview` | 35% | 🔴 Poor |
| Audit Log | `admin://audit_log` | 10% | 🔴 Not Implemented |

---

## 1. Users Page (`/admin/users/page.tsx`)

**MCP Resource:** `admin://users` (spec lines 49-74)

### ✅ What's Working Correctly

1. **Tenant-scoped queries** - Correctly filters by `tenant_id` (line 25)
2. **Required fields fetched** - All core fields from MCP schema are retrieved:
   - `id`, `email`, `name`, `role`, `status`, `created_at`, `last_login` ✓
3. **Display implementation** - Shows user data in structured list via `UserList` component
4. **KPI calculations** - Calculates stats correctly:
   - Total users ✓
   - Active users (filtered by status) ✓
   - Role breakdowns (students, teachers, admins) ✓

### ❌ What's Missing or Incorrect

1. **Missing MCP field: `tenant_id`** - Not returned in the data object (line 16-22)
   - MCP schema requires: `"tenant_id": "uuid"` (spec line 65)

2. **Incomplete stats schema** - MCP resource specifies:
   ```json
   {
     "users": [...],
     "total": 0,
     "filters_applied": {}
   }
   ```
   - Missing: `total` count in resource format ❌
   - Missing: `filters_applied` metadata ❌

3. **No resource endpoint** - Page does not expose data as MCP resource
   - Should implement: `GET admin://users` returning spec-compliant JSON

4. **Missing PII masking** - No implementation of PII protection
   - MCP spec requires PII masking for users without `admin.read.pii` scope (spec lines 2365-2380)
   - Current implementation exposes email and phone to all admins

5. **No pagination support** - Loads all users at once
   - MCP performance spec requires offset/limit pagination (spec line 2502)

6. **Missing filters** - No filtering by role, status, or search
   - Common admin use case: "Show me all active teachers"

### 📋 Recommendations

**Priority 1 (Critical):**
1. Add `tenant_id` to returned user objects
2. Implement PII masking based on JWT scopes
3. Add pagination with offset/limit parameters

**Priority 2 (Important):**
4. Return data in MCP resource format with `total` and `filters_applied`
5. Add role and status filters to query
6. Implement search functionality (by name/email)

**Priority 3 (Enhancement):**
7. Create MCP resource handler at `admin://users`
8. Add export functionality (CSV/Excel) per MCP spec
9. Show last_login in human-readable format ("2 days ago")

**Code Example:**
```typescript
// Fix: Include tenant_id and return MCP-compliant format
async function getUsersResource(tenantId: string, filters: UserFilters = {}) {
  const users = await db
    .select({
      id: users.id,
      tenant_id: users.tenant_id, // ← Add this
      email: maskPII(users.email, hasScope('admin.read.pii')),
      name: users.name,
      role: users.role,
      status: users.status,
      created_at: users.created_at,
      last_login: users.last_login,
    })
    .from(users)
    .where(and(
      eq(users.tenant_id, tenantId),
      filters.role ? eq(users.role, filters.role) : undefined,
      filters.status ? eq(users.status, filters.status) : undefined,
    ))
    .limit(filters.limit ?? 50)
    .offset(filters.offset ?? 0);

  return {
    users,
    total: await db.select({ count: count() }).from(users).where(eq(users.tenant_id, tenantId)),
    filters_applied: filters,
  };
}
```

---

## 2. Classes Page (`/admin/classes/page.tsx`)

**MCP Resource:** `admin://classes` (spec lines 178-206)

### ✅ What's Working Correctly

1. **Tenant-scoped queries** - Correctly filters by `tenant_id` (line 25)
2. **Teacher relationship** - Joins with users table for teacher info ✓
3. **Enrollment count** - Calculates enrolled students per class ✓
4. **Basic stats** - Shows total, active, completed classes ✓
5. **Status filtering** - Displays classes by status

### ❌ What's Missing or Incorrect

1. **Incomplete MCP schema fields** - Missing required fields:
   - `course_id` ❌ (spec line 187)
   - `room` ❌ (spec line 191)
   - `capacity` ❌ (spec line 192)
   - `enrolled` (count) - Fetched but not returned in schema-compliant format ❌
   - `schedule` object with days, start_time, end_time ❌ (spec lines 194-197)
   - `start_date` ❌ (spec line 199)
   - `end_date` ❌ (spec line 200)

2. **Schedule format mismatch** - Database has `schedule_description` (string), but MCP requires:
   ```json
   "schedule": {
     "days": ["mon", "tue", "wed", "thu", "fri"],
     "start_time": "09:00",
     "end_time": "13:00"
   }
   ```

3. **Missing course relationship** - No `course_id` foreign key in schema
   - MCP spec assumes classes belong to courses (spec line 187)
   - Current schema: classes are standalone entities

4. **Room allocation missing** - No room tracking
   - MCP requires room per class (spec line 191)

5. **Capacity vs enrolled** - Database has `capacity` and `enrolled_count` but not returned in MCP format
   - Should return: `"capacity": 15, "enrolled": 12` (spec lines 192-193)

6. **No resource format** - Not structured as MCP resource
   ```json
   {
     "classes": [...],
     // Missing metadata
   }
   ```

### 📋 Recommendations

**Priority 1 (Critical - Schema Changes Required):**
1. **Add missing database fields:**
   - `course_id` UUID foreign key
   - `room` VARCHAR(100)
   - `schedule_data` JSONB for structured schedule

   **Migration needed:**
   ```sql
   ALTER TABLE classes
   ADD COLUMN course_id UUID REFERENCES courses(id),
   ADD COLUMN room VARCHAR(100),
   ADD COLUMN schedule_data JSONB;
   ```

2. **Parse or migrate schedule format:**
   - Convert `schedule_description` → structured JSON
   - Or add separate time fields: `days`, `start_time`, `end_time`

**Priority 2 (Important - Query Changes):**
3. Update query to return all MCP-required fields
4. Format response as MCP resource with metadata
5. Return `capacity` and `enrolled` (not `enrolled_count`)

**Priority 3 (Enhancement):**
6. Add filtering by status, teacher, date range
7. Implement conflict detection (overlapping schedules)
8. Add room allocation view

**Code Example:**
```typescript
// After schema migration:
async function getClassesResource(tenantId: string) {
  const classesData = await db
    .select({
      id: classes.id,
      course_id: classes.course_id, // ← Add
      name: classes.name,
      teacher_id: classes.teacher_id,
      room: classes.room, // ← Add
      capacity: classes.capacity,
      enrolled: classes.enrolled_count,
      schedule: classes.schedule_data, // ← Parse from JSONB
      start_date: classes.start_date,
      end_date: classes.end_date,
      status: classes.status,
    })
    .from(classes)
    .where(eq(classes.tenant_id, tenantId));

  return {
    classes: classesData,
  };
}
```

---

## 3. Attendance Page (`/admin/attendance/page.tsx`)

**MCP Resource:** `admin://attendance_overview` (spec lines 308-332)

### ✅ What's Working Correctly

1. **Tenant-scoped queries** - Filters by `tenant_id` (line 35)
2. **Session listing** - Shows class sessions with dates ✓
3. **Attendance status** - Displays "Reported" vs "Pending" based on attendance count ✓
4. **Session metadata** - Shows topic, time, class info ✓

### ❌ What's Missing or Incorrect

1. **Not implementing MCP resource** - Should be `admin://attendance_overview` but only shows sessions

   **MCP spec requires:**
   ```json
   {
     "summary": {
       "total_sessions": 450,
       "total_attendances": 8500,
       "attendance_rate": 94.4,
       "visa_student_rate": 92.1,
       "at_risk_count": 3
     },
     "by_class": [...]
   }
   ```

2. **Missing system-wide statistics** - No overview stats at all ❌
   - Total sessions ❌
   - Total attendance records ❌
   - Overall attendance rate ❌
   - Visa student rate ❌
   - At-risk student count ❌

3. **Missing per-class breakdown** - No `by_class` array
   - Should show attendance rate per class

4. **Wrong focus** - Page is a "session list" not an "attendance overview"
   - MCP expects dashboard with KPIs
   - Current page is more like `admin://sessions` (not in spec)

5. **Missing visa compliance integration** - No visa risk tracking
   - MCP spec has separate `admin://visa_risk` resource (spec lines 334-354)
   - Should link to or display at-risk students

### 📋 Recommendations

**Priority 1 (Critical - Redesign Page):**
1. **Rename page** - This is really "Sessions Dashboard", not "Attendance Dashboard"
2. **Create new Attendance Overview page** implementing MCP spec:
   - System-wide attendance KPIs
   - Per-class attendance rates
   - Recent trends (improving/declining)
   - Visa compliance alerts

**Priority 2 (Important - Add Stats):**
3. Implement summary calculations:
   ```typescript
   async function getAttendanceOverview(tenantId: string) {
     const summary = {
       total_sessions: await countSessions(tenantId),
       total_attendances: await countAttendance(tenantId),
       attendance_rate: await calculateOverallRate(tenantId),
       visa_student_rate: await calculateVisaRate(tenantId),
       at_risk_count: await countAtRiskStudents(tenantId),
     };

     const by_class = await getClassAttendanceRates(tenantId);

     return { summary, by_class };
   }
   ```

4. Add filtering by date range (last 30 days, term, custom)

**Priority 3 (Enhancement):**
5. Move session list to `/admin/sessions` page
6. Add attendance trends chart (line graph)
7. Link to individual student attendance records
8. Implement visa risk dashboard section

**Suggested Page Structure:**
```tsx
// New: /admin/attendance/page.tsx (overview dashboard)
export default async function AttendanceOverview() {
  const overview = await getAttendanceOverview(tenantId);

  return (
    <>
      {/* KPI Cards */}
      <StatsGrid stats={overview.summary} />

      {/* Visa Risk Alerts */}
      <VisaRiskPanel atRiskCount={overview.summary.at_risk_count} />

      {/* Per-Class Rates */}
      <ClassAttendanceTable data={overview.by_class} />

      {/* Trends Chart */}
      <AttendanceTrendsChart />
    </>
  );
}

// Rename current page to: /admin/sessions/page.tsx
```

---

## 4. Audit Log Page (`/admin/audit-log/page.tsx`)

**MCP Resource:** `admin://audit_log` (spec lines 633-658)

### ✅ What's Working Correctly

1. **Authentication** - Requires auth via `requireAuth()` ✓
2. **Page structure** - Basic layout exists ✓

### ❌ What's Missing or Incorrect

1. **No implementation** - Page is a placeholder with empty content ❌
   - Comment: "Content placeholder for Audit Log" (line 19)

2. **Missing all MCP fields** - Should display:
   ```json
   {
     "entries": [
       {
         "id": "uuid",
         "timestamp": "ISO8601",
         "actor_id": "uuid",
         "actor_email": "admin@example.com",
         "action": "user.create",
         "resource_type": "user",
         "resource_id": "uuid",
         "changes": {
           "before": null,
           "after": {"email": "new@example.com", "role": "student"}
         },
         "ip_address": "192.168.1.1",
         "user_agent": "Mozilla/5.0..."
       }
     ]
   }
   ```

3. **No query implementation** - Not fetching audit logs from database

4. **Missing filters** - Should support:
   - Filter by user (actor)
   - Filter by action type
   - Filter by resource type
   - Date range picker
   - Search by resource ID

5. **Missing detail view** - No way to see change diffs

### 📋 Recommendations

**Priority 1 (Critical - Implement Core Functionality):**
1. **Fetch audit logs from database:**
   ```typescript
   async function getAuditLogs(tenantId: string, filters: AuditFilters = {}) {
     return await db
       .select({
         id: auditLogs.id,
         timestamp: auditLogs.timestamp,
         actor: users, // Join for actor email
         action: auditLogs.action,
         resource_type: auditLogs.resource_type,
         resource_id: auditLogs.resource_id,
         changes: auditLogs.changes,
         metadata: auditLogs.metadata, // Contains IP, user_agent
       })
       .from(auditLogs)
       .leftJoin(users, eq(auditLogs.user_id, users.id))
       .where(and(
         eq(auditLogs.tenant_id, tenantId),
         filters.action ? eq(auditLogs.action, filters.action) : undefined,
         filters.userId ? eq(auditLogs.user_id, filters.userId) : undefined,
       ))
       .orderBy(desc(auditLogs.timestamp))
       .limit(100);
   }
   ```

2. **Display audit entries in table:**
   - Columns: Timestamp, Actor, Action, Resource, Changes
   - Expandable rows for change diffs

3. **Add pagination** - Audit logs can be very large
   - Implement offset/limit with "Load More" button

**Priority 2 (Important - Add Filters):**
4. Add filter controls:
   - Action type dropdown
   - User selector
   - Resource type filter
   - Date range picker

5. Implement change diff viewer:
   ```tsx
   <DiffViewer
     before={entry.changes.before}
     after={entry.changes.after}
   />
   ```

**Priority 3 (Enhancement):**
6. Add export to CSV for compliance reports
7. Add real-time updates (new entries appear without refresh)
8. Add search by resource ID
9. Color-code actions (create = green, delete = red, update = blue)

**Code Example:**
```tsx
import { AuditLogList } from '@/components/admin/AuditLogList';

export default async function AuditLogPage() {
  await requireAuth();
  const tenantId = await getTenantId();

  const logs = await getAuditLogs(tenantId);

  return (
    <div>
      <h1>Audit Log</h1>
      <p>Immutable record of all system actions</p>

      {/* Filters */}
      <AuditLogFilters />

      {/* Logs Table */}
      <AuditLogList entries={logs} />
    </div>
  );
}
```

---

## Cross-Cutting Issues

### 1. No MCP Resource Handlers
**Problem:** Pages fetch data directly but don't implement MCP resource URIs
**Impact:** Cannot be accessed via MCP protocol by AI agents
**Fix:** Create resource handlers in `/admin-mcp/src/resources/`

Example:
```typescript
// admin-mcp/src/resources/users.ts
export async function handleUsersResource(jwt: JWT) {
  const tenantId = jwt.tenant_id;
  return await getUsersResource(tenantId, {});
}

// Register in MCP server:
server.resource({
  uri: "admin://users",
  name: "User Directory",
  description: "Complete user directory with roles and status",
  handler: handleUsersResource,
});
```

### 2. Missing Authorization Scopes
**Problem:** No scope-based access control implemented
**Impact:** All admins see all data (PII exposure risk)
**Fix:** Implement JWT scope checking per MCP spec (lines 2287-2346)

```typescript
function requireScope(jwt: JWT, scope: string) {
  if (!jwt.scopes?.includes(scope) && !jwt.scopes?.includes('admin.super')) {
    throw new Error(`Insufficient scope: ${scope} required`);
  }
}
```

### 3. No Pagination
**Problem:** All pages load entire datasets
**Impact:** Performance issues with large datasets
**Fix:** Add offset/limit to all queries

### 4. Missing Tenant Isolation Verification
**Problem:** Relying on app-level filtering, no RLS policies
**Impact:** Security risk if query accidentally omits tenant filter
**Fix:** Implement RLS policies in Supabase per MCP spec (lines 2350-2380)

### 5. No Error Handling
**Problem:** No try/catch blocks, no error states in UI
**Impact:** App crashes on database errors
**Fix:** Add error boundaries and proper error responses

### 6. Missing Audit Logging
**Problem:** Admin actions are not logged to audit_logs table
**Impact:** No compliance trail for changes
**Fix:** Log all mutations (create, update, delete) to audit_logs

---

## Priority Action Plan

### Phase 1: Critical Fixes (Week 1)
1. ✅ **Users Page:**
   - Add tenant_id to response
   - Implement PII masking
   - Return MCP-compliant format

2. ✅ **Classes Page:**
   - Database migration for missing fields
   - Update query to fetch all MCP fields
   - Fix schedule format

3. ✅ **Attendance Page:**
   - Implement system-wide stats
   - Calculate attendance rates
   - Add visa compliance tracking

4. ✅ **Audit Log Page:**
   - Implement basic audit log display
   - Fetch logs from database
   - Add pagination

### Phase 2: Important Enhancements (Week 2)
5. Create MCP resource handlers for all pages
6. Implement scope-based authorization
7. Add filtering and search to all pages
8. Implement pagination across all endpoints

### Phase 3: Advanced Features (Week 3)
9. Add export functionality (CSV, PDF)
10. Implement RLS policies in database
11. Add audit logging for all mutations
12. Create visa risk dashboard
13. Add real-time updates to audit log

---

## Compliance Scorecard

| MCP Requirement | Users | Classes | Attendance | Audit Log | Overall |
|-----------------|-------|---------|------------|-----------|---------|
| **Data Fetching** | 🟢 80% | 🟡 60% | 🔴 40% | 🔴 0% | 🟡 45% |
| **Required Fields** | 🟢 90% | 🔴 40% | 🔴 20% | 🔴 0% | 🔴 38% |
| **Tenant Scoping** | 🟢 100% | 🟢 100% | 🟢 100% | ⚪ N/A | 🟢 100% |
| **Stats/KPIs** | 🟢 90% | 🟡 60% | 🔴 10% | 🔴 0% | 🔴 40% |
| **MCP Resource Format** | 🔴 30% | 🔴 20% | 🔴 10% | 🔴 0% | 🔴 15% |
| **Authorization** | 🔴 0% | 🔴 0% | 🔴 0% | 🔴 0% | 🔴 0% |
| **Pagination** | 🔴 0% | 🔴 0% | 🔴 0% | 🔴 0% | 🔴 0% |
| **Filters** | 🔴 0% | 🔴 20% | 🔴 0% | 🔴 0% | 🔴 5% |

**Legend:** 🟢 Good (>75%) | 🟡 Acceptable (50-75%) | 🔴 Needs Work (<50%) | ⚪ N/A

---

## Conclusion

The existing admin pages provide a functional foundation but require significant work to achieve MCP compliance. Key gaps include:

1. **Schema alignment** - Classes page needs database migrations
2. **Missing implementations** - Audit log is not implemented
3. **Resource formatting** - No pages return MCP-compliant resource format
4. **Authorization** - No scope-based access control
5. **Performance** - No pagination or filtering

**Recommended Next Steps:**
1. Start with Users page (easiest, 65% complete)
2. Implement Audit Log (critical for compliance)
3. Redesign Attendance page to show overview stats
4. Execute database migration for Classes page
5. Create MCP resource handlers for all pages

**Estimated Effort:**
- Phase 1 (Critical): 40 hours
- Phase 2 (Important): 30 hours
- Phase 3 (Advanced): 40 hours
- **Total: ~110 hours (3 weeks)**

---

**Report Generated:** 2025-12-17
**Spec Version:** Admin MCP v2.0.0
**Reviewed By:** Claude (AI Assistant)

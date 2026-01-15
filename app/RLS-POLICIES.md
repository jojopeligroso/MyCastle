# Row-Level Security (RLS) Policies

> **Task**: T-011: RLS Policies (Core)
> **Epic**: EP-AUTH
> **Requirements**: REQ-A-004
> **Design Ref**: DESIGN §5.2
> **Status**: ✅ Complete

---

## Table of Contents

1. [Overview](#overview)
2. [Security Model](#security-model)
3. [User Context](#user-context)
4. [Policy Summary](#policy-summary)
5. [Implementation Details](#implementation-details)
6. [Testing](#testing)
7. [Usage Guide](#usage-guide)
8. [Security Considerations](#security-considerations)

---

## Overview

Row-Level Security (RLS) policies enforce multi-tenant isolation and role-based access control (RBAC) at the database level. This ensures that:

- **Tenant Isolation**: Users can only access data within their own organization/school
- **Role-Based Access**: Access permissions vary by role (admin, teacher, student)
- **Defense in Depth**: Security is enforced at the database layer, not just application layer

### Acceptance Criteria (T-011)

```gherkin
GIVEN teacher Alice assigned to Class A
  AND teacher Bob assigned to Class B
WHEN Alice queries classes
THEN only Class A returned
  AND Class B not visible

GIVEN student enrolled in Class A
WHEN student queries classes
THEN only Class A returned

GIVEN admin in Org 1
WHEN admin queries classes
THEN all Org 1 classes returned
  AND Org 2 classes not visible
```

✅ **All acceptance criteria met and tested.**

---

## Security Model

### Multi-Tenant Architecture

Every table contains a `tenant_id` column that references the tenant (organization/school). RLS policies ensure users can only access data where `tenant_id` matches their authenticated tenant.

### Role-Based Access Control (RBAC)

Three primary roles with different access levels:

| Role        | Access Level | Capabilities                                           |
| ----------- | ------------ | ------------------------------------------------------ |
| **admin**   | Org-wide     | Full CRUD on all tenant data                           |
| **teacher** | Class-scoped | View/modify assigned classes, sessions, attendance     |
| **student** | Self-scoped  | View enrolled classes, own attendance, own submissions |

---

## User Context

### Context Functions

RLS policies rely on session-level configuration variables set via the `set_user_context()` function:

```sql
CREATE OR REPLACE FUNCTION set_user_context(
  p_user_id uuid,
  p_tenant_id uuid,
  p_role varchar
) RETURNS void;
```

**Helper Functions**:

- `current_user_id()` - Returns authenticated user UUID
- `current_tenant_id()` - Returns authenticated tenant UUID
- `current_user_role()` - Returns user role (admin/teacher/student)

### Application Integration

After JWT verification, the application must call:

```typescript
await db.execute(sql`SELECT set_user_context(${userId}::uuid, ${tenantId}::uuid, ${role})`);
```

**Location**: `app/src/lib/auth/middleware.ts` (recommended)

---

## Policy Summary

### Tables with RLS Enabled

| Table              | Admin         | Teacher            | Student              | Notes                 |
| ------------------ | ------------- | ------------------ | -------------------- | --------------------- |
| **tenants**        | Own tenant    | Own tenant         | Own tenant           | Tenant isolation      |
| **users**          | All in tenant | All in tenant      | All in tenant        | User directory        |
| **classes**        | All in tenant | Assigned classes   | Enrolled classes     | Core access control   |
| **enrollments**    | All in tenant | For their classes  | Own enrollments      | Enrollment visibility |
| **class_sessions** | All in tenant | For their classes  | For enrolled classes | Session access        |
| **attendance**     | All in tenant | For their sessions | Own records          | Attendance privacy    |
| **assignments**    | All in tenant | For their classes  | For enrolled classes | Assignment visibility |
| **submissions**    | All in tenant | For their classes  | Own submissions      | Student work privacy  |
| **grades**         | All in tenant | For their classes  | Own grades           | Grade privacy         |
| **audit_logs**     | View all      | No access          | No access            | Admin-only auditing   |
| **invoices**       | All in tenant | No access          | Own invoices         | Financial privacy     |
| **payments**       | All in tenant | No access          | Own payments         | Payment privacy       |
| **conversations**  | No access     | Own conversations  | Own conversations    | Chat privacy          |
| **exports**        | All in tenant | Own exports        | No access            | Export access         |

---

## Implementation Details

### Core Policies (Examples)

#### Classes Table

**SELECT Policy** (Role-based visibility):

```sql
CREATE POLICY classes_select_by_role ON classes
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND (
      -- Admins see all
      current_user_role() = 'admin'
      -- Teachers see assigned classes
      OR (current_user_role() = 'teacher' AND teacher_id = current_user_id())
      -- Students see enrolled classes
      OR (
        current_user_role() = 'student'
        AND EXISTS (
          SELECT 1 FROM enrollments e
          WHERE e.class_id = classes.id
            AND e.student_id = current_user_id()
            AND e.status = 'active'
        )
      )
    )
  );
```

**INSERT Policy** (Admin-only):

```sql
CREATE POLICY classes_insert_admin ON classes
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'admin'
  );
```

**UPDATE Policy** (Admin or assigned teacher):

```sql
CREATE POLICY classes_update_admin_or_teacher ON classes
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND (
      current_user_role() = 'admin'
      OR (current_user_role() = 'teacher' AND teacher_id = current_user_id())
    )
  );
```

#### Attendance Table

**SELECT Policy**:

```sql
CREATE POLICY attendance_select_by_role ON attendance
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND (
      current_user_role() = 'admin'
      OR (current_user_role() = 'student' AND student_id = current_user_id())
      OR (
        current_user_role() = 'teacher'
        AND EXISTS (
          SELECT 1 FROM class_sessions cs
          INNER JOIN classes c ON cs.class_id = c.id
          WHERE cs.id = attendance.class_session_id
            AND c.teacher_id = current_user_id()
        )
      )
    )
  );
```

**INSERT Policy** (Teachers mark attendance for their sessions):

```sql
CREATE POLICY attendance_insert_teacher_or_admin ON attendance
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND (
      current_user_role() = 'admin'
      OR EXISTS (
        SELECT 1 FROM class_sessions cs
        INNER JOIN classes c ON cs.class_id = c.id
        WHERE cs.id = attendance.class_session_id
          AND c.teacher_id = current_user_id()
      )
    )
  );
```

### Audit Logs (Immutable)

Audit logs are **immutable** and **admin-only**:

```sql
-- SELECT: Admins only
CREATE POLICY audit_logs_select_admin ON audit_logs
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'admin'
  );

-- No INSERT, UPDATE, or DELETE policies for users
-- Logs are inserted via triggers or elevated application code
```

---

## Testing

### Test Coverage

Comprehensive test suite in `app/src/__tests__/rls-policies.test.ts`:

**Test Categories**:

1. ✅ **Setup & Teardown** - Create test tenants, users, classes
2. ✅ **Tenant Isolation** - Users see only their tenant data
3. ✅ **Role-Based Access** - Admins, teachers, students see appropriate data
4. ✅ **Positive Cases** - Authorized operations succeed
5. ✅ **Negative Cases** - Unauthorized operations blocked
6. ✅ **Multi-Tenant Isolation** - Cross-tenant access prevented
7. ✅ **Admin Privileges** - Admins can create, update, delete
8. ✅ **Teacher Privileges** - Teachers can modify their classes
9. ✅ **Student Restrictions** - Students cannot create/update classes
10. ✅ **Rollback Safety** - Policy violations trigger transaction rollback
11. ✅ **Context Functions** - User context correctly set/retrieved

**Test Count**: 22+ comprehensive tests

### Running Tests

```bash
cd app
npm test -- rls-policies.test.ts
```

**Prerequisites**:

- PostgreSQL database with RLS policies applied
- `DATABASE_URL` environment variable set
- Test database seeded with CEFR descriptors (optional)

### Example Test

```typescript
it('should allow teacher to see only their assigned classes', async () => {
  await setUserContext(teacher1Id, tenant1Id, 'teacher');

  const result = await db.select().from(classes);

  // Teacher1 should only see class1
  expect(result.length).toBe(1);
  expect(result[0].id).toBe(class1Id);
});
```

---

## Usage Guide

### Application Layer Integration

#### 1. Middleware Setup

In your Next.js middleware or API route handler:

```typescript
import { db } from '@/db';
import { sql } from 'drizzle-orm';

// After JWT verification
const { userId, tenantId, role } = await verifyJWT(token);

// Set user context for RLS policies
await db.execute(sql`SELECT set_user_context(${userId}::uuid, ${tenantId}::uuid, ${role})`);
```

#### 2. Query Execution

Once context is set, all queries automatically respect RLS policies:

```typescript
// Admin sees all classes in their tenant
await setUserContext(adminId, tenantId, 'admin');
const allClasses = await db.select().from(classes); // Returns all tenant classes

// Teacher sees only assigned classes
await setUserContext(teacherId, tenantId, 'teacher');
const myClasses = await db.select().from(classes); // Returns only assigned classes

// Student sees only enrolled classes
await setUserContext(studentId, tenantId, 'student');
const enrolledClasses = await db.select().from(classes); // Returns only enrolled classes
```

#### 3. Clear Context (After Request)

```typescript
await db.execute(sql`RESET app.current_user_id`);
await db.execute(sql`RESET app.current_tenant_id`);
await db.execute(sql`RESET app.current_role`);
```

### Bypassing RLS (Admin Operations)

For setup scripts or migrations that need to bypass RLS:

```sql
-- Disable RLS for this session (superuser only)
SET session_replication_role = 'replica';

-- Perform admin operations
INSERT INTO tenants (...) VALUES (...);

-- Re-enable RLS
SET session_replication_role = 'origin';
```

**⚠️ Warning**: Only use in trusted admin scripts, never in application code.

---

## Security Considerations

### 1. Always Set Context

**Critical**: ALWAYS call `set_user_context()` after JWT verification. Queries without context will return **zero rows** due to RLS policies.

```typescript
// ❌ Bad: Context not set
const classes = await db.select().from(classes); // Returns []

// ✅ Good: Context set first
await setUserContext(userId, tenantId, role);
const classes = await db.select().from(classes); // Returns authorized rows
```

### 2. Never Trust Client Input for Context

**Critical**: User context (userId, tenantId, role) must ONLY come from verified JWT claims, never from request parameters:

```typescript
// ❌ NEVER DO THIS
const { userId } = req.body; // Attacker can impersonate any user!

// ✅ Always use JWT claims
const { userId, tenantId, role } = await verifyJWT(req.headers.authorization);
```

### 3. Tenant Isolation Guarantee

RLS policies enforce strict tenant isolation. Even if an attacker obtains a valid user ID from another tenant, they cannot access cross-tenant data because:

1. `tenant_id` mismatch prevents row visibility
2. All policies include `tenant_id = current_tenant_id()` check

### 4. Immutable Audit Logs

Audit logs have **no user-facing INSERT/UPDATE/DELETE policies**. They are:

- Inserted via triggers or elevated application code
- Read-only for admins
- Tamper-proof

### 5. Defense in Depth

RLS is the **last line of defense**, not the only defense:

**Application Layer**:

- JWT authentication
- Role-based middleware
- Input validation
- Business logic checks

**Database Layer**:

- RLS policies (this layer)
- Foreign key constraints
- Check constraints

Both layers are critical for security.

### 6. Performance Considerations

**RLS Policies Add Query Overhead**:

- Policies with `EXISTS` subqueries can impact performance
- Mitigated by proper indexes (see `003_add_timetable_indexes.sql`)
- Always test query performance with `EXPLAIN ANALYZE`

**Indexes for RLS Performance**:

```sql
-- Example: Speed up teacher's class queries
CREATE INDEX idx_classes_teacher ON classes(teacher_id);

-- Example: Speed up student's enrollment checks
CREATE INDEX idx_enrollments_student_class ON enrollments(student_id, class_id);
```

---

## Migration Files

1. **`0001_add_core_rls_policies.sql`** - Main RLS policy definitions
   - User context functions
   - Enable RLS on all tables
   - Policy definitions for all tables

2. **`004_add_rls_policies.sql`** - Additional attendance-specific policies (deprecated, merged into 0001)

3. **Test file**: `app/src/__tests__/rls-policies.test.ts`

---

## Troubleshooting

### Issue: Queries return empty results

**Cause**: User context not set

**Solution**:

```typescript
await db.execute(sql`SELECT set_user_context(${userId}::uuid, ${tenantId}::uuid, ${role})`);
```

### Issue: Permission denied on INSERT/UPDATE

**Cause**: User role lacks permission for operation

**Solution**: Check that:

1. User role matches policy requirements (e.g., only admins can create classes)
2. `tenant_id` matches current context
3. Additional conditions met (e.g., teacher assigned to class)

### Issue: RLS policies not applied

**Cause**: RLS not enabled on table or policies not created

**Solution**:

```sql
-- Check RLS status
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Enable RLS if needed
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

### Issue: Tests failing with "cannot execute X in a read-only transaction"

**Cause**: Running tests without proper database setup

**Solution**:

```bash
# Ensure DATABASE_URL points to test database
export DATABASE_URL="postgresql://user:pass@localhost:5432/mycastle_test"

# Run migrations
npm run db:migrate

# Run tests
npm test -- rls-policies.test.ts
```

---

## References

- **Task**: TASKS.md §T-011
- **Requirements**: REQ.md §REQ-A-004
- **Design**: DESIGN.md §5.2
- **Database Schema**: spec/08-database.md
- **PostgreSQL RLS Docs**: https://www.postgresql.org/docs/current/ddl-rowsecurity.html

---

## Changelog

| Version | Date       | Changes                                          |
| ------- | ---------- | ------------------------------------------------ |
| 1.0.0   | 2025-11-09 | Initial RLS policies implementation (T-011)      |
| 1.0.1   | 2025-11-09 | Consolidated policies into single migration file |
| 1.0.2   | 2025-11-09 | Added comprehensive documentation                |

---

**Status**: ✅ **T-011 Complete**

- [x] RLS policies implemented for all core tables
- [x] Multi-tenant isolation enforced
- [x] Role-based access control (admin/teacher/student)
- [x] Comprehensive test suite (22+ tests)
- [x] Positive and negative test cases
- [x] Rollback safety verified
- [x] Documentation complete

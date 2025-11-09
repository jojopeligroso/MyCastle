# Database Migrations

This directory contains SQL migration files for setting up the MyCastle database with Row-Level Security (RLS) policies.

## Migration Files

### 0001_initial_schema_with_rls.sql
- **Task**: T-002 (Database Setup) + T-011 (Core RLS Policies)
- **Description**: Creates all core tables and applies comprehensive RLS policies
- **Includes**:
  - Core tables (tenants, users)
  - Academic tables (classes, enrollments, class_sessions, attendance, assignments, submissions, grades)
  - System tables (audit_logs, invoices, payments, conversations, exports)
  - Curriculum tables (cefr_descriptors, lesson_plans, materials)
  - All RLS policies for multi-tenant and role-based access control

## Running Migrations

### Prerequisites
1. PostgreSQL 14+ database
2. DATABASE_URL environment variable set
3. Supabase project (recommended) or local PostgreSQL

### Apply Migrations

#### Option 1: Using psql directly
```bash
# Set your database connection string
export DATABASE_URL="postgresql://user:password@localhost:5432/mycastle"

# Run the migration
psql $DATABASE_URL -f migrations/0001_initial_schema_with_rls.sql
```

#### Option 2: Using Supabase CLI
```bash
supabase db reset --linked
```

#### Option 3: Using Node.js script
```bash
npm run db:migrate
```

## RLS Policy Architecture

### User Context Functions
The RLS policies rely on application-level user context set via:
```sql
SELECT set_user_context(user_id, tenant_id, role);
```

This must be called **before** any database queries in your application code.

### Context Retrieval Functions
- `current_user_id()` - Returns the authenticated user's ID
- `current_tenant_id()` - Returns the user's tenant ID
- `current_user_role()` - Returns the user's role (admin, teacher, student)

### Access Control Model

#### Multi-Tenant Isolation
- All data is scoped by `tenant_id`
- Users can only see data from their own tenant
- Cross-tenant queries are blocked by RLS

#### Role-Based Access

**Admin Role (`admin`)**
- Can view/create/update/delete all resources in their tenant
- Full access to audit logs, invoices, payments, exports
- Can manage users and class assignments

**Teacher Role (`teacher`)**
- Can view their assigned classes and sessions
- Can mark attendance for their sessions
- Can create/update assignments and grade submissions for their classes
- Can create lesson plans
- Cannot access other teachers' classes

**Student Role (`student`)**
- Can view classes they're enrolled in
- Can view their own attendance, assignments, submissions, grades
- Can submit assignments
- Can view their own invoices and payments
- Cannot access other students' data

### Security Guarantees

1. **No Cross-Tenant Data Leaks**: RLS policies enforce tenant isolation at the database level
2. **Role Separation**: Teachers cannot access admin functions, students cannot access teacher functions
3. **Audit Trail**: All policy violations are logged (when audit triggers are enabled)
4. **Defense in Depth**: Even if application code has bugs, database will reject unauthorized queries

## Testing RLS Policies

### Running the Test Suite
```bash
npm test src/__tests__/rls-policies.test.ts
```

### Test Coverage
- ✅ Multi-tenant isolation
- ✅ Role-based access control (admin, teacher, student)
- ✅ Positive cases (authorized access)
- ✅ Negative cases (unauthorized access blocked)
- ✅ Policy rollback safety
- ✅ Context functions

## Application Integration

### Example: Next.js API Route with RLS
```typescript
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await getSession(request);

  // Set user context for RLS
  await db.execute(sql`
    SELECT set_user_context(
      ${session.userId}::uuid,
      ${session.tenantId}::uuid,
      ${session.role}
    )
  `);

  // Now all queries are scoped by RLS policies
  const classes = await db.select().from(classesTable);

  return Response.json(classes);
}
```

### Example: Clearing Context (Optional)
```typescript
// After queries complete (optional, context is session-scoped)
await db.execute(sql`RESET app.current_user_id`);
await db.execute(sql`RESET app.current_tenant_id`);
await db.execute(sql`RESET app.current_role`);
```

## Troubleshooting

### "permission denied for table" errors
- Ensure you've called `set_user_context()` before querying
- Verify the user has the correct role for the operation
- Check that the resource belongs to the user's tenant

### Empty result sets when data exists
- Verify `current_tenant_id()` matches the data's tenant_id
- Check role-based visibility (e.g., teacher can only see assigned classes)
- Ensure enrollments exist for students trying to access classes

### "function set_user_context does not exist"
- Run the RLS policy migration (`0001_add_core_rls_policies.sql`)
- Verify migration completed successfully

## Maintenance

### Adding New Tables
1. Add table definition to appropriate schema file
2. Enable RLS: `ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;`
3. Create appropriate SELECT/INSERT/UPDATE/DELETE policies
4. Update `src/__tests__/rls-policies.test.ts` with new tests
5. Run test suite to verify

### Modifying Policies
1. Create new migration file (e.g., `0002_update_rls_policies.sql`)
2. Use `DROP POLICY IF EXISTS policy_name ON table_name;`
3. Create updated policy with `CREATE POLICY ...`
4. Update tests
5. Test thoroughly before deploying to production

## References

- **Task Spec**: TASKS.md § T-011
- **Requirements**: REQ.md § REQ-A-004
- **Design**: DESIGN.md § 5.2
- **PostgreSQL RLS Docs**: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- **Supabase RLS Guide**: https://supabase.com/docs/guides/auth/row-level-security

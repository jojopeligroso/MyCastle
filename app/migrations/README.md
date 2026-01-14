# Database Migrations

This directory contains database schema migrations for MyCastle ESL School Management System.

## Current Schema Version

**Fresh Schema - January 2026**

The database has been rebuilt from scratch with Ireland ESL school business logic.

## Migration Files

### Core Migrations (Apply in order)

| File | Description | Status |
|------|-------------|--------|
| `FRESH_0000_drop_all.sql` | Nuclear reset (DROP SCHEMA public CASCADE) | ✅ Applied |
| `FRESH_0001_core_schema.sql` | Complete schema: 9 tables with RLS enabled | ✅ Applied |
| `FRESH_0002_rls_policies.sql` | Comprehensive RLS policies (role-based + superuser) | ✅ Applied |

### Seed Data

Seed data is managed via TypeScript scripts (not SQL files):

| Script | Description |
|--------|-------------|
| `scripts/seed-fresh-data.ts` | Initial seed data (tenant, courses, test user, booking) |
| `scripts/seed-cefr-descriptors.ts` | CEFR language level descriptors |
| `scripts/seed-students.ts` | Sample student data |

## Database Structure

### 9 Core Tables

**Multi-tenancy & Users:**
1. **tenants** - School branches (multi-tenancy support)
2. **users** - Base table for all people (students, teachers, admins)
3. **user_roles** - Multi-role support (one user can be admin + teacher + student)
4. **students** - Student-specific data (visa tracking, emergency contacts)

**Business Tables:**
5. **agencies** - Sales sources (Direct vs Agency bookings)
6. **courses** - Course catalog (GE A1-C1, IELTS, etc.)
7. **accommodation_types** - Host Family, Residence, Student House, Studio
8. **bookings** - Core business transactions with full financial breakdown (EUR)
9. **payments** - Payment history with auto-calculated balances

### Key Features

- **Multi-role users**: One person can be admin + teacher + student simultaneously via `user_roles` junction table
- **Ireland ESL specifics**: Stamp 2 visa tracking (First Time/Renewal 1/Renewal 2), learner protection insurance
- **Financial tracking**: Full booking breakdown (course, accommodation, exam, insurance fees) with payment history
- **Tenant isolation**: RLS policies enforce strict data separation between school branches
- **Audit trails**: created_at, updated_at on all tables; booking cancellations tracked

## RLS Security Model

### Role Hierarchy

1. **Superuser** (eoinmaleoin@gmail.com + service_role)
   - Bypasses all RLS policies via `is_superuser()` function
   - Full access to all tenants and data

2. **Admin**
   - Full CRUD on all tables within their tenant
   - Can manage users, roles, courses, bookings, payments
   - Cannot access other tenants

3. **Teacher** (permissions TBD)
   - Limited read access (to be defined when implementing teacher features)
   - Cannot manage agencies, users, or roles
   - Specific permissions will be added in future migrations

4. **Student**
   - Read their own profile, student record, bookings, payments
   - Update limited fields (preferences, profile)
   - Cannot access other students' data

### Setting RLS Context

**CRITICAL**: Every database query must set RLS context first:

```typescript
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

// ALWAYS do this BEFORE querying:
await db.execute(sql`
  SELECT set_user_context(
    \${userId}::uuid,
    \${tenantId}::uuid,
    \${role}
  )
`);

// Optional: Set user email for superuser check
await db.execute(sql`SET app.user_email = \${email}`);

// Now all queries are automatically scoped:
const users = await db.select().from(usersTable);
```

See `/app/RLS-POLICIES.md` for detailed documentation.

## Running Migrations

### Fresh Install (Recommended)

For new environments or when resetting the database:

```bash
# 1. Run the automated migration script
cd /home/eoin/Work/MyCastle/app
npm run migrate:fresh

# This orchestrates:
# - FRESH_0000_drop_all.sql (nuclear reset)
# - FRESH_0001_core_schema.sql (create tables)
# - FRESH_0002_rls_policies.sql (security policies)
# - scripts/seed-fresh-data.ts (initial data)
```

### Manual Migration (Supabase SQL Editor)

If you prefer manual control:

```bash
# 1. In Supabase SQL Editor, run in order:
FRESH_0000_drop_all.sql
FRESH_0001_core_schema.sql
FRESH_0002_rls_policies.sql

# 2. Seed data via CLI:
npx tsx scripts/seed-fresh-data.ts
```

### Verification

```bash
# Verify schema and data
npx tsx scripts/verify-complete.ts

# Check RLS policies
npx tsx scripts/check-rls-policies.ts
```

## Package.json Scripts

```json
{
  "migrate:fresh": "tsx scripts/run-fresh-migrations.ts",
  "db:generate": "drizzle-kit generate",
  "db:push": "drizzle-kit push",
  "db:studio": "drizzle-kit studio"
}
```

## After Migration Checklist

After running migrations, **always**:

1. ✅ Verify schema matches design: `npx tsx scripts/verify-complete.ts`
2. ✅ Check RLS policies: `npx tsx scripts/check-rls-policies.ts`
3. ✅ Regenerate TypeScript types: `npm run db:generate`
4. ✅ Type-check project: `npx tsc --noEmit`
5. ✅ Restart dev server: `npm run dev`
6. ✅ Test user creation and RLS context in UI

## Troubleshooting

### "Permission denied" errors

**Cause**: RLS context not set before querying.

**Fix**: Call `set_user_context()` before all queries. See "Setting RLS Context" above.

### "Empty results" despite data existing

**Cause**: Wrong tenant_id or missing RLS context.

**Fix**: Verify you're setting the correct tenant_id matching your seed data.

### Migration script fails

**Cause**: Previous tables/constraints blocking clean slate.

**Fix**: Ensure `FRESH_0000_drop_all.sql` runs first to nuke everything.

### Types out of sync

**Cause**: Schema changed but TypeScript types not regenerated.

**Fix**: Run `npm run db:generate` after schema changes.

## Design Documents

- **Schema Design**: `/docs/FRESH_SCHEMA_DESIGN.md`
- **RLS Policies**: `/app/RLS-POLICIES.md`
- **Business Logic**: See `/REQ.md` and `/DESIGN.md`

## Schema Evolution

When the schema needs to evolve:

1. **Create new migration**: `FRESH_0003_add_feature.sql`
2. **Update Drizzle schema**: `/app/src/db/schema/*.ts`
3. **Add new RLS policies** if needed
4. **Regenerate types**: `npm run db:generate`
5. **Update this README**
6. **Test thoroughly** before deploying

## Deprecated Files (Removed)

- Old numbered migrations (0001-0008, 001-004) - superseded by FRESH_* schema
- `FRESH_0002_seed_data.sql` - replaced by TypeScript seeder
- Debug scripts (`check-tenants.ts`, `examine-database.ts`, etc.)

---

**Last Updated**: 2026-01-14
**Schema Version**: FRESH (January 2026)
**Migration Count**: 3 (drop, schema, RLS)

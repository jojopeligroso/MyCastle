# Migration Guide: From Over-Engineered Endpoints to Query Interface

**Date**: 2026-01-10
**Status**: Implementation Guide

---

## Overview

This guide shows how to migrate from dedicated API endpoints and React components to the simplified query interface for common admin operations.

---

## Migration Strategy

### 3-Phase Approach

**Phase 1**: Parallel Operation (Weeks 1-2)
- Query interface available at `/admin/query`
- Existing endpoints remain functional
- User training and adoption

**Phase 2**: Gradual Migration (Weeks 3-4)
- Move workflows to query interface
- Mark old endpoints as deprecated
- Monitor usage analytics

**Phase 3**: Cleanup (Week 5+)
- Remove unused endpoints
- Archive old components
- Update documentation

---

## Endpoint Migration Examples

### Example 1: Student Search/Filter

**Before** (Over-Engineered):

```typescript
// API: /api/admin/students?search=john&status=active&level=B1
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const status = searchParams.get('status');
  const level = searchParams.get('level');

  let query = db.select().from(users)
    .where(and(eq(users.role, 'student'), isNull(users.deleted_at)));

  if (search) {
    query = query.where(or(
      ilike(users.name, `%${search}%`),
      ilike(users.email, `%${search}%`)
    ));
  }

  if (status) {
    query = query.where(eq(users.status, status));
  }

  if (level) {
    query = query.where(eq(users.current_level, level));
  }

  const students = await query.limit(100).orderBy(users.name);
  return NextResponse.json({ students });
}

// Client: Complex component with filters
<StudentFilters
  onStatusChange={setStatus}
  onLevelChange={setLevel}
  onSearchChange={setSearch}
/>
<StudentList students={filteredStudents} />
```

**After** (Simplified):

```
Natural Language: "Show me active students in B1 level named John"
↓ AI Translation
SQL: SELECT * FROM users WHERE role='student' AND status='active'
     AND current_level='B1' AND name LIKE '%John%' AND deleted_at IS NULL
↓ Execute → Display
```

**Migration Steps**:
1. Add link to Query Interface in Student Registry page
2. Show tutorial for common queries
3. After 2 weeks, deprecate `/api/admin/students` endpoint
4. Remove StudentFilters component (keep StudentList for detail view)

**Lines of Code Removed**: ~300 (API + Component)

---

### Example 2: Visa Expiry Report

**Before** (Over-Engineered):

```typescript
// API: /api/admin/reports/visa-expiring
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '30');

  const students = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.role, 'student'),
        sql`${users.visa_expiry} BETWEEN NOW() AND NOW() + INTERVAL '${days} days'`,
        isNull(users.deleted_at)
      )
    );

  // Generate CSV on server
  const csv = generateCSV(students);

  // Upload to storage
  const url = await uploadToStorage(csv);

  return NextResponse.json({ url, expires: '24h' });
}

// Client: Dedicated component
<VisaExpiryReport onGenerate={handleGenerate} />
```

**After** (Simplified):

```
Natural Language: "Show students whose visas expire in the next 30 days"
↓ Execute
↓ Click "Export CSV" (client-side download, instant)
```

**Migration Steps**:
1. Remove `/api/admin/reports/visa-expiring` endpoint
2. Remove VisaExpiryReport component
3. Add query template to quick actions

**Lines of Code Removed**: ~200 (API + Component + CSV generation)

---

### Example 3: Enrollment Status Update

**Before** (Over-Engineered):

```typescript
// Server Action: /app/admin/enrollments/_actions/updateStatus.ts
export async function updateEnrollmentStatus(
  enrollmentId: string,
  newStatus: string
) {
  'use server';

  // Validation
  const schema = z.object({
    enrollmentId: z.string().uuid(),
    newStatus: z.enum(['active', 'completed', 'withdrawn']),
  });

  const result = schema.safeParse({ enrollmentId, newStatus });
  if (!result.success) {
    return { error: result.error.message };
  }

  // Transaction
  await db.transaction(async (tx) => {
    await tx
      .update(enrollments)
      .set({ status: newStatus, updated_at: new Date() })
      .where(eq(enrollments.id, enrollmentId));

    // Audit log
    await tx.insert(auditLog).values({
      entity: 'enrollment',
      entity_id: enrollmentId,
      action: 'update',
      changes: { status: newStatus },
    });
  });

  revalidatePath('/admin/enrollments');
  return { success: true };
}

// Client: Form with validation
<UpdateStatusForm enrollment={enrollment} onUpdate={updateEnrollmentStatus} />
```

**After** (Simplified with Confirmation):

```
Natural Language: "Update enrollment X to completed status"
↓ AI Translation
SQL: UPDATE enrollments SET status='completed', updated_at=NOW()
     WHERE id='X'
↓ Preview: "This will affect 1 row. Proceed?"
↓ Confirm → Execute
↓ Audit log automatically created by trigger
```

**Migration Steps**:
1. Add confirmation workflow for UPDATE queries
2. Show affected rows before execution
3. Keep audit log trigger in database
4. Remove server action + form component

**Lines of Code Removed**: ~150 (Server Action + Form)

---

### Example 4: Class Roster Export

**Before** (Over-Engineered):

```typescript
// API: /api/admin/classes/[id]/roster/export
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const classId = params.id;

  // Fetch data with joins
  const roster = await db
    .select({
      studentName: users.name,
      studentEmail: users.email,
      enrollmentStatus: enrollments.status,
      startDate: enrollments.start_date,
    })
    .from(enrollments)
    .innerJoin(users, eq(enrollments.student_id, users.id))
    .where(
      and(
        eq(enrollments.class_id, classId),
        eq(enrollments.status, 'active')
      )
    );

  // Generate CSV on server
  const csv = generateCSV(roster);

  // Upload to storage
  const { url } = await supabaseStorage.upload('exports', csv);

  // Return signed URL
  const signedUrl = await supabaseStorage.getSignedUrl(url, 86400);

  return NextResponse.json({ url: signedUrl, expires: '24h' });
}
```

**After** (Simplified):

```
Natural Language: "Show all students enrolled in class X"
↓ Execute
↓ Click "Export CSV" (instant client-side download)
```

**Migration Steps**:
1. Remove export endpoint
2. Remove storage upload logic
3. Use client-side CSV generation

**Lines of Code Removed**: ~100 (API + Storage logic)

---

## Component Migration

### StudentRegistry Component

**Before**:
- Complex client-side filtering
- Saved views with URL params
- Multiple filter dropdowns
- Search input with debouncing

**After**:
- Link to `/admin/query` with suggested queries
- Quick action buttons that pre-fill natural language input
- Keep detail drawer for individual student view

**Migration**:
```tsx
// Add to StudentRegistry.tsx
<div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
  <p className="text-sm text-blue-800 mb-2">
    💡 Try the new Query Interface for faster, more flexible searches!
  </p>
  <Link href="/admin/query?q=Show me active students">
    <Button variant="outline" size="sm">
      Open Query Interface →
    </Button>
  </Link>
</div>
```

---

## Database Considerations

### Triggers for Audit Logging

Since we're removing server-side audit log logic, add database triggers:

```sql
-- Trigger for enrollment updates
CREATE OR REPLACE FUNCTION log_enrollment_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (entity, entity_id, action, changes, created_at)
  VALUES (
    'enrollment',
    NEW.id,
    'update',
    jsonb_build_object(
      'old', row_to_json(OLD),
      'new', row_to_json(NEW)
    ),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enrollment_audit_trigger
AFTER UPDATE ON enrollments
FOR EACH ROW
EXECUTE FUNCTION log_enrollment_changes();
```

---

## Testing Migration

### Test Checklist

For each migrated operation:

1. **Functionality**: Query produces same results as old endpoint
2. **Performance**: Query completes in < 5 seconds
3. **Security**: RLS policies still enforced
4. **UX**: Non-technical users can perform operation
5. **Error Handling**: Clear error messages for invalid queries

### Test Cases

```typescript
// Test: Student search
describe('Student Search Migration', () => {
  it('should return same results as old endpoint', async () => {
    // Old endpoint
    const oldResults = await fetch('/api/admin/students?search=john');

    // New query interface
    const newResults = await fetch('/api/admin/query/translate', {
      method: 'POST',
      body: JSON.stringify({ query: 'Show students named John' }),
    });

    expect(newResults.data).toEqual(oldResults.students);
  });
});
```

---

## User Training

### Quick Start Guide

**For Non-Technical Users**:

1. **Natural Language Mode** (Recommended):
   - Type what you want to see in plain English
   - Review the generated SQL
   - Click "Execute" to run the query
   - Export results if needed

2. **Query Builder Mode** (More Control):
   - Select a table
   - Choose columns to display
   - Add filters step-by-step
   - Run and export results

### Common Queries Cheat Sheet

| Task | Natural Language Query |
|------|------------------------|
| View all students | "Show me all students" |
| Filter by status | "Show active students" |
| Filter by level | "Show students in B1 level" |
| Visa expiring | "Show students whose visas expire in the next 30 days" |
| Recent enrollments | "Show enrollments from this month" |
| Class roster | "Show all students in Pre-Intermediate class" |
| Student by name | "Find student named John Smith" |

---

## Rollback Plan

If issues arise during migration:

### Phase 1: Immediate Rollback (< 1 hour)

1. Keep old endpoints active in parallel
2. Disable query interface routing
3. Revert to previous UI

### Phase 2: Investigation (< 4 hours)

1. Review error logs
2. Identify root cause
3. Fix issues in staging

### Phase 3: Re-enable (< 1 hour)

1. Deploy fixes
2. Re-enable query interface
3. Monitor metrics

---

## Success Metrics

### Key Performance Indicators (KPIs)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Adoption Rate** | 80% of admins use query interface | Analytics |
| **Time Savings** | 60% reduction in common operations | User surveys |
| **Error Rate** | < 5% query execution errors | Server logs |
| **User Satisfaction** | NPS > 50 | Quarterly survey |
| **Endpoint Deprecation** | 20 endpoints removed | Code audit |

---

## Timeline

### Week 1-2: Parallel Operation

- ✅ Query interface deployed
- ✅ Documentation created
- ⏳ User training sessions
- ⏳ Adoption monitoring

### Week 3-4: Gradual Migration

- ⏳ Move workflows to query interface
- ⏳ Deprecate redundant endpoints
- ⏳ Update internal documentation

### Week 5+: Cleanup

- ⏳ Remove deprecated endpoints
- ⏳ Archive old components
- ⏳ Performance review

---

## FAQ

### Q: What happens to existing bookmarks?

**A**: Old endpoints remain functional during transition. Users should update bookmarks to `/admin/query`.

### Q: Can I still use the old Student Registry page?

**A**: Yes, during Phase 1-2. Eventually it will redirect to query interface with suggested queries.

### Q: What if I need a complex query the AI can't generate?

**A**: Use the Query Builder mode for more control, or contact support for assistance.

### Q: Are UPDATE/DELETE operations supported?

**A**: Yes, with confirmation workflow. Shows affected rows before execution.

### Q: How do I save common queries for reuse?

**A**: Feature coming in Phase 2. Currently use browser bookmarks or copy queries to notes.

---

## Support

For migration assistance:
1. Review this guide
2. Check inline help in `/admin/query`
3. Contact: eoin@mycastle.app

---

**Version**: 1.0
**Last Updated**: 2026-01-10
**Status**: Active Migration

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { auditLogs, users } from '@/db/schema';
import { eq, and, desc, or, sql } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';

/**
 * GET /api/admin/students/[id]/audit
 * Fetch audit trail for a student (all changes related to them)
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(['admin', 'dos']);
    const tenantId = await getTenantId();
    const { id: studentId } = await params;
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    // Verify student exists and get their user ID
    const [student] = await db
      .select({ id: users.id, userId: users.id })
      .from(users)
      .where(and(eq(users.id, studentId), eq(users.role, 'student')))
      .limit(1);

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Build filter conditions based on filter type
    let resourceCondition;
    switch (filter) {
      case 'profile':
        resourceCondition = or(
          eq(auditLogs.action, 'user_created'),
          eq(auditLogs.action, 'user_updated')
        );
        break;
      case 'level':
        resourceCondition = or(
          eq(auditLogs.action, 'level_changed'),
          eq(auditLogs.action, 'promotion_requested'),
          eq(auditLogs.action, 'promotion_approved'),
          eq(auditLogs.action, 'promotion_rejected')
        );
        break;
      case 'enrollment':
        resourceCondition = or(
          eq(auditLogs.action, 'enrollment_created'),
          eq(auditLogs.action, 'enrollment_amended')
        );
        break;
      case 'attendance':
        resourceCondition = eq(auditLogs.action, 'attendance_recorded');
        break;
      case 'notes':
        resourceCondition = or(
          eq(auditLogs.action, 'note_added'),
          eq(auditLogs.action, 'note_shared')
        );
        break;
      default:
        resourceCondition = undefined;
    }

    // Fetch audit logs for this student
    // Match by resourceId (for actions ON the student) or metadata containing student reference
    const baseConditions = and(
      eq(auditLogs.tenantId, tenantId),
      or(
        eq(auditLogs.resourceId, studentId),
        sql`${auditLogs.metadata}->>'student_id' = ${studentId}`
      )
    );

    const conditions = resourceCondition ? and(baseConditions, resourceCondition) : baseConditions;

    const logs = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        resourceType: auditLogs.resourceType,
        resourceId: auditLogs.resourceId,
        changes: auditLogs.changes,
        metadata: auditLogs.metadata,
        timestamp: auditLogs.timestamp,
        userId: auditLogs.userId,
        userName: users.name,
        userRole: users.role,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(conditions)
      .orderBy(desc(auditLogs.timestamp))
      .limit(100);

    // Format response
    const formattedLogs = logs.map(log => ({
      id: log.id,
      action: log.action,
      resourceType: log.resourceType,
      changes: log.changes,
      metadata: log.metadata,
      timestamp: log.timestamp.toISOString(),
      userId: log.userId,
      userName: log.userName || 'System',
      userRole: log.userRole || 'system',
    }));

    return NextResponse.json({ auditEntries: formattedLogs });
  } catch (error) {
    console.error('Error fetching audit trail:', error);
    return NextResponse.json({ error: 'Failed to fetch audit trail' }, { status: 500 });
  }
}

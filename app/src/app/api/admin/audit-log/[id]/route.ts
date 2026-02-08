import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { auditLogs, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/utils';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(['admin']);
    const { id: logId } = await params;

    const [log] = await db
      .select({
        log: auditLogs,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(eq(auditLogs.id, logId))
      .limit(1);

    if (!log) {
      return NextResponse.json({ error: 'Audit log not found' }, { status: 404 });
    }

    // Fetch related logs for the same resource
    const relatedLogs = log.log.resourceId
      ? await db
          .select({
            log: auditLogs,
            user: {
              id: users.id,
              name: users.name,
            },
          })
          .from(auditLogs)
          .leftJoin(users, eq(auditLogs.userId, users.id))
          .where(eq(auditLogs.resourceId, log.log.resourceId))
          .orderBy(auditLogs.timestamp)
          .limit(50)
      : [];

    return NextResponse.json({
      ...log,
      relatedLogs,
    });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    return NextResponse.json({ error: 'Failed to fetch audit log' }, { status: 500 });
  }
}

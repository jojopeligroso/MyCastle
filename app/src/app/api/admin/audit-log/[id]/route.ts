import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { auditLogs, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/utils';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth(['admin']);
    const logId = params.id;

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
      .leftJoin(users, eq(auditLogs.user_id, users.id))
      .where(eq(auditLogs.id, logId))
      .limit(1);

    if (!log) {
      return NextResponse.json({ error: 'Audit log not found' }, { status: 404 });
    }

    // Fetch related logs for the same entity
    const relatedLogs = await db
      .select({
        log: auditLogs,
        user: {
          id: users.id,
          name: users.name,
        },
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.user_id, users.id))
      .where(eq(auditLogs.entity_id, log.log.entity_id))
      .orderBy(auditLogs.created_at)
      .limit(50);

    return NextResponse.json({
      ...log,
      relatedLogs,
    });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    return NextResponse.json({ error: 'Failed to fetch audit log' }, { status: 500 });
  }
}

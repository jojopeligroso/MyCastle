import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { auditLogs, users } from '@/db/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/utils';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(['admin']);

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const entity = searchParams.get('entity');
    const action = searchParams.get('action');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = db
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
      .$dynamic();

    // Apply filters
    if (userId) {
      query = query.where(eq(auditLogs.user_id, userId));
    }

    if (entity) {
      query = query.where(eq(auditLogs.entity_type, entity));
    }

    if (action) {
      query = query.where(eq(auditLogs.action, action));
    }

    if (startDate) {
      query = query.where(gte(auditLogs.created_at, new Date(startDate)));
    }

    if (endDate) {
      query = query.where(lte(auditLogs.created_at, new Date(endDate)));
    }

    // Execute query with pagination
    const results = await query
      .orderBy(desc(auditLogs.created_at))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogs);

    return NextResponse.json({
      logs: results,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + results.length < count,
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { emailLogs } from '@/db/schema';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { desc, eq, gte, ilike, lte, or, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    const userRole = user.user_metadata?.role || user.app_metadata?.role;
    const isAuthorized =
      userRole === 'admin' ||
      userRole === 'super_admin' ||
      userRole?.startsWith('admin_') ||
      userRole === 'teacher';

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = db
      .select()
      .from(emailLogs)
      .where(eq(emailLogs.tenant_id, tenantId))
      .$dynamic();

    if (search) {
      query = query.where(
        or(ilike(emailLogs.recipient, `%${search}%`), ilike(emailLogs.subject, `%${search}%`))
      );
    }

    if (status) {
      query = query.where(eq(emailLogs.status, status));
    }

    if (from) {
      const fromDate = new Date(from);
      if (!Number.isNaN(fromDate.getTime())) {
        query = query.where(gte(emailLogs.sent_at, fromDate));
      }
    }

    if (to) {
      const toDate = new Date(to);
      if (!Number.isNaN(toDate.getTime())) {
        toDate.setHours(23, 59, 59, 999);
        query = query.where(lte(emailLogs.sent_at, toDate));
      }
    }

    const logs = await query.orderBy(desc(emailLogs.sent_at)).limit(limit).offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(emailLogs)
      .where(eq(emailLogs.tenant_id, tenantId));

    return NextResponse.json({
      logs,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + logs.length < count,
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching email logs:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch email logs' },
      { status: 500 }
    );
  }
}

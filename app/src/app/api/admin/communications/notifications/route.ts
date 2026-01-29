/**
 * Admin Notifications API - List and create notifications
 * GET /api/admin/communications/notifications - List notifications
 * POST /api/admin/communications/notifications - Create notification
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { notificationRecipients, notifications } from '@/db/schema';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { and, desc, eq, sql } from 'drizzle-orm';
import {
  createNotificationWithRecipients,
  parseNotificationPayload,
} from '@/lib/notifications/notifications';

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

    await db.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, false)`);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const type = searchParams.get('type') || undefined;
    const scope = searchParams.get('scope') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const conditions = [eq(notifications.tenant_id, tenantId)];

    if (status) {
      conditions.push(eq(notifications.status, status));
    }

    if (type) {
      conditions.push(eq(notifications.type, type));
    }

    if (scope) {
      conditions.push(eq(notifications.target_scope, scope));
    }

    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

    const notificationsList = await db
      .select({
        id: notifications.id,
        title: notifications.title,
        body: notifications.body,
        severity: notifications.severity,
        status: notifications.status,
        type: notifications.type,
        target_scope: notifications.target_scope,
        created_at: notifications.created_at,
        scheduled_at: notifications.scheduled_at,
        sent_at: notifications.sent_at,
        read_count:
          sql<number>`COUNT(CASE WHEN ${notificationRecipients.status} = 'read' THEN 1 END)`.as(
            'read_count'
          ),
        unread_count:
          sql<number>`COUNT(CASE WHEN ${notificationRecipients.status} = 'unread' THEN 1 END)`.as(
            'unread_count'
          ),
        recipient_count: sql<number>`COUNT(${notificationRecipients.id})`.as('recipient_count'),
      })
      .from(notifications)
      .leftJoin(
        notificationRecipients,
        eq(notificationRecipients.notification_id, notifications.id)
      )
      .where(whereClause)
      .groupBy(notifications.id)
      .orderBy(desc(notifications.created_at))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(whereClause);

    return NextResponse.json({
      notifications: notificationsList,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + notificationsList.length < count,
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    const userRole = user.user_metadata?.role || user.app_metadata?.role;
    const isAdmin =
      userRole === 'admin' || userRole === 'super_admin' || userRole?.startsWith('admin_');

    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const payload = parseNotificationPayload(body);

    const result = await createNotificationWithRecipients({ tenantId, payload });

    return NextResponse.json({
      success: true,
      notificationId: result.notificationId,
      recipientCount: result.recipientCount,
      status: result.status,
    });
  } catch (error: unknown) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create notification' },
      { status: 500 }
    );
  }
}

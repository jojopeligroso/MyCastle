import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { NotificationsList, type NotificationSummary } from '@/components/admin/NotificationsList';
import { notFound } from 'next/navigation';
import { db } from '@/db';
import { notificationRecipients, notifications } from '@/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { createNotification } from './_actions';

type SearchParams = {
  [key: string]: string | string[] | undefined;
};

type NotificationFilters = {
  status?: string;
  type?: string;
  scope?: string;
};

async function getNotifications(
  tenantId: string,
  filters: NotificationFilters
): Promise<NotificationSummary[]> {
  await db.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, false)`);

  let query = db
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
      read_count: sql<number>`COUNT(CASE WHEN ${notificationRecipients.status} = 'read' THEN 1 END)`.as(
        'read_count'
      ),
      unread_count: sql<number>`COUNT(CASE WHEN ${notificationRecipients.status} = 'unread' THEN 1 END)`.as(
        'unread_count'
      ),
      recipient_count: sql<number>`COUNT(${notificationRecipients.id})`.as('recipient_count'),
    })
    .from(notifications)
    .leftJoin(notificationRecipients, eq(notificationRecipients.notification_id, notifications.id))
    .where(eq(notifications.tenant_id, tenantId))
    .$dynamic();

  if (filters.status) {
    query = query.where(eq(notifications.status, filters.status));
  }

  if (filters.type) {
    query = query.where(eq(notifications.type, filters.type));
  }

  if (filters.scope) {
    query = query.where(eq(notifications.target_scope, filters.scope));
  }

  return query.groupBy(notifications.id).orderBy(desc(notifications.created_at));
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  await requireAuth();
  const tenantId = await getTenantId();

  if (!tenantId) {
    notFound();
  }

  const params = (await searchParams) || {};
  const filters: NotificationFilters = {
    status: typeof params.status === 'string' ? params.status : undefined,
    type: typeof params.type === 'string' ? params.type : undefined,
    scope: typeof params.scope === 'string' ? params.scope : undefined,
  };
  const created = typeof params.created === 'string' ? params.created : undefined;
  const errorMessage = typeof params.error === 'string' ? params.error : undefined;

  const notificationsList = await getNotifications(tenantId, filters);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notifications and Messaging</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage system alerts, announcements, and manual messaging
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>
      ) : null}
      {created ? (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-700">
          Notification created successfully.
        </div>
      ) : null}

      <NotificationsList
        notifications={notificationsList}
        filters={filters}
        createAction={createNotification}
      />
    </div>
  );
}

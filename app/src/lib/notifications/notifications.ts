import 'server-only';

import { z } from 'zod';
import { db } from '@/db';
import { notificationRecipients, notifications, users } from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';

type NotificationSeverity = 'info' | 'warning' | 'critical';
type NotificationType = 'system' | 'announcement' | 'reminder';
type NotificationScope = 'user' | 'role' | 'all';

type NormalizedNotificationPayload = {
  title: string;
  body: string;
  severity: NotificationSeverity;
  type: NotificationType;
  target_scope: NotificationScope;
  scheduledAt: Date | null;
  userId?: string;
  recipientRole?: string;
};

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

const optionalText = z.preprocess(emptyToUndefined, z.string().optional());

export const notificationPayloadSchema = z
  .object({
    title: z.string().min(1, 'Title is required'),
    body: z.string().min(1, 'Message is required'),
    severity: z.enum(['info', 'warning', 'critical']).default('info'),
    type: z.enum(['system', 'announcement', 'reminder']).default('system'),
    target_scope: z.enum(['user', 'role', 'all']).default('all'),
    scheduled_at: optionalText,
    user_id: optionalText,
    recipient_role: optionalText,
  })
  .superRefine((data, ctx) => {
    if (data.target_scope === 'user' && !data.user_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'User ID is required when targeting a user.',
        path: ['user_id'],
      });
    }

    if (data.target_scope === 'role' && !data.recipient_role) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Role is required when targeting a role.',
        path: ['recipient_role'],
      });
    }
  });

export type NotificationPayload = z.infer<typeof notificationPayloadSchema>;

export function parseNotificationPayload(raw: unknown): NormalizedNotificationPayload {
  const data = notificationPayloadSchema.parse(raw);
  let scheduledAt: Date | null = null;

  if (data.scheduled_at) {
    const parsedDate = new Date(data.scheduled_at);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new Error('Scheduled date is invalid.');
    }
    scheduledAt = parsedDate;
  }

  return {
    title: data.title,
    body: data.body,
    severity: data.severity,
    type: data.type,
    target_scope: data.target_scope,
    scheduledAt,
    userId: data.user_id,
    recipientRole: data.recipient_role,
  };
}

export async function createNotificationWithRecipients({
  tenantId,
  payload,
}: {
  tenantId: string;
  payload: NormalizedNotificationPayload;
}) {
  await db.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, false)`);

  const targetScope = payload.target_scope;
  let recipientUserIds: string[] = [];

  if (targetScope === 'user') {
    if (!payload.userId) {
      throw new Error('User ID is required when targeting a user.');
    }

    const [userMatch] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, payload.userId), eq(users.tenantId, tenantId)))
      .limit(1);

    if (!userMatch) {
      throw new Error('Target user was not found for this tenant.');
    }

    recipientUserIds = [userMatch.id];
  } else {
    const conditions = [eq(users.tenantId, tenantId)];

    if (targetScope === 'role') {
      if (!payload.recipientRole) {
        throw new Error('Role is required when targeting a role.');
      }
      conditions.push(eq(users.primaryRole, payload.recipientRole));
    }

    const usersList = await db
      .select({ id: users.id })
      .from(users)
      .where(and(...conditions));
    recipientUserIds = usersList.map(user => user.id);
  }

  if (recipientUserIds.length === 0) {
    throw new Error('No recipients found for the selected audience.');
  }

  const now = new Date();
  const status = payload.scheduledAt ? 'scheduled' : 'sent';
  const sentAt = payload.scheduledAt ? null : now;

  const [notification] = await db
    .insert(notifications)
    .values({
      tenant_id: tenantId,
      title: payload.title,
      body: payload.body,
      severity: payload.severity,
      status,
      type: payload.type,
      target_scope: payload.target_scope,
      scheduled_at: payload.scheduledAt,
      sent_at: sentAt,
    })
    .returning({ id: notifications.id });

  const recipientType = targetScope === 'all' ? 'broadcast' : targetScope;

  const recipientRows = recipientUserIds.map(userId => ({
    tenant_id: tenantId,
    notification_id: notification.id,
    recipient_type: recipientType,
    user_id: userId,
    recipient_role: targetScope === 'role' ? payload.recipientRole : null,
    status: 'unread',
    delivered_at: sentAt,
  }));

  await db.insert(notificationRecipients).values(recipientRows);

  return {
    notificationId: notification.id,
    recipientCount: recipientRows.length,
    status,
  };
}

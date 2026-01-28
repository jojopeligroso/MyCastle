'use server';

import { getTenantId, requireAuth } from '@/lib/auth/utils';
import {
  createNotificationWithRecipients,
  parseNotificationPayload,
} from '@/lib/notifications/notifications';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const getFormValue = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === 'string' ? value : undefined;
};

export async function createNotification(formData: FormData) {
  const user = await requireAuth();
  const tenantId = await getTenantId();

  if (!tenantId) {
    redirect('/admin/communications/notifications?error=Tenant%20not%20found');
  }

  const userRole = user.user_metadata?.role || user.app_metadata?.role;
  const isAdmin =
    userRole === 'admin' || userRole === 'super_admin' || userRole?.startsWith('admin_');

  if (!isAdmin) {
    redirect('/admin/communications/notifications?error=Unauthorized');
  }

  try {
    const payload = parseNotificationPayload({
      title: getFormValue(formData, 'title'),
      body: getFormValue(formData, 'body'),
      severity: getFormValue(formData, 'severity'),
      type: getFormValue(formData, 'type'),
      target_scope: getFormValue(formData, 'target_scope'),
      scheduled_at: getFormValue(formData, 'scheduled_at'),
      user_id: getFormValue(formData, 'user_id'),
      recipient_role: getFormValue(formData, 'recipient_role'),
    });

    await createNotificationWithRecipients({ tenantId, payload });
    revalidatePath('/admin/communications/notifications');
    redirect('/admin/communications/notifications?created=1');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create notification';
    redirect(`/admin/communications/notifications?error=${encodeURIComponent(message)}`);
  }
}

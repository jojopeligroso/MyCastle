/**
 * Notification payload validation tests
 */

import { describe, expect, it } from '@jest/globals';
import { parseNotificationPayload } from '../lib/notifications/notifications';

describe('Notification payload validation', () => {
  it('parses a broadcast notification', () => {
    const result = parseNotificationPayload({
      title: 'Holiday notice',
      body: 'The school will be closed on Friday.',
      severity: 'info',
      type: 'announcement',
      target_scope: 'all',
    });

    expect(result.target_scope).toBe('all');
    expect(result.scheduledAt).toBeNull();
  });

  it('requires user_id for user scope', () => {
    expect(() =>
      parseNotificationPayload({
        title: 'Direct message',
        body: 'Hello there',
        severity: 'info',
        type: 'system',
        target_scope: 'user',
      })
    ).toThrow('User ID is required');
  });

  it('requires recipient_role for role scope', () => {
    expect(() =>
      parseNotificationPayload({
        title: 'Teacher update',
        body: 'Staff meeting at 4pm.',
        severity: 'warning',
        type: 'announcement',
        target_scope: 'role',
      })
    ).toThrow('Role is required');
  });

  it('rejects invalid scheduled dates', () => {
    expect(() =>
      parseNotificationPayload({
        title: 'Scheduled',
        body: 'This should fail.',
        severity: 'info',
        type: 'system',
        target_scope: 'all',
        scheduled_at: 'not-a-date',
      })
    ).toThrow('Scheduled date is invalid');
  });
});

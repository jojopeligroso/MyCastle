/**
 * Notifications Schema Unit Tests
 * Ensures notifications tables exist in schema exports
 */

import { describe, it, expect } from '@jest/globals';
import * as schema from '../db/schema';

describe('Notifications Schema', () => {
  it('should export notifications table', () => {
    expect(schema.notifications).toBeDefined();
    expect(schema.notifications).toHaveProperty('id');
    expect(schema.notifications).toHaveProperty('tenant_id');
    expect(schema.notifications).toHaveProperty('title');
    expect(schema.notifications).toHaveProperty('status');
  });

  it('should export notificationRecipients table', () => {
    expect(schema.notificationRecipients).toBeDefined();
    expect(schema.notificationRecipients).toHaveProperty('id');
    expect(schema.notificationRecipients).toHaveProperty('notification_id');
    expect(schema.notificationRecipients).toHaveProperty('status');
  });
});

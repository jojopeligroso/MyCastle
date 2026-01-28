-- ============================================================================
-- MyCastle Fresh Schema Migration 0016
-- Notifications Tables
-- Date: 2026-01-28
-- Ref: app/src/db/schema/system.ts
-- ============================================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  severity VARCHAR(50) NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  status VARCHAR(50) NOT NULL DEFAULT 'sent' CHECK (status IN ('draft', 'scheduled', 'sent')),
  type VARCHAR(50) NOT NULL DEFAULT 'system' CHECK (type IN ('system', 'announcement', 'reminder')),
  target_scope VARCHAR(50) NOT NULL DEFAULT 'all' CHECK (target_scope IN ('user', 'role', 'all')),

  source VARCHAR(100),
  external_id VARCHAR(255),

  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,

  recipient_type VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (recipient_type IN ('user', 'role', 'broadcast')),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recipient_role VARCHAR(50),

  status VARCHAR(50) NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read')),
  read_at TIMESTAMP,
  delivered_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_scope ON notifications(target_scope);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE UNIQUE INDEX idx_notifications_source_external
  ON notifications(tenant_id, source, external_id)
  WHERE source IS NOT NULL AND external_id IS NOT NULL;

CREATE INDEX idx_notification_recipients_tenant ON notification_recipients(tenant_id);
CREATE INDEX idx_notification_recipients_notification ON notification_recipients(notification_id);
CREATE INDEX idx_notification_recipients_user ON notification_recipients(user_id);
CREATE INDEX idx_notification_recipients_status ON notification_recipients(status);
CREATE INDEX idx_notification_recipients_role ON notification_recipients(recipient_role);
CREATE UNIQUE INDEX idx_notification_recipient_unique
  ON notification_recipients(notification_id, user_id)
  WHERE user_id IS NOT NULL;

COMMENT ON TABLE notifications IS 'System notifications sent to users';
COMMENT ON TABLE notification_recipients IS 'Per-recipient notification delivery and read state';

DO $$
BEGIN
  RAISE NOTICE 'Migration FRESH_0016 completed successfully!';
  RAISE NOTICE 'Created tables: notifications, notification_recipients';
END $$;

-- ============================================================================
-- MyCastle Fresh Schema Migration 0017
-- Notifications RLS Policies
-- Date: 2026-01-28
-- Ref: app/src/db/schema/system.ts
-- ============================================================================

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_recipients ENABLE ROW LEVEL SECURITY;

-- Tenant isolation (SELECT)
CREATE POLICY tenant_isolation_notifications ON notifications
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_notification_recipients ON notification_recipients
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Tenant isolation (INSERT)
CREATE POLICY tenant_insert_notifications ON notifications
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_insert_notification_recipients ON notification_recipients
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Tenant isolation (UPDATE)
CREATE POLICY tenant_update_notifications ON notifications
  FOR UPDATE
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_update_notification_recipients ON notification_recipients
  FOR UPDATE
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

DO $$
BEGIN
  RAISE NOTICE 'Migration FRESH_0017 completed successfully!';
  RAISE NOTICE 'Enabled RLS and policies for notifications tables';
END $$;

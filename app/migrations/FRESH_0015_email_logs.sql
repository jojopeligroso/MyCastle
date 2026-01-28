-- ============================================================================
-- MyCastle Fresh Schema Migration 0015
-- Email Logs Table
-- Date: 2026-02-12
-- Ref: app/src/db/schema/system.ts
-- ============================================================================

CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
  status VARCHAR(50) NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),

  source VARCHAR(100),
  external_id VARCHAR(255),
  provider VARCHAR(100),
  provider_message_id VARCHAR(255),

  headers JSONB,
  body_preview TEXT,
  error_message TEXT
);

CREATE INDEX idx_email_logs_tenant ON email_logs(tenant_id);
CREATE INDEX idx_email_logs_recipient ON email_logs(recipient);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at DESC);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE UNIQUE INDEX idx_email_logs_source_external
  ON email_logs(tenant_id, source, external_id)
  WHERE source IS NOT NULL AND external_id IS NOT NULL;

COMMENT ON TABLE email_logs IS 'Outbound email delivery logs and provider metadata';
COMMENT ON COLUMN email_logs.headers IS 'Raw email headers captured at send time';
COMMENT ON COLUMN email_logs.body_preview IS 'Short preview of the email body';
COMMENT ON COLUMN email_logs.error_message IS 'Provider error message for failed sends';

DO $$
BEGIN
  RAISE NOTICE 'Migration FRESH_0015 completed successfully!';
  RAISE NOTICE 'Created table: email_logs';
END $$;

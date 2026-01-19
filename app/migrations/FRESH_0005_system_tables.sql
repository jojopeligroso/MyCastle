-- ============================================================================
-- MyCastle Fresh Schema Migration 0005
-- System Tables: Audit Logs, Invoices, Conversations, Exports
-- Date: 2026-01-19
-- Ref: app/src/db/schema/system.ts
-- ============================================================================

-- NOTE: This migration creates system tables for auditing, invoicing, and exports.
-- Run this AFTER FRESH_0001, FRESH_0002, FRESH_0003, and FRESH_0004.

-- NOTE ON PAYMENTS TABLE:
-- The 'payments' table already exists from FRESH_0001 (booking payments).
-- The system.ts schema defines a different 'payments' table for invoice payments.
-- This conflict needs to be resolved in a future migration.
-- For now, we're only creating: audit_logs, invoices, conversations, exports.

-- ============================================================================
-- PART 1: Audit Logs (HIGH PRIORITY)
-- ============================================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL, -- user_created, class_deleted, booking_updated, etc.
  resource_type VARCHAR(50), -- user, class, invoice, booking, etc.
  resource_id UUID,

  changes JSONB, -- Before/after values {before: {...}, after: {...}}
  metadata JSONB, -- IP address, user agent, request_id, etc.

  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- ============================================================================
-- PART 2: Invoices
-- ============================================================================

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'EUR',

  description TEXT,
  line_items JSONB, -- Array of {description, quantity, unit_price, total}

  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,

  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_invoices_student ON invoices(student_id);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_status ON invoices(tenant_id, status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_issue_date ON invoices(issue_date DESC);

-- ============================================================================
-- PART 3: Conversations (Low Priority - Feature Not Built)
-- ============================================================================

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  title VARCHAR(255),
  messages JSONB NOT NULL DEFAULT '[]', -- Array of {role: 'user'|'assistant', content: string, timestamp: ISO8601}

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);

-- ============================================================================
-- PART 4: Exports (Low Priority - Feature Not Built)
-- ============================================================================

CREATE TABLE exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  template_id VARCHAR(100) NOT NULL, -- e.g., "user_roster_v1", "attendance_report_v2"
  template_version VARCHAR(20) NOT NULL, -- e.g., "1.0", "2.3"

  filename VARCHAR(255) NOT NULL,
  file_url VARCHAR(500), -- Signed URL to download (e.g., Supabase Storage)
  file_size INTEGER, -- Bytes

  filters JSONB, -- Applied filters {date_from, date_to, class_id, etc.}
  row_count INTEGER, -- Number of rows in export

  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP -- Signed URL expiry (typically 24-48 hours)
);

CREATE INDEX idx_exports_tenant ON exports(tenant_id);
CREATE INDEX idx_exports_requested_by ON exports(requested_by);
CREATE INDEX idx_exports_created ON exports(created_at DESC);
CREATE INDEX idx_exports_template ON exports(template_id, template_version);
CREATE INDEX idx_exports_expires ON exports(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- PART 5: Triggers
-- ============================================================================

-- Apply updated_at trigger to tables that have updated_at
CREATE TRIGGER trigger_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Note: audit_logs and exports don't have updated_at triggers (immutable logs)

-- ============================================================================
-- PART 6: Comments (Documentation)
-- ============================================================================

COMMENT ON TABLE audit_logs IS 'Immutable audit trail of all significant system actions';
COMMENT ON TABLE invoices IS 'Financial invoices for students (separate from booking payments)';
COMMENT ON TABLE conversations IS 'Chat/messaging history (feature not yet implemented)';
COMMENT ON TABLE exports IS 'Tracks generated report exports with expiring download URLs';

COMMENT ON COLUMN audit_logs.changes IS 'JSONB containing before/after values for audit trail';
COMMENT ON COLUMN audit_logs.metadata IS 'JSONB containing IP address, user agent, request context';
COMMENT ON COLUMN invoices.line_items IS 'JSONB array of invoice line items with descriptions and amounts';
COMMENT ON COLUMN conversations.messages IS 'JSONB array of chat messages with role, content, timestamp';
COMMENT ON COLUMN exports.filters IS 'JSONB containing applied filter parameters for reproducibility';
COMMENT ON COLUMN exports.expires_at IS 'When the signed download URL expires (typically 24-48 hours)';

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration FRESH_0005 completed successfully!';
  RAISE NOTICE 'Created tables: audit_logs, invoices, conversations, exports';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT NOTES:';
  RAISE NOTICE '1. The payments table conflict (booking vs invoice payments) still needs resolution';
  RAISE NOTICE '2. Consider renaming system.ts payments to invoice_payments in schema';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run npm run db:generate to regenerate TypeScript types';
  RAISE NOTICE '2. Run FRESH_0006_curriculum_tables.sql for CEFR and lesson planning';
  RAISE NOTICE '3. The admin dashboard v_audit_events_recent view will now work!';
END $$;

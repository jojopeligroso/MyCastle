-- FRESH_0018: Enquiries Management
-- REQ: spec/01-admin-mcp.md §1.2.6 - admin://enquiries resource
-- DESIGN: Enquiries table for lead tracking and prospective student management
-- Created: 2026-01-29

-- =====================================================================
-- TABLE: enquiries
-- =====================================================================
-- Purpose: Track inbound prospective student enquiries from various sources
-- Supports: Lead management, CRM integration, conversion tracking

CREATE TABLE IF NOT EXISTS enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Contact Information
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),

  -- Programme Interest
  programme_interest VARCHAR(255),
  level_estimate VARCHAR(10), -- CEFR level: A1, A2, B1, B2, C1, C2
  start_date_preference DATE,

  -- Status Tracking
  status VARCHAR(50) NOT NULL DEFAULT 'new',
  -- Status values: 'new', 'contacted', 'converted', 'rejected'

  -- Source Tracking
  source VARCHAR(50),
  -- Source values: 'website', 'referral', 'agent', 'social', 'phone', 'walk_in'

  -- CRM Integration
  external_id VARCHAR(255), -- For third-party CRM system integration

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================================
-- INDEXES
-- =====================================================================

-- Primary lookup: enquiries by tenant
CREATE INDEX idx_enquiries_tenant_id ON enquiries(tenant_id);

-- Filter by status
CREATE INDEX idx_enquiries_status ON enquiries(status);

-- Sort by creation date (most recent first)
CREATE INDEX idx_enquiries_created_at ON enquiries(created_at DESC);

-- Search by email (for deduplication checks)
CREATE INDEX idx_enquiries_email ON enquiries(email);

-- Composite index for common query pattern: tenant + status
CREATE INDEX idx_enquiries_tenant_status ON enquiries(tenant_id, status);

-- =====================================================================
-- RLS POLICIES
-- =====================================================================

-- Enable RLS
ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;

-- Policy: Admin can SELECT enquiries for their tenant
CREATE POLICY admin_enquiries_select ON enquiries
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid
    AND current_setting('app.current_user_role', TRUE) IN ('admin', 'super_admin')
  );

-- Policy: Admin can INSERT enquiries for their tenant
CREATE POLICY admin_enquiries_insert ON enquiries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid
    AND current_setting('app.current_user_role', TRUE) IN ('admin', 'super_admin')
  );

-- Policy: Admin can UPDATE enquiries for their tenant
CREATE POLICY admin_enquiries_update ON enquiries
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid
    AND current_setting('app.current_user_role', TRUE) IN ('admin', 'super_admin')
  )
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid
    AND current_setting('app.current_user_role', TRUE) IN ('admin', 'super_admin')
  );

-- Policy: Admin can DELETE enquiries for their tenant
CREATE POLICY admin_enquiries_delete ON enquiries
  FOR DELETE
  TO authenticated
  USING (
    tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid
    AND current_setting('app.current_user_role', TRUE) IN ('admin', 'super_admin')
  );

-- =====================================================================
-- TRIGGERS
-- =====================================================================

-- Trigger: Update updated_at timestamp on modification
CREATE OR REPLACE FUNCTION update_enquiries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enquiries_updated_at
  BEFORE UPDATE ON enquiries
  FOR EACH ROW
  EXECUTE FUNCTION update_enquiries_updated_at();

-- =====================================================================
-- COMMENTS
-- =====================================================================

COMMENT ON TABLE enquiries IS 'Prospective student enquiries from various sources';
COMMENT ON COLUMN enquiries.status IS 'Lead status: new, contacted, converted, rejected';
COMMENT ON COLUMN enquiries.source IS 'Lead source: website, referral, agent, social, phone, walk_in';
COMMENT ON COLUMN enquiries.external_id IS 'Integration ID for third-party CRM systems';
COMMENT ON COLUMN enquiries.level_estimate IS 'Estimated CEFR level (A1-C2)';

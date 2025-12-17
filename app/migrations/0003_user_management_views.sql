-- Migration 0003: User Management Views
-- Page 2: User Management  
-- Creates views for user management with metadata and orphaned auth users detection

-- ============================================================================
-- PART 1: User Management Views
-- ============================================================================

-- v_users_with_metadata: Enhanced user view with related entity counts
CREATE OR REPLACE VIEW v_users_with_metadata AS
SELECT
  u.id,
  u.tenant_id,
  u.auth_id,
  u.email,
  u.name,
  u.role,
  u.status,
  u.last_login,
  u.created_at,
  u.updated_at,
  u.metadata,
  (SELECT COUNT(*) FROM enrollments WHERE student_id = u.id) AS enrollment_count,
  (SELECT COUNT(*) FROM classes WHERE teacher_id = u.id) AS class_count
FROM users u
WHERE u.tenant_id = (SELECT id FROM tenants LIMIT 1)
ORDER BY u.created_at DESC;

-- v_orphaned_auth_users: Detect auth users without profile records
-- Note: This view accesses auth.users which requires service role
CREATE OR REPLACE VIEW v_orphaned_auth_users AS
SELECT
  au.id AS auth_id,
  au.email,
  au.created_at
FROM auth.users au
LEFT JOIN users u ON au.id = u.auth_id
WHERE u.id IS NULL;

-- ============================================================================
-- PART 2: User Role Audit Table (Optional History Tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_role_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- Change details
  old_role VARCHAR(50),
  new_role VARCHAR(50) NOT NULL,
  change_reason TEXT,
  
  -- Actor
  changed_by UUID NOT NULL REFERENCES users(id),
  changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_role_audit_user ON user_role_audit(user_id);
CREATE INDEX idx_role_audit_changed_at ON user_role_audit(changed_at DESC);
CREATE INDEX idx_role_audit_tenant ON user_role_audit(tenant_id);

-- ============================================================================
-- PART 3: RLS Policies for Role Audit
-- ============================================================================

ALTER TABLE user_role_audit ENABLE ROW LEVEL SECURITY;

-- Admins can view role audit history for their tenant
CREATE POLICY role_audit_admin_select ON user_role_audit
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (SELECT id FROM tenants LIMIT 1)
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
        AND users.role IN ('admin', 'super_admin')
        AND users.tenant_id = user_role_audit.tenant_id
    )
  );

-- Only system/admins can insert role audit records
CREATE POLICY role_audit_admin_insert ON user_role_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (SELECT id FROM tenants LIMIT 1)
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
        AND users.role IN ('admin', 'super_admin')
        AND users.tenant_id = user_role_audit.tenant_id
    )
  );

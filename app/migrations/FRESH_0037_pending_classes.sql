-- ============================================================================
-- FRESH_0037_pending_classes.sql
-- Pending classes table for import workflow (class approval before apply)
-- Used by StudentTracker ETL for new class detection
-- Date: 2026-03-09
-- ============================================================================

-- ============================================================================
-- 1. PENDING_CLASSES TABLE
-- Classes detected in Excel that don't exist in database
-- Requires admin approval with CEFR level before rows can be applied
-- ============================================================================

CREATE TABLE IF NOT EXISTS pending_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES upload_batches(id) ON DELETE CASCADE,

    -- Class name from Excel
    class_name VARCHAR(100) NOT NULL,

    -- CEFR level assigned by admin (required for approval)
    cefr_level VARCHAR(2), -- A1, A2, B1, B2, C1, C2, or null

    -- Status: pending, approved, rejected
    status VARCHAR(20) NOT NULL DEFAULT 'pending',

    -- Approval tracking
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,

    -- Count of rows waiting on this class
    affected_row_count INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Indexes for pending_classes
CREATE INDEX IF NOT EXISTS idx_pending_classes_batch ON pending_classes(batch_id);
CREATE INDEX IF NOT EXISTS idx_pending_classes_tenant ON pending_classes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pending_classes_status ON pending_classes(status);

-- ============================================================================
-- 2. UPDATED_AT TRIGGER
-- ============================================================================

DROP TRIGGER IF EXISTS update_pending_classes_updated_at ON pending_classes;
CREATE TRIGGER update_pending_classes_updated_at
    BEFORE UPDATE ON pending_classes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- Admin-only access following FRESH_0020_imports pattern
-- ============================================================================

-- Enable RLS
ALTER TABLE pending_classes ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------
-- pending_classes policies (admin-only)
-- ----------------------------------------
DROP POLICY IF EXISTS admin_pending_classes_select ON pending_classes;
CREATE POLICY admin_pending_classes_select ON pending_classes
    FOR SELECT TO authenticated
    USING (
        tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid
        AND current_setting('app.current_user_role', TRUE) IN ('admin', 'super_admin')
    );

DROP POLICY IF EXISTS admin_pending_classes_insert ON pending_classes;
CREATE POLICY admin_pending_classes_insert ON pending_classes
    FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid
        AND current_setting('app.current_user_role', TRUE) IN ('admin', 'super_admin')
    );

DROP POLICY IF EXISTS admin_pending_classes_update ON pending_classes;
CREATE POLICY admin_pending_classes_update ON pending_classes
    FOR UPDATE TO authenticated
    USING (
        tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid
        AND current_setting('app.current_user_role', TRUE) IN ('admin', 'super_admin')
    )
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid
        AND current_setting('app.current_user_role', TRUE) IN ('admin', 'super_admin')
    );

DROP POLICY IF EXISTS admin_pending_classes_delete ON pending_classes;
CREATE POLICY admin_pending_classes_delete ON pending_classes
    FOR DELETE TO authenticated
    USING (
        tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid
        AND current_setting('app.current_user_role', TRUE) IN ('admin', 'super_admin')
    );

-- ============================================================================
-- 4. SUPER ADMIN BYPASS POLICY
-- Super admins can access all tenant data
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_superuser') THEN
        DROP POLICY IF EXISTS super_admin_pending_classes ON pending_classes;
        CREATE POLICY super_admin_pending_classes ON pending_classes
            FOR ALL TO authenticated
            USING (is_superuser())
            WITH CHECK (is_superuser());
    END IF;
END $$;

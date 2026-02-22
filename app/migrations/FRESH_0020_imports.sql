-- ============================================================================
-- FRESH_0020_imports.sql
-- ETL/Import workflow tables for enrollment data (classes.xlsx)
-- Ref: spec/IMPORTS_UI_SPEC.md
-- Date: 2026-02-22
-- ============================================================================

-- ============================================================================
-- 1. UPLOAD_BATCHES TABLE
-- Tracks import batch lifecycle with 10-state machine
-- ============================================================================

CREATE TABLE IF NOT EXISTS upload_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- File metadata
    file_type VARCHAR(50) NOT NULL DEFAULT 'classes',
    file_name VARCHAR(255),

    -- State machine status
    -- Valid: RECEIVED, PARSING, PROPOSED_OK, PROPOSED_NEEDS_REVIEW,
    --        READY_TO_APPLY, APPLYING, APPLIED, REJECTED, FAILED_VALIDATION, FAILED_SYSTEM
    status VARCHAR(50) NOT NULL DEFAULT 'RECEIVED',

    -- Denormalized counts (avoids joins for dashboard display)
    total_rows INTEGER NOT NULL DEFAULT 0,
    valid_rows INTEGER NOT NULL DEFAULT 0,
    invalid_rows INTEGER NOT NULL DEFAULT 0,
    ambiguous_rows INTEGER NOT NULL DEFAULT 0,
    new_rows INTEGER NOT NULL DEFAULT 0,
    update_rows INTEGER NOT NULL DEFAULT 0,
    excluded_rows INTEGER NOT NULL DEFAULT 0,

    -- Triage fields
    review_outcome VARCHAR(50), -- CONFIRM | DENY | NEEDS_REVIEW
    review_comment TEXT,

    -- Parse metadata
    ignored_columns JSONB DEFAULT '[]'::jsonb,
    parse_error TEXT,

    -- Audit trail
    created_by UUID NOT NULL REFERENCES users(id),
    applied_by UUID REFERENCES users(id),
    applied_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Indexes for upload_batches
CREATE INDEX IF NOT EXISTS idx_upload_batches_tenant ON upload_batches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_upload_batches_status ON upload_batches(status);
CREATE INDEX IF NOT EXISTS idx_upload_batches_created_by ON upload_batches(created_by);
CREATE INDEX IF NOT EXISTS idx_upload_batches_created_at ON upload_batches(created_at);

-- ============================================================================
-- 2. STG_ROWS TABLE
-- Individual rows from uploaded file with validation state
-- ============================================================================

CREATE TABLE IF NOT EXISTS stg_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES upload_batches(id) ON DELETE CASCADE,

    -- Row position in file (1-indexed, excludes header)
    row_number INTEGER NOT NULL,

    -- Row status: VALID, INVALID, AMBIGUOUS, EXCLUDED
    row_status VARCHAR(50) NOT NULL DEFAULT 'VALID',

    -- Raw data from file (column -> value mapping)
    raw_data JSONB NOT NULL,

    -- Parsed/normalized data
    parsed_data JSONB,

    -- Validation errors (for INVALID rows)
    validation_errors JSONB DEFAULT '[]'::jsonb,

    -- Match candidates (for AMBIGUOUS rows)
    match_candidates JSONB DEFAULT '[]'::jsonb,

    -- Resolution tracking (for AMBIGUOUS rows)
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id),
    resolution_type VARCHAR(50), -- linked | new | excluded
    linked_enrollment_id UUID REFERENCES enrollments(id),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Indexes for stg_rows
CREATE INDEX IF NOT EXISTS idx_stg_rows_batch ON stg_rows(batch_id);
CREATE INDEX IF NOT EXISTS idx_stg_rows_tenant ON stg_rows(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stg_rows_status ON stg_rows(row_status);
CREATE INDEX IF NOT EXISTS idx_stg_rows_batch_status ON stg_rows(batch_id, row_status);

-- ============================================================================
-- 3. PROPOSED_CHANGES TABLE
-- Computed diffs/actions for each staged row
-- ============================================================================

CREATE TABLE IF NOT EXISTS proposed_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES upload_batches(id) ON DELETE CASCADE,
    stg_row_id UUID NOT NULL REFERENCES stg_rows(id) ON DELETE CASCADE,

    -- Proposed action: INSERT, UPDATE, NOOP, NEEDS_RESOLUTION
    action VARCHAR(50) NOT NULL,

    -- Target enrollment (for UPDATE/NOOP)
    target_enrollment_id UUID REFERENCES enrollments(id),

    -- Diff for UPDATE actions: { fieldName: { old: value, new: value } }
    diff JSONB,

    -- Exclusion flag (admin can exclude individual changes)
    is_excluded BOOLEAN DEFAULT false,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Indexes for proposed_changes
CREATE INDEX IF NOT EXISTS idx_proposed_changes_batch ON proposed_changes(batch_id);
CREATE INDEX IF NOT EXISTS idx_proposed_changes_tenant ON proposed_changes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_proposed_changes_stg_row ON proposed_changes(stg_row_id);
CREATE INDEX IF NOT EXISTS idx_proposed_changes_action ON proposed_changes(action);
CREATE INDEX IF NOT EXISTS idx_proposed_changes_target ON proposed_changes(target_enrollment_id);

-- ============================================================================
-- 4. UPDATED_AT TRIGGERS
-- ============================================================================

-- Trigger function (reuse if exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS update_upload_batches_updated_at ON upload_batches;
CREATE TRIGGER update_upload_batches_updated_at
    BEFORE UPDATE ON upload_batches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stg_rows_updated_at ON stg_rows;
CREATE TRIGGER update_stg_rows_updated_at
    BEFORE UPDATE ON stg_rows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_proposed_changes_updated_at ON proposed_changes;
CREATE TRIGGER update_proposed_changes_updated_at
    BEFORE UPDATE ON proposed_changes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- Admin-only access following FRESH_0018_enquiries pattern
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE upload_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE stg_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposed_changes ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------
-- upload_batches policies (admin-only)
-- ----------------------------------------
DROP POLICY IF EXISTS admin_upload_batches_select ON upload_batches;
CREATE POLICY admin_upload_batches_select ON upload_batches
    FOR SELECT TO authenticated
    USING (
        tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid
        AND current_setting('app.current_user_role', TRUE) IN ('admin', 'super_admin')
    );

DROP POLICY IF EXISTS admin_upload_batches_insert ON upload_batches;
CREATE POLICY admin_upload_batches_insert ON upload_batches
    FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid
        AND current_setting('app.current_user_role', TRUE) IN ('admin', 'super_admin')
    );

DROP POLICY IF EXISTS admin_upload_batches_update ON upload_batches;
CREATE POLICY admin_upload_batches_update ON upload_batches
    FOR UPDATE TO authenticated
    USING (
        tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid
        AND current_setting('app.current_user_role', TRUE) IN ('admin', 'super_admin')
    )
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid
        AND current_setting('app.current_user_role', TRUE) IN ('admin', 'super_admin')
    );

DROP POLICY IF EXISTS admin_upload_batches_delete ON upload_batches;
CREATE POLICY admin_upload_batches_delete ON upload_batches
    FOR DELETE TO authenticated
    USING (
        tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid
        AND current_setting('app.current_user_role', TRUE) IN ('admin', 'super_admin')
    );

-- ----------------------------------------
-- stg_rows policies (admin-only)
-- ----------------------------------------
DROP POLICY IF EXISTS admin_stg_rows_select ON stg_rows;
CREATE POLICY admin_stg_rows_select ON stg_rows
    FOR SELECT TO authenticated
    USING (
        tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid
        AND current_setting('app.current_user_role', TRUE) IN ('admin', 'super_admin')
    );

DROP POLICY IF EXISTS admin_stg_rows_insert ON stg_rows;
CREATE POLICY admin_stg_rows_insert ON stg_rows
    FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid
        AND current_setting('app.current_user_role', TRUE) IN ('admin', 'super_admin')
    );

DROP POLICY IF EXISTS admin_stg_rows_update ON stg_rows;
CREATE POLICY admin_stg_rows_update ON stg_rows
    FOR UPDATE TO authenticated
    USING (
        tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid
        AND current_setting('app.current_user_role', TRUE) IN ('admin', 'super_admin')
    )
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid
        AND current_setting('app.current_user_role', TRUE) IN ('admin', 'super_admin')
    );

DROP POLICY IF EXISTS admin_stg_rows_delete ON stg_rows;
CREATE POLICY admin_stg_rows_delete ON stg_rows
    FOR DELETE TO authenticated
    USING (
        tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid
        AND current_setting('app.current_user_role', TRUE) IN ('admin', 'super_admin')
    );

-- ----------------------------------------
-- proposed_changes policies (admin-only)
-- ----------------------------------------
DROP POLICY IF EXISTS admin_proposed_changes_select ON proposed_changes;
CREATE POLICY admin_proposed_changes_select ON proposed_changes
    FOR SELECT TO authenticated
    USING (
        tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid
        AND current_setting('app.current_user_role', TRUE) IN ('admin', 'super_admin')
    );

DROP POLICY IF EXISTS admin_proposed_changes_insert ON proposed_changes;
CREATE POLICY admin_proposed_changes_insert ON proposed_changes
    FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid
        AND current_setting('app.current_user_role', TRUE) IN ('admin', 'super_admin')
    );

DROP POLICY IF EXISTS admin_proposed_changes_update ON proposed_changes;
CREATE POLICY admin_proposed_changes_update ON proposed_changes
    FOR UPDATE TO authenticated
    USING (
        tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid
        AND current_setting('app.current_user_role', TRUE) IN ('admin', 'super_admin')
    )
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid
        AND current_setting('app.current_user_role', TRUE) IN ('admin', 'super_admin')
    );

DROP POLICY IF EXISTS admin_proposed_changes_delete ON proposed_changes;
CREATE POLICY admin_proposed_changes_delete ON proposed_changes
    FOR DELETE TO authenticated
    USING (
        tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid
        AND current_setting('app.current_user_role', TRUE) IN ('admin', 'super_admin')
    );

-- ============================================================================
-- 6. SUPER ADMIN BYPASS POLICIES
-- Super admins can access all tenant data (using is_superuser() function)
-- ============================================================================

-- Check if is_superuser function exists (created in FRESH_0002)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_superuser') THEN
        -- upload_batches super admin bypass
        DROP POLICY IF EXISTS super_admin_upload_batches ON upload_batches;
        CREATE POLICY super_admin_upload_batches ON upload_batches
            FOR ALL TO authenticated
            USING (is_superuser())
            WITH CHECK (is_superuser());

        -- stg_rows super admin bypass
        DROP POLICY IF EXISTS super_admin_stg_rows ON stg_rows;
        CREATE POLICY super_admin_stg_rows ON stg_rows
            FOR ALL TO authenticated
            USING (is_superuser())
            WITH CHECK (is_superuser());

        -- proposed_changes super admin bypass
        DROP POLICY IF EXISTS super_admin_proposed_changes ON proposed_changes;
        CREATE POLICY super_admin_proposed_changes ON proposed_changes
            FOR ALL TO authenticated
            USING (is_superuser())
            WITH CHECK (is_superuser());
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERY (for manual testing)
-- ============================================================================
-- SELECT table_name, COUNT(*) as policy_count
-- FROM information_schema.tables t
-- LEFT JOIN pg_policies p ON t.table_name = p.tablename
-- WHERE t.table_name IN ('upload_batches', 'stg_rows', 'proposed_changes')
-- GROUP BY t.table_name;

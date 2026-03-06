-- FRESH_0035: Custom Descriptors for Schools
-- Allows tenants to create their own learning objectives alongside official CEFR descriptors
-- Date: 2026-03-06

-- ============================================================================
-- CUSTOM DESCRIPTORS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS custom_descriptors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Descriptor content
    cefr_level VARCHAR(10) NOT NULL,  -- A1, A2, B1, B2, C1, C2
    skill VARCHAR(50) NOT NULL,        -- reading, writing, listening, speaking, grammar, vocabulary
    descriptor_text TEXT NOT NULL,

    -- Optional categorization
    category VARCHAR(100),             -- e.g., "Business English", "Academic Writing"

    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    -- Status
    is_active BOOLEAN DEFAULT TRUE NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_custom_descriptors_tenant ON custom_descriptors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_custom_descriptors_level ON custom_descriptors(cefr_level);
CREATE INDEX IF NOT EXISTS idx_custom_descriptors_skill ON custom_descriptors(skill);
CREATE INDEX IF NOT EXISTS idx_custom_descriptors_active ON custom_descriptors(is_active);
CREATE INDEX IF NOT EXISTS idx_custom_descriptors_category ON custom_descriptors(category);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE custom_descriptors ENABLE ROW LEVEL SECURITY;

-- Admins can do everything for their tenant
CREATE POLICY custom_descriptors_admin_all ON custom_descriptors
    FOR ALL
    TO authenticated
    USING (
        tenant_id = current_setting('app.tenant_id', true)::uuid
        AND current_setting('app.user_role', true) IN ('admin', 'super_admin', 'owner')
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)::uuid
        AND current_setting('app.user_role', true) IN ('admin', 'super_admin', 'owner')
    );

-- Teachers can read active descriptors for their tenant
CREATE POLICY custom_descriptors_teacher_read ON custom_descriptors
    FOR SELECT
    TO authenticated
    USING (
        tenant_id = current_setting('app.tenant_id', true)::uuid
        AND current_setting('app.user_role', true) IN ('teacher', 'dos', 'assistant_dos')
        AND is_active = true
    );

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_custom_descriptors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_custom_descriptors_updated_at
    BEFORE UPDATE ON custom_descriptors
    FOR EACH ROW
    EXECUTE FUNCTION update_custom_descriptors_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE custom_descriptors IS 'School-specific learning objectives that supplement official CEFR descriptors';
COMMENT ON COLUMN custom_descriptors.cefr_level IS 'CEFR level (A1, A2, B1, B2, C1, C2)';
COMMENT ON COLUMN custom_descriptors.skill IS 'Language skill (reading, writing, listening, speaking, grammar, vocabulary)';
COMMENT ON COLUMN custom_descriptors.category IS 'Optional categorization for organization (e.g., Business English)';

-- FRESH_0029: Textbook Descriptors Table
-- Maps CEFR descriptors to specific textbook lessons (e.g., Speakout series)
-- Created: 2026-03-02

-- Create textbook_descriptors table
CREATE TABLE IF NOT EXISTS textbook_descriptors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Textbook location
    book VARCHAR(255) NOT NULL,          -- e.g., "Speakout Pre-intermediate 2nd edition"
    unit VARCHAR(50) NOT NULL,           -- e.g., "Unit 1"
    page INTEGER,                        -- Page number
    lesson VARCHAR(255),                 -- e.g., "Feeling good"

    -- CEFR mapping
    level VARCHAR(5) NOT NULL,           -- A2+, B1, B1+, B2, C1, etc.
    skill_focus VARCHAR(50) NOT NULL,    -- Speaking, Listening, Reading, Writing

    -- The descriptor text
    descriptor_text TEXT NOT NULL,

    -- Optional link to official CEFR descriptor
    cefr_descriptor_id UUID REFERENCES cefr_descriptors(id),

    -- Tenant scope (NULL = global/shared)
    tenant_id UUID REFERENCES tenants(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_textbook_book ON textbook_descriptors(book);
CREATE INDEX IF NOT EXISTS idx_textbook_level ON textbook_descriptors(level);
CREATE INDEX IF NOT EXISTS idx_textbook_skill ON textbook_descriptors(skill_focus);
CREATE INDEX IF NOT EXISTS idx_textbook_unit ON textbook_descriptors(unit);
CREATE INDEX IF NOT EXISTS idx_textbook_tenant ON textbook_descriptors(tenant_id);

-- Add comment
COMMENT ON TABLE textbook_descriptors IS 'Maps CEFR descriptors to textbook lessons (Speakout 2nd Edition)';

-- RLS policies (tenant-aware read, admin write)
ALTER TABLE textbook_descriptors ENABLE ROW LEVEL SECURITY;

-- Anyone can read global descriptors (tenant_id IS NULL)
CREATE POLICY "Read global textbook descriptors"
    ON textbook_descriptors
    FOR SELECT
    USING (tenant_id IS NULL OR tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Admins can manage tenant-specific descriptors
CREATE POLICY "Admin manage textbook descriptors"
    ON textbook_descriptors
    FOR ALL
    USING (
        current_setting('app.role', true) IN ('admin', 'superadmin')
        AND (tenant_id IS NULL OR tenant_id = current_setting('app.tenant_id', true)::uuid)
    )
    WITH CHECK (
        current_setting('app.role', true) IN ('admin', 'superadmin')
        AND (tenant_id IS NULL OR tenant_id = current_setting('app.tenant_id', true)::uuid)
    );

-- Updated at trigger
CREATE TRIGGER set_textbook_descriptors_updated_at
    BEFORE UPDATE ON textbook_descriptors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

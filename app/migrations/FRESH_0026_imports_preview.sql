-- ============================================
-- FRESH_0026_imports_preview.sql
-- Add confirmation and edit tracking to stg_rows
-- Supports preview workflow with editable cells
-- ============================================

-- Add confirmation status for preview workflow
ALTER TABLE stg_rows
ADD COLUMN IF NOT EXISTS confirmation VARCHAR(20) DEFAULT 'pending';

-- Add comment explaining values
COMMENT ON COLUMN stg_rows.confirmation IS 'Row confirmation status for preview workflow: pending, confirmed, quarantined';

-- Add admin edit tracking
ALTER TABLE stg_rows
ADD COLUMN IF NOT EXISTS edited_data JSONB;

ALTER TABLE stg_rows
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP;

ALTER TABLE stg_rows
ADD COLUMN IF NOT EXISTS edited_by UUID REFERENCES users(id);

-- Add comment explaining edited_data
COMMENT ON COLUMN stg_rows.edited_data IS 'Admin edits that override parsedData values: { fieldName: editedValue, ... }';

-- Index for filtering by confirmation status
CREATE INDEX IF NOT EXISTS idx_stg_rows_confirmation ON stg_rows(confirmation);

-- Add index for edited_by for audit queries
CREATE INDEX IF NOT EXISTS idx_stg_rows_edited_by ON stg_rows(edited_by) WHERE edited_by IS NOT NULL;

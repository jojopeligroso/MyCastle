-- FRESH_0024_booking_fee_presets.sql
-- Configurable Fee Presets for Bookings
-- Date: 2026-03-01
-- Description: Creates booking_fee_presets table for customizable fee options

-- =============================================================================
-- 1. CREATE BOOKING FEE PRESETS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS booking_fee_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    fee_type VARCHAR(50) NOT NULL,  -- 'registration', 'learner_protection', 'transfer', 'exam'
    label VARCHAR(100) NOT NULL,     -- Display name (e.g., "Standard", "Agency Rate")
    amount_eur DECIMAL(10,2) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_booking_fee_presets_tenant
    ON booking_fee_presets(tenant_id);

CREATE INDEX IF NOT EXISTS idx_booking_fee_presets_type
    ON booking_fee_presets(tenant_id, fee_type);

CREATE INDEX IF NOT EXISTS idx_booking_fee_presets_active
    ON booking_fee_presets(tenant_id, fee_type, is_active);

-- Unique constraint: only one default per fee type per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_fee_presets_default
    ON booking_fee_presets(tenant_id, fee_type)
    WHERE is_default = true;

-- =============================================================================
-- 2. CREATE ACCOMMODATION TYPE PRESETS TABLE
-- =============================================================================
-- Per user requirement: accommodation types need to be customizable
-- This extends the existing accommodation_types table with preset functionality

CREATE TABLE IF NOT EXISTS accommodation_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(500),
    price_per_week_eur DECIMAL(10,2) NOT NULL DEFAULT 0,
    deposit_eur DECIMAL(10,2) DEFAULT 0,
    is_default BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_accommodation_presets_tenant
    ON accommodation_presets(tenant_id);

CREATE INDEX IF NOT EXISTS idx_accommodation_presets_active
    ON accommodation_presets(tenant_id, is_active);

-- Unique constraint: only one default per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_accommodation_presets_default
    ON accommodation_presets(tenant_id)
    WHERE is_default = true;

-- =============================================================================
-- 3. RLS POLICIES FOR BOOKING FEE PRESETS
-- =============================================================================

ALTER TABLE booking_fee_presets ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read presets for their tenant
CREATE POLICY booking_fee_presets_select_policy ON booking_fee_presets
    FOR SELECT
    USING (tenant_id::text = current_setting('app.tenant_id', true));

-- Allow admins to manage presets for their tenant
CREATE POLICY booking_fee_presets_insert_policy ON booking_fee_presets
    FOR INSERT
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY booking_fee_presets_update_policy ON booking_fee_presets
    FOR UPDATE
    USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY booking_fee_presets_delete_policy ON booking_fee_presets
    FOR DELETE
    USING (tenant_id::text = current_setting('app.tenant_id', true));

-- =============================================================================
-- 4. RLS POLICIES FOR ACCOMMODATION PRESETS
-- =============================================================================

ALTER TABLE accommodation_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY accommodation_presets_select_policy ON accommodation_presets
    FOR SELECT
    USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY accommodation_presets_insert_policy ON accommodation_presets
    FOR INSERT
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY accommodation_presets_update_policy ON accommodation_presets
    FOR UPDATE
    USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY accommodation_presets_delete_policy ON accommodation_presets
    FOR DELETE
    USING (tenant_id::text = current_setting('app.tenant_id', true));

-- =============================================================================
-- 5. SEED DEFAULT FEE PRESETS
-- Note: Run this for each tenant or modify to insert for all tenants
-- =============================================================================

-- Create a function to seed default presets for a tenant
CREATE OR REPLACE FUNCTION seed_default_fee_presets(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
    -- Registration Fee Presets
    INSERT INTO booking_fee_presets (tenant_id, fee_type, label, amount_eur, is_default, sort_order)
    VALUES
        (p_tenant_id, 'registration', 'Standard', 75.00, true, 1),
        (p_tenant_id, 'registration', 'Reduced', 50.00, false, 2),
        (p_tenant_id, 'registration', 'Minimal', 25.00, false, 3),
        (p_tenant_id, 'registration', 'Waived', 0.00, false, 4)
    ON CONFLICT DO NOTHING;

    -- Learner Protection Presets
    INSERT INTO booking_fee_presets (tenant_id, fee_type, label, amount_eur, is_default, sort_order)
    VALUES
        (p_tenant_id, 'learner_protection', 'Standard', 130.00, true, 1)
    ON CONFLICT DO NOTHING;

    -- Transfer Fee Presets
    INSERT INTO booking_fee_presets (tenant_id, fee_type, label, amount_eur, is_default, sort_order)
    VALUES
        (p_tenant_id, 'transfer', 'No Transfer', 0.00, true, 1),
        (p_tenant_id, 'transfer', 'Airport Transfer', 50.00, false, 2)
    ON CONFLICT DO NOTHING;

    -- Exam Fee Presets
    INSERT INTO booking_fee_presets (tenant_id, fee_type, label, amount_eur, is_default, sort_order)
    VALUES
        (p_tenant_id, 'exam', 'No Exam', 0.00, true, 1),
        (p_tenant_id, 'exam', 'Cambridge FCE', 195.00, false, 2),
        (p_tenant_id, 'exam', 'Cambridge CAE', 210.00, false, 3),
        (p_tenant_id, 'exam', 'IELTS', 220.00, false, 4)
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Create a function to seed default accommodation presets for a tenant
CREATE OR REPLACE FUNCTION seed_default_accommodation_presets(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
    INSERT INTO accommodation_presets (tenant_id, name, price_per_week_eur, is_default, sort_order)
    VALUES
        (p_tenant_id, 'Host Family', 200.00, true, 1),
        (p_tenant_id, 'Student House - Twin', 150.00, false, 2),
        (p_tenant_id, 'Student House - Treble', 130.00, false, 3),
        (p_tenant_id, 'Student House - Single (Point Campus)', 250.00, false, 4)
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Seed defaults for all existing tenants
DO $$
DECLARE
    tenant_record RECORD;
BEGIN
    FOR tenant_record IN SELECT id FROM tenants LOOP
        PERFORM seed_default_fee_presets(tenant_record.id);
        PERFORM seed_default_accommodation_presets(tenant_record.id);
    END LOOP;
END $$;

-- =============================================================================
-- 6. TRIGGER TO SEED DEFAULTS FOR NEW TENANTS
-- =============================================================================

CREATE OR REPLACE FUNCTION on_tenant_created()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM seed_default_fee_presets(NEW.id);
    PERFORM seed_default_accommodation_presets(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists (idempotent)
DROP TRIGGER IF EXISTS trigger_seed_tenant_presets ON tenants;

CREATE TRIGGER trigger_seed_tenant_presets
    AFTER INSERT ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION on_tenant_created();

-- =============================================================================
-- 7. UPDATED_AT TRIGGER FOR BOTH TABLES
-- =============================================================================

-- Use the existing updated_at trigger function if available
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_booking_fee_presets_updated_at
    BEFORE UPDATE ON booking_fee_presets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accommodation_presets_updated_at
    BEFORE UPDATE ON accommodation_presets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Done

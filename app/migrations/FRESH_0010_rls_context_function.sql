-- ============================================================================
-- MyCastle Fresh Schema Migration 0010
-- RLS Context Helper Function
-- Date: 2026-01-19
-- ============================================================================

-- This function sets the RLS context for the current session
-- Used in server actions and seed scripts to set tenant/user context

CREATE OR REPLACE FUNCTION set_user_context(
  p_user_id UUID,
  p_tenant_id UUID,
  p_role VARCHAR
)
RETURNS void AS $$
BEGIN
  -- Set session variables for RLS policies
  PERFORM set_config('app.user_id', p_user_id::text, false);
  PERFORM set_config('app.tenant_id', p_tenant_id::text, false);
  PERFORM set_config('app.user_role', p_role, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION set_user_context IS 'Sets RLS context variables for the current session (user_id, tenant_id, role)';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION set_user_context TO PUBLIC;

DO $$
BEGIN
  RAISE NOTICE 'Migration FRESH_0010 completed successfully!';
  RAISE NOTICE 'Created function: set_user_context(user_id, tenant_id, role)';
  RAISE NOTICE 'This function sets app.user_id, app.tenant_id, app.user_role for RLS policies';
END $$;

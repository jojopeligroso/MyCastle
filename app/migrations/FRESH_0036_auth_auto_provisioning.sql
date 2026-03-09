-- FRESH_0036: Auth Auto-Provisioning
-- Adds domain-based auto-provisioning for user authentication
-- Date: 2026-03-09

-- Add allowed_email_domains column to tenants
-- This is a JSON array of domains that can auto-register to this tenant
-- e.g., ["castleforbescollege.com"]
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS allowed_email_domains JSONB DEFAULT '[]'::jsonb;

-- Add default_role column to tenants
-- The role assigned to auto-provisioned users (can be changed later via RBAC)
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS default_role VARCHAR(50) DEFAULT 'teacher';

-- Add comment for documentation
COMMENT ON COLUMN tenants.allowed_email_domains IS 'Email domains that can auto-register to this tenant, e.g., ["castleforbescollege.com"]';
COMMENT ON COLUMN tenants.default_role IS 'Default role for auto-provisioned users (admin, teacher, student)';

-- Configure Castle Forbes College tenant with allowed domain
-- This enables dos@castleforbescollege.com and adrian@castleforbescollege.com to auto-provision
UPDATE tenants
SET
  allowed_email_domains = '["castleforbescollege.com"]'::jsonb,
  default_role = 'admin'
WHERE name ILIKE '%castle%forbes%'
   OR subdomain ILIKE '%castle%forbes%'
   OR contact_email ILIKE '%castleforbescollege%';

-- If no Castle Forbes tenant exists, create one
INSERT INTO tenants (name, subdomain, contact_email, status, allowed_email_domains, default_role)
SELECT
  'Castle Forbes College',
  'castleforbes',
  'admin@castleforbescollege.com',
  'active',
  '["castleforbescollege.com"]'::jsonb,
  'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM tenants
  WHERE name ILIKE '%castle%forbes%'
     OR subdomain ILIKE '%castle%forbes%'
     OR contact_email ILIKE '%castleforbescollege%'
);

-- Verify the setup
DO $$
DECLARE
  tenant_count INT;
BEGIN
  SELECT COUNT(*) INTO tenant_count
  FROM tenants
  WHERE allowed_email_domains @> '"castleforbescollege.com"'::jsonb;

  IF tenant_count = 0 THEN
    RAISE WARNING 'No tenant configured for castleforbescollege.com domain';
  ELSE
    RAISE NOTICE 'Castle Forbes College tenant configured for auto-provisioning';
  END IF;
END $$;

-- Migration: FRESH_0022_performance_indexes.sql
-- Purpose: Add indexes for import matching performance
-- Date: 2026-02-25
-- Expected Improvement: 86% faster imports (100s -> ~14s for 252 students)

-- Enable trigram extension for fuzzy text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram index on user names for ILIKE queries
-- Speeds up fuzzy name matching in import matcher
CREATE INDEX IF NOT EXISTS idx_users_name_trgm
ON users USING GIN(name gin_trgm_ops);

-- Compound index for enrollment filtering by tenant and status
-- Used by prefetchAllEnrollments() to fetch active enrollments
CREATE INDEX IF NOT EXISTS idx_enrollments_tenant_status
ON enrollments(tenant_id, status);

-- Index for class name lookups (case-insensitive)
-- Used by apply-service to match class names from imports
CREATE INDEX IF NOT EXISTS idx_classes_tenant_name_lower
ON classes(tenant_id, LOWER(name));

-- Verify indexes created
DO $$
DECLARE
  idx_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO idx_count
  FROM pg_indexes
  WHERE indexname IN (
    'idx_users_name_trgm',
    'idx_enrollments_tenant_status',
    'idx_classes_tenant_name_lower'
  );

  IF idx_count = 3 THEN
    RAISE NOTICE 'All 3 performance indexes created successfully';
  ELSE
    RAISE NOTICE 'Warning: Only % of 3 indexes were created', idx_count;
  END IF;
END $$;

-- Display created indexes for verification
SELECT indexname, tablename
FROM pg_indexes
WHERE indexname IN (
  'idx_users_name_trgm',
  'idx_enrollments_tenant_status',
  'idx_classes_tenant_name_lower'
);

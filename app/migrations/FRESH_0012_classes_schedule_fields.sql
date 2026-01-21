-- FRESH_0012: Add schedule time fields and unique name constraint to classes table
-- Author: Claude + Eoin
-- Date: 2026-01-20
-- Purpose: Support separate start/end times, break duration, and enforce unique class names

-- Add schedule time fields to classes table
ALTER TABLE classes
ADD COLUMN start_time TIME,
ADD COLUMN end_time TIME,
ADD COLUMN break_duration_minutes INTEGER DEFAULT 0,
ADD COLUMN days_of_week JSONB DEFAULT '[]'::jsonb,
ADD COLUMN show_capacity_publicly BOOLEAN DEFAULT true;

-- Add unique constraint for class names within tenant
-- (prevents duplicate class names per tenant)
ALTER TABLE classes
ADD CONSTRAINT uk_classes_tenant_name UNIQUE (tenant_id, name);

-- Add index for time-based queries
CREATE INDEX idx_classes_schedule_times ON classes(start_time, end_time);

-- Add comment for clarity
COMMENT ON COLUMN classes.start_time IS 'Daily start time (e.g., 09:00:00)';
COMMENT ON COLUMN classes.end_time IS 'Daily end time (e.g., 10:30:00)';
COMMENT ON COLUMN classes.break_duration_minutes IS 'Optional break duration in minutes (default 0)';
COMMENT ON COLUMN classes.days_of_week IS 'Array of days class runs, e.g., ["Monday", "Wednesday", "Friday"]';
COMMENT ON COLUMN classes.show_capacity_publicly IS 'Whether to show capacity limits on public-facing dashboards';
COMMENT ON CONSTRAINT uk_classes_tenant_name ON classes IS 'Ensures class names are unique within each tenant';

-- FRESH_0025_nullable_course_dates.sql
-- Make course dates nullable to support TBC (To Be Confirmed) bookings
-- Date: 2026-03-01

-- Allow course_start_date to be NULL (TBC)
ALTER TABLE bookings
ALTER COLUMN course_start_date DROP NOT NULL;

-- Allow course_end_date to be NULL (TBC)
ALTER TABLE bookings
ALTER COLUMN course_end_date DROP NOT NULL;

-- Done

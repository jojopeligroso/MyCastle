-- Migration: FRESH_0021_activate_provisional_students.sql
-- Purpose: Convert provisional students to active if their enrollment dates
--          contain either today's date OR the next Monday
-- Date: 2026-02-23

-- Calculate next Monday:
-- If today is Monday (dow=1), next Monday is today+7
-- Otherwise, next Monday is today + (8 - dow) % 7 days
-- dow: 0=Sunday, 1=Monday, ..., 6=Saturday

DO $$
DECLARE
  next_monday DATE;
  today DATE := CURRENT_DATE;
  affected_users INT := 0;
  affected_students INT := 0;
BEGIN
  -- Calculate next Monday
  -- EXTRACT(DOW FROM date) returns 0 for Sunday, 1 for Monday, etc.
  next_monday := today + ((8 - EXTRACT(DOW FROM today)::INT) % 7);

  -- If today is Monday, next_monday would be today, so add 7 days
  IF EXTRACT(DOW FROM today) = 1 THEN
    next_monday := today + 7;
  END IF;

  RAISE NOTICE 'Today: %, Next Monday: %', today, next_monday;

  -- Update users to 'active' where:
  -- 1. User status is 'provisional'
  -- 2. User was created via provisional import (metadata check)
  -- 3. User has a corresponding student record
  -- 4. Student has an active enrollment in a class where:
  --    - Class start_date <= (today OR next_monday) AND
  --    - Class end_date >= (today OR next_monday)
  --    OR
  --    - Enrollment expected_end_date >= (today OR next_monday)

  WITH eligible_users AS (
    SELECT DISTINCT u.id AS user_id, s.id AS student_id
    FROM users u
    INNER JOIN students s ON s.user_id = u.id
    INNER JOIN enrollments e ON e.student_id = u.id AND e.status = 'active'
    INNER JOIN classes c ON c.id = e.class_id
    WHERE u.status = 'provisional'
      AND u.metadata->>'provisionalImport' = 'true'
      AND (
        -- Check if dates contain today
        (c.start_date <= today AND (c.end_date IS NULL OR c.end_date >= today))
        OR
        -- Check if dates contain next Monday
        (c.start_date <= next_monday AND (c.end_date IS NULL OR c.end_date >= next_monday))
        OR
        -- Also check enrollment expected_end_date
        (e.enrollment_date <= today AND (e.expected_end_date IS NULL OR e.expected_end_date >= today))
        OR
        (e.enrollment_date <= next_monday AND (e.expected_end_date IS NULL OR e.expected_end_date >= next_monday))
      )
  ),
  updated_users AS (
    UPDATE users
    SET status = 'active',
        updated_at = NOW()
    WHERE id IN (SELECT user_id FROM eligible_users)
    RETURNING id
  ),
  updated_students AS (
    UPDATE students
    SET status = 'active',
        updated_at = NOW()
    WHERE id IN (SELECT student_id FROM eligible_users)
    RETURNING id
  )
  SELECT
    (SELECT COUNT(*) FROM updated_users),
    (SELECT COUNT(*) FROM updated_students)
  INTO affected_users, affected_students;

  RAISE NOTICE 'Activated % users and % students', affected_users, affected_students;

  -- Also log any provisional students that were NOT activated (for review)
  RAISE NOTICE 'Provisional students NOT activated (no valid enrollment in date range):';

  FOR affected_users IN
    SELECT u.id, u.name, u.email
    FROM users u
    INNER JOIN students s ON s.user_id = u.id
    WHERE u.status = 'provisional'
      AND u.metadata->>'provisionalImport' = 'true'
    LOOP
      RAISE NOTICE '  - User ID: %', affected_users;
    END LOOP;

END $$;

-- Verification query (run separately to check results)
-- SELECT u.id, u.name, u.email, u.status, s.status as student_status,
--        c.name as class_name, c.start_date, c.end_date,
--        e.enrollment_date, e.expected_end_date
-- FROM users u
-- JOIN students s ON s.user_id = u.id
-- LEFT JOIN enrollments e ON e.student_id = u.id
-- LEFT JOIN classes c ON c.id = e.class_id
-- WHERE u.metadata->>'provisionalImport' = 'true'
-- ORDER BY u.created_at DESC;

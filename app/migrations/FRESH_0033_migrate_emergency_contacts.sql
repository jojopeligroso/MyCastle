/**
 * FRESH_0033: Emergency Contact Data Migration
 *
 * Migrates existing emergency contact data from users.metadata (JSONB)
 * to the new emergency_contacts table (structured relational data).
 *
 * IMPORTANT: Run this AFTER FRESH_0033_student_documents_system.sql
 *
 * Date: 2026-03-05
 */

-- ============================================================================
-- PART 1: Migrate Existing Emergency Contacts from users.metadata
-- ============================================================================

DO $$
DECLARE
  student_record RECORD;
  contact_name TEXT;
  contact_phone TEXT;
  contact_relationship TEXT;
  rows_migrated INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting emergency contact migration...';
  RAISE NOTICE '';

  -- Loop through all students with emergency contact data in metadata
  FOR student_record IN
    SELECT
      id,
      tenant_id,
      metadata
    FROM users
    WHERE role = 'student'
      AND metadata IS NOT NULL
      AND (
        metadata->>'emergency_contact_name' IS NOT NULL
        OR metadata->>'emergency_contact_phone' IS NOT NULL
      )
  LOOP
    -- Extract emergency contact fields from metadata
    contact_name := student_record.metadata->>'emergency_contact_name';
    contact_phone := student_record.metadata->>'emergency_contact_phone';
    contact_relationship := student_record.metadata->>'emergency_contact_relationship';

    -- Skip if no name or phone (incomplete data)
    IF contact_name IS NULL OR contact_phone IS NULL THEN
      CONTINUE;
    END IF;

    -- Insert into emergency_contacts table (priority 1 = primary)
    INSERT INTO emergency_contacts (
      tenant_id,
      student_id,
      name,
      relationship,
      phone,
      email,
      priority,
      is_primary,
      created_at,
      updated_at
    )
    VALUES (
      student_record.tenant_id,
      student_record.id,
      contact_name,
      COALESCE(contact_relationship, 'Not Specified'),  -- Default if null
      contact_phone,
      NULL,  -- Email not in old structure
      1,     -- Priority 1 = primary contact
      true,  -- Mark as primary
      NOW(),
      NOW()
    )
    ON CONFLICT (student_id, priority) DO NOTHING;  -- Skip duplicates

    rows_migrated := rows_migrated + 1;
  END LOOP;

  RAISE NOTICE '✅ Migration complete!';
  RAISE NOTICE 'Migrated % emergency contacts from users.metadata to emergency_contacts table', rows_migrated;
  RAISE NOTICE '';

  -- Verification query
  RAISE NOTICE 'Verification:';
  RAISE NOTICE '  - Total students: %', (SELECT COUNT(*) FROM users WHERE role = 'student');
  RAISE NOTICE '  - Students with emergency contacts: %', (SELECT COUNT(DISTINCT student_id) FROM emergency_contacts);
  RAISE NOTICE '  - Total emergency contact records: %', (SELECT COUNT(*) FROM emergency_contacts);
  RAISE NOTICE '';

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Migration failed: %', SQLERRM;
END $$;

-- ============================================================================
-- PART 2: Add Columns to users table for Emergency Contacts (Backward Compatibility)
-- ============================================================================

-- NOTE: We are NOT removing the emergency contact fields from users.metadata
-- to maintain backward compatibility with existing code.
-- New code should use the emergency_contacts table.
-- Old code will continue to work with metadata fields.

COMMENT ON TABLE emergency_contacts IS
  'Primary source for emergency contacts (replaces users.metadata fields).
   Migrated from users.metadata->emergency_contact_* fields.
   Old metadata fields kept for backward compatibility.';

-- ============================================================================
-- PART 3: Create View for Easy Access to Primary Emergency Contact
-- ============================================================================

CREATE OR REPLACE VIEW v_student_primary_contact AS
SELECT
  ec.student_id,
  ec.name AS contact_name,
  ec.relationship,
  ec.phone AS contact_phone,
  ec.email AS contact_email,
  ec.address AS contact_address,
  ec.notes
FROM emergency_contacts ec
WHERE ec.is_primary = true
  AND ec.priority = 1;

COMMENT ON VIEW v_student_primary_contact IS
  'Convenient view to get primary emergency contact for each student';

-- ============================================================================
-- PART 4: Add Helper Function to Get All Emergency Contacts for a Student
-- ============================================================================

CREATE OR REPLACE FUNCTION get_student_emergency_contacts(p_student_id UUID)
RETURNS TABLE (
  contact_id UUID,
  name TEXT,
  relationship VARCHAR,
  phone VARCHAR,
  email VARCHAR,
  address TEXT,
  priority INTEGER,
  is_primary BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ec.id,
    ec.name,
    ec.relationship,
    ec.phone,
    ec.email,
    ec.address,
    ec.priority,
    ec.is_primary
  FROM emergency_contacts ec
  WHERE ec.student_id = p_student_id
  ORDER BY ec.priority ASC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_student_emergency_contacts IS
  'Returns all emergency contacts for a student, ordered by priority';

-- ============================================================================
-- PART 5: Sample Query Examples
-- ============================================================================

/*
-- Example 1: Get primary contact for a student
SELECT * FROM v_student_primary_contact WHERE student_id = '<student-uuid>';

-- Example 2: Get all contacts for a student (using helper function)
SELECT * FROM get_student_emergency_contacts('<student-uuid>');

-- Example 3: Get all contacts for a student (direct query)
SELECT * FROM emergency_contacts WHERE student_id = '<student-uuid>' ORDER BY priority;

-- Example 4: Find students with no emergency contact
SELECT
  u.id,
  u.name,
  u.email
FROM users u
LEFT JOIN emergency_contacts ec ON ec.student_id = u.id
WHERE u.role = 'student'
  AND ec.id IS NULL;

-- Example 5: Find students with only one emergency contact (missing secondary)
SELECT
  u.id,
  u.name,
  u.email,
  COUNT(ec.id) AS contact_count
FROM users u
LEFT JOIN emergency_contacts ec ON ec.student_id = u.id
WHERE u.role = 'student'
GROUP BY u.id, u.name, u.email
HAVING COUNT(ec.id) = 1;
*/

-- ============================================================================
-- PART 6: Verification and Completion Message
-- ============================================================================

DO $$
DECLARE
  total_students INTEGER;
  students_with_contacts INTEGER;
  total_contacts INTEGER;
  students_with_two_contacts INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_students FROM users WHERE role = 'student';
  SELECT COUNT(DISTINCT student_id) INTO students_with_contacts FROM emergency_contacts;
  SELECT COUNT(*) INTO total_contacts FROM emergency_contacts;
  SELECT COUNT(DISTINCT student_id) INTO students_with_two_contacts
  FROM (
    SELECT student_id
    FROM emergency_contacts
    GROUP BY student_id
    HAVING COUNT(*) >= 2
  ) sub;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Emergency Contact Migration Summary';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total students: %', total_students;
  RAISE NOTICE 'Students with emergency contacts: % (%.1f%%)',
    students_with_contacts,
    ROUND(100.0 * students_with_contacts / NULLIF(total_students, 0), 1);
  RAISE NOTICE 'Total emergency contact records: %', total_contacts;
  RAISE NOTICE 'Students with 2+ contacts: % (%.1f%%)',
    students_with_two_contacts,
    ROUND(100.0 * students_with_two_contacts / NULLIF(students_with_contacts, 0), 1);
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Review migrated data: SELECT * FROM emergency_contacts LIMIT 10;';
  RAISE NOTICE '  2. Add secondary contacts where needed via admin UI';
  RAISE NOTICE '  3. Update application code to use emergency_contacts table';
  RAISE NOTICE '  4. Keep users.metadata fields for backward compatibility';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Migration complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

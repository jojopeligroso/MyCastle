/**
 * FRESH_0002: Comprehensive RLS Policies
 * Following Supabase best practices for multi-tenant ESL school
 *
 * Security Model:
 * - All operations require app.tenant_id to be set
 * - Role-based permissions: admin, teacher, student
 * - Tenant isolation enforced on all tables
 *
 * Date: 2026-01-14
 */

-- ============================================================================
-- STEP 1: Drop ALL existing policies (will be replaced with granular policies)
-- ============================================================================

-- Drop old tenant isolation policies
DROP POLICY IF EXISTS tenant_isolation_tenants ON tenants;
DROP POLICY IF EXISTS tenant_isolation_users ON users;
DROP POLICY IF EXISTS tenant_isolation_user_roles ON user_roles;
DROP POLICY IF EXISTS tenant_isolation_students ON students;
DROP POLICY IF EXISTS tenant_isolation_agencies ON agencies;
DROP POLICY IF EXISTS tenant_isolation_courses ON courses;
DROP POLICY IF EXISTS tenant_isolation_accommodation_types ON accommodation_types;
DROP POLICY IF EXISTS tenant_isolation_bookings ON bookings;
DROP POLICY IF EXISTS tenant_isolation_payments ON payments;

-- Drop all granular policies (in case re-running)
DROP POLICY IF EXISTS tenants_superuser_all ON tenants;
DROP POLICY IF EXISTS tenants_select_admin_only ON tenants;
DROP POLICY IF EXISTS tenants_insert_admin_only ON tenants;
DROP POLICY IF EXISTS tenants_update_admin_only ON tenants;
DROP POLICY IF EXISTS tenants_delete_admin_only ON tenants;

DROP POLICY IF EXISTS users_superuser_all ON users;
DROP POLICY IF EXISTS users_select_all ON users;
DROP POLICY IF EXISTS users_insert_admin ON users;
DROP POLICY IF EXISTS users_update_admin_or_self ON users;
DROP POLICY IF EXISTS users_delete_admin ON users;

DROP POLICY IF EXISTS user_roles_superuser_all ON user_roles;
DROP POLICY IF EXISTS user_roles_select_all ON user_roles;
DROP POLICY IF EXISTS user_roles_insert_admin ON user_roles;
DROP POLICY IF EXISTS user_roles_update_admin ON user_roles;
DROP POLICY IF EXISTS user_roles_delete_admin ON user_roles;

DROP POLICY IF EXISTS students_superuser_all ON students;
DROP POLICY IF EXISTS students_select_admin_or_self ON students;
DROP POLICY IF EXISTS students_insert_admin ON students;
DROP POLICY IF EXISTS students_update_admin ON students;
DROP POLICY IF EXISTS students_delete_admin ON students;

DROP POLICY IF EXISTS agencies_superuser_all ON agencies;
DROP POLICY IF EXISTS agencies_select_admin ON agencies;
DROP POLICY IF EXISTS agencies_insert_admin ON agencies;
DROP POLICY IF EXISTS agencies_update_admin ON agencies;
DROP POLICY IF EXISTS agencies_delete_admin ON agencies;

DROP POLICY IF EXISTS courses_superuser_all ON courses;
DROP POLICY IF EXISTS courses_select_all ON courses;
DROP POLICY IF EXISTS courses_insert_admin ON courses;
DROP POLICY IF EXISTS courses_update_admin ON courses;
DROP POLICY IF EXISTS courses_delete_admin ON courses;

DROP POLICY IF EXISTS accommodation_types_superuser_all ON accommodation_types;
DROP POLICY IF EXISTS accommodation_types_select_all ON accommodation_types;
DROP POLICY IF EXISTS accommodation_types_insert_admin ON accommodation_types;
DROP POLICY IF EXISTS accommodation_types_update_admin ON accommodation_types;
DROP POLICY IF EXISTS accommodation_types_delete_admin ON accommodation_types;

DROP POLICY IF EXISTS bookings_superuser_all ON bookings;
DROP POLICY IF EXISTS bookings_select_teacher_or_own ON bookings;
DROP POLICY IF EXISTS bookings_insert_teacher ON bookings;
DROP POLICY IF EXISTS bookings_update_teacher ON bookings;
DROP POLICY IF EXISTS bookings_delete_admin ON bookings;

DROP POLICY IF EXISTS payments_superuser_all ON payments;
DROP POLICY IF EXISTS payments_select_teacher_or_own ON payments;
DROP POLICY IF EXISTS payments_insert_teacher ON payments;
DROP POLICY IF EXISTS payments_update_teacher ON payments;
DROP POLICY IF EXISTS payments_delete_admin ON payments;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Check if current user is superuser (eoinmaleoin@gmail.com or service role)
CREATE OR REPLACE FUNCTION public.is_superuser()
RETURNS BOOLEAN AS $$
DECLARE
  current_user_email VARCHAR;
BEGIN
  -- Service role always has superuser access
  IF current_user = 'service_role' OR current_user = 'postgres' THEN
    RETURN true;
  END IF;

  -- Check if specific superuser email
  current_user_email := current_setting('app.user_email', true);
  RETURN current_user_email = 'eoinmaleoin@gmail.com';
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS VARCHAR AS $$
BEGIN
  -- Superuser bypasses role checks
  IF is_superuser() THEN
    RETURN 'admin';
  END IF;

  RETURN current_setting('app.user_role', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is teacher or admin
CREATE OR REPLACE FUNCTION public.is_teacher_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role() IN ('admin', 'teacher');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current tenant ID
CREATE OR REPLACE FUNCTION public.get_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (current_setting('app.tenant_id', true))::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current user ID
CREATE OR REPLACE FUNCTION public.get_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN (current_setting('app.user_id', true))::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TENANTS: Only admins can manage tenants
-- ============================================================================

-- Superuser can access all tenants
CREATE POLICY "tenants_superuser_all"
  ON tenants FOR ALL
  USING (is_superuser())
  WITH CHECK (is_superuser());

CREATE POLICY "tenants_select_admin_only"
  ON tenants FOR SELECT
  USING (is_admin() AND id = get_tenant_id());

CREATE POLICY "tenants_insert_admin_only"
  ON tenants FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "tenants_update_admin_only"
  ON tenants FOR UPDATE
  USING (is_admin() AND id = get_tenant_id())
  WITH CHECK (is_admin() AND id = get_tenant_id());

CREATE POLICY "tenants_delete_admin_only"
  ON tenants FOR DELETE
  USING (is_admin() AND id = get_tenant_id());

-- ============================================================================
-- USERS: Role-based access to user profiles
-- ============================================================================

-- Superuser can access all users
CREATE POLICY "users_superuser_all"
  ON users FOR ALL
  USING (is_superuser())
  WITH CHECK (is_superuser());

-- Everyone can read users in their tenant
CREATE POLICY "users_select_all"
  ON users FOR SELECT
  USING (tenant_id = get_tenant_id());

-- Admins can insert users
CREATE POLICY "users_insert_admin"
  ON users FOR INSERT
  WITH CHECK (is_admin() AND tenant_id = get_tenant_id());

-- Admins can update any user, users can update themselves
CREATE POLICY "users_update_admin_or_self"
  ON users FOR UPDATE
  USING (
    tenant_id = get_tenant_id() AND
    (is_admin() OR id = get_user_id())
  )
  WITH CHECK (
    tenant_id = get_tenant_id() AND
    (is_admin() OR id = get_user_id())
  );

-- Only admins can delete users
CREATE POLICY "users_delete_admin"
  ON users FOR DELETE
  USING (is_admin() AND tenant_id = get_tenant_id());

-- ============================================================================
-- USER_ROLES: Admins manage roles
-- ============================================================================

CREATE POLICY "user_roles_superuser_all"
  ON user_roles FOR ALL
  USING (is_superuser())
  WITH CHECK (is_superuser());

CREATE POLICY "user_roles_select_all"
  ON user_roles FOR SELECT
  USING (tenant_id = get_tenant_id());

CREATE POLICY "user_roles_insert_admin"
  ON user_roles FOR INSERT
  WITH CHECK (is_admin() AND tenant_id = get_tenant_id());

CREATE POLICY "user_roles_update_admin"
  ON user_roles FOR UPDATE
  USING (is_admin() AND tenant_id = get_tenant_id())
  WITH CHECK (is_admin() AND tenant_id = get_tenant_id());

CREATE POLICY "user_roles_delete_admin"
  ON user_roles FOR DELETE
  USING (is_admin() AND tenant_id = get_tenant_id());

-- ============================================================================
-- STUDENTS: Admins manage, teachers have limited access (TBD), students see themselves
-- NOTE: Teacher permissions will be defined more clearly when implementing teacher features
-- ============================================================================

CREATE POLICY "students_superuser_all"
  ON students FOR ALL
  USING (is_superuser())
  WITH CHECK (is_superuser());

-- Admins can read all students, teachers can read (limits TBD), students can read themselves
CREATE POLICY "students_select_admin_or_self"
  ON students FOR SELECT
  USING (
    tenant_id = get_tenant_id() AND
    (is_admin() OR user_id = get_user_id())
    -- TODO: Add teacher read permissions when teacher features are implemented
  );

-- Only admins can insert students
CREATE POLICY "students_insert_admin"
  ON students FOR INSERT
  WITH CHECK (is_admin() AND tenant_id = get_tenant_id());

-- Admins can update students, students can update limited fields
CREATE POLICY "students_update_admin"
  ON students FOR UPDATE
  USING (
    tenant_id = get_tenant_id() AND
    is_admin()
    -- TODO: Add teacher update permissions (limited fields) when teacher features are implemented
  )
  WITH CHECK (
    tenant_id = get_tenant_id() AND
    is_admin()
  );

-- Only admins can delete students
CREATE POLICY "students_delete_admin"
  ON students FOR DELETE
  USING (is_admin() AND tenant_id = get_tenant_id());

-- ============================================================================
-- AGENCIES: Admin-only management
-- ============================================================================

CREATE POLICY "agencies_superuser_all"
  ON agencies FOR ALL
  USING (is_superuser())
  WITH CHECK (is_superuser());

-- Only admins can read agencies
CREATE POLICY "agencies_select_admin"
  ON agencies FOR SELECT
  USING (is_admin() AND tenant_id = get_tenant_id());

CREATE POLICY "agencies_insert_admin"
  ON agencies FOR INSERT
  WITH CHECK (is_admin() AND tenant_id = get_tenant_id());

CREATE POLICY "agencies_update_admin"
  ON agencies FOR UPDATE
  USING (is_admin() AND tenant_id = get_tenant_id())
  WITH CHECK (is_admin() AND tenant_id = get_tenant_id());

CREATE POLICY "agencies_delete_admin"
  ON agencies FOR DELETE
  USING (is_admin() AND tenant_id = get_tenant_id());

-- ============================================================================
-- COURSES: Everyone can read, teachers/admins manage
-- ============================================================================

CREATE POLICY "courses_superuser_all"
  ON courses FOR ALL
  USING (is_superuser())
  WITH CHECK (is_superuser());

CREATE POLICY "courses_select_all"
  ON courses FOR SELECT
  USING (tenant_id = get_tenant_id());

CREATE POLICY "courses_insert_admin"
  ON courses FOR INSERT
  WITH CHECK (is_admin() AND tenant_id = get_tenant_id());

CREATE POLICY "courses_update_admin"
  ON courses FOR UPDATE
  USING (is_admin() AND tenant_id = get_tenant_id())
  WITH CHECK (is_admin() AND tenant_id = get_tenant_id());

CREATE POLICY "courses_delete_admin"
  ON courses FOR DELETE
  USING (is_admin() AND tenant_id = get_tenant_id());

-- ============================================================================
-- ACCOMMODATION_TYPES: Everyone can read, admins manage
-- ============================================================================

CREATE POLICY "accommodation_types_superuser_all"
  ON accommodation_types FOR ALL
  USING (is_superuser())
  WITH CHECK (is_superuser());

CREATE POLICY "accommodation_types_select_all"
  ON accommodation_types FOR SELECT
  USING (tenant_id = get_tenant_id());

CREATE POLICY "accommodation_types_insert_admin"
  ON accommodation_types FOR INSERT
  WITH CHECK (is_admin() AND tenant_id = get_tenant_id());

CREATE POLICY "accommodation_types_update_admin"
  ON accommodation_types FOR UPDATE
  USING (is_admin() AND tenant_id = get_tenant_id())
  WITH CHECK (is_admin() AND tenant_id = get_tenant_id());

CREATE POLICY "accommodation_types_delete_admin"
  ON accommodation_types FOR DELETE
  USING (is_admin() AND tenant_id = get_tenant_id());

-- ============================================================================
-- BOOKINGS: Teachers/admins manage, students see their own
-- ============================================================================

CREATE POLICY "bookings_superuser_all"
  ON bookings FOR ALL
  USING (is_superuser())
  WITH CHECK (is_superuser());

-- Teachers/admins see all, students see their own
CREATE POLICY "bookings_select_teacher_or_own"
  ON bookings FOR SELECT
  USING (
    tenant_id = get_tenant_id() AND
    (is_teacher_or_admin() OR
     student_id IN (SELECT id FROM students WHERE user_id = get_user_id()))
  );

-- Teachers/admins can create bookings
CREATE POLICY "bookings_insert_teacher"
  ON bookings FOR INSERT
  WITH CHECK (is_teacher_or_admin() AND tenant_id = get_tenant_id());

-- Teachers/admins can update bookings
CREATE POLICY "bookings_update_teacher"
  ON bookings FOR UPDATE
  USING (is_teacher_or_admin() AND tenant_id = get_tenant_id())
  WITH CHECK (is_teacher_or_admin() AND tenant_id = get_tenant_id());

-- Only admins can delete bookings
CREATE POLICY "bookings_delete_admin"
  ON bookings FOR DELETE
  USING (is_admin() AND tenant_id = get_tenant_id());

-- ============================================================================
-- PAYMENTS: Teachers/admins manage, students see their own
-- ============================================================================

CREATE POLICY "payments_superuser_all"
  ON payments FOR ALL
  USING (is_superuser())
  WITH CHECK (is_superuser());

-- Teachers/admins see all, students see payments for their bookings
CREATE POLICY "payments_select_teacher_or_own"
  ON payments FOR SELECT
  USING (
    tenant_id = get_tenant_id() AND
    (is_teacher_or_admin() OR
     booking_id IN (
       SELECT b.id FROM bookings b
       JOIN students s ON b.student_id = s.id
       WHERE s.user_id = get_user_id()
     ))
  );

-- Teachers/admins can create payments
CREATE POLICY "payments_insert_teacher"
  ON payments FOR INSERT
  WITH CHECK (is_teacher_or_admin() AND tenant_id = get_tenant_id());

-- Teachers/admins can update payments
CREATE POLICY "payments_update_teacher"
  ON payments FOR UPDATE
  USING (is_teacher_or_admin() AND tenant_id = get_tenant_id())
  WITH CHECK (is_teacher_or_admin() AND tenant_id = get_tenant_id());

-- Only admins can delete payments
CREATE POLICY "payments_delete_admin"
  ON payments FOR DELETE
  USING (is_admin() AND tenant_id = get_tenant_id());

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check that all tables have RLS enabled and have 4+ policies each
DO $$
DECLARE
  tbl RECORD;
  policy_count INTEGER;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    -- Check RLS is enabled
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename = tbl.tablename
      AND rowsecurity = true
    ) THEN
      RAISE EXCEPTION 'RLS not enabled on %.%', 'public', tbl.tablename;
    END IF;

    -- Check at least 4 policies exist (SELECT, INSERT, UPDATE, DELETE)
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = tbl.tablename;

    IF policy_count < 4 THEN
      RAISE WARNING 'Table % has only % policies (expected 4+)', tbl.tablename, policy_count;
    END IF;
  END LOOP;

  RAISE NOTICE '✅ RLS verification complete: all tables protected';
END $$;

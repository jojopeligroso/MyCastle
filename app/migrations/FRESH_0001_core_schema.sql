-- ============================================================================
-- MyCastle Fresh Schema Migration 0001
-- Core Tables: Tenants, Users, Multi-Role Support, Agencies
-- Date: 2026-01-13
-- Ref: /docs/FRESH_SCHEMA_DESIGN.md
-- ============================================================================

-- Drop existing tables if doing fresh start
-- WARNING: This will delete all data!
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS class_enrollments CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS class_sessions CASCADE;
DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS accommodation CASCADE;
DROP TABLE IF EXISTS booking CASCADE;
DROP TABLE IF EXISTS learner CASCADE;
DROP TABLE IF EXISTS admin_user CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS agencies CASCADE;
DROP TABLE IF EXISTS accommodation_types CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS programmes CASCADE;
DROP TABLE IF EXISTS course CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- Drop existing types
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS booking_status CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;

-- ============================================================================
-- PART 1: Core Tables
-- ============================================================================

-- Tenants (Multi-tenancy support)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(63) UNIQUE,
  contact_email VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_tenants_status ON tenants(status);

-- Users (Base table for all people in the system)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  auth_id UUID UNIQUE, -- Supabase Auth ID
  email VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  date_of_birth DATE,
  nationality VARCHAR(100),
  avatar_url VARCHAR(500),
  primary_role VARCHAR(50) NOT NULL DEFAULT 'student' CHECK (primary_role IN ('student', 'teacher', 'admin', 'super_admin')),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  last_login TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE UNIQUE INDEX idx_users_tenant_email ON users(tenant_id, email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_primary_role ON users(primary_role);
CREATE INDEX idx_users_status ON users(status);

-- User Roles (Multi-role support junction table)
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'teacher', 'admin', 'super_admin')),
  granted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  granted_by UUID REFERENCES users(id),
  revoked_at TIMESTAMP,
  revoked_by UUID REFERENCES users(id)
);

CREATE UNIQUE INDEX idx_user_roles_active ON user_roles(user_id, tenant_id, role) WHERE revoked_at IS NULL;
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_tenant ON user_roles(tenant_id);

-- Agencies (Sales source tracking)
CREATE TABLE agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  commission_rate DECIMAL(5, 2), -- Percentage (e.g., 15.50 for 15.5%)
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_agencies_tenant_name ON agencies(tenant_id, name);
CREATE INDEX idx_agencies_status ON agencies(tenant_id, status);

-- ============================================================================
-- PART 2: Academic Catalog
-- ============================================================================

-- Courses (Course offerings catalog)
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  description TEXT,
  level VARCHAR(10), -- A1, A2, B1, B2, C1, C2
  hours_per_week INTEGER,
  price_per_week_eur DECIMAL(10, 2),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_courses_tenant ON courses(tenant_id);
CREATE INDEX idx_courses_status ON courses(tenant_id, status);
CREATE INDEX idx_courses_level ON courses(level);

-- Accommodation Types (Accommodation options catalog)
CREATE TABLE accommodation_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL, -- Host Family, Residence, Student House, etc.
  description TEXT,
  price_per_week_eur DECIMAL(10, 2),
  deposit_eur DECIMAL(10, 2),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_accommodation_types_tenant_name ON accommodation_types(tenant_id, name);
CREATE INDEX idx_accommodation_types_status ON accommodation_types(tenant_id, status);

-- ============================================================================
-- PART 3: Students
-- ============================================================================

-- Students (Student-specific data extending users)
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_number VARCHAR(50), -- School-assigned student ID
  is_visa_student BOOLEAN DEFAULT FALSE, -- 'v' flag from business logic
  visa_type VARCHAR(50), -- First Time / Renewal 1 / Renewal 2
  visa_expiry_date DATE,
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(50),
  emergency_contact_relationship VARCHAR(100),
  medical_conditions TEXT,
  dietary_requirements TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'graduated', 'withdrawn', 'suspended')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_students_tenant_number ON students(tenant_id, student_number) WHERE student_number IS NOT NULL;
CREATE INDEX idx_students_user ON students(user_id);
CREATE INDEX idx_students_tenant ON students(tenant_id);
CREATE INDEX idx_students_visa ON students(tenant_id, is_visa_student);
CREATE INDEX idx_students_visa_expiry ON students(visa_expiry_date) WHERE visa_expiry_date IS NOT NULL;

-- ============================================================================
-- PART 4: Bookings & Payments
-- ============================================================================

-- Bookings (Core business transaction record)
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_number VARCHAR(50) UNIQUE NOT NULL,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Student Information
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,

  -- Booked By (Proxy booking support)
  booked_by_user_id UUID REFERENCES users(id),
  booked_by_name VARCHAR(255),
  booked_by_email VARCHAR(255),
  booked_by_phone VARCHAR(50),

  -- Source
  agency_id UUID REFERENCES agencies(id), -- NULL = Direct

  -- Course Details
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  weeks INTEGER NOT NULL CHECK (weeks > 0),
  course_start_date DATE NOT NULL,
  course_end_date DATE NOT NULL,
  placement_test_score VARCHAR(50),
  assigned_level VARCHAR(10), -- Actual level/class assigned

  -- Accommodation Details (nullable)
  accommodation_type_id UUID REFERENCES accommodation_types(id),
  accommodation_start_date DATE,
  accommodation_end_date DATE,

  -- Financial Breakdown (all in EUR)
  course_fee_eur DECIMAL(10, 2) NOT NULL DEFAULT 0,
  accommodation_fee_eur DECIMAL(10, 2) NOT NULL DEFAULT 0,
  transfer_fee_eur DECIMAL(10, 2) NOT NULL DEFAULT 0,
  exam_fee_eur DECIMAL(10, 2) NOT NULL DEFAULT 0,
  registration_fee_eur DECIMAL(10, 2) NOT NULL DEFAULT 0,
  learner_protection_fee_eur DECIMAL(10, 2) NOT NULL DEFAULT 0,
  medical_insurance_fee_eur DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_booking_eur DECIMAL(10, 2) NOT NULL DEFAULT 0,

  -- Payment Tracking
  deposit_paid_eur DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_paid_eur DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_due_eur DECIMAL(10, 2) GENERATED ALWAYS AS (total_booking_eur - total_paid_eur) STORED,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled')),

  -- Metadata
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMP,
  cancelled_by UUID REFERENCES users(id),
  cancellation_reason TEXT
);

CREATE UNIQUE INDEX idx_bookings_number ON bookings(booking_number);
CREATE INDEX idx_bookings_tenant ON bookings(tenant_id);
CREATE INDEX idx_bookings_student ON bookings(student_id);
CREATE INDEX idx_bookings_sale_date ON bookings(tenant_id, sale_date DESC);
CREATE INDEX idx_bookings_status ON bookings(tenant_id, status);
CREATE INDEX idx_bookings_dates ON bookings(course_start_date, course_end_date);
CREATE INDEX idx_bookings_outstanding ON bookings(tenant_id, total_due_eur) WHERE total_due_eur > 0;

-- Payments (Payment history)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_eur DECIMAL(10, 2) NOT NULL CHECK (amount_eur > 0),
  payment_method VARCHAR(50) NOT NULL, -- Cash, Card, Bank Transfer, etc.
  reference_number VARCHAR(255),
  received_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_tenant_date ON payments(tenant_id, payment_date DESC);
CREATE INDEX idx_payments_date ON payments(payment_date DESC);

-- ============================================================================
-- PART 5: Triggers
-- ============================================================================

-- Function to update booking total_paid when payment changes
CREATE OR REPLACE FUNCTION update_booking_total_paid()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate total_paid for the affected booking
  UPDATE bookings
  SET total_paid_eur = (
    SELECT COALESCE(SUM(amount_eur), 0)
    FROM payments
    WHERE booking_id = COALESCE(NEW.booking_id, OLD.booking_id)
  ),
  updated_at = NOW()
  WHERE id = COALESCE(NEW.booking_id, OLD.booking_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger on payments INSERT/UPDATE/DELETE
CREATE TRIGGER trigger_update_booking_total_paid
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_booking_total_paid();

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER trigger_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_agencies_updated_at BEFORE UPDATE ON agencies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_accommodation_types_updated_at BEFORE UPDATE ON accommodation_types FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- PART 6: Row-Level Security (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE accommodation_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy (applied to all tenant-scoped tables)
-- Note: This assumes app.tenant_id is set in session
CREATE POLICY tenant_isolation_tenants ON tenants
  USING (id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_users ON users
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_user_roles ON user_roles
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_agencies ON agencies
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_courses ON courses
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_accommodation_types ON accommodation_types
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_students ON students
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_bookings ON bookings
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_payments ON payments
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================================
-- PART 7: Comments (Documentation)
-- ============================================================================

COMMENT ON TABLE tenants IS 'Multi-tenancy support for school branches/franchises';
COMMENT ON TABLE users IS 'Base table for all people in the system (students, teachers, admins)';
COMMENT ON TABLE user_roles IS 'Junction table enabling multi-role support per user';
COMMENT ON TABLE agencies IS 'Sales agencies and direct sales tracking';
COMMENT ON TABLE courses IS 'Course catalog - offerings available for booking';
COMMENT ON TABLE accommodation_types IS 'Accommodation options catalog';
COMMENT ON TABLE students IS 'Student-specific data extending users table';
COMMENT ON TABLE bookings IS 'Core business transaction - student enrollment with financial tracking';
COMMENT ON TABLE payments IS 'Payment history against bookings';

COMMENT ON COLUMN users.primary_role IS 'Default role for UI display when user has multiple roles';
COMMENT ON COLUMN students.is_visa_student IS 'True for Stamp 2 visa students (Ireland-specific)';
COMMENT ON COLUMN students.visa_type IS 'First Time, Renewal 1, or Renewal 2 (Ireland Stamp 2 visas)';
COMMENT ON COLUMN bookings.total_due_eur IS 'Auto-calculated: total_booking_eur - total_paid_eur';
COMMENT ON COLUMN payments.received_by IS 'Staff member who recorded the payment';

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration FRESH_0001 completed successfully!';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run FRESH_0002_seed_data.sql to populate default data';
  RAISE NOTICE '2. Update Drizzle schema definitions';
  RAISE NOTICE '3. Test admin UI';
END $$;

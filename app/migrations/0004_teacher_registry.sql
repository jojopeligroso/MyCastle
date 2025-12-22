-- Migration 0004: Teacher Registry
-- Teacher management with qualifications, permissions, and availability tracking
-- Supports Trust-ED programme and ILEP compliance requirements
-- User Story: Admin needs to manage teacher profiles and track availability

-- ============================================================================
-- PART 1: Teacher Profile Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Employment Details
  employee_number VARCHAR(50),
  employment_type VARCHAR(50) NOT NULL DEFAULT 'full-time', -- full-time, part-time, contractor, substitute
  contract_start_date DATE NOT NULL,
  contract_end_date DATE,
  max_hours_per_week DECIMAL(5,2),
  hourly_rate DECIMAL(10,2),

  -- Work Authorization (for compliance)
  work_permit_required BOOLEAN DEFAULT FALSE,
  work_permit_number VARCHAR(100),
  work_permit_expiry DATE,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, on_leave, inactive, terminated

  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),

  CONSTRAINT unique_teacher_per_user UNIQUE (tenant_id, user_id),
  CONSTRAINT unique_employee_number UNIQUE (tenant_id, employee_number)
);

CREATE INDEX idx_teachers_tenant ON teachers(tenant_id);
CREATE INDEX idx_teachers_user ON teachers(user_id);
CREATE INDEX idx_teachers_status ON teachers(status);
CREATE INDEX idx_teachers_work_permit_expiry ON teachers(work_permit_expiry) WHERE work_permit_required = TRUE;

COMMENT ON TABLE teachers IS 'Teacher profiles with employment and work authorization details';
COMMENT ON COLUMN teachers.work_permit_expiry IS 'Alert when approaching expiry for ILEP compliance';

-- ============================================================================
-- PART 2: Teacher Qualifications (for Trust-ED and ILEP compliance)
-- ============================================================================

CREATE TABLE IF NOT EXISTS teacher_qualifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,

  -- Qualification Details
  qualification_type VARCHAR(100) NOT NULL, -- CELTA, DELTA, TEFL, TESL, Degree, Masters, PhD, etc.
  qualification_name VARCHAR(255) NOT NULL,
  institution VARCHAR(255),
  country VARCHAR(100),
  date_obtained DATE NOT NULL,
  expiry_date DATE, -- Some certifications expire

  -- Evidence & Verification (for compliance audits)
  document_url VARCHAR(500), -- S3 path or file reference
  document_type VARCHAR(50), -- certificate, transcript, license
  verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMP,
  verification_notes TEXT,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, expired, revoked

  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  CONSTRAINT check_expiry_after_obtained CHECK (expiry_date IS NULL OR expiry_date >= date_obtained)
);

CREATE INDEX idx_teacher_qualifications_tenant ON teacher_qualifications(tenant_id);
CREATE INDEX idx_teacher_qualifications_teacher ON teacher_qualifications(teacher_id);
CREATE INDEX idx_teacher_qualifications_expiry ON teacher_qualifications(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX idx_teacher_qualifications_verified ON teacher_qualifications(verified, status);

COMMENT ON TABLE teacher_qualifications IS 'Teacher qualifications and certifications for Trust-ED and ILEP compliance';
COMMENT ON COLUMN teacher_qualifications.verified IS 'Must be verified by admin for compliance reporting';

-- ============================================================================
-- PART 3: Teacher Permissions (what they can teach)
-- ============================================================================

CREATE TABLE IF NOT EXISTS teacher_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,

  -- Teaching Permissions
  can_teach_levels TEXT[] NOT NULL DEFAULT '{}', -- CEFR levels: A1, A2, B1, B2, C1, C2
  can_teach_subjects TEXT[] NOT NULL DEFAULT '{}', -- General English, IELTS, Business, Academic, etc.
  can_teach_online BOOLEAN DEFAULT TRUE,
  can_teach_onsite BOOLEAN DEFAULT TRUE,

  -- Restrictions
  max_students_per_class INTEGER,
  notes TEXT,

  -- Effective dates (allows temporal permissions)
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE,

  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  CONSTRAINT check_effective_dates CHECK (effective_until IS NULL OR effective_until >= effective_from)
);

CREATE INDEX idx_teacher_permissions_tenant ON teacher_permissions(tenant_id);
CREATE INDEX idx_teacher_permissions_teacher ON teacher_permissions(teacher_id);
CREATE INDEX idx_teacher_permissions_effective ON teacher_permissions(effective_from, effective_until);

COMMENT ON TABLE teacher_permissions IS 'Defines what levels and subjects each teacher is authorized to teach';

-- ============================================================================
-- PART 4: Teacher Availability
-- ============================================================================

CREATE TABLE IF NOT EXISTS teacher_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,

  -- Availability Details
  availability_type VARCHAR(50) NOT NULL, -- recurring, one-off, unavailable
  day_of_week INTEGER, -- 0 = Sunday, 6 = Saturday (for recurring)
  specific_date DATE, -- For one-off availability or unavailability
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  -- Temporal validity (allows future availability changes)
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE,

  -- Metadata
  reason VARCHAR(255), -- For unavailability: "Holiday", "Sick Leave", "Training", etc.
  notes TEXT,

  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  CONSTRAINT check_availability_time CHECK (end_time > start_time),
  CONSTRAINT check_effective_dates CHECK (effective_until IS NULL OR effective_until >= effective_from),
  CONSTRAINT check_day_of_week CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6)),
  CONSTRAINT check_recurring_needs_day CHECK (
    (availability_type = 'recurring' AND day_of_week IS NOT NULL AND specific_date IS NULL) OR
    (availability_type != 'recurring' AND specific_date IS NOT NULL AND day_of_week IS NULL)
  )
);

CREATE INDEX idx_teacher_availability_tenant ON teacher_availability(tenant_id);
CREATE INDEX idx_teacher_availability_teacher ON teacher_availability(teacher_id);
CREATE INDEX idx_teacher_availability_day ON teacher_availability(day_of_week) WHERE availability_type = 'recurring';
CREATE INDEX idx_teacher_availability_date ON teacher_availability(specific_date) WHERE availability_type != 'recurring';
CREATE INDEX idx_teacher_availability_effective ON teacher_availability(effective_from, effective_until);

COMMENT ON TABLE teacher_availability IS 'Teacher availability schedule for conflict detection and timetabling';
COMMENT ON COLUMN teacher_availability.availability_type IS 'recurring: weekly pattern, one-off: specific date available, unavailable: specific date unavailable';

-- ============================================================================
-- PART 5: Enable Row Level Security
-- ============================================================================

ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_availability ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Tenant Isolation
CREATE POLICY tenant_isolation_teachers ON teachers
  FOR ALL
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation_teacher_qualifications ON teacher_qualifications
  FOR ALL
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation_teacher_permissions ON teacher_permissions
  FOR ALL
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation_teacher_availability ON teacher_availability
  FOR ALL
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE));

-- ============================================================================
-- PART 6: Triggers for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER teachers_updated_at
  BEFORE UPDATE ON teachers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER teacher_qualifications_updated_at
  BEFORE UPDATE ON teacher_qualifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER teacher_permissions_updated_at
  BEFORE UPDATE ON teacher_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER teacher_availability_updated_at
  BEFORE UPDATE ON teacher_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

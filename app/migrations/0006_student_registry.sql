-- Migration 0006: Student Registry
-- Student management with visa compliance, document tracking, and safeguarding
-- User Story: Admin needs to manage student profiles for visa compliance and academic tracking

-- ============================================================================
-- PART 1: Student Profile Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Personal Details
  student_number VARCHAR(50),
  date_of_birth DATE,
  nationality VARCHAR(100),
  passport_number VARCHAR(100),

  -- Contact Details (in addition to user table)
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(50),
  emergency_contact_relationship VARCHAR(100),

  -- Address
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),

  -- Visa & Immigration
  visa_type VARCHAR(100), -- Stamp 2, Tourist, etc.
  visa_number VARCHAR(100),
  visa_expiry_date DATE,
  ilr_status BOOLEAN DEFAULT FALSE, -- Indefinite Leave to Remain

  -- Academic
  current_level VARCHAR(10), -- CEFR level: A1, A2, B1, B2, C1, C2
  intake_date DATE,
  expected_completion_date DATE,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, on_leave, withdrawn, completed
  withdrawal_reason TEXT,
  withdrawal_date DATE,

  -- Tags (for filtering and grouping)
  tags TEXT[] DEFAULT '{}',

  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),

  CONSTRAINT unique_student_per_user UNIQUE (tenant_id, user_id),
  CONSTRAINT unique_student_number UNIQUE (tenant_id, student_number)
);

CREATE INDEX idx_students_tenant ON students(tenant_id);
CREATE INDEX idx_students_user ON students(user_id);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_visa_expiry ON students(visa_expiry_date) WHERE visa_expiry_date IS NOT NULL;
CREATE INDEX idx_students_current_level ON students(current_level);
CREATE INDEX idx_students_tags ON students USING GIN(tags);

COMMENT ON TABLE students IS 'Student profiles with visa compliance and academic tracking';
COMMENT ON COLUMN students.visa_expiry_date IS 'Alert when approaching expiry for visa compliance';

-- ============================================================================
-- PART 2: Student Documents
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  -- Document Details
  document_type VARCHAR(100) NOT NULL, -- passport, visa, certificate, transcript, etc.
  document_name VARCHAR(255) NOT NULL,
  document_url VARCHAR(500) NOT NULL, -- S3 path or file reference
  file_size INTEGER, -- in bytes
  mime_type VARCHAR(100),

  -- Metadata
  expiry_date DATE,
  issue_date DATE,
  issuing_authority VARCHAR(255),

  -- Verification
  verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMP,

  -- Access Control
  visibility VARCHAR(50) NOT NULL DEFAULT 'admin', -- admin, teacher, student, parent

  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  CONSTRAINT check_expiry_after_issue CHECK (expiry_date IS NULL OR issue_date IS NULL OR expiry_date >= issue_date)
);

CREATE INDEX idx_student_documents_tenant ON student_documents(tenant_id);
CREATE INDEX idx_student_documents_student ON student_documents(student_id);
CREATE INDEX idx_student_documents_type ON student_documents(document_type);
CREATE INDEX idx_student_documents_expiry ON student_documents(expiry_date) WHERE expiry_date IS NOT NULL;

COMMENT ON TABLE student_documents IS 'Student document storage with expiry tracking and verification';

-- ============================================================================
-- PART 3: Student Notes (Safeguarding)
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  -- Note Details
  note_type VARCHAR(50) NOT NULL, -- general, safeguarding, academic, behavioral, medical
  note_title VARCHAR(255),
  note_content TEXT NOT NULL,

  -- Safeguarding Flag
  is_safeguarding BOOLEAN DEFAULT FALSE,

  -- Visibility (safeguarding notes have restricted access)
  visible_to_roles TEXT[] DEFAULT '{admin,super_admin}', -- Only certain roles can see safeguarding notes

  -- Follow-up
  requires_followup BOOLEAN DEFAULT FALSE,
  followup_date DATE,
  followup_completed BOOLEAN DEFAULT FALSE,

  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

CREATE INDEX idx_student_notes_tenant ON student_notes(tenant_id);
CREATE INDEX idx_student_notes_student ON student_notes(student_id);
CREATE INDEX idx_student_notes_type ON student_notes(note_type);
CREATE INDEX idx_student_notes_safeguarding ON student_notes(is_safeguarding);
CREATE INDEX idx_student_notes_followup ON student_notes(requires_followup, followup_date) WHERE requires_followup = TRUE;

COMMENT ON TABLE student_notes IS 'Student notes with safeguarding protection and access control';
COMMENT ON COLUMN student_notes.is_safeguarding IS 'Safeguarding notes have restricted visibility';

-- ============================================================================
-- PART 4: Student Emergency Contacts (Additional)
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  -- Contact Details
  name VARCHAR(255) NOT NULL,
  relationship VARCHAR(100) NOT NULL,
  phone_primary VARCHAR(50) NOT NULL,
  phone_secondary VARCHAR(50),
  email VARCHAR(255),

  -- Priority
  priority INTEGER DEFAULT 1, -- 1 = primary, 2 = secondary, etc.

  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_student_emergency_contacts_tenant ON student_emergency_contacts(tenant_id);
CREATE INDEX idx_student_emergency_contacts_student ON student_emergency_contacts(student_id);
CREATE INDEX idx_student_emergency_contacts_priority ON student_emergency_contacts(student_id, priority);

COMMENT ON TABLE student_emergency_contacts IS 'Multiple emergency contacts per student with priority ordering';

-- ============================================================================
-- PART 5: Enable Row Level Security
-- ============================================================================

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_emergency_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Tenant Isolation
CREATE POLICY tenant_isolation_students ON students
  FOR ALL
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation_student_documents ON student_documents
  FOR ALL
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation_student_notes ON student_notes
  FOR ALL
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation_student_emergency_contacts ON student_emergency_contacts
  FOR ALL
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE));

-- ============================================================================
-- PART 6: Triggers for updated_at
-- ============================================================================

CREATE TRIGGER students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER student_documents_updated_at
  BEFORE UPDATE ON student_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER student_notes_updated_at
  BEFORE UPDATE ON student_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER student_emergency_contacts_updated_at
  BEFORE UPDATE ON student_emergency_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

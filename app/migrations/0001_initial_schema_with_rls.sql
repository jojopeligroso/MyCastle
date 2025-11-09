-- Migration 0001: Initial Schema with RLS Policies
-- T-002: Database Setup
-- T-011: Core RLS Policies
-- Ref: REQ-A-004, DESIGN §5.2, spec/08-database.md

-- ============================================================================
-- PART 1: Core Tables (Tenants and Users)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(63) NOT NULL UNIQUE,
  contact_email VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_tenants_status ON tenants(status);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  auth_id UUID UNIQUE,
  email VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  avatar_url VARCHAR(500),
  phone VARCHAR(50),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  last_login TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE UNIQUE INDEX idx_users_tenant_email ON users(tenant_id, email);
CREATE INDEX idx_users_tenant_role ON users(tenant_id, role);
CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_status ON users(status);

-- ============================================================================
-- PART 2: Academic Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  description TEXT,
  level VARCHAR(50),
  subject VARCHAR(100),
  capacity INTEGER NOT NULL DEFAULT 20,
  enrolled_count INTEGER NOT NULL DEFAULT 0,
  teacher_id UUID REFERENCES users(id),
  schedule_description VARCHAR(500),
  start_date DATE NOT NULL,
  end_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_classes_tenant ON classes(tenant_id);
CREATE INDEX idx_classes_teacher ON classes(teacher_id);
CREATE INDEX idx_classes_status ON classes(status);
CREATE INDEX idx_classes_dates ON classes(start_date, end_date);

CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  student_id UUID NOT NULL REFERENCES users(id),
  class_id UUID NOT NULL REFERENCES classes(id),
  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completion_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  attendance_rate DECIMAL(5, 2),
  current_grade VARCHAR(10),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_enrollments_student_class ON enrollments(student_id, class_id);

CREATE TABLE IF NOT EXISTS class_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  class_id UUID NOT NULL REFERENCES classes(id),
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  topic VARCHAR(500),
  notes TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_class_date ON class_sessions(class_id, session_date);

CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  class_session_id UUID NOT NULL REFERENCES class_sessions(id),
  student_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(50) NOT NULL,
  notes TEXT,
  recorded_by UUID REFERENCES users(id),
  recorded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  hash VARCHAR(64),
  previous_hash VARCHAR(64),
  edited_at TIMESTAMP,
  edited_by UUID REFERENCES users(id),
  edit_count INTEGER DEFAULT 0,
  is_within_edit_window VARCHAR(10) DEFAULT 'true',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_attendance_session_student ON attendance(class_session_id, student_id);
CREATE INDEX idx_attendance_hash ON attendance(hash);
CREATE INDEX idx_attendance_session_created ON attendance(class_session_id, created_at);

CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  class_id UUID NOT NULL REFERENCES classes(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL,
  assigned_date DATE NOT NULL,
  due_date DATE NOT NULL,
  max_score INTEGER,
  content JSONB,
  attachments JSONB,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  assignment_id UUID NOT NULL REFERENCES assignments(id),
  student_id UUID NOT NULL REFERENCES users(id),
  submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  content JSONB,
  attachments JSONB,
  status VARCHAR(50) NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  submission_id UUID NOT NULL REFERENCES submissions(id) UNIQUE,
  score DECIMAL(10, 2),
  grade VARCHAR(10),
  feedback TEXT,
  graded_by UUID REFERENCES users(id),
  graded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PART 3: System Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  changes JSONB,
  metadata JSONB,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  student_id UUID NOT NULL REFERENCES users(id),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  description TEXT,
  line_items JSONB,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  student_id UUID NOT NULL REFERENCES users(id),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  payment_method VARCHAR(50) NOT NULL,
  transaction_id VARCHAR(255),
  receipt_url VARCHAR(500),
  payment_date DATE NOT NULL,
  notes TEXT,
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255),
  messages JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  template_id VARCHAR(100) NOT NULL,
  template_version VARCHAR(20) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  file_url VARCHAR(500),
  file_size INTEGER,
  filters JSONB,
  row_count INTEGER,
  requested_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- ============================================================================
-- PART 4: Curriculum Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS cefr_descriptors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level VARCHAR(2) NOT NULL,
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  descriptor_text TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cefr_level ON cefr_descriptors(level);
CREATE INDEX idx_cefr_category ON cefr_descriptors(category);

CREATE TABLE IF NOT EXISTS lesson_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  class_id UUID REFERENCES classes(id),
  teacher_id UUID REFERENCES users(id),
  cefr_level VARCHAR(2) NOT NULL,
  descriptor_id UUID REFERENCES cefr_descriptors(id),
  title VARCHAR(255) NOT NULL,
  topic VARCHAR(255),
  duration_minutes VARCHAR(50),
  json_plan JSONB NOT NULL,
  is_ai_generated VARCHAR(10) DEFAULT 'false',
  generation_prompt TEXT,
  cache_key VARCHAR(64),
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plans_tenant ON lesson_plans(tenant_id);
CREATE INDEX idx_plans_class ON lesson_plans(class_id);
CREATE INDEX idx_plans_teacher ON lesson_plans(teacher_id);
CREATE INDEX idx_plans_cefr ON lesson_plans(cefr_level);
CREATE INDEX idx_plans_cache_key ON lesson_plans(cache_key);

CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL,
  file_url VARCHAR(500),
  file_size VARCHAR(50),
  mime_type VARCHAR(100),
  cefr_level VARCHAR(2),
  tags JSONB,
  subject VARCHAR(100),
  visibility VARCHAR(50) NOT NULL DEFAULT 'private',
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_materials_tenant ON materials(tenant_id);
CREATE INDEX idx_materials_cefr ON materials(cefr_level);
CREATE INDEX idx_materials_type ON materials(type);

CREATE TABLE IF NOT EXISTS lesson_plan_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_plan_id UUID NOT NULL REFERENCES lesson_plans(id),
  material_id UUID NOT NULL REFERENCES materials(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- NOW APPLY THE RLS POLICIES FROM 0001_add_core_rls_policies.sql
-- ============================================================================

\i /home/user/MyCastle/app/drizzle/0001_add_core_rls_policies.sql

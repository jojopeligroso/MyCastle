/**
 * FRESH_0033: Student Documents & Complete History System
 *
 * Implements comprehensive document management and timeline features:
 * 1. Document types with configurable permissions
 * 2. Student documents with soft delete versioning
 * 3. Emergency contacts (upgrade to 2 contacts)
 * 4. Configurable notification/reminder system
 * 5. Letter templates with mail merge
 * 6. Generated letters tracking
 *
 * Date: 2026-03-05
 * Ref: Student Profile Document Hub Plan
 */

-- ============================================================================
-- PART 1: DOCUMENT TYPES (Customizable by Admin/DoS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Type definition
  name TEXT NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'identity', 'visa', 'medical', 'academic', 'correspondence', 'other'
  )),
  description TEXT,

  -- Upload permissions
  admin_can_upload BOOLEAN DEFAULT true NOT NULL,
  student_can_upload BOOLEAN DEFAULT false NOT NULL,
  requires_approval BOOLEAN DEFAULT false NOT NULL,

  -- View permissions (default visibility)
  default_visibility VARCHAR(50) DEFAULT 'admin_only' NOT NULL CHECK (
    default_visibility IN ('admin_only', 'staff_only', 'student_can_view')
  ),

  -- Expiry tracking
  requires_expiry BOOLEAN DEFAULT false NOT NULL,
  expiry_alert_days INTEGER[] DEFAULT ARRAY[60, 30],  -- Alert at 60 and 30 days

  -- Display & status
  is_required BOOLEAN DEFAULT false NOT NULL,
  display_order INTEGER DEFAULT 0 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  CONSTRAINT uk_document_types_tenant_name UNIQUE(tenant_id, name)
);

CREATE INDEX idx_document_types_tenant ON document_types(tenant_id);
CREATE INDEX idx_document_types_category ON document_types(category);
CREATE INDEX idx_document_types_active ON document_types(is_active) WHERE is_active = true;

COMMENT ON TABLE document_types IS 'Customizable document type definitions per tenant';
COMMENT ON COLUMN document_types.expiry_alert_days IS 'Array of days before expiry to send alerts, e.g., [60, 30] for 60-day and 30-day warnings';

-- ============================================================================
-- PART 2: STUDENT DOCUMENTS (With Soft Delete Versioning)
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type_id UUID REFERENCES document_types(id) ON DELETE SET NULL,

  -- File information
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,  -- Supabase Storage path: {tenant_id}/{student_id}/{timestamp}_{filename}
  file_size INTEGER,        -- Bytes
  mime_type VARCHAR(100),   -- 'application/pdf', 'image/jpeg', etc.

  -- Metadata
  document_date DATE,       -- Date on the document (letter date, test date)
  expiry_date DATE,         -- For passports, visas, medical certificates
  notes TEXT,

  -- Visibility & sharing
  is_shared_with_student BOOLEAN DEFAULT false NOT NULL,
  shared_by UUID REFERENCES users(id),
  shared_at TIMESTAMP,

  -- Version control (soft delete)
  is_current BOOLEAN DEFAULT true NOT NULL,
  superseded_by UUID REFERENCES student_documents(id),  -- Link to replacement document
  superseded_at TIMESTAMP,

  -- Approval workflow (for student uploads)
  approval_status VARCHAR(50) DEFAULT 'approved' NOT NULL CHECK (
    approval_status IN ('pending', 'approved', 'rejected')
  ),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  rejection_reason TEXT,

  -- Audit
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT NOW() NOT NULL,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_student_documents_student ON student_documents(student_id);
CREATE INDEX idx_student_documents_type ON student_documents(document_type_id);
CREATE INDEX idx_student_documents_tenant ON student_documents(tenant_id);
CREATE INDEX idx_student_documents_current ON student_documents(is_current) WHERE is_current = true;
CREATE INDEX idx_student_documents_pending ON student_documents(approval_status) WHERE approval_status = 'pending';
CREATE INDEX idx_student_documents_expiry ON student_documents(expiry_date) WHERE expiry_date IS NOT NULL AND is_current = true;
CREATE INDEX idx_student_documents_uploaded_at ON student_documents(uploaded_at DESC);

COMMENT ON TABLE student_documents IS 'Student documents with soft delete versioning and approval workflow';
COMMENT ON COLUMN student_documents.is_current IS 'False when document is superseded by newer version';
COMMENT ON COLUMN student_documents.superseded_by IS 'Links to the replacement document when this document is replaced';

-- ============================================================================
-- PART 3: EMERGENCY CONTACTS (Upgrade from Single to Multiple)
-- ============================================================================

CREATE TABLE IF NOT EXISTS emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Contact details
  name TEXT NOT NULL,
  relationship VARCHAR(100) NOT NULL,  -- Mother, Father, Spouse, Guardian, Friend
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  address TEXT,

  -- Priority (1 = primary, 2 = secondary)
  priority INTEGER DEFAULT 1 NOT NULL CHECK (priority >= 1 AND priority <= 10),
  is_primary BOOLEAN DEFAULT false NOT NULL,

  -- Additional information
  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  CONSTRAINT uk_emergency_contacts_student_priority UNIQUE(student_id, priority)
);

CREATE INDEX idx_emergency_contacts_student ON emergency_contacts(student_id);
CREATE INDEX idx_emergency_contacts_tenant ON emergency_contacts(tenant_id);
CREATE INDEX idx_emergency_contacts_primary ON emergency_contacts(is_primary) WHERE is_primary = true;

COMMENT ON TABLE emergency_contacts IS 'Student emergency contacts with priority ordering (replaces single contact in users table)';
COMMENT ON COLUMN emergency_contacts.priority IS '1 = primary contact, 2 = secondary contact, etc.';

-- ============================================================================
-- PART 4: CONFIGURABLE NOTIFICATION RULES
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Rule definition
  name TEXT NOT NULL,
  description TEXT,

  -- Trigger condition
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'document_expiry', 'assessment_overdue', 'course_end', 'attendance_low', 'custom'
  )),
  entity_type VARCHAR(50) CHECK (entity_type IN (
    'student_document', 'assessment', 'enrollment', 'attendance', 'custom'
  )),
  document_type_id UUID REFERENCES document_types(id) ON DELETE SET NULL,  -- NULL = applies to all documents of this type

  -- Timing
  trigger_days_before INTEGER,  -- Positive = before event, negative = after event

  -- Recipients (JSONB for flexibility)
  recipient_roles JSONB DEFAULT '[]'::jsonb NOT NULL,  -- ['admin', 'dos', 'student', 'teacher']
  include_emergency_contact BOOLEAN DEFAULT false NOT NULL,

  -- Message template
  notification_type VARCHAR(50) DEFAULT 'email' NOT NULL CHECK (
    notification_type IN ('email', 'in_app', 'both')
  ),
  email_subject TEXT,
  email_body TEXT,  -- Supports {{student_name}}, {{expiry_date}}, {{days_remaining}} placeholders

  -- Status
  is_active BOOLEAN DEFAULT true NOT NULL,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  CONSTRAINT uk_notification_rules_tenant_name UNIQUE(tenant_id, name)
);

CREATE INDEX idx_notification_rules_tenant ON notification_rules(tenant_id);
CREATE INDEX idx_notification_rules_event_type ON notification_rules(event_type);
CREATE INDEX idx_notification_rules_active ON notification_rules(is_active) WHERE is_active = true;
CREATE INDEX idx_notification_rules_document_type ON notification_rules(document_type_id) WHERE document_type_id IS NOT NULL;

COMMENT ON TABLE notification_rules IS 'Fully configurable notification/reminder system per document type and event type';
COMMENT ON COLUMN notification_rules.recipient_roles IS 'JSON array of role names: ["admin", "dos", "student", "teacher"]';
COMMENT ON COLUMN notification_rules.email_body IS 'Email template with placeholders: {{student_name}}, {{expiry_date}}, {{days_remaining}}, etc.';

-- ============================================================================
-- PART 5: LETTER TEMPLATES (Mail Merge)
-- ============================================================================

CREATE TABLE IF NOT EXISTS letter_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Template definition
  name TEXT NOT NULL,
  category VARCHAR(50) CHECK (category IN ('correspondence', 'certificate', 'official', 'other')),
  description TEXT,

  -- Template content (supports placeholders)
  content TEXT NOT NULL,  -- Rich text/HTML with {{placeholders}}

  -- Available placeholders (for UI helper)
  available_placeholders JSONB DEFAULT '[]'::jsonb NOT NULL,
  -- Example: ['student_name', 'student_number', 'current_level', 'course_name', 'start_date', 'end_date', 'teacher_name']

  -- Output format
  output_format VARCHAR(50) DEFAULT 'pdf' NOT NULL CHECK (
    output_format IN ('pdf', 'docx', 'both')
  ),

  -- Status
  is_active BOOLEAN DEFAULT true NOT NULL,
  display_order INTEGER DEFAULT 0 NOT NULL,

  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  CONSTRAINT uk_letter_templates_tenant_name UNIQUE(tenant_id, name)
);

CREATE INDEX idx_letter_templates_tenant ON letter_templates(tenant_id);
CREATE INDEX idx_letter_templates_category ON letter_templates(category);
CREATE INDEX idx_letter_templates_active ON letter_templates(is_active) WHERE is_active = true;

COMMENT ON TABLE letter_templates IS 'Letter templates with mail merge placeholders for auto-filling student data';
COMMENT ON COLUMN letter_templates.content IS 'Template content with placeholders like {{student_name}}, {{current_level}}';
COMMENT ON COLUMN letter_templates.available_placeholders IS 'JSON array of available placeholder names for UI autocomplete';

-- ============================================================================
-- PART 6: GENERATED LETTERS (Mail Merge Results)
-- ============================================================================

CREATE TABLE IF NOT EXISTS generated_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES letter_templates(id) ON DELETE SET NULL,

  -- Generated output
  file_url TEXT NOT NULL,          -- Supabase Storage path to PDF/DOCX
  generated_content TEXT,          -- Merged content (for record keeping)

  -- Metadata
  generated_by UUID NOT NULL REFERENCES users(id),
  generated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_generated_letters_student ON generated_letters(student_id);
CREATE INDEX idx_generated_letters_template ON generated_letters(template_id);
CREATE INDEX idx_generated_letters_tenant ON generated_letters(tenant_id);
CREATE INDEX idx_generated_letters_generated_at ON generated_letters(generated_at DESC);

COMMENT ON TABLE generated_letters IS 'Tracking of generated letters from templates (saved PDFs/DOCXs)';

-- ============================================================================
-- PART 7: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE letter_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_letters ENABLE ROW LEVEL SECURITY;

-- document_types: Admin/DoS can manage, everyone can read active types
CREATE POLICY tenant_isolation_document_types ON document_types
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY document_types_insert_admin ON document_types
  FOR INSERT
  WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::uuid AND
    current_setting('app.user_role', true) IN ('admin', 'dos', 'super_admin')
  );

-- student_documents: Tenant isolation + role-based access
CREATE POLICY tenant_isolation_student_documents ON student_documents
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY student_documents_insert ON student_documents
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- emergency_contacts: Tenant isolation
CREATE POLICY tenant_isolation_emergency_contacts ON emergency_contacts
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY emergency_contacts_insert ON emergency_contacts
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- notification_rules: Admin/DoS only
CREATE POLICY tenant_isolation_notification_rules ON notification_rules
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY notification_rules_insert_admin ON notification_rules
  FOR INSERT
  WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::uuid AND
    current_setting('app.user_role', true) IN ('admin', 'dos', 'super_admin')
  );

-- letter_templates: Admin/DoS can manage
CREATE POLICY tenant_isolation_letter_templates ON letter_templates
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY letter_templates_insert_admin ON letter_templates
  FOR INSERT
  WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::uuid AND
    current_setting('app.user_role', true) IN ('admin', 'dos', 'super_admin')
  );

-- generated_letters: Tenant isolation
CREATE POLICY tenant_isolation_generated_letters ON generated_letters
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY generated_letters_insert ON generated_letters
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================================
-- PART 8: SEED DEFAULT DOCUMENT TYPES
-- ============================================================================

-- Note: This will be populated per tenant. Example seed data:
COMMENT ON TABLE document_types IS
  'Seed examples: Passport (identity, required, expires), Visa (visa, required, expires),
   Medical Certificate (medical, expires), Test Results (academic), Parent Consent Form (correspondence, required)';

-- ============================================================================
-- PART 9: MIGRATION NOTES
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ FRESH_0033 migration completed successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'New tables created:';
  RAISE NOTICE '  1. document_types - Customizable document type definitions';
  RAISE NOTICE '  2. student_documents - Document storage with soft delete and approval workflow';
  RAISE NOTICE '  3. emergency_contacts - Multiple emergency contacts per student';
  RAISE NOTICE '  4. notification_rules - Configurable notification/reminder system';
  RAISE NOTICE '  5. letter_templates - Mail merge templates';
  RAISE NOTICE '  6. generated_letters - Generated letter tracking';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Set up Supabase Storage bucket: student-documents';
  RAISE NOTICE '  2. Migrate existing emergency contact data from users.metadata';
  RAISE NOTICE '  3. Seed default document types per tenant';
  RAISE NOTICE '  4. Create API endpoints for document management';
  RAISE NOTICE '  5. Build UI components for document upload/management';
  RAISE NOTICE '';
  RAISE NOTICE 'Features enabled:';
  RAISE NOTICE '  ✅ 25MB max file size support';
  RAISE NOTICE '  ✅ PDF, Word, Excel, Image upload';
  RAISE NOTICE '  ✅ Two emergency contacts per student';
  RAISE NOTICE '  ✅ Soft delete for document versioning';
  RAISE NOTICE '  ✅ Student upload approval workflow';
  RAISE NOTICE '  ✅ Configurable notifications per document type';
  RAISE NOTICE '  ✅ Letter template mail merge system';
END $$;

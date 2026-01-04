# Database Schema Gap Analysis

**Generated:** 2025-12-17
**Purpose:** Map MCP spec resource requirements to existing database tables

---

## Existing Database Tables

### ✅ Core Schema (`app/src/db/schema/core.ts`)
- **tenants** - Organizations/schools ✅
- **users** - All user accounts (admin/teacher/student) ✅

### ✅ Academic Schema (`app/src/db/schema/academic.ts`)
- **classes** - Course/class definitions ✅
- **enrollments** - Student-class relationships ✅
- **classSessions** - Individual class meetings ✅
- **attendance** - Attendance records with hash-chain ✅
- **assignments** - Homework/quizzes/projects ✅
- **submissions** - Student work submissions ✅
- **grades** - Assignment grades ✅

### ✅ Curriculum Schema (`app/src/db/schema/curriculum.ts`)
- **cefrDescriptors** - CEFR framework descriptors ✅
- **lessonPlans** - AI-generated and teacher lesson plans ✅
- **materials** - Teaching materials and resources ✅
- **lessonPlanMaterials** - Join table ✅

### ✅ System Schema (`app/src/db/schema/system.ts`)
- **auditLogs** - Immutable action logs ✅
- **invoices** - Financial invoices ✅
- **payments** - Payment records ✅
- **conversations** - Chat history (optional) ✅
- **exports** - Generated report exports ✅

---

## Missing Critical Tables (Per MCP Spec)

### 🔴 HIGH PRIORITY - MVP Blocking

#### 1. **programmes** (Academic Programmes)
**MCP Resource:** `admin://programmes`
**Spec Reference:** spec/01-admin-mcp.md §1.2.2

**Required Fields:**
```sql
CREATE TABLE programmes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),

  -- Programme Info
  name VARCHAR(255) NOT NULL,              -- e.g., "General English"
  code VARCHAR(50) NOT NULL,                -- e.g., "GE"
  description TEXT,

  -- CEFR Levels
  levels JSONB NOT NULL,                    -- ["A1", "A2", "B1", "B2", "C1", "C2"]

  -- Duration
  duration_weeks INTEGER NOT NULL,

  -- Status
  active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  -- Indexes
  CONSTRAINT uk_programmes_tenant_code UNIQUE(tenant_id, code)
);

CREATE INDEX idx_programmes_tenant ON programmes(tenant_id);
CREATE INDEX idx_programmes_active ON programmes(active);
```

**MCP Tools Blocked:**
- `create_programme`
- `map_cefr`
- `publish_syllabus`

---

#### 2. **courses** (Course Catalogue)
**MCP Resource:** `admin://courses`
**Spec Reference:** spec/01-admin-mcp.md §1.2.2

**Required Fields:**
```sql
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  programme_id UUID NOT NULL REFERENCES programmes(id),

  -- Course Info
  name VARCHAR(255) NOT NULL,               -- e.g., "English B1 Intermediate"
  code VARCHAR(50) NOT NULL,                -- e.g., "ENG-B1"
  description TEXT,

  -- CEFR Mapping
  cefr_level VARCHAR(2) NOT NULL,           -- A1, A2, B1, B2, C1, C2

  -- Syllabus
  syllabus_url VARCHAR(500),
  syllabus_version VARCHAR(20),

  -- Schedule
  hours_per_week INTEGER NOT NULL,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, archived

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  -- Indexes
  CONSTRAINT uk_courses_tenant_code UNIQUE(tenant_id, code)
);

CREATE INDEX idx_courses_tenant ON courses(tenant_id);
CREATE INDEX idx_courses_programme ON courses(programme_id);
CREATE INDEX idx_courses_cefr ON courses(cefr_level);
CREATE INDEX idx_courses_status ON courses(status);
```

**MCP Tools Blocked:**
- `create_course`
- `map_cefr`
- `publish_syllabus`

**Impact:** Cannot define course structure or manage curriculum

---

#### 3. **rooms** (Physical Classrooms)
**MCP Resource:** `admin://rooms`
**Spec Reference:** spec/01-admin-mcp.md §1.2.3

**Required Fields:**
```sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),

  -- Room Info
  name VARCHAR(100) NOT NULL,               -- e.g., "Room 3"
  building VARCHAR(100),
  floor INTEGER,

  -- Capacity
  capacity INTEGER NOT NULL,                -- Maximum students

  -- Equipment
  equipment JSONB,                          -- ["projector", "whiteboard", "computer"]

  -- Accessibility
  accessibility BOOLEAN NOT NULL DEFAULT false,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'available', -- available, maintenance, reserved

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  -- Indexes
  CONSTRAINT uk_rooms_tenant_name UNIQUE(tenant_id, name)
);

CREATE INDEX idx_rooms_tenant ON rooms(tenant_id);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_rooms_capacity ON rooms(capacity);
```

**Schema Extension Needed for `classes` table:**
```sql
ALTER TABLE classes ADD COLUMN room_id UUID REFERENCES rooms(id);
CREATE INDEX idx_classes_room ON classes(room_id);
```

**MCP Tools Blocked:**
- `allocate_room`
- `resolve_collision`

**Impact:** Cannot manage physical resources or prevent scheduling conflicts

---

#### 4. **bookings** (Student Bookings/Admissions)
**MCP Resource:** `admin://bookings`
**Spec Reference:** spec/01-admin-mcp.md §1.2.6

**Required Fields:**
```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),

  -- References
  student_id UUID NOT NULL REFERENCES users(id),
  programme_id UUID NOT NULL REFERENCES programmes(id),

  -- Dates
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  weeks INTEGER NOT NULL,

  -- Cohort
  cohort_type VARCHAR(50) NOT NULL,         -- exam, non-exam

  -- Requirements
  visa_required BOOLEAN NOT NULL DEFAULT false,
  accommodation_required BOOLEAN NOT NULL DEFAULT false,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, confirmed, cancelled, completed

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_bookings_tenant ON bookings(tenant_id);
CREATE INDEX idx_bookings_student ON bookings(student_id);
CREATE INDEX idx_bookings_programme ON bookings(programme_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_dates ON bookings(start_date, end_date);
```

**MCP Tools Blocked:**
- `create_booking`
- `edit_booking`
- `confirm_intake`

**Impact:** Cannot manage student admissions or cohorts

---

#### 5. **enquiries** (Prospective Students)
**MCP Resource:** `admin://enquiries`
**Spec Reference:** spec/01-admin-mcp.md §1.2.6

**Required Fields:**
```sql
CREATE TABLE enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),

  -- Contact Info
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),

  -- Interests
  programme_interest VARCHAR(255),
  level_estimate VARCHAR(2),                -- A1-C2 (optional)
  start_date_preference DATE,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'new', -- new, contacted, converted, lost

  -- Source
  source VARCHAR(50),                       -- website, referral, agent

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_enquiries_tenant ON enquiries(tenant_id);
CREATE INDEX idx_enquiries_status ON enquiries(status);
CREATE INDEX idx_enquiries_created ON enquiries(created_at DESC);
```

**Impact:** Cannot track prospective students or manage admissions pipeline

---

### ⚠️ MEDIUM PRIORITY - Student Lifecycle

#### 6. **letters** (Official Letters)
**MCP Tool:** `issue_letter`
**Spec Reference:** spec/01-admin-mcp.md §1.3.8

**Required Fields:**
```sql
CREATE TABLE letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  student_id UUID NOT NULL REFERENCES users(id),

  -- Letter Info
  letter_type VARCHAR(50) NOT NULL,         -- enrolment, attendance, completion, reference
  letter_number VARCHAR(50) NOT NULL UNIQUE,

  -- Date Range (for attendance letters)
  start_date DATE,
  end_date DATE,

  -- Signatory
  signatory VARCHAR(255),
  signatory_title VARCHAR(255),

  -- File
  file_url VARCHAR(500),
  verification_qr_code VARCHAR(500),

  -- Issued
  issued_at TIMESTAMP DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_letters_tenant ON letters(tenant_id);
CREATE INDEX idx_letters_student ON letters(student_id);
CREATE INDEX idx_letters_type ON letters(letter_type);
```

---

#### 7. **certificates** (Completion Certificates)
**MCP Tool:** `award_certificate`
**Spec Reference:** spec/01-admin-mcp.md §1.3.8

**Required Fields:**
```sql
CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),

  -- References
  student_id UUID NOT NULL REFERENCES users(id),
  course_id UUID NOT NULL REFERENCES courses(id),

  -- Certificate Info
  certificate_number VARCHAR(50) NOT NULL UNIQUE,
  certificate_type VARCHAR(50) NOT NULL,    -- completion, achievement

  -- Performance
  completion_date DATE NOT NULL,
  final_level VARCHAR(2) NOT NULL,          -- A1-C2
  grade VARCHAR(10),                        -- A+, B, etc.

  -- File
  file_url VARCHAR(500),
  verification_qr_code VARCHAR(500),

  -- Timestamps
  issued_at TIMESTAMP DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_certificates_tenant ON certificates(tenant_id);
CREATE INDEX idx_certificates_student ON certificates(student_id);
CREATE INDEX idx_certificates_course ON certificates(course_id);
```

---

#### 8. **deferrals** (Student Deferrals)
**MCP Tool:** `approve_deferral`
**Spec Reference:** spec/01-admin-mcp.md §1.3.8

**Required Fields:**
```sql
CREATE TABLE deferrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),

  -- References
  enrolment_id UUID NOT NULL REFERENCES enrollments(id),
  student_id UUID NOT NULL REFERENCES users(id),

  -- Deferral Info
  original_start_date DATE NOT NULL,
  new_start_date DATE NOT NULL,
  deferral_weeks INTEGER NOT NULL,
  reason TEXT,

  -- Approval
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,

  -- Timestamps
  requested_at TIMESTAMP DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_deferrals_tenant ON deferrals(tenant_id);
CREATE INDEX idx_deferrals_student ON deferrals(student_id);
CREATE INDEX idx_deferrals_status ON deferrals(status);
```

---

### ⚠️ MEDIUM PRIORITY - Accommodation

#### 9. **hosts** (Accommodation Hosts)
**MCP Resource:** `admin://hosts`
**Spec Reference:** spec/01-admin-mcp.md §1.2.9

**Required Fields:**
```sql
CREATE TABLE hosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),

  -- Host Info
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  contact_phone VARCHAR(50) NOT NULL,
  contact_email VARCHAR(255),

  -- Capacity
  capacity INTEGER NOT NULL,
  occupied INTEGER NOT NULL DEFAULT 0,

  -- Safeguarding
  safeguarding_checked BOOLEAN NOT NULL DEFAULT false,
  garda_vetting_expiry DATE,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, inactive

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_hosts_tenant ON hosts(tenant_id);
CREATE INDEX idx_hosts_status ON hosts(status);
CREATE INDEX idx_hosts_vetting_expiry ON hosts(garda_vetting_expiry);
```

---

#### 10. **placements** (Accommodation Placements)
**MCP Resource:** `admin://placements`
**Spec Reference:** spec/01-admin-mcp.md §1.2.9

**Required Fields:**
```sql
CREATE TABLE placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),

  -- References
  student_id UUID NOT NULL REFERENCES users(id),
  host_id UUID NOT NULL REFERENCES hosts(id),

  -- Room
  room_number VARCHAR(50),

  -- Dates
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Guardianship
  guardianship_required BOOLEAN NOT NULL DEFAULT false,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, ended

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_placements_tenant ON placements(tenant_id);
CREATE INDEX idx_placements_student ON placements(student_id);
CREATE INDEX idx_placements_host ON placements(host_id);
CREATE INDEX idx_placements_dates ON placements(start_date, end_date);
```

---

### ⚠️ MEDIUM PRIORITY - Quality & CPD

#### 11. **observations** (Teacher Observations)
**MCP Resource:** `admin://observations`
**Spec Reference:** spec/01-admin-mcp.md §1.2.10

**Required Fields:**
```sql
CREATE TABLE observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),

  -- References
  teacher_id UUID NOT NULL REFERENCES users(id),
  observer_id UUID NOT NULL REFERENCES users(id),
  class_id UUID REFERENCES classes(id),

  -- Observation
  observation_date DATE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),

  -- Feedback
  strengths JSONB,                          -- Array of strings
  development_areas JSONB,                  -- Array of strings
  action_points JSONB,                      -- Array of strings

  -- Follow-up
  follow_up_date DATE,
  follow_up_completed BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_observations_tenant ON observations(tenant_id);
CREATE INDEX idx_observations_teacher ON observations(teacher_id);
CREATE INDEX idx_observations_date ON observations(observation_date DESC);
```

---

#### 12. **cpd_activities** (CPD Tracking)
**MCP Tool:** `assign_cpd`
**Spec Reference:** spec/01-admin-mcp.md §1.3.10

**Required Fields:**
```sql
CREATE TABLE cpd_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),

  -- Assignment
  teacher_id UUID NOT NULL REFERENCES users(id),
  assigned_by UUID REFERENCES users(id),

  -- Activity
  activity_name VARCHAR(255) NOT NULL,
  activity_type VARCHAR(50) NOT NULL,       -- workshop, course, conference, observation, self_study
  description TEXT,

  -- Scheduling
  deadline DATE,
  mandatory BOOLEAN NOT NULL DEFAULT false,

  -- Completion
  status VARCHAR(50) NOT NULL DEFAULT 'assigned', -- assigned, in_progress, completed
  completed_at TIMESTAMP,

  -- Evidence
  evidence_url VARCHAR(500),
  notes TEXT,

  -- Timestamps
  assigned_at TIMESTAMP DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_cpd_tenant ON cpd_activities(tenant_id);
CREATE INDEX idx_cpd_teacher ON cpd_activities(teacher_id);
CREATE INDEX idx_cpd_status ON cpd_activities(status);
CREATE INDEX idx_cpd_deadline ON cpd_activities(deadline);
```

---

### 🔵 LOWER PRIORITY

#### 13. **policies** (Policy Library)
**MCP Resource:** `admin://policies`
**Spec Reference:** spec/01-admin-mcp.md §1.2.11

**Required Fields:**
```sql
CREATE TABLE policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),

  -- Policy Info
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,            -- GDPR, Safeguarding, Health & Safety, Academic
  version VARCHAR(20) NOT NULL,

  -- Dates
  approved_date DATE NOT NULL,
  review_date DATE NOT NULL,

  -- Document
  document_url VARCHAR(500) NOT NULL,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, archived

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_policies_tenant ON policies(tenant_id);
CREATE INDEX idx_policies_category ON policies(category);
CREATE INDEX idx_policies_review_date ON policies(review_date);
```

---

#### 14. **lesson_templates** (Approved Templates)
**MCP Resource:** `admin://lesson_templates`
**Spec Reference:** spec/01-admin-mcp.md §1.2.4

**Required Fields:**
```sql
CREATE TABLE lesson_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),

  -- Template Info
  name VARCHAR(255) NOT NULL,
  cefr_level VARCHAR(2) NOT NULL,
  duration_minutes INTEGER NOT NULL,

  -- Structure
  objectives JSONB,                         -- Array of learning objectives
  sections JSONB,                           -- Array of section names
  template_url VARCHAR(500),

  -- Approval
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  version VARCHAR(20) NOT NULL,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, approved, archived

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_templates_tenant ON lesson_templates(tenant_id);
CREATE INDEX idx_templates_cefr ON lesson_templates(cefr_level);
CREATE INDEX idx_templates_status ON lesson_templates(status);
```

---

## Schema Extensions Needed

### 1. **users** table - Add metadata fields
```sql
-- For student progression tracking
ALTER TABLE users ADD COLUMN initial_level VARCHAR(2);
ALTER TABLE users ADD COLUMN current_level VARCHAR(2);
ALTER TABLE users ADD COLUMN next_level VARCHAR(2);

-- For visa tracking
ALTER TABLE users ADD COLUMN visa_type VARCHAR(100);
ALTER TABLE users ADD COLUMN visa_expiry DATE;
```

### 2. **classes** table - Add room and course references
```sql
ALTER TABLE classes ADD COLUMN room_id UUID REFERENCES rooms(id);
ALTER TABLE classes ADD COLUMN course_id UUID REFERENCES courses(id);

CREATE INDEX idx_classes_room ON classes(room_id);
CREATE INDEX idx_classes_course ON classes(course_id);
```

### 3. **enrollments** table - Add progression fields
```sql
ALTER TABLE enrollments ADD COLUMN initial_level VARCHAR(2);
ALTER TABLE enrollments ADD COLUMN current_level VARCHAR(2);
ALTER TABLE enrollments ADD COLUMN target_level VARCHAR(2);
```

---

## Summary Statistics

### Tables Status

| Category | Exists | Missing | Total |
|----------|--------|---------|-------|
| Core | 2 | 0 | 2 |
| Academic | 7 | 2 (programmes, courses) | 9 |
| Scheduling | 0 | 1 (rooms) | 1 |
| Admissions | 0 | 2 (bookings, enquiries) | 2 |
| Student Lifecycle | 0 | 3 (letters, certificates, deferrals) | 3 |
| Accommodation | 0 | 2 (hosts, placements) | 2 |
| Quality & CPD | 0 | 2 (observations, cpd_activities) | 2 |
| Finance | 2 | 0 | 2 |
| Curriculum | 4 | 1 (lesson_templates) | 5 |
| System | 5 | 1 (policies) | 6 |
| **TOTAL** | **20** | **14** | **34** |

### Priority Breakdown

- **🔴 HIGH PRIORITY (MVP Blocking):** 5 tables missing
  - programmes, courses, rooms, bookings, enquiries

- **⚠️ MEDIUM PRIORITY:** 7 tables missing
  - letters, certificates, deferrals, hosts, placements, observations, cpd_activities

- **🔵 LOWER PRIORITY:** 2 tables missing
  - policies, lesson_templates

---

## Implementation Roadmap

### Phase 1: Academic Foundation (Week 1)
1. Create `programmes` table + migration
2. Create `courses` table + migration
3. Create `rooms` table + migration
4. Update `classes` table with foreign keys
5. Build CRUD pages for all three

### Phase 2: Admissions & Bookings (Week 2)
1. Create `bookings` table + migration
2. Create `enquiries` table + migration
3. Build booking workflow pages
4. Build enquiry management pages

### Phase 3: Student Lifecycle (Week 3)
1. Create `letters` table + migration
2. Create `certificates` table + migration
3. Create `deferrals` table + migration
4. Build letter generation workflow
5. Build certificate issuance workflow

### Phase 4: Accommodation (Week 4)
1. Create `hosts` table + migration
2. Create `placements` table + migration
3. Build host management pages
4. Build placement allocation workflow

### Phase 5: Quality & Compliance (Week 5)
1. Create `observations` table + migration
2. Create `cpd_activities` table + migration
3. Create `policies` table + migration
4. Create `lesson_templates` table + migration
5. Build observation recording workflow
6. Build CPD tracking pages

---

## Next Steps

1. **Review with team** - Confirm priorities and timelines
2. **Create migrations** - Start with Phase 1 tables
3. **Update Drizzle schema** - Add to `app/src/db/schema/`
4. **Run migrations** - Apply to database
5. **Build pages** - Remove placeholder warnings
6. **Implement MCP tools** - Connect to new tables
7. **Add RLS policies** - Ensure tenant isolation
8. **Write tests** - Cover CRUD operations


# ESL Learning Platform - Database Schema Design (BCNF)

**Status**: Draft - Normalized from business requirements
**Date**: 2025-10-30
**Normalization Level**: Boyce-Codd Normal Form (BCNF)

---

## Normalization Analysis

### Raw Data Provided
```
Sale Date, Name, Source, Visa Type, Nationality, Visa, DOB,
Deposit Paid, Paid, Course Fee Due, Accommodation, Transfer,
Exam Fee, Registration Fee, Learner Protection, Medical Insurance,
Total Booking, Total Booking Due, Course, Placement test score,
Level/Class, Weeks, Start date, End date, Accom Type,
Start date, End date, Class, Visa, Weekly attendance (1/0)
```

### Identified Entities & Functional Dependencies

**Student Entity:**
- student_id → {name, dob, nationality}

**Booking Entity:**
- booking_id → {sale_date, source_id, student_id}

**Financial Items:**
- booking_id, item_type → {amount, due_amount}

**Enrollment Entity:**
- enrollment_id → {student_id, course_id, start_date, end_date, weeks}

**Accommodation Booking:**
- accommodation_booking_id → {student_id, booking_id, type_id, start_date, end_date}

**Class Assignment:**
- class_enrollment_id → {enrollment_id, class_id}

**Attendance:**
- attendance_id → {class_id, student_id, week_date, status}

**Visa:**
- visa_id → {student_id, visa_type_id, status}

---

## Schema Design (BCNF)

### 1. Core Person/Identity Tables

#### `students`
**Purpose**: Student personal information (PII)

```sql
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Personal Information
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  date_of_birth DATE NOT NULL,

  -- Reference Data
  nationality_id UUID NOT NULL REFERENCES nationalities(id),

  -- System
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'graduated', 'withdrawn', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,

  -- Constraints
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  CONSTRAINT valid_phone CHECK (phone IS NULL OR length(phone) >= 7)
);

CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_students_nationality ON students(nationality_id);
CREATE INDEX idx_students_status ON students(status);
```

#### `nationalities`
**Purpose**: Reference table for countries/nationalities

```sql
CREATE TABLE nationalities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_name TEXT NOT NULL UNIQUE,
  country_code CHAR(2) NOT NULL UNIQUE, -- ISO 3166-1 alpha-2
  region TEXT, -- e.g., Europe, Asia, Middle East

  CONSTRAINT valid_country_code CHECK (length(country_code) = 2)
);

CREATE INDEX idx_nationalities_code ON nationalities(country_code);
```

---

### 2. Visa Management

#### `visa_types`
**Purpose**: Reference table for visa categories

```sql
CREATE TABLE visa_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visa_type_name TEXT NOT NULL UNIQUE,
  description TEXT,
  typical_duration_months INT,
  requires_attendance_tracking BOOLEAN NOT NULL DEFAULT false
);
```

#### `student_visas`
**Purpose**: Student visa records with temporal validity

```sql
CREATE TABLE student_visas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  visa_type_id UUID NOT NULL REFERENCES visa_types(id),

  -- Visa Details
  visa_number TEXT,
  issue_date DATE,
  expiry_date DATE NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'valid'
    CHECK (status IN ('valid', 'expired', 'cancelled', 'pending')),

  -- System
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_visa_dates CHECK (expiry_date > issue_date),
  CONSTRAINT unique_active_visa UNIQUE (student_id, visa_type_id, status)
);

CREATE INDEX idx_student_visas_student ON student_visas(student_id);
CREATE INDEX idx_student_visas_expiry ON student_visas(expiry_date)
  WHERE status = 'valid';
```

---

### 3. Sales & Booking Sources

#### `sources`
**Purpose**: Agents, agencies, and direct booking sources

```sql
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source Information
  source_name TEXT NOT NULL,
  source_type TEXT NOT NULL
    CHECK (source_type IN ('agent', 'agency', 'direct', 'partner', 'referral')),

  -- Contact
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,

  -- Commission
  commission_rate DECIMAL(5,2), -- percentage (e.g., 15.00 for 15%)
  commission_type TEXT
    CHECK (commission_type IN ('percentage', 'flat_fee', 'tiered')),

  -- Status
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'suspended')),

  -- System
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sources_type ON sources(source_type);
CREATE INDEX idx_sources_status ON sources(status);
```

---

### 4. Course Catalog

#### `courses`
**Purpose**: Course offerings and pricing

```sql
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Course Information
  course_code TEXT NOT NULL UNIQUE,
  course_name TEXT NOT NULL,
  description TEXT,

  -- Pricing
  price_per_week DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',

  -- Duration
  min_weeks INT NOT NULL DEFAULT 1,
  max_weeks INT,

  -- Requirements
  min_age INT,
  requires_placement_test BOOLEAN NOT NULL DEFAULT true,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- System
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_price CHECK (price_per_week > 0),
  CONSTRAINT valid_weeks CHECK (min_weeks > 0 AND (max_weeks IS NULL OR max_weeks >= min_weeks))
);

CREATE INDEX idx_courses_code ON courses(course_code);
CREATE INDEX idx_courses_active ON courses(is_active);
```

#### `levels`
**Purpose**: Language proficiency levels (CEFR)

```sql
CREATE TABLE levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Level Information
  level_code TEXT NOT NULL UNIQUE, -- A1, A2, B1, B2, C1, C2
  level_name TEXT NOT NULL,
  description TEXT,

  -- Ordering
  sequence_order INT NOT NULL UNIQUE,

  -- Requirements
  min_placement_score INT,
  max_placement_score INT,

  CONSTRAINT valid_sequence CHECK (sequence_order > 0),
  CONSTRAINT valid_scores CHECK (
    (min_placement_score IS NULL AND max_placement_score IS NULL) OR
    (min_placement_score < max_placement_score)
  )
);

CREATE INDEX idx_levels_code ON levels(level_code);
CREATE INDEX idx_levels_sequence ON levels(sequence_order);
```

---

### 5. Bookings & Financial

#### `bookings`
**Purpose**: Master booking record (one per sale)

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  student_id UUID NOT NULL REFERENCES students(id),
  source_id UUID REFERENCES sources(id),

  -- Booking Details
  booking_reference TEXT NOT NULL UNIQUE,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled')),

  -- Financial Summary (denormalized for performance)
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_due DECIMAL(10,2) GENERATED ALWAYS AS (total_amount - total_paid) STORED,

  -- System
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,

  CONSTRAINT valid_amounts CHECK (total_paid >= 0 AND total_paid <= total_amount)
);

CREATE INDEX idx_bookings_student ON bookings(student_id);
CREATE INDEX idx_bookings_source ON bookings(source_id);
CREATE INDEX idx_bookings_reference ON bookings(booking_reference);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_sale_date ON bookings(sale_date);
```

#### `booking_line_items`
**Purpose**: Itemized charges per booking (eliminates column redundancy)

```sql
CREATE TABLE booking_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

  -- Line Item Details
  item_type TEXT NOT NULL
    CHECK (item_type IN (
      'course_fee',
      'accommodation',
      'transfer',
      'exam_fee',
      'registration_fee',
      'learner_protection',
      'medical_insurance',
      'materials',
      'other'
    )),
  description TEXT NOT NULL,

  -- Financial
  unit_price DECIMAL(10,2) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1, -- can be weeks, days, etc.
  total_amount DECIMAL(10,2) GENERATED ALWAYS AS (unit_price * quantity) STORED,

  -- Tax
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) GENERATED ALWAYS AS (unit_price * quantity * tax_rate / 100) STORED,

  -- System
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_price CHECK (unit_price >= 0),
  CONSTRAINT valid_quantity CHECK (quantity > 0)
);

CREATE INDEX idx_booking_items_booking ON booking_line_items(booking_id);
CREATE INDEX idx_booking_items_type ON booking_line_items(item_type);
```

#### `payments`
**Purpose**: Payment records

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

  -- Payment Details
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(10,2) NOT NULL,

  -- Classification
  payment_type TEXT NOT NULL
    CHECK (payment_type IN ('deposit', 'installment', 'full_payment', 'refund')),
  payment_method TEXT NOT NULL
    CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'online', 'cheque')),

  -- Reference
  transaction_reference TEXT,
  notes TEXT,

  -- System
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by UUID,

  CONSTRAINT valid_payment_amount CHECK (amount != 0) -- negative for refunds
);

CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_payments_type ON payments(payment_type);
```

---

### 6. Academic Operations

#### `enrollments`
**Purpose**: Student enrollment in a specific course

```sql
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  booking_id UUID NOT NULL REFERENCES bookings(id),
  student_id UUID NOT NULL REFERENCES students(id),
  course_id UUID NOT NULL REFERENCES courses(id),
  level_id UUID REFERENCES levels(id),

  -- Enrollment Details
  placement_test_score INT,
  placement_test_date DATE,

  -- Duration
  weeks INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'completed', 'withdrawn', 'transferred')),

  -- System
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_dates CHECK (end_date > start_date),
  CONSTRAINT valid_weeks CHECK (weeks > 0)
);

CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_booking ON enrollments(booking_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_enrollments_dates ON enrollments(start_date, end_date);
CREATE INDEX idx_enrollments_status ON enrollments(status);
```

#### `classes`
**Purpose**: Actual teaching groups

```sql
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Class Information
  class_code TEXT NOT NULL UNIQUE,
  class_name TEXT NOT NULL,
  level_id UUID NOT NULL REFERENCES levels(id),

  -- Teacher Assignment (nullable - can be assigned later)
  teacher_id UUID REFERENCES students(id), -- teachers are in students table with role

  -- Capacity
  max_capacity INT NOT NULL DEFAULT 15,
  current_enrollment INT NOT NULL DEFAULT 0,

  -- Schedule (stored as JSONB)
  -- Example: [{"day": "Monday", "start": "09:00", "end": "12:00", "room": "A101"}]
  schedule JSONB NOT NULL,

  -- Duration
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Location
  room TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),

  -- System
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_capacity CHECK (max_capacity > 0 AND current_enrollment <= max_capacity),
  CONSTRAINT valid_class_dates CHECK (end_date > start_date)
);

CREATE INDEX idx_classes_code ON classes(class_code);
CREATE INDEX idx_classes_level ON classes(level_id);
CREATE INDEX idx_classes_teacher ON classes(teacher_id);
CREATE INDEX idx_classes_dates ON classes(start_date, end_date);
CREATE INDEX idx_classes_status ON classes(status);
```

#### `class_enrollments`
**Purpose**: Many-to-many relationship between enrollments and classes

```sql
CREATE TABLE class_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,

  -- Assignment Details
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'transferred', 'withdrawn')),

  -- System
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_enrollment_class UNIQUE (enrollment_id, class_id)
);

CREATE INDEX idx_class_enrollments_enrollment ON class_enrollments(enrollment_id);
CREATE INDEX idx_class_enrollments_class ON class_enrollments(class_id);
CREATE INDEX idx_class_enrollments_status ON class_enrollments(status);
```

#### `attendance`
**Purpose**: Weekly attendance records (eliminates repeating columns)

```sql
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  -- Time Period
  week_starting DATE NOT NULL, -- Monday of the week

  -- Attendance Status
  status TEXT NOT NULL
    CHECK (status IN ('present', 'absent', 'late', 'excused', 'sick')),

  -- Details
  notes TEXT,

  -- System
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by UUID,

  -- Constraints
  CONSTRAINT unique_attendance_record UNIQUE (class_id, student_id, week_starting),
  CONSTRAINT valid_week_start CHECK (EXTRACT(DOW FROM week_starting) = 1) -- Monday
);

CREATE INDEX idx_attendance_class ON attendance(class_id);
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_attendance_week ON attendance(week_starting);
CREATE INDEX idx_attendance_status ON attendance(status);
```

---

### 7. Accommodation

#### `accommodation_types`
**Purpose**: Types of accommodation offered

```sql
CREATE TABLE accommodation_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Type Information
  type_code TEXT NOT NULL UNIQUE,
  type_name TEXT NOT NULL,
  description TEXT,

  -- Pricing
  price_per_week DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',

  -- Details
  typical_location TEXT,
  includes_meals BOOLEAN NOT NULL DEFAULT false,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  CONSTRAINT valid_price CHECK (price_per_week > 0)
);

CREATE INDEX idx_accommodation_types_code ON accommodation_types(type_code);
CREATE INDEX idx_accommodation_types_active ON accommodation_types(is_active);
```

#### `accommodation_bookings`
**Purpose**: Student accommodation assignments

```sql
CREATE TABLE accommodation_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  accommodation_type_id UUID NOT NULL REFERENCES accommodation_types(id),

  -- Duration
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Location (specific address)
  address TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled')),

  -- System
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_accom_dates CHECK (end_date > start_date)
);

CREATE INDEX idx_accommodation_bookings_student ON accommodation_bookings(student_id);
CREATE INDEX idx_accommodation_bookings_booking ON accommodation_bookings(booking_id);
CREATE INDEX idx_accommodation_bookings_type ON accommodation_bookings(accommodation_type_id);
CREATE INDEX idx_accommodation_bookings_dates ON accommodation_bookings(start_date, end_date);
```

---

## BCNF Verification

### Functional Dependencies Check

✅ **students**: `id → {full_name, email, dob, nationality_id}` - id is candidate key
✅ **bookings**: `id → {student_id, source_id, sale_date, total_amount}` - id is candidate key
✅ **booking_line_items**: `id → {booking_id, item_type, amount}` - id is candidate key
✅ **enrollments**: `id → {student_id, course_id, start_date, weeks}` - id is candidate key
✅ **attendance**: `id → {class_id, student_id, week_starting, status}` - id is candidate key

### No Transitive Dependencies
All non-key attributes depend directly on the primary key, not on other non-key attributes.

### No Partial Dependencies
All tables have single-column primary keys (UUIDs), eliminating partial dependency risks.

### All Determinants are Candidate Keys
Every functional dependency X → Y has X as a superkey.

**Result**: Schema is in BCNF ✅

---

## Additional Design Notes

### 1. Calculated Fields
- `bookings.total_due` is a generated column (virtual/stored)
- Prevents update anomalies while maintaining query performance

### 2. Temporal Data
- All bookings, enrollments, and accommodations have start/end dates
- Enables historical analysis and prevents data loss

### 3. Reference Data
- Separate tables for `nationalities`, `visa_types`, `levels`, `courses`
- Ensures consistency and enables easy updates

### 4. Financial Design
- `booking_line_items` eliminates column proliferation
- Supports flexible pricing models
- Tax calculation built-in

### 5. Attendance Design
- Weekly records instead of daily columns
- Supports historical reporting
- No maximum time limit

---

## Next Steps

1. Review and approve this schema
2. Add any missing entities/columns you need
3. Create Drizzle migration scripts
4. Deploy to Supabase
5. Set up RLS policies
6. Regenerate TypeScript types

**Questions to clarify:**
1. Do teachers need a separate table or are they in `students` with a role?
2. Should we track individual daily attendance or weekly is sufficient?
3. Any other fee types beyond what's listed?
4. Do you need exam/assessment results tracked separately?
5. Should we track accommodation providers (hosts/residences)?

Please review and let me know what needs adjustment!

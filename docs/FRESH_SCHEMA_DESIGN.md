# MyCastle Fresh Schema Design
**Date:** 2026-01-13
**Purpose:** Fresh database schema aligned with Ireland ESL school business logic
**Status:** Design Phase

---

## Business Requirements Summary

### Market Context
- **Location:** Ireland ESL School
- **Currency:** EUR (€)
- **Visa System:** Ireland Stamp 2 visas (First Time → Renewal 1 → Renewal 2)
- **Market Segments:** Visa students (more valuable) + Non-visa students (EU/local)
- **Regulatory:** Learner Protection insurance required (school closure protection)

### Key Business Rules
1. **Multi-role Users:** Single user can be student + teacher + admin
2. **Multiple Bookings:** One student can have multiple enrollments over time
3. **Proxy Booking:** One person can book for others (parent for child, etc.)
4. **Payment Tracking:** Full payment history per booking
5. **Visa Tracking:** Optional visa type tracking (First Time/Renewal 1/Renewal 2)
6. **Source Tracking:** Direct sales vs Agency sales

---

## Core Entities

### 1. TENANTS
Multi-tenancy support for future school franchises/branches.

```sql
tenants
- id (UUID, PK)
- name (VARCHAR)
- subdomain (VARCHAR, UNIQUE)
- contact_email (VARCHAR)
- status (VARCHAR) -- active/inactive
- settings (JSONB)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

---

### 2. USERS (Base table for all people)
Stores basic user information for anyone in the system.

```sql
users
- id (UUID, PK)
- tenant_id (UUID, FK → tenants)
- auth_id (UUID, UNIQUE) -- Supabase Auth ID
- email (VARCHAR, NOT NULL)
- email_verified (BOOLEAN)
- name (VARCHAR, NOT NULL)
- phone (VARCHAR)
- date_of_birth (DATE)
- nationality (VARCHAR)
- avatar_url (VARCHAR)
- primary_role (VARCHAR) -- Default role for UI (student/teacher/admin)
- status (VARCHAR) -- active/inactive/suspended
- last_login (TIMESTAMP)
- metadata (JSONB) -- Emergency contacts, etc.
- preferences (JSONB) -- UI preferences
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- deleted_at (TIMESTAMP) -- Soft delete

UNIQUE INDEX: (tenant_id, email)
```

---

### 3. USER_ROLES (Junction table for multi-role support)
Allows one user to have multiple roles simultaneously.

```sql
user_roles
- id (UUID, PK)
- user_id (UUID, FK → users)
- tenant_id (UUID, FK → tenants)
- role (VARCHAR) -- student/teacher/admin/super_admin
- granted_at (TIMESTAMP)
- granted_by (UUID, FK → users)
- revoked_at (TIMESTAMP)
- revoked_by (UUID, FK → users)

UNIQUE INDEX: (user_id, tenant_id, role)
INDEX: (user_id, revoked_at) -- Active roles only
```

**Example:** User eoinmaleoin@gmail.com has 3 rows:
- (user_id, role='admin', revoked_at=NULL)
- (user_id, role='teacher', revoked_at=NULL)
- (user_id, role='student', revoked_at=NULL)

---

### 4. STUDENTS (Extends users for student-specific data)
Student-specific information beyond base user data.

```sql
students
- id (UUID, PK)
- user_id (UUID, FK → users, UNIQUE)
- tenant_id (UUID, FK → tenants)
- student_number (VARCHAR, UNIQUE) -- School-assigned student ID
- is_visa_student (BOOLEAN) -- 'v' flag from spreadsheet
- visa_type (VARCHAR) -- First Time / Renewal 1 / Renewal 2 (nullable)
- visa_expiry_date (DATE) -- nullable
- emergency_contact_name (VARCHAR)
- emergency_contact_phone (VARCHAR)
- emergency_contact_relationship (VARCHAR)
- medical_conditions (TEXT)
- dietary_requirements (TEXT)
- status (VARCHAR) -- active/graduated/withdrawn
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

INDEX: (tenant_id, is_visa_student)
INDEX: (visa_expiry_date) WHERE visa_expiry_date IS NOT NULL
```

---

### 5. AGENCIES (Sales source tracking)
Track referral agencies and direct sales.

```sql
agencies
- id (UUID, PK)
- tenant_id (UUID, FK → tenants)
- name (VARCHAR, NOT NULL) -- 'Direct' or agency name
- contact_person (VARCHAR)
- contact_email (VARCHAR)
- contact_phone (VARCHAR)
- commission_rate (DECIMAL) -- Percentage
- status (VARCHAR) -- active/inactive
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

UNIQUE INDEX: (tenant_id, name)
```

**Note:** Create default 'Direct' agency during seed.

---

### 6. COURSES
Course offerings (not classes - this is the catalog).

```sql
courses
- id (UUID, PK)
- tenant_id (UUID, FK → tenants)
- name (VARCHAR, NOT NULL)
- code (VARCHAR) -- Course code
- description (TEXT)
- level (VARCHAR) -- A1, A2, B1, B2, C1, C2
- hours_per_week (INTEGER)
- price_per_week_eur (DECIMAL)
- status (VARCHAR) -- active/inactive
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

INDEX: (tenant_id, status)
```

---

### 7. ACCOMMODATION_TYPES
Accommodation options catalog.

```sql
accommodation_types
- id (UUID, PK)
- tenant_id (UUID, FK → tenants)
- name (VARCHAR, NOT NULL) -- Host Family, Residence, Student House, etc.
- description (TEXT)
- price_per_week_eur (DECIMAL)
- deposit_eur (DECIMAL)
- status (VARCHAR) -- active/inactive
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

UNIQUE INDEX: (tenant_id, name)
```

---

### 8. BOOKINGS (Core business entity - replaces "enrollments")
This is the main transactional record linking everything together.

```sql
bookings
- id (UUID, PK)
- tenant_id (UUID, FK → tenants)
- booking_number (VARCHAR, UNIQUE) -- Human-readable booking ref
- sale_date (DATE, NOT NULL)
-
-- Student Information
- student_id (UUID, FK → students, NOT NULL)
-
-- Booked By (May differ from student - proxy booking)
- booked_by_user_id (UUID, FK → users)
- booked_by_name (VARCHAR) -- If not a registered user
- booked_by_email (VARCHAR)
- booked_by_phone (VARCHAR)
-
-- Source
- agency_id (UUID, FK → agencies) -- NULL = Direct
-
-- Course Details
- course_id (UUID, FK → courses, NOT NULL)
- weeks (INTEGER, NOT NULL)
- course_start_date (DATE, NOT NULL)
- course_end_date (DATE, NOT NULL)
- placement_test_score (VARCHAR) -- Score or level
- assigned_level (VARCHAR) -- Actual level/class assigned
-
-- Accommodation Details (nullable - not all students need accommodation)
- accommodation_type_id (UUID, FK → accommodation_types)
- accommodation_start_date (DATE)
- accommodation_end_date (DATE)
-
-- Financial Breakdown (all in EUR)
- course_fee_eur (DECIMAL, NOT NULL)
- accommodation_fee_eur (DECIMAL DEFAULT 0)
- transfer_fee_eur (DECIMAL DEFAULT 0) -- Airport transfer
- exam_fee_eur (DECIMAL DEFAULT 0)
- registration_fee_eur (DECIMAL DEFAULT 0)
- learner_protection_fee_eur (DECIMAL DEFAULT 0)
- medical_insurance_fee_eur (DECIMAL DEFAULT 0)
- total_booking_eur (DECIMAL, NOT NULL) -- Sum of all fees
-
-- Payment Tracking
- deposit_paid_eur (DECIMAL DEFAULT 0)
- total_paid_eur (DECIMAL DEFAULT 0) -- Sum of all payments
- total_due_eur (DECIMAL GENERATED ALWAYS AS (total_booking_eur - total_paid_eur) STORED)
-
-- Status
- status (VARCHAR) -- pending/confirmed/active/completed/cancelled
-
-- Metadata
- notes (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- cancelled_at (TIMESTAMP)
- cancelled_by (UUID, FK → users)
- cancellation_reason (TEXT)

INDEX: (tenant_id, student_id)
INDEX: (tenant_id, sale_date)
INDEX: (tenant_id, status)
INDEX: (course_start_date, course_end_date)
INDEX: (total_due_eur) WHERE total_due_eur > 0 -- Outstanding balances
```

---

### 9. PAYMENTS (Payment history)
Track all payments against bookings.

```sql
payments
- id (UUID, PK)
- tenant_id (UUID, FK → tenants)
- booking_id (UUID, FK → bookings, NOT NULL)
- payment_date (DATE, NOT NULL)
- amount_eur (DECIMAL, NOT NULL)
- payment_method (VARCHAR) -- Cash, Card, Bank Transfer, etc.
- reference_number (VARCHAR) -- Transaction ref
- received_by (UUID, FK → users) -- Staff who recorded payment
- notes (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

INDEX: (booking_id, payment_date)
INDEX: (tenant_id, payment_date)
```

**Trigger:** Update `bookings.total_paid_eur` when payment inserted/updated/deleted.

---

### 10. CLASSES (Actual running classes - schedule)
Physical classes that students attend.

```sql
classes
- id (UUID, PK)
- tenant_id (UUID, FK → tenants)
- name (VARCHAR, NOT NULL) -- e.g., "B1 Morning Group"
- course_id (UUID, FK → courses)
- teacher_id (UUID, FK → users) -- FK to users with teacher role
- level (VARCHAR) -- A1, A2, B1, etc.
- capacity (INTEGER DEFAULT 15)
- enrolled_count (INTEGER DEFAULT 0)
- schedule_description (VARCHAR) -- "Mon-Fri 9:00-12:30"
- start_date (DATE, NOT NULL)
- end_date (DATE)
- status (VARCHAR) -- scheduled/active/completed/cancelled
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

INDEX: (tenant_id, teacher_id)
INDEX: (tenant_id, status)
```

---

### 11. CLASS_ENROLLMENTS (Link bookings to actual classes)
Connects bookings to physical classes they attend.

```sql
class_enrollments
- id (UUID, PK)
- tenant_id (UUID, FK → tenants)
- booking_id (UUID, FK → bookings, NOT NULL)
- class_id (UUID, FK → classes, NOT NULL)
- enrollment_date (DATE, NOT NULL)
- withdrawal_date (DATE)
- status (VARCHAR) -- active/completed/withdrawn
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

UNIQUE INDEX: (booking_id, class_id)
INDEX: (class_id, status)
```

---

## Supporting Tables (For Future Features)

### 12. ATTENDANCE
```sql
attendance
- id (UUID, PK)
- tenant_id (UUID, FK → tenants)
- class_enrollment_id (UUID, FK → class_enrollments)
- attendance_date (DATE, NOT NULL)
- status (VARCHAR) -- present/absent/late/excused
- notes (TEXT)
- marked_by (UUID, FK → users)
- marked_at (TIMESTAMP)

UNIQUE INDEX: (class_enrollment_id, attendance_date)
```

### 13. AUDIT_LOG
```sql
audit_log
- id (UUID, PK)
- tenant_id (UUID, FK → tenants)
- user_id (UUID, FK → users)
- action (VARCHAR) -- create/update/delete
- entity_type (VARCHAR) -- booking/payment/user/etc.
- entity_id (UUID)
- changes (JSONB) -- Before/after values
- ip_address (INET)
- user_agent (TEXT)
- created_at (TIMESTAMP)

INDEX: (tenant_id, created_at DESC)
INDEX: (entity_type, entity_id)
```

---

## Row-Level Security (RLS) Policies

### Tenant Isolation
All tables with `tenant_id` get RLS policy:
```sql
CREATE POLICY tenant_isolation ON <table>
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

### Role-Based Access
- **Students:** Read own bookings, payments, classes
- **Teachers:** Read assigned classes, students in those classes
- **Admins:** Full access to tenant data
- **Super Admins:** Full access across all tenants

---

## Migration Strategy

### Phase 1: Core Tables (Priority 1)
1. tenants
2. users
3. user_roles
4. agencies (with 'Direct' seed)

### Phase 2: Academic Catalog (Priority 1)
5. courses
6. accommodation_types

### Phase 3: Bookings & Payments (Priority 1)
7. students
8. bookings
9. payments
10. Payment update trigger

### Phase 4: Classes & Attendance (Priority 2)
11. classes
12. class_enrollments
13. attendance

### Phase 5: Audit & Support (Priority 3)
14. audit_log

---

## Test Data Requirements

### Test User: eoinmaleoin@gmail.com
- Create user in `users` table
- Create 3 entries in `user_roles`: student, teacher, admin
- Create student record in `students` table
- Create sample booking for this student

### Sample Data:
- 1 tenant: "MyCastle Default"
- 1 agency: "Direct"
- 3-5 courses (different levels)
- 3-4 accommodation types (Host Family, Residence, Student House)
- 5-10 sample bookings with payments

---

## Next Steps
1. Create migration SQL file
2. Update Drizzle schema definitions
3. Create seed scripts
4. Test with admin UI


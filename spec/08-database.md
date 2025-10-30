# 8. Database Specification

> **Document status:** Living specification. Defines complete data model using Drizzle ORM and PostgreSQL.

---

## 8.1 Schema Overview

### Database Technology
- **Primary**: Supabase (managed PostgreSQL)
- **Compatibility**: Standard PostgreSQL 14+
- **ORM**: Drizzle ORM with TypeScript
- **Migrations**: Drizzle Kit for versioned migrations
- **Location**: `packages/platform-db`

### Design Principles
- **Multi-tenancy Ready**: All tenant-scoped tables include `tenant_id`
- **Soft Deletes**: Critical entities use `deleted_at` instead of hard deletes
- **Audit Trail**: Timestamps (`created_at`, `updated_at`) on all tables
- **Row-Level Security (RLS)**: Enforced at database level for multi-tenancy
- **Type Safety**: Drizzle generates TypeScript types from schema

---

## 8.2 Entity Relationship Diagram (ERD)

```
┌─────────────┐
│   tenants   │
└──────┬──────┘
       │
       │ 1:N
       │
┌──────▼──────┐      ┌──────────────┐
│    users    │◄─────┤ audit_logs   │
└──────┬──────┘  N:1 └──────────────┘
       │
       ├─── 1:N ───► ┌──────────────┐
       │             │   invoices   │
       │             └──────┬───────┘
       │                    │ 1:N
       │                    ▼
       │             ┌──────────────┐
       │             │   payments   │
       │             └──────────────┘
       │
       ├─── N:M ───► ┌──────────────┐
       │  (via       │   classes    │
       │  enrollments)└──────┬──────┘
       │                     │
       │                     │ 1:N
       │                     ▼
       │              ┌──────────────┐
       │              │  schedules   │
       │              └──────┬───────┘
       │                     │ 1:N
       │                     ▼
       │              ┌──────────────┐
       │              │ class_sessions│
       ▼              └──────┬───────┘
┌──────────────┐            │ 1:N
│ enrollments  │            ▼
└──────┬───────┘     ┌──────────────┐
       │             │  attendance  │
       │ 1:N         └──────────────┘
       ▼
┌──────────────┐
│ assignments  │
└──────┬───────┘
       │ 1:N
       ▼
┌──────────────┐
│ submissions  │
└──────┬───────┘
       │ 1:1
       ▼
┌──────────────┐
│    grades    │
└──────────────┘

┌──────────────┐
│ conversations│ (optional, for chat history)
└──────────────┘

┌──────────────┐
│   exports    │ (generated reports/exports)
└──────────────┘
```

---

## 8.3 Core Tables

### 8.3.1 tenants

Represents a school or organization using the platform.

```typescript
import { pgTable, uuid, varchar, timestamp, boolean } from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  subdomain: varchar('subdomain', { length: 63 }).notNull().unique(), // e.g., 'acme-school'
  contact_email: varchar('contact_email', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('active'), // active, suspended, archived
  settings: jsonb('settings').default({}), // Tenant-specific config
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});
```

**Indexes**:
```sql
CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_tenants_status ON tenants(status);
```

---

### 8.3.2 users

All user accounts (admins, teachers, students).

```typescript
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id').notNull().references(() => tenants.id),

  // Auth fields (synced with Supabase Auth)
  auth_id: uuid('auth_id').unique(), // Supabase Auth user ID
  email: varchar('email', { length: 255 }).notNull(),
  email_verified: boolean('email_verified').default(false),

  // Profile
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull(), // admin, teacher, student
  avatar_url: varchar('avatar_url', { length: 500 }),
  phone: varchar('phone', { length: 50 }),

  // Status
  status: varchar('status', { length: 50 }).notNull().default('active'), // active, suspended, archived
  last_login: timestamp('last_login'),

  // Metadata
  metadata: jsonb('metadata').default({}), // Custom fields per role
  preferences: jsonb('preferences').default({}), // User preferences

  // Timestamps
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  deleted_at: timestamp('deleted_at'), // Soft delete
});
```

**Indexes**:
```sql
CREATE UNIQUE INDEX idx_users_tenant_email ON users(tenant_id, email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_tenant_role ON users(tenant_id, role);
CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_status ON users(status);
```

**RLS Policy**:
```sql
-- Users can only see users in their tenant
CREATE POLICY users_tenant_isolation ON users
  FOR SELECT
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Students can only see their own profile
CREATE POLICY users_student_own_data ON users
  FOR SELECT
  USING (
    role = 'student' AND
    auth_id = auth.uid()
  );
```

---

### 8.3.3 classes

Course/class definitions.

```typescript
export const classes = pgTable('classes', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id').notNull().references(() => tenants.id),

  // Class info
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }), // e.g., "MATH-101"
  description: text('description'),
  level: varchar('level', { length: 50 }), // Beginner, Intermediate, Advanced
  subject: varchar('subject', { length: 100 }),

  // Capacity
  capacity: integer('capacity').notNull().default(20),
  enrolled_count: integer('enrolled_count').notNull().default(0),

  // Teacher assignment
  teacher_id: uuid('teacher_id').references(() => users.id),

  // Schedule
  schedule_description: varchar('schedule_description', { length: 500 }), // "Mon/Wed 10:00-11:00"
  start_date: date('start_date').notNull(),
  end_date: date('end_date'),

  // Status
  status: varchar('status', { length: 50 }).notNull().default('active'), // active, completed, cancelled

  // Timestamps
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  deleted_at: timestamp('deleted_at'),
});
```

**Indexes**:
```sql
CREATE INDEX idx_classes_tenant ON classes(tenant_id);
CREATE INDEX idx_classes_teacher ON classes(teacher_id);
CREATE INDEX idx_classes_status ON classes(status);
CREATE INDEX idx_classes_dates ON classes(start_date, end_date);
```

---

### 8.3.4 enrollments

Student-class relationships (many-to-many).

```typescript
export const enrollments = pgTable('enrollments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id').notNull().references(() => tenants.id),

  student_id: uuid('student_id').notNull().references(() => users.id),
  class_id: uuid('class_id').notNull().references(() => classes.id),

  enrollment_date: date('enrollment_date').notNull().defaultNow(),
  completion_date: date('completion_date'),

  status: varchar('status', { length: 50 }).notNull().default('active'), // active, completed, dropped

  // Performance tracking
  attendance_rate: decimal('attendance_rate', { precision: 5, scale: 2 }), // 0.00 to 100.00
  current_grade: varchar('current_grade', { length: 10 }), // A+, B, etc.

  // Timestamps
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});
```

**Unique Constraint**:
```sql
CREATE UNIQUE INDEX idx_enrollments_student_class ON enrollments(student_id, class_id)
WHERE status = 'active';
```

**Trigger** (to update `classes.enrolled_count`):
```sql
CREATE OR REPLACE FUNCTION update_class_enrolled_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE classes SET enrolled_count = enrolled_count + 1 WHERE id = NEW.class_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status != 'active' THEN
    UPDATE classes SET enrolled_count = enrolled_count - 1 WHERE id = NEW.class_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status != 'active' AND NEW.status = 'active' THEN
    UPDATE classes SET enrolled_count = enrolled_count + 1 WHERE id = NEW.class_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_enrolled_count
AFTER INSERT OR UPDATE ON enrollments
FOR EACH ROW EXECUTE FUNCTION update_class_enrolled_count();
```

---

### 8.3.5 class_sessions

Individual class meetings/lessons.

```typescript
export const classSessions = pgTable('class_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id').notNull().references(() => tenants.id),
  class_id: uuid('class_id').notNull().references(() => classes.id),

  session_date: date('session_date').notNull(),
  start_time: time('start_time').notNull(),
  end_time: time('end_time').notNull(),

  topic: varchar('topic', { length: 500 }),
  notes: text('notes'),

  status: varchar('status', { length: 50 }).notNull().default('scheduled'), // scheduled, completed, cancelled

  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});
```

**Indexes**:
```sql
CREATE INDEX idx_sessions_class_date ON class_sessions(class_id, session_date);
```

---

### 8.3.6 attendance

Attendance records for class sessions.

```typescript
export const attendance = pgTable('attendance', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id').notNull().references(() => tenants.id),

  class_session_id: uuid('class_session_id').notNull().references(() => classSessions.id),
  student_id: uuid('student_id').notNull().references(() => users.id),

  status: varchar('status', { length: 50 }).notNull(), // present, absent, late, excused
  notes: text('notes'),

  recorded_by: uuid('recorded_by').references(() => users.id), // Teacher/admin who recorded
  recorded_at: timestamp('recorded_at').defaultNow().notNull(),

  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});
```

**Unique Constraint**:
```sql
CREATE UNIQUE INDEX idx_attendance_session_student ON attendance(class_session_id, student_id);
```

---

### 8.3.7 assignments

Homework, quizzes, projects.

```typescript
export const assignments = pgTable('assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id').notNull().references(() => tenants.id),
  class_id: uuid('class_id').notNull().references(() => classes.id),

  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).notNull(), // homework, quiz, exam, project

  assigned_date: date('assigned_date').notNull(),
  due_date: date('due_date').notNull(),

  max_score: integer('max_score'), // e.g., 100 points

  content: jsonb('content'), // Assignment content (questions, etc.)
  attachments: jsonb('attachments'), // File URLs

  status: varchar('status', { length: 50 }).notNull().default('active'), // active, closed

  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});
```

---

### 8.3.8 submissions

Student work submissions.

```typescript
export const submissions = pgTable('submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id').notNull().references(() => tenants.id),

  assignment_id: uuid('assignment_id').notNull().references(() => assignments.id),
  student_id: uuid('student_id').notNull().references(() => users.id),

  submitted_at: timestamp('submitted_at').defaultNow().notNull(),
  content: jsonb('content'), // Answers, text responses
  attachments: jsonb('attachments'), // File URLs

  status: varchar('status', { length: 50 }).notNull().default('submitted'), // submitted, graded

  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});
```

**Unique Constraint**:
```sql
CREATE UNIQUE INDEX idx_submissions_assignment_student ON submissions(assignment_id, student_id);
```

---

### 8.3.9 grades

Grading results for submissions.

```typescript
export const grades = pgTable('grades', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id').notNull().references(() => tenants.id),

  submission_id: uuid('submission_id').notNull().references(() => submissions.id).unique(),
  student_id: uuid('student_id').notNull().references(() => users.id),
  assignment_id: uuid('assignment_id').notNull().references(() => assignments.id),

  score: decimal('score', { precision: 6, scale: 2 }), // e.g., 85.50
  grade: varchar('grade', { length: 10 }), // A, B+, etc.

  feedback: text('feedback'),

  graded_by: uuid('graded_by').references(() => users.id), // Teacher
  graded_at: timestamp('graded_at').defaultNow().notNull(),

  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});
```

---

## 8.4 Financial Tables

### 8.4.1 invoices

```typescript
export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id').notNull().references(() => tenants.id),

  invoice_number: varchar('invoice_number', { length: 50 }).notNull().unique(),
  student_id: uuid('student_id').notNull().references(() => users.id),

  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),

  description: text('description'),
  line_items: jsonb('line_items'), // Array of {description, quantity, unit_price}

  issue_date: date('issue_date').notNull(),
  due_date: date('due_date').notNull(),

  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, paid, overdue, cancelled

  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});
```

---

### 8.4.2 payments

```typescript
export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id').notNull().references(() => tenants.id),

  invoice_id: uuid('invoice_id').notNull().references(() => invoices.id),
  student_id: uuid('student_id').notNull().references(() => users.id),

  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),

  payment_method: varchar('payment_method', { length: 50 }).notNull(), // stripe, cash, bank_transfer
  transaction_id: varchar('transaction_id', { length: 255 }), // External transaction ID
  receipt_url: varchar('receipt_url', { length: 500 }),

  payment_date: date('payment_date').notNull(),
  notes: text('notes'),

  recorded_by: uuid('recorded_by').references(() => users.id),

  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});
```

**Trigger** (update invoice status when paid):
```sql
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS TRIGGER AS $$
DECLARE
  total_paid DECIMAL(10,2);
  invoice_amount DECIMAL(10,2);
BEGIN
  SELECT SUM(amount) INTO total_paid FROM payments WHERE invoice_id = NEW.invoice_id;
  SELECT amount INTO invoice_amount FROM invoices WHERE id = NEW.invoice_id;

  IF total_paid >= invoice_amount THEN
    UPDATE invoices SET status = 'paid' WHERE id = NEW.invoice_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_invoice_status
AFTER INSERT ON payments
FOR EACH ROW EXECUTE FUNCTION update_invoice_status();
```

---

## 8.5 System Tables

### 8.5.1 audit_logs

```typescript
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id').references(() => tenants.id),

  user_id: uuid('user_id').references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(), // user_created, class_deleted, etc.
  resource_type: varchar('resource_type', { length: 50 }), // user, class, invoice, etc.
  resource_id: uuid('resource_id'),

  changes: jsonb('changes'), // Before/after values
  metadata: jsonb('metadata'), // IP address, user agent, etc.

  timestamp: timestamp('timestamp').defaultNow().notNull(),
});
```

**Indexes**:
```sql
CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

**Retention Policy**:
```sql
-- Auto-delete audit logs older than 2 years (compliance requirement)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_logs WHERE timestamp < NOW() - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql;

-- Schedule via pg_cron or external job
```

---

### 8.5.2 conversations (Optional)

For storing chat history.

```typescript
export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id').notNull().references(() => tenants.id),
  user_id: uuid('user_id').notNull().references(() => users.id),

  title: varchar('title', { length: 255 }),
  messages: jsonb('messages').notNull(), // Array of {role, content, timestamp}

  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});
```

---

### 8.5.3 exports

Tracks generated report exports.

```typescript
export const exports = pgTable('exports', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id').notNull().references(() => tenants.id),

  template_id: varchar('template_id', { length: 100 }).notNull(), // e.g., "user_roster_v1"
  template_version: varchar('template_version', { length: 20 }).notNull(),

  filename: varchar('filename', { length: 255 }).notNull(),
  file_url: varchar('file_url', { length: 500 }), // Signed URL
  file_size: integer('file_size'), // Bytes

  filters: jsonb('filters'), // Applied filters
  row_count: integer('row_count'),

  requested_by: uuid('requested_by').notNull().references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  expires_at: timestamp('expires_at'), // Signed URL expiry
});
```

---

## 8.6 SQL Views for Reports

### 8.6.1 view_user_roster

Stable view for user roster export template.

```sql
CREATE OR REPLACE VIEW view_user_roster AS
SELECT
  u.id,
  u.email,
  u.name,
  u.role,
  u.status,
  u.created_at,
  u.last_login,
  u.tenant_id
FROM users u
WHERE u.deleted_at IS NULL
ORDER BY u.created_at DESC;
```

### 8.6.2 view_class_enrollment

```sql
CREATE OR REPLACE VIEW view_class_enrollment AS
SELECT
  c.id AS class_id,
  c.name AS class_name,
  c.level,
  u.id AS student_id,
  u.name AS student_name,
  u.email AS student_email,
  e.enrollment_date,
  e.status AS enrollment_status,
  e.attendance_rate,
  e.current_grade,
  t.name AS teacher_name
FROM classes c
JOIN enrollments e ON c.id = e.class_id
JOIN users u ON e.student_id = u.id
LEFT JOIN users t ON c.teacher_id = t.id
WHERE c.deleted_at IS NULL AND u.deleted_at IS NULL
ORDER BY c.name, u.name;
```

### 8.6.3 view_attendance_report

```sql
CREATE OR REPLACE VIEW view_attendance_report AS
SELECT
  cs.session_date,
  c.name AS class_name,
  c.id AS class_id,
  u.name AS student_name,
  u.id AS student_id,
  a.status AS attendance_status,
  a.notes,
  t.name AS teacher_name
FROM attendance a
JOIN class_sessions cs ON a.class_session_id = cs.id
JOIN classes c ON cs.class_id = c.id
JOIN users u ON a.student_id = u.id
LEFT JOIN users t ON c.teacher_id = t.id
ORDER BY cs.session_date DESC, c.name, u.name;
```

### 8.6.4 view_payment_ledger

```sql
CREATE OR REPLACE VIEW view_payment_ledger AS
SELECT
  p.payment_date,
  u.name AS student_name,
  u.email AS student_email,
  p.amount,
  p.currency,
  p.payment_method,
  i.invoice_number,
  i.status AS invoice_status,
  p.transaction_id,
  p.tenant_id
FROM payments p
JOIN invoices i ON p.invoice_id = i.id
JOIN users u ON p.student_id = u.id
ORDER BY p.payment_date DESC;
```

---

## 8.7 Row-Level Security (RLS) Policies

### Enable RLS on All Tables

```sql
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;
```

### Example Policies

**Tenant Isolation (All Tables)**:
```sql
CREATE POLICY tenant_isolation ON users
FOR ALL
USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Repeat for all tenant-scoped tables
```

**Role-Based Access**:
```sql
-- Admins can see all users in their tenant
CREATE POLICY admin_full_access ON users
FOR ALL
USING (
  tenant_id = current_setting('app.tenant_id')::uuid AND
  current_setting('app.user_role') = 'admin'
);

-- Teachers can see their students
CREATE POLICY teacher_student_access ON users
FOR SELECT
USING (
  tenant_id = current_setting('app.tenant_id')::uuid AND
  current_setting('app.user_role') = 'teacher' AND
  role = 'student' AND
  id IN (
    SELECT student_id FROM enrollments e
    JOIN classes c ON e.class_id = c.id
    WHERE c.teacher_id = current_setting('app.user_id')::uuid
  )
);

-- Students can only see their own data
CREATE POLICY student_own_data ON users
FOR SELECT
USING (
  tenant_id = current_setting('app.tenant_id')::uuid AND
  current_setting('app.user_role') = 'student' AND
  auth_id = auth.uid()
);
```

### Setting RLS Context

```typescript
// Before each query, set context
await db.execute(sql`
  SELECT
    set_config('app.tenant_id', ${tenantId}, true),
    set_config('app.user_id', ${userId}, true),
    set_config('app.user_role', ${role}, true)
`);

// Then queries automatically respect RLS
const users = await db.select().from(usersTable);
```

---

## 8.8 Database Package Structure

```
packages/platform-db/
├── drizzle/
│   ├── migrations/             # Versioned SQL migrations
│   │   ├── 0001_init.sql
│   │   ├── 0002_add_exports.sql
│   │   └── ...
│   └── seed/                   # Seed data
│       ├── dev.ts              # Development seed data
│       └── prod.ts             # Production seed (minimal)
├── src/
│   ├── schema/                 # Drizzle schema definitions
│   │   ├── index.ts            # Exports all schemas
│   │   ├── tenants.ts
│   │   ├── users.ts
│   │   ├── classes.ts
│   │   ├── enrollments.ts
│   │   ├── attendance.ts
│   │   ├── assignments.ts
│   │   ├── financial.ts        # invoices, payments
│   │   ├── system.ts           # audit_logs, conversations, exports
│   │   └── views.ts            # SQL view definitions
│   ├── queries/                # Reusable query functions
│   │   ├── users.ts
│   │   ├── classes.ts
│   │   └── reports.ts
│   ├── db.ts                   # Database connection
│   └── rls.ts                  # RLS helper functions
├── drizzle.config.ts           # Drizzle Kit config
├── package.json
└── tsconfig.json
```

---

## 8.9 Migration Strategy

### Development Workflow

```bash
# Generate migration from schema changes
npm run db:generate

# Apply migrations
npm run db:migrate

# Seed database
npm run db:seed

# Reset database (dev only)
npm run db:reset
```

### Production Workflow

```bash
# Review migration SQL before applying
cat drizzle/migrations/0003_new_feature.sql

# Apply with backup
npm run db:backup && npm run db:migrate

# Rollback if needed (manual)
psql -f drizzle/migrations/rollback/0003.sql
```

---

## 8.10 Data Validation Rules

### Enforced at Database Level

```sql
-- Email format
ALTER TABLE users ADD CONSTRAINT check_email_format
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$');

-- Role values
ALTER TABLE users ADD CONSTRAINT check_role
CHECK (role IN ('admin', 'teacher', 'student'));

-- Capacity
ALTER TABLE classes ADD CONSTRAINT check_capacity
CHECK (capacity > 0 AND enrolled_count <= capacity);

-- Dates
ALTER TABLE classes ADD CONSTRAINT check_dates
CHECK (end_date IS NULL OR end_date >= start_date);

-- Amount positive
ALTER TABLE payments ADD CONSTRAINT check_amount_positive
CHECK (amount > 0);
```

---

*This completes the database specification. All MCP servers will use this shared schema via the `platform-db` package.*

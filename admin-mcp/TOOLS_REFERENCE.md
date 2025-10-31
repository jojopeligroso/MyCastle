# Admin MCP Tools - Quick Reference

## Tool Catalog

### User Management Tools

#### create-user
Create a new user with roles.

**Required Scope**: `admin.write.user`

**Input**:
```typescript
{
  email: string;           // Valid email address
  fullName: string;        // Full name
  roles: string[];         // At least one role
}
```

**Output**:
```typescript
{
  userId: string;          // UUID of created user
}
```

**Features**:
- Validates email uniqueness
- Assigns primary role
- Emits audit for user creation
- Emits audit for each role assignment

---

#### update-user
Update user profile fields.

**Required Scope**: `admin.write.user`

**Input**:
```typescript
{
  userId: string;          // UUID (required)
  fullName?: string;       // Updated name
  status?: 'active' | 'inactive' | 'suspended';
  roles?: string[];        // Updated roles
}
```

**Output**:
```typescript
{
  updated: boolean;
}
```

**Features**:
- Captures before/after states
- Computes diff hash
- Updates primary role from roles array

---

#### assign-role
Assign a role to a user with escalation guards.

**Required Scope**: `admin.write.role`

**Input**:
```typescript
{
  userId: string;          // UUID (required)
  role: string;            // Role name
}
```

**Output**:
```typescript
{
  assigned: boolean;
}
```

**Features**:
- Prevents privilege escalation
- Only super admins can assign admin roles
- Validates role hierarchy

---

#### search-directory
Search user directory with filters.

**Required Scope**: `admin.read.user`

**Input**:
```typescript
{
  q: string;               // Search query (required)
  role?: string;           // Filter by role
  status?: string;         // Filter by status
  page?: number;           // Page number (default: 1)
  limit?: number;          // Results per page (default: 20, max: 100)
}
```

**Output**:
```typescript
{
  results: Array<{
    id: string;
    email: string;         // Masked unless admin.read.pii
    fullName: string;      // Masked unless admin.read.pii
    role: string;
    status: string;
    createdAt: string;
  }>;
  nextPage?: number;       // Present if more results available
}
```

**Features**:
- Searches name and email
- PII masking based on scope
- Pagination support

---

### Academic Operations Tools

#### create-class
Create a new class with schedule.

**Required Scope**: `admin.write.class`

**Input**:
```typescript
{
  name: string;
  level: string;           // e.g., 'A1', 'A2', 'B1'
  schedule: Array<{
    dayOfWeek: number;     // 0-6 (Sunday-Saturday)
    startTime: string;     // HH:MM format
    endTime: string;       // HH:MM format
    room?: string;
  }>;
  capacity: number;        // Positive integer
}
```

**Output**:
```typescript
{
  classId: string;         // UUID of created class
}
```

**Features**:
- Checks schedule conflicts
- Validates time format
- Supports multiple schedule entries

---

#### plan-roster
Plan a teacher roster assignment.

**Required Scope**: `admin.write.roster`

**Input**:
```typescript
{
  classId: string;         // UUID (required)
  teacherId: string;       // UUID (required)
  start: string;           // ISO 8601 datetime
  end: string;             // ISO 8601 datetime
}
```

**Output**:
```typescript
{
  rosterId: string;        // UUID of created roster
}
```

**Features**:
- Validates teacher availability
- Checks workload limits (max 5 concurrent)
- Verifies teacher role
- Prevents overlapping assignments

---

#### record-attendance
Record attendance for multiple students.

**Required Scope**: `admin.write.attendance`

**Input**:
```typescript
{
  registerDate: string;    // ISO 8601 datetime
  classId: string;         // UUID (required)
  entries: Array<{
    studentId: string;     // UUID
    status: 'present' | 'absent' | 'late' | 'excused';
    note?: string;
  }>;
}
```

**Output**:
```typescript
{
  saved: number;           // Number of records saved
}
```

**Features**:
- Batch insert
- Prevents duplicates
- Emits audit per student
- Shared correlation ID

---

#### adjust-enrolment
Adjust enrolment status with validation.

**Required Scope**: `admin.write.enrolment`

**Input**:
```typescript
{
  enrolmentId: string;     // UUID (required)
  status: 'pending' | 'active' | 'suspended' | 'completed' | 'withdrawn' | 'cancelled';
  note?: string;
}
```

**Output**:
```typescript
{
  status: string;          // New status
}
```

**Features**:
- Validates status transitions
- Enforces state machine
- Terminal states: completed, withdrawn, cancelled

**Valid Transitions**:
- `pending` → `active`, `cancelled`
- `active` → `suspended`, `completed`, `withdrawn`
- `suspended` → `active`, `withdrawn`

---

#### gen-register-csv
Generate class register CSV export.

**Required Scope**: `admin.read.register`

**Input**:
```typescript
{
  classId: string;         // UUID (required)
  week: string;            // ISO 8601 week format (YYYY-Www)
}
```

**Output**:
```typescript
{
  fileUri: string;         // file:/// URI
}
```

**Features**:
- Parses ISO week format
- Masks PII unless `admin.read.pii`
- Outputs to MCP_FILES_DIR
- CSV format: Date, Student ID, Name, Email, Status, Note

---

### Financial Operations Tools

#### ar-snapshot
Generate accounts receivable aging snapshot.

**Required Scope**: `admin.read.finance`

**Input**:
```typescript
{
  asOfDate?: string;       // ISO 8601 datetime (defaults to now)
}
```

**Output**:
```typescript
{
  agingBuckets: {
    current: number;       // Not yet due
    days30: number;        // 1-30 days overdue
    days60: number;        // 31-60 days overdue
    days90: number;        // 61-90 days overdue
    days90Plus: number;    // 90+ days overdue
    total: number;         // Total outstanding
  };
}
```

**Features**:
- Queries outstanding invoices
- Calculates aging buckets
- Rounds to 2 decimal places

---

#### raise-refund-req
Raise a refund request for approval.

**Required Scope**: `admin.write.refund`

**Input**:
```typescript
{
  invoiceId: string;       // UUID (required)
  reason: string;          // Minimum 10 characters
  amount: number;          // Positive number
}
```

**Output**:
```typescript
{
  requestId: string;       // UUID of request
  status: 'pending_approval';
}
```

**Features**:
- Validates refund amount ≤ paid amount
- Creates approval request (doesn't execute)
- Prevents duplicate pending requests

---

### Accommodation Management Tools

#### add-accommodation
Add student accommodation placement.

**Required Scope**: `admin.write.accommodation`

**Input**:
```typescript
{
  studentId: string;       // UUID (required)
  providerId: string;      // UUID (required)
  start: string;           // ISO 8601 datetime
  end: string;             // ISO 8601 datetime
  cost: number;            // Non-negative
}
```

**Output**:
```typescript
{
  placementId: string;     // UUID of placement
}
```

**Features**:
- Checks date overlaps
- Validates provider is active
- Prevents overlapping placements for student

---

#### vendor-status
Update vendor/provider status.

**Required Scope**: `admin.write.vendor`

**Input**:
```typescript
{
  providerId: string;      // UUID (required)
  status: 'active' | 'inactive' | 'suspended' | 'terminated';
}
```

**Output**:
```typescript
{
  updated: boolean;
}
```

**Features**:
- Cascades visibility changes
- Suspends/reactivates related placements
- Shared correlation ID for cascade

**Cascade Behavior**:
- `suspended`/`terminated` → marks future placements as `provider_suspended`
- `active` → reactivates suspended placements

---

### Compliance & Reporting Tools

#### compliance-pack
Generate compliance document ZIP archive.

**Required Scope**: `admin.read.compliance`

**Input**:
```typescript
{
  ownerType: 'student' | 'teacher' | 'class';
  ownerId: string;         // UUID (required)
}
```

**Output**:
```typescript
{
  zipUri: string;          // file:/// URI
}
```

**Features**:
- Collects approved documents only
- Creates ZIP with manifest
- Includes document metadata
- Uses maximum compression

---

#### publish-ops-report
Generate and publish operations report.

**Required Scope**: `admin.write.report`

**Input**:
```typescript
{
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  channels: Array<'files' | 'comms'>;
  audience: string[];      // User IDs or emails
}
```

**Output**:
```typescript
{
  reportUri?: string;      // Present if 'files' channel used
  messageId?: string;      // Present if 'comms' channel used
}
```

**Features**:
- Orchestrates Analytics → Files → Comms MCPs
- Multi-channel distribution
- Generates metrics for period
- Correlation ID for tracking

**Metrics Included**:
- Total users
- Total classes
- New enrolments (in period)
- Attendance records (in period)

---

## Common Patterns

### PII Masking
Tools that mask PII unless `admin.read.pii` scope is present:
- `gen-register-csv`
- `search-directory`

**Masking Format**:
- Email: `j***@example.com`
- Name: `J*** D***`

### Correlation IDs
Tools that use shared correlation IDs for related operations:
- `record-attendance` (batch entries)
- `vendor-status` (cascade effects)
- `publish-ops-report` (MCP orchestration)

### Before/After State Capture
All mutation tools capture before/after states for audit:
- `create-user`, `update-user`, `assign-role`
- `create-class`, `plan-roster`, `adjust-enrolment`
- `raise-refund-req`, `add-accommodation`, `vendor-status`

### Validation Guards
- **Email uniqueness**: `create-user`
- **Date range**: `plan-roster`, `add-accommodation`
- **Role escalation**: `assign-role`
- **Status transitions**: `adjust-enrolment`
- **Overlaps**: `create-class`, `plan-roster`, `add-accommodation`
- **Duplicates**: `record-attendance`, `raise-refund-req`
- **Workload limits**: `plan-roster`

---

## Environment Variables

```bash
# File storage directory for generated files
MCP_FILES_DIR="/tmp/mcp-files"  # Default

# Supabase configuration (required)
SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."  # For admin operations
```

---

## Error Handling

All tools may throw:
- `AuthorizationError` - Missing required scope or privilege escalation attempt
- `ValidationError` - Invalid input data
- `Error` - Operation failures (with descriptive messages)

Example error messages:
```
"Missing required scope: admin.write.user. Actor user-123 has: admin.read.user"
"User with email test@example.com already exists"
"Invalid status transition from 'completed' to 'active'"
"Teacher has 5 conflicting roster assignment(s) during this period"
```

---

## Audit Trail

All tools emit audit entries to stderr in JSON format:
```json
{
  "type": "audit",
  "actor": "user-123",
  "action": "user.create",
  "target": "user/456",
  "scope": "admin.write.user",
  "diffHash": "abc123...",
  "timestamp": "2025-10-30T12:00:00Z",
  "correlationId": "corr-789"
}
```

Actions emitted:
- `user.create`, `user.update`, `user.role.assign`
- `class.create`, `roster.create`, `attendance.record`
- `enrolment.adjust`, `register.export`
- `finance.ar_snapshot`, `refund.request`
- `accommodation.create`, `accommodation.cascade_suspend`, `accommodation.cascade_reactivate`
- `vendor.status_update`
- `compliance.pack_generate`
- `directory.search`
- `report.generate`, `report.publish.files`, `report.publish.comms`

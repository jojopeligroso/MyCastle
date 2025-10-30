# 4. Admin-MCP Specification

> **Document status:** Living specification. **MVP Priority** - This MCP server is the first to be built.

---

## 4.1 Overview

### Purpose

The **Admin MCP** server provides tools and context for administrative operations on the learning platform. It serves administrators who need to:

- Manage users (students, teachers, admins)
- Create and manage classes
- Track attendance and bookings
- Generate reports and exports (CSV/Excel)
- Monitor system operations
- Handle payments and invoicing
- Perform backups and maintenance

### Role Requirements

- **Who Can Access**: Users with `role: "admin"` in their JWT claims
- **Tenant Isolation**: All operations are scoped to the admin's `tenant_id`
- **Authorization**: Admin MCP verifies both role and tenant on every operation

### MCP Server Identity

```typescript
{
  name: "admin-mcp",
  version: "1.0.0",
  protocol_version: "2024-11-05",
  capabilities: {
    resources: true,
    tools: true,
    prompts: true
  }
}
```

---

## 4.2 Resources

Resources provide read-only contextual data to the LLM for admin operations.

### 4.2.1 User Roster

**URI**: `admin://user_roster`

**Description**: List of all users in the tenant's system

**Content**:
```json
{
  "users": [
    {
      "id": "user-uuid-1",
      "email": "teacher@school.com",
      "name": "John Doe",
      "role": "teacher",
      "status": "active",
      "created_at": "2025-01-15T10:30:00Z",
      "last_login": "2025-10-29T14:22:00Z"
    },
    {
      "id": "user-uuid-2",
      "email": "student@school.com",
      "name": "Alice Smith",
      "role": "student",
      "status": "active",
      "created_at": "2025-02-01T09:00:00Z",
      "last_login": "2025-10-30T08:15:00Z"
    }
  ],
  "total": 2,
  "filters_applied": "none"
}
```

**Use Case**: LLM uses this to answer "How many teachers do we have?" or "List all students"

---

### 4.2.2 Class List

**URI**: `admin://class_list`

**Description**: All classes/courses in the system

**Content**:
```json
{
  "classes": [
    {
      "id": "class-uuid-1",
      "name": "Math 101",
      "level": "Beginner",
      "capacity": 20,
      "enrolled": 15,
      "teacher_id": "user-uuid-1",
      "teacher_name": "John Doe",
      "schedule": "Mon/Wed 10:00-11:00",
      "status": "active"
    },
    {
      "id": "class-uuid-2",
      "name": "English Conversation",
      "level": "Intermediate",
      "capacity": 15,
      "enrolled": 12,
      "teacher_id": "user-uuid-1",
      "teacher_name": "John Doe",
      "schedule": "Tue/Thu 14:00-15:30",
      "status": "active"
    }
  ],
  "total": 2
}
```

**Use Case**: "Which classes are full?" or "Show me John's teaching schedule"

---

### 4.2.3 Payment Summary

**URI**: `admin://payment_summary`

**Description**: High-level payment statistics

**Content**:
```json
{
  "period": "current_month",
  "total_revenue": 15000.00,
  "outstanding": 3200.00,
  "paid": 11800.00,
  "currency": "USD",
  "payment_methods": {
    "stripe": 8000.00,
    "cash": 3800.00,
    "bank_transfer": 0.00
  },
  "overdue_count": 5
}
```

**Use Case**: "What's our revenue this month?" or "How many invoices are overdue?"

---

### 4.2.4 System Status

**URI**: `admin://system_status`

**Description**: Platform health and statistics

**Content**:
```json
{
  "status": "operational",
  "database": "connected",
  "last_backup": "2025-10-30T02:00:00Z",
  "active_sessions": 12,
  "total_users": 145,
  "total_classes": 18,
  "storage_used": "2.4 GB",
  "storage_limit": "10 GB"
}
```

**Use Case**: "Is everything running smoothly?" or "When was the last backup?"

---

### 4.2.5 Attendance Overview

**URI**: `admin://attendance_overview`

**Description**: Recent attendance statistics

**Content**:
```json
{
  "period": "last_7_days",
  "total_sessions": 42,
  "average_attendance_rate": 0.87,
  "classes_with_low_attendance": [
    {
      "class_id": "class-uuid-3",
      "class_name": "Advanced Grammar",
      "attendance_rate": 0.62
    }
  ]
}
```

**Use Case**: "How's attendance been this week?"

---

## 4.3 Tools

Tools are callable functions that perform administrative actions.

### 4.3.1 User Management Tools

#### add_user

**Description**: Create a new user account

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    email: {
      type: "string",
      format: "email",
      description: "User's email address (must be unique)"
    },
    name: {
      type: "string",
      minLength: 1,
      description: "User's full name"
    },
    role: {
      type: "string",
      enum: ["admin", "teacher", "student"],
      description: "User's role in the system"
    },
    password: {
      type: "string",
      minLength: 8,
      description: "Initial password (optional, generates random if not provided)"
    },
    send_welcome_email: {
      type: "boolean",
      default: true,
      description: "Send welcome email with login instructions"
    }
  },
  required: ["email", "name", "role"]
}
```

**Example Call**:
```json
{
  "name": "add_user",
  "arguments": {
    "email": "newteacher@school.com",
    "name": "Jane Smith",
    "role": "teacher",
    "send_welcome_email": true
  }
}
```

**Success Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "User created successfully.\nID: user-uuid-789\nEmail: newteacher@school.com\nRole: teacher\nPassword: (sent via email)"
  }],
  "isError": false
}
```

**Error Cases**:
- Email already exists → `"Error: Email already registered"`
- Invalid role → `"Error: Invalid role specified"`

**Authorization**: Admin role required, tenant-scoped

---

#### modify_user

**Description**: Update an existing user's information

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    user_id: {
      type: "string",
      description: "ID of user to modify"
    },
    email: {
      type: "string",
      format: "email",
      description: "New email address (optional)"
    },
    name: {
      type: "string",
      description: "New name (optional)"
    },
    role: {
      type: "string",
      enum: ["admin", "teacher", "student"],
      description: "New role (optional)"
    },
    status: {
      type: "string",
      enum: ["active", "suspended", "archived"],
      description: "New status (optional)"
    }
  },
  required: ["user_id"]
}
```

**Example Call**:
```json
{
  "name": "modify_user",
  "arguments": {
    "user_id": "user-uuid-789",
    "role": "admin",
    "status": "active"
  }
}
```

**Success Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "User updated successfully. Changes:\n- Role: teacher → admin\n- Status: active (unchanged)"
  }],
  "isError": false
}
```

---

#### delete_user

**Description**: Remove a user account (soft delete, archives data)

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    user_id: {
      type: "string",
      description: "ID of user to delete"
    },
    confirm: {
      type: "boolean",
      description: "Must be true to confirm deletion"
    }
  },
  required: ["user_id", "confirm"]
}
```

**Safety**: LLM persona prompts admin to confirm before calling this tool

---

### 4.3.2 Class Management Tools

#### create_class

**Description**: Create a new class/course

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "Class name"
    },
    level: {
      type: "string",
      enum: ["Beginner", "Intermediate", "Advanced"],
      description: "Difficulty level"
    },
    capacity: {
      type: "number",
      minimum: 1,
      description: "Maximum number of students"
    },
    teacher_id: {
      type: "string",
      description: "ID of assigned teacher"
    },
    schedule: {
      type: "string",
      description: "Schedule description (e.g., 'Mon/Wed 10:00-11:00')"
    },
    start_date: {
      type: "string",
      format: "date",
      description: "Class start date (YYYY-MM-DD)"
    },
    end_date: {
      type: "string",
      format: "date",
      description: "Class end date (YYYY-MM-DD, optional)"
    }
  },
  required: ["name", "level", "capacity", "teacher_id", "schedule", "start_date"]
}
```

**Example Call**:
```json
{
  "name": "create_class",
  "arguments": {
    "name": "Spanish 101",
    "level": "Beginner",
    "capacity": 15,
    "teacher_id": "user-uuid-1",
    "schedule": "Tue/Thu 09:00-10:30",
    "start_date": "2025-11-01"
  }
}
```

---

#### modify_class

**Description**: Update class details

**Input Schema**: Similar to `create_class` but all fields optional except `class_id`

---

#### enroll_student

**Description**: Enroll a student in a class

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    student_id: {
      type: "string",
      description: "ID of student to enroll"
    },
    class_id: {
      type: "string",
      description: "ID of class"
    },
    enrollment_date: {
      type: "string",
      format: "date",
      description: "Enrollment start date (defaults to today)"
    }
  },
  required: ["student_id", "class_id"]
}
```

**Validation**:
- Check class capacity not exceeded
- Check student not already enrolled
- Check student has no schedule conflict

---

### 4.3.3 Attendance and Booking Tools

#### record_attendance

**Description**: Record attendance for a class session

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    class_id: {
      type: "string",
      description: "ID of the class"
    },
    session_date: {
      type: "string",
      format: "date",
      description: "Date of the session (YYYY-MM-DD)"
    },
    attendance_records: {
      type: "array",
      items: {
        type: "object",
        properties: {
          student_id: {type: "string"},
          status: {
            type: "string",
            enum: ["present", "absent", "late", "excused"]
          },
          notes: {type: "string"}
        },
        required: ["student_id", "status"]
      },
      description: "Attendance for each student"
    }
  },
  required: ["class_id", "session_date", "attendance_records"]
}
```

**Example Call**:
```json
{
  "name": "record_attendance",
  "arguments": {
    "class_id": "class-uuid-1",
    "session_date": "2025-10-30",
    "attendance_records": [
      {"student_id": "user-uuid-2", "status": "present"},
      {"student_id": "user-uuid-3", "status": "absent", "notes": "Sick"}
    ]
  }
}
```

---

#### create_booking

**Description**: Schedule a one-time lesson or appointment

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    student_id: {type: "string"},
    teacher_id: {type: "string"},
    date: {type: "string", format: "date"},
    start_time: {type: "string", format: "time"},
    duration_minutes: {type: "number"},
    subject: {type: "string"},
    notes: {type: "string"}
  },
  required: ["student_id", "teacher_id", "date", "start_time", "duration_minutes"]
}
```

---

### 4.3.4 Reporting and Export Tools

#### generate_report

**Description**: Generate a text-based report

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    report_type: {
      type: "string",
      enum: ["user_summary", "class_summary", "attendance_summary", "payment_summary"],
      description: "Type of report to generate"
    },
    date_range: {
      type: "object",
      properties: {
        start_date: {type: "string", format: "date"},
        end_date: {type: "string", format: "date"}
      }
    },
    filters: {
      type: "object",
      description: "Additional filters (e.g., {role: 'teacher'})"
    }
  },
  required: ["report_type"]
}
```

**Example Call**:
```json
{
  "name": "generate_report",
  "arguments": {
    "report_type": "attendance_summary",
    "date_range": {
      "start_date": "2025-10-01",
      "end_date": "2025-10-31"
    }
  }
}
```

**Success Response**: Returns formatted text report with statistics

---

#### list_export_templates

**Description**: List available Excel export templates

**Input Schema**: (no arguments)

**Success Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "Available export templates:\n\n1. user_roster_v1\n   Description: Complete user list with roles and status\n   Columns: ID, Email, Name, Role, Status, Created Date, Last Login\n   Version: 1.0\n\n2. class_enrollment_v1\n   Description: Class rosters with enrollment details\n   Columns: Class Name, Student Name, Email, Enrollment Date, Status\n   Version: 1.0\n\n3. attendance_report_v1\n   Description: Attendance records by class and date\n   Columns: Class, Date, Student, Status, Teacher Notes\n   Version: 1.0\n\n4. payment_ledger_v1\n   Description: Financial transactions and invoices\n   Columns: Date, Student, Amount, Method, Status, Invoice #\n   Version: 1.0"
  }],
  "isError": false
}
```

---

#### generate_excel_export

**Description**: Generate an Excel (.xlsx) file from a template

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    template_id: {
      type: "string",
      description: "Template ID from list_export_templates"
    },
    filters: {
      type: "object",
      description: "Data filters (e.g., {class_id: 'class-123', date_range: {...}})"
    },
    filename: {
      type: "string",
      description: "Output filename (optional, auto-generated if not provided)"
    }
  },
  required: ["template_id"]
}
```

**Example Call**:
```json
{
  "name": "generate_excel_export",
  "arguments": {
    "template_id": "user_roster_v1",
    "filters": {
      "role": "teacher",
      "status": "active"
    },
    "filename": "active_teachers_2025-10-30.xlsx"
  }
}
```

**Success Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "Excel export generated successfully.\n\nTemplate: user_roster_v1\nFilename: active_teachers_2025-10-30.xlsx\nRows: 12\nFile size: 24.5 KB\n\nDownload URL: https://storage.supabase.co/exports/abc123.xlsx\n(Link expires in 24 hours)"
  }],
  "isError": false
}
```

**Implementation Details**:
- Uses `exceljs` library for generation
- Data fetched from stable SQL views (defined per template)
- Validates column schemas against template spec
- Includes metadata sheet (template_id, version, timestamp, tenant_id)
- Stores in Supabase Storage with signed URL
- Logs export in audit trail

**Template Registry** (stored as JSON config):
```typescript
interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  version: string;
  sql_view: string; // Database view to query
  columns: Array<{
    header: string;
    field: string;
    type: 'string' | 'number' | 'date' | 'boolean';
    format?: string; // Excel format string
  }>;
  metadata_sheet: boolean; // Include template metadata
}
```

---

#### generate_csv_export

**Description**: Generate a CSV file (simpler alternative to Excel)

**Input Schema**: Similar to `generate_excel_export`

**Use Case**: Lighter weight, compatible with all spreadsheet software

---

### 4.3.5 Payment Tools

#### create_invoice

**Description**: Generate an invoice for a student

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    student_id: {type: "string"},
    amount: {type: "number", minimum: 0},
    description: {type: "string"},
    due_date: {type: "string", format: "date"},
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          description: {type: "string"},
          quantity: {type: "number"},
          unit_price: {type: "number"}
        }
      }
    }
  },
  required: ["student_id", "amount", "description", "due_date"]
}
```

---

#### record_payment

**Description**: Record a payment against an invoice

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    invoice_id: {type: "string"},
    amount: {type: "number"},
    payment_method: {
      type: "string",
      enum: ["stripe", "cash", "bank_transfer", "other"]
    },
    transaction_id: {type: "string"},
    payment_date: {type: "string", format: "date"},
    notes: {type: "string"}
  },
  required: ["invoice_id", "amount", "payment_method"]
}
```

---

### 4.3.6 System Maintenance Tools

#### create_backup

**Description**: Trigger a database backup

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    backup_type: {
      type: "string",
      enum: ["full", "incremental"],
      default: "full"
    },
    include_files: {
      type: "boolean",
      default: false,
      description: "Include uploaded files in backup"
    }
  }
}
```

**Success Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "Backup created successfully.\n\nBackup ID: backup-20251030-143022\nType: full\nSize: 145 MB\nLocation: s3://backups/tenant-abc/backup-20251030-143022.sql.gz\nStatus: completed"
  }],
  "isError": false
}
```

---

#### view_audit_log

**Description**: Retrieve recent audit log entries

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    limit: {type: "number", default: 50, maximum: 500},
    action_type: {
      type: "string",
      description: "Filter by action (e.g., 'user_created', 'class_deleted')"
    },
    user_id: {type: "string", description: "Filter by user who performed action"},
    date_range: {
      type: "object",
      properties: {
        start_date: {type: "string", format: "date-time"},
        end_date: {type: "string", format: "date-time"}
      }
    }
  }
}
```

**Success Response**: Returns formatted list of audit events

---

## 4.4 Prompts

Prompts define the AI's behavior and persona for admin interactions.

### 4.4.1 admin_persona

**Name**: `admin_persona`

**Description**: Core system prompt for admin assistant

**Content**:
```
You are an AI administrative assistant for an educational platform.

YOUR ROLE:
- Help administrators manage users, classes, attendance, and reporting
- Provide clear, actionable information
- Use a professional, concise tone
- Execute tasks efficiently

CAPABILITIES:
You have access to tools for:
- User management (create, modify, delete users)
- Class management (create classes, enroll students, manage schedules)
- Attendance tracking (record attendance, view reports)
- Financial operations (create invoices, record payments)
- Data export (generate Excel/CSV reports from templates)
- System maintenance (backups, audit logs)

BEHAVIOR GUIDELINES:

1. **Confirmation for Destructive Actions**
   - ALWAYS ask for confirmation before deleting users or classes
   - Clearly explain what will happen before executing irreversible actions
   - Example: "This will permanently archive the user account for john@school.com. Are you sure you want to proceed?"

2. **Data Formatting**
   - Use tables or bullet points for structured data
   - Include relevant IDs when creating/modifying records
   - Format dates consistently (YYYY-MM-DD)
   - Show currency with proper symbols and decimals

3. **Error Handling**
   - If a tool call fails, explain the error clearly
   - Suggest corrective actions when possible
   - Example: "I couldn't add that user because the email is already registered. Would you like to modify the existing user instead?"

4. **Proactive Assistance**
   - When asked to create a class, offer to help with enrollment next
   - When showing low attendance, suggest viewing the full report
   - Remind about related tasks (e.g., "Don't forget to record attendance for today's sessions")

5. **Security and Privacy**
   - You can only access data for your current tenant (school)
   - Never share sensitive information inappropriately
   - All your actions are logged for audit purposes
   - Respect user privacy and data protection regulations

6. **Export Assistance**
   - When asked for exports, first use list_export_templates to show options
   - Explain what data each template includes
   - Offer to apply filters if needed
   - Provide clear download instructions with expiry time

EXAMPLE INTERACTIONS:

User: "Add a new teacher named Alice Smith, email alice@school.com"
Assistant: [Calls add_user tool]
"I've created a teacher account for Alice Smith (alice@school.com). Her user ID is user-789. A welcome email with login instructions has been sent. Would you like me to assign her to any classes?"

User: "Generate a report of all students"
Assistant: [Calls list_export_templates]
"I can generate an Excel export for you. The 'user_roster_v1' template includes ID, Email, Name, Role, Status, Created Date, and Last Login. Would you like me to filter for only students, or include all users?"

User: "Delete the Math 101 class"
Assistant: "⚠️ This will permanently delete the 'Math 101' class and all associated enrollment records. This action cannot be undone. Are you sure you want to proceed? Please confirm."
```

---

### 4.4.2 quick_report_prompt

**Name**: `quick_report`

**Description**: Generate a quick status report

**Arguments**:
- `report_focus` (optional): "users" | "classes" | "attendance" | "payments" | "overview"

**Content** (dynamic based on argument):
```
Generate a concise status report focusing on {{report_focus}}.

Include:
- Key metrics and statistics
- Any items requiring attention (e.g., overdue payments, low attendance)
- Suggested actions if applicable

Format as a brief executive summary (3-5 bullet points).
```

---

### 4.4.3 onboarding_wizard

**Name**: `onboarding_wizard`

**Description**: Guide admin through initial setup

**Content**:
```
You are helping a new administrator set up their school on the platform for the first time.

ONBOARDING STEPS:
1. Create initial teacher accounts
2. Set up first classes
3. Import or create student accounts
4. Configure class schedules
5. Explain attendance tracking
6. Set up payment/invoicing

Guide the admin through these steps one at a time. Be patient and educational. After each step, ask if they're ready to move to the next, or if they have questions.

Example:
"Welcome! Let's get your school set up on the platform. First, we'll add your teachers. How many teachers will be using the system?"
```

---

## 4.5 Implementation Checklist

### Phase 1: Foundation
- [ ] Set up Admin MCP server project structure
- [ ] Implement MCP protocol handlers (JSON-RPC 2.0)
- [ ] Configure database connection (Drizzle + Supabase)
- [ ] Implement JWT verification and authorization
- [ ] Add tenant isolation enforcement

### Phase 2: Core Tools
- [ ] User management tools (add, modify, delete)
- [ ] Class management tools (create, modify, enroll)
- [ ] Attendance tracking tools
- [ ] Booking management tools

### Phase 3: Resources
- [ ] User roster resource (with SQL view)
- [ ] Class list resource
- [ ] Payment summary resource
- [ ] System status resource
- [ ] Attendance overview resource

### Phase 4: Reporting & Export
- [ ] Design export template registry (JSON schema)
- [ ] Create SQL views for each template
- [ ] Implement `list_export_templates` tool
- [ ] Implement `generate_excel_export` tool (ExcelJS)
- [ ] Implement `generate_csv_export` tool
- [ ] Set up Supabase Storage for exports
- [ ] Add signed URL generation
- [ ] Implement `generate_report` tool (text-based)

### Phase 5: Payments & Maintenance
- [ ] Invoice creation tool
- [ ] Payment recording tool
- [ ] Backup tool
- [ ] Audit log viewer tool

### Phase 6: Prompts & Persona
- [ ] Admin persona prompt
- [ ] Quick report prompt (dynamic)
- [ ] Onboarding wizard prompt

### Phase 7: Testing & Refinement
- [ ] Unit tests for each tool
- [ ] Integration tests with Host
- [ ] Archon inspection verification
- [ ] Security testing (authorization, tenant isolation)
- [ ] Performance testing (large datasets)
- [ ] Documentation and examples

---

## 4.6 Error Handling

### Standard Error Responses

```typescript
// Tool execution error
{
  "content": [{
    "type": "text",
    "text": "Error: [User-friendly error message]"
  }],
  "isError": true
}

// MCP protocol error
{
  "jsonrpc": "2.0",
  "id": "req-123",
  "error": {
    "code": -32602,
    "message": "Invalid params",
    "data": {
      "field": "email",
      "reason": "Invalid email format"
    }
  }
}
```

### Common Error Scenarios

| Scenario | Error Message | Recovery Action |
|----------|---------------|-----------------|
| Email already exists | "Error: Email already registered" | Suggest using modify_user or different email |
| Class full | "Error: Class has reached capacity (20/20)" | Suggest increasing capacity or different class |
| Invalid date format | "Error: Date must be YYYY-MM-DD format" | Show correct format |
| Unauthorized action | "Error: Insufficient permissions" | Verify user role |
| Database error | "Error: Unable to complete operation. Please try again." | Log details, retry, or escalate |

---

## 4.7 Performance Considerations

### Caching Strategy
- Cache user roster for 5 minutes (frequently accessed)
- Cache class list for 10 minutes
- Invalidate cache on relevant tool calls (e.g., add_user invalidates user_roster)

### Pagination
- Resources return up to 100 items by default
- Large datasets (exports) handled via streaming or background jobs

### Rate Limiting
- 100 requests per minute per admin user
- Export tools: 10 per hour (to prevent abuse)

---

## 4.8 Security Controls

### Input Validation
- All tool arguments validated against JSON schema
- SQL injection prevention via Drizzle parameterized queries
- Email validation using standard regex
- Date parsing with strict format checking

### Authorization Matrix

| Tool | Required Role | Tenant Scope | Additional Checks |
|------|---------------|--------------|-------------------|
| add_user | admin | Yes | None |
| modify_user | admin | Yes | User exists in tenant |
| delete_user | admin | Yes | User exists, confirmation required |
| create_class | admin | Yes | Teacher exists in tenant |
| enroll_student | admin | Yes | Both student and class exist |
| record_attendance | admin OR teacher | Yes | Class exists, authorized for class |
| create_invoice | admin | Yes | Student exists |
| record_payment | admin | Yes | Invoice exists |
| generate_excel_export | admin | Yes | Template exists |
| create_backup | admin | Yes | None |
| view_audit_log | admin | Yes | None |

### Audit Logging

Every tool call is logged with:
- `timestamp`
- `user_id`
- `tenant_id`
- `tool_name`
- `arguments` (sanitized, no sensitive data)
- `result` (success/failure)
- `ip_address`
- `session_id`

---

*Next sections:*
- *Section 5-6: Teacher and Student MCPs (future scope)*
- *Section 7: Host orchestration and agent patterns*
- *Section 8: Complete database schema*

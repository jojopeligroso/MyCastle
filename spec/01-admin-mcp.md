# 1. Admin MCP Specification

> **Document Status:** Living specification | **MVP Priority** | **Phase:** 1 (Current)
> **Version:** 2.0.0 | **Last Updated:** 2025-10-31

---

## 1.1 Overview

### Purpose

The **Admin MCP** provides comprehensive administrative operations for the ESL learning platform. It serves administrators who manage the entire institutional ecosystem: identity & access, academic programs, scheduling, admissions, finance, compliance, and operations.

### Role Requirements

- **Who Can Access**: Users with `role: "admin"` in their JWT claims
- **Tenant Isolation**: All operations scoped to admin's `tenant_id`
- **Authorization**: JWT verification + scope-based permissions
- **RLS Enforcement**: Row-Level Security policies enforced via Supabase

### MCP Server Identity

```typescript
{
  name: "admin-mcp",
  version: "2.0.0",
  protocol_version: "2024-11-05",
  capabilities: {
    resources: true,
    tools: true,
    prompts: true
  }
}
```

### Transport

- **Development**: STDIO (for AI clients like Claude Desktop, Cursor)
- **Production**: HTTPS with TLS (reverse proxy)

---

## 1.2 Resources

Resources provide read-only contextual data to the LLM.

### 1.2.1 Identity & Access Resources

#### `admin://users`

**Description**: Complete user directory with roles and status

**Schema**:
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "Full Name",
      "role": "admin | teacher | student",
      "status": "active | suspended | inactive",
      "created_at": "ISO8601",
      "last_login": "ISO8601",
      "tenant_id": "uuid"
    }
  ],
  "total": 0,
  "filters_applied": {}
}
```

**Use Case**: "How many active teachers do we have?"

---

#### `admin://roles`

**Description**: Role definitions and permissions matrix

**Schema**:
```json
{
  "roles": [
    {
      "name": "admin",
      "permissions": ["*"],
      "description": "Full system access"
    },
    {
      "name": "teacher",
      "permissions": ["class.read", "class.mark_attendance", "lesson.write"],
      "description": "Teaching staff"
    },
    {
      "name": "student",
      "permissions": ["class.read_own", "homework.submit", "materials.download"],
      "description": "Enrolled learners"
    }
  ]
}
```

---

#### `admin://sessions`

**Description**: Active user sessions and login audit

**Schema**:
```json
{
  "active_sessions": [
    {
      "user_id": "uuid",
      "email": "user@example.com",
      "login_at": "ISO8601",
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "expires_at": "ISO8601"
    }
  ],
  "total_active": 0
}
```

---

### 1.2.2 Academic Resources

#### `admin://programmes`

**Description**: Academic programmes and pathways

**Schema**:
```json
{
  "programmes": [
    {
      "id": "uuid",
      "name": "General English",
      "code": "GE",
      "description": "Core English programme",
      "levels": ["A1", "A2", "B1", "B2", "C1", "C2"],
      "duration_weeks": 12,
      "active": true
    }
  ]
}
```

---

#### `admin://courses`

**Description**: Course catalogue with CEFR mappings

**Schema**:
```json
{
  "courses": [
    {
      "id": "uuid",
      "programme_id": "uuid",
      "name": "English B1 Intermediate",
      "code": "ENG-B1",
      "cefr_level": "B1",
      "syllabus_url": "https://...",
      "hours_per_week": 20,
      "status": "active | archived"
    }
  ]
}
```

---

#### `admin://classes`

**Description**: All class groups with schedules

**Schema**:
```json
{
  "classes": [
    {
      "id": "uuid",
      "course_id": "uuid",
      "name": "B1 Morning Group A",
      "teacher_id": "uuid",
      "room": "Room 3",
      "capacity": 15,
      "enrolled": 12,
      "schedule": {
        "days": ["mon", "tue", "wed", "thu", "fri"],
        "start_time": "09:00",
        "end_time": "13:00"
      },
      "start_date": "2025-01-06",
      "end_date": "2025-03-28",
      "status": "active | completed | cancelled"
    }
  ]
}
```

---

### 1.2.3 Scheduling Resources

#### `admin://timetable`

**Description**: Master timetable with room allocations

**Schema**:
```json
{
  "timetable": [
    {
      "class_id": "uuid",
      "class_name": "B1 Morning A",
      "teacher_id": "uuid",
      "teacher_name": "John Doe",
      "room": "Room 3",
      "day": "monday",
      "start_time": "09:00",
      "end_time": "13:00",
      "recurrence": "weekly"
    }
  ],
  "conflicts": []
}
```

---

#### `admin://rooms`

**Description**: Room inventory and availability

**Schema**:
```json
{
  "rooms": [
    {
      "id": "uuid",
      "name": "Room 3",
      "capacity": 16,
      "equipment": ["projector", "whiteboard", "computer"],
      "accessibility": true,
      "status": "available | maintenance | reserved"
    }
  ]
}
```

---

### 1.2.4 Curriculum Resources

#### `admin://lesson_templates`

**Description**: Approved lesson plan templates

**Schema**:
```json
{
  "templates": [
    {
      "id": "uuid",
      "name": "Grammar Introduction Template",
      "cefr_level": "B1",
      "duration_minutes": 60,
      "objectives": ["Introduce target language", "Controlled practice", "Freer practice"],
      "sections": ["Warm-up", "Presentation", "Practice", "Production", "Homework"],
      "approved_by": "uuid",
      "version": "1.2"
    }
  ]
}
```

---

#### `admin://cefr_descriptors`

**Description**: CEFR competency descriptors

**Schema**:
```json
{
  "descriptors": [
    {
      "level": "B1",
      "skill": "speaking",
      "descriptor": "Can deal with most situations likely to arise whilst travelling...",
      "code": "B1.SPEAK.001"
    }
  ]
}
```

---

### 1.2.5 Attendance Resources

#### `admin://attendance_overview`

**Description**: System-wide attendance summary

**Schema**:
```json
{
  "summary": {
    "total_sessions": 450,
    "total_attendances": 8500,
    "attendance_rate": 94.4,
    "visa_student_rate": 92.1,
    "at_risk_count": 3
  },
  "by_class": [
    {
      "class_id": "uuid",
      "class_name": "B1 Morning A",
      "sessions": 60,
      "rate": 95.2
    }
  ]
}
```

---

#### `admin://visa_risk`

**Description**: Students at risk of visa non-compliance

**Schema**:
```json
{
  "at_risk_students": [
    {
      "student_id": "uuid",
      "name": "Student Name",
      "attendance_rate": 78.5,
      "threshold": 80.0,
      "absences_last_30_days": 8,
      "visa_type": "Student Visa Tier 4",
      "visa_expiry": "2026-06-30",
      "alert_level": "warning | critical"
    }
  ]
}
```

---

### 1.2.6 Admissions & Bookings Resources

#### `admin://enquiries`

**Description**: Prospective student enquiries

**Schema**:
```json
{
  "enquiries": [
    {
      "id": "uuid",
      "name": "Prospective Student",
      "email": "prospect@example.com",
      "phone": "+353...",
      "programme_interest": "General English",
      "level_estimate": "B1",
      "start_date_preference": "2025-01-06",
      "status": "new | contacted | converted | lost",
      "source": "website | referral | agent",
      "created_at": "ISO8601"
    }
  ]
}
```

---

#### `admin://bookings`

**Description**: Student bookings and cohorts

**Schema**:
```json
{
  "bookings": [
    {
      "id": "uuid",
      "student_id": "uuid",
      "programme_id": "uuid",
      "start_date": "2025-01-06",
      "end_date": "2025-03-28",
      "weeks": 12,
      "cohort_type": "exam | non-exam",
      "visa_required": true,
      "status": "pending | confirmed | cancelled | completed",
      "created_at": "ISO8601"
    }
  ]
}
```

---

### 1.2.7 Finance Resources

#### `admin://invoices`

**Description**: Invoice register

**Schema**:
```json
{
  "invoices": [
    {
      "id": "uuid",
      "customer_id": "uuid",
      "invoice_number": "INV-2025-001",
      "amount": 2400.00,
      "currency": "EUR",
      "issued_date": "2025-01-01",
      "due_date": "2025-01-15",
      "status": "draft | sent | paid | overdue | void",
      "line_items": [
        {
          "description": "Tuition - 12 weeks",
          "quantity": 12,
          "unit_price": 200.00,
          "total": 2400.00
        }
      ]
    }
  ]
}
```

---

#### `admin://payments`

**Description**: Payment transaction log

**Schema**:
```json
{
  "payments": [
    {
      "id": "uuid",
      "invoice_id": "uuid",
      "amount": 2400.00,
      "currency": "EUR",
      "method": "card | bank_transfer | cash",
      "paid_at": "ISO8601",
      "reference": "REF-12345",
      "status": "pending | completed | failed | refunded"
    }
  ]
}
```

---

#### `admin://aging_report`

**Description**: Accounts receivable aging analysis

**Schema**:
```json
{
  "aging": {
    "current": 15000.00,
    "30_days": 2500.00,
    "60_days": 800.00,
    "90_days_plus": 300.00,
    "total_outstanding": 18600.00
  },
  "by_customer": [
    {
      "customer_id": "uuid",
      "name": "Customer Name",
      "total_due": 2400.00,
      "overdue_amount": 800.00,
      "days_overdue": 45
    }
  ]
}
```

---

### 1.2.8 Student Lifecycle Resources

#### `admin://enrolments`

**Description**: Active student enrolments

**Schema**:
```json
{
  "enrolments": [
    {
      "id": "uuid",
      "student_id": "uuid",
      "class_id": "uuid",
      "start_date": "2025-01-06",
      "expected_end_date": "2025-03-28",
      "status": "active | deferred | withdrawn | completed",
      "progression": {
        "initial_level": "A2",
        "current_level": "B1",
        "next_level": "B1+"
      }
    }
  ]
}
```

---

### 1.2.9 Accommodation Resources

#### `admin://hosts`

**Description**: Accommodation host families

**Schema**:
```json
{
  "hosts": [
    {
      "id": "uuid",
      "name": "Host Family Name",
      "address": "123 Main St, Dublin",
      "contact_phone": "+353...",
      "contact_email": "host@example.com",
      "capacity": 2,
      "occupied": 1,
      "safeguarding_checked": true,
      "garda_vetting_expiry": "2026-12-31",
      "status": "active | inactive"
    }
  ]
}
```

---

#### `admin://placements`

**Description**: Student accommodation placements

**Schema**:
```json
{
  "placements": [
    {
      "id": "uuid",
      "student_id": "uuid",
      "host_id": "uuid",
      "room_number": "Room 1",
      "start_date": "2025-01-05",
      "end_date": "2025-03-29",
      "status": "active | ended",
      "guardianship_required": false
    }
  ]
}
```

---

### 1.2.10 Quality & CPD Resources

#### `admin://observations`

**Description**: Teacher observation records

**Schema**:
```json
{
  "observations": [
    {
      "id": "uuid",
      "teacher_id": "uuid",
      "observer_id": "uuid",
      "class_id": "uuid",
      "date": "2025-02-15",
      "rating": 4,
      "strengths": ["Clear instructions", "Good rapport"],
      "development_areas": ["Differentiation"],
      "action_points": ["Attend differentiation workshop"],
      "follow_up_date": "2025-03-15"
    }
  ]
}
```

---

### 1.2.11 Compliance & Governance Resources

#### `admin://policies`

**Description**: Policy library

**Schema**:
```json
{
  "policies": [
    {
      "id": "uuid",
      "title": "Data Protection Policy",
      "category": "GDPR | Safeguarding | Health & Safety | Academic",
      "version": "2.1",
      "approved_date": "2024-09-01",
      "review_date": "2025-09-01",
      "document_url": "https://...",
      "status": "active | archived"
    }
  ]
}
```

---

#### `admin://audit_log`

**Description**: System audit trail

**Schema**:
```json
{
  "entries": [
    {
      "id": "uuid",
      "timestamp": "ISO8601",
      "actor_id": "uuid",
      "actor_email": "admin@example.com",
      "action": "user.create",
      "resource_type": "user",
      "resource_id": "uuid",
      "changes": {
        "before": null,
        "after": {"email": "new@example.com", "role": "student"}
      },
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0..."
    }
  ]
}
```

---

## 1.3 Tools

Tools are executable operations with side effects.

### 1.3.1 Identity & Access Tools

#### `create_user`

**Description**: Create a new user account

**Scopes Required**: `admin.write.user`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    email: {
      type: "string",
      format: "email",
      description: "User's email address (used for login)"
    },
    name: {
      type: "string",
      minLength: 1,
      description: "Full name"
    },
    role: {
      type: "string",
      enum: ["admin", "teacher", "student"],
      description: "User role"
    },
    send_invitation: {
      type: "boolean",
      default: true,
      description: "Send email invitation with password setup link"
    }
  },
  required: ["email", "name", "role"]
}
```

**Output Schema**:
```typescript
{
  type: "object",
  properties: {
    success: { type: "boolean" },
    user_id: { type: "string", format: "uuid" },
    message: { type: "string" }
  }
}
```

**Example**:
```json
{
  "email": "teacher@school.ie",
  "name": "Mary Smith",
  "role": "teacher",
  "send_invitation": true
}
```

**Response**:
```json
{
  "success": true,
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "User created successfully. Invitation email sent to teacher@school.ie"
}
```

---

#### `assign_role`

**Description**: Assign or change user role

**Scopes Required**: `admin.write.user`, `admin.write.role`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    user_id: {
      type: "string",
      format: "uuid",
      description: "Target user ID"
    },
    role: {
      type: "string",
      enum: ["admin", "teacher", "student"],
      description: "New role to assign"
    },
    reason: {
      type: "string",
      description: "Reason for role change (audit trail)"
    }
  },
  required: ["user_id", "role"]
}
```

**Guardrails**:
- Cannot remove last admin in tenant
- Escalation to admin requires additional confirmation

---

#### `set_permissions`

**Description**: Grant granular permissions to user

**Scopes Required**: `admin.write.permissions`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    user_id: { type: "string", format: "uuid" },
    permissions: {
      type: "array",
      items: { type: "string" },
      description: "Permission scopes to grant"
    },
    mode: {
      type: "string",
      enum: ["add", "remove", "replace"],
      default: "add"
    }
  },
  required: ["user_id", "permissions"]
}
```

---

#### `revoke_session`

**Description**: Force logout user session

**Scopes Required**: `admin.write.session`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    user_id: { type: "string", format: "uuid" },
    reason: { type: "string", description: "Reason for revocation" }
  },
  required: ["user_id"]
}
```

---

#### `rotate_api_key`

**Description**: Rotate MCP or integration API key

**Scopes Required**: `admin.super`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    service: {
      type: "string",
      enum: ["admin-mcp", "teacher-mcp", "student-mcp", "integration"],
      description: "Which service key to rotate"
    },
    invalidate_previous: {
      type: "boolean",
      default: false,
      description: "Immediately invalidate old key"
    }
  },
  required: ["service"]
}
```

---

### 1.3.2 Programme & Course Tools

#### `create_programme`

**Description**: Create academic programme

**Scopes Required**: `admin.write.programme`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    name: { type: "string", minLength: 1 },
    code: { type: "string", pattern: "^[A-Z]{2,4}$" },
    description: { type: "string" },
    levels: {
      type: "array",
      items: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2"] }
    },
    duration_weeks: { type: "integer", minimum: 1 }
  },
  required: ["name", "code", "levels", "duration_weeks"]
}
```

---

#### `create_course`

**Description**: Create course within programme

**Scopes Required**: `admin.write.course`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    programme_id: { type: "string", format: "uuid" },
    name: { type: "string" },
    code: { type: "string" },
    cefr_level: {
      type: "string",
      enum: ["A1", "A2", "B1", "B2", "C1", "C2"]
    },
    hours_per_week: { type: "integer", minimum: 1 },
    syllabus_url: { type: "string", format: "uri" }
  },
  required: ["programme_id", "name", "code", "cefr_level", "hours_per_week"]
}
```

---

#### `map_cefr`

**Description**: Map course objectives to CEFR descriptors

**Scopes Required**: `admin.write.course`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    course_id: { type: "string", format: "uuid" },
    descriptors: {
      type: "array",
      items: {
        type: "object",
        properties: {
          code: { type: "string", description: "CEFR descriptor code" },
          skill: { type: "string", enum: ["reading", "writing", "listening", "speaking"] }
        }
      }
    }
  },
  required: ["course_id", "descriptors"]
}
```

---

#### `publish_syllabus`

**Description**: Publish course syllabus

**Scopes Required**: `admin.write.course`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    course_id: { type: "string", format: "uuid" },
    syllabus_url: { type: "string", format: "uri" },
    version: { type: "string", pattern: "^\\d+\\.\\d+$" }
  },
  required: ["course_id", "syllabus_url"]
}
```

---

### 1.3.3 Scheduling Tools

#### `schedule_class`

**Description**: Create class schedule

**Scopes Required**: `admin.write.class`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    course_id: { type: "string", format: "uuid" },
    name: { type: "string" },
    capacity: { type: "integer", minimum: 1 },
    schedule: {
      type: "object",
      properties: {
        days: {
          type: "array",
          items: { type: "string", enum: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] }
        },
        start_time: { type: "string", pattern: "^([0-1]\\d|2[0-3]):[0-5]\\d$" },
        end_time: { type: "string", pattern: "^([0-1]\\d|2[0-3]):[0-5]\\d$" }
      },
      required: ["days", "start_time", "end_time"]
    },
    start_date: { type: "string", format: "date" },
    end_date: { type: "string", format: "date" }
  },
  required: ["course_id", "name", "capacity", "schedule", "start_date", "end_date"]
}
```

**Validation**:
- Check room availability
- Detect teacher conflicts
- Verify capacity constraints

---

#### `assign_teacher`

**Description**: Assign teacher to class

**Scopes Required**: `admin.write.class`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    class_id: { type: "string", format: "uuid" },
    teacher_id: { type: "string", format: "uuid" },
    check_availability: { type: "boolean", default: true }
  },
  required: ["class_id", "teacher_id"]
}
```

**Validation**:
- Verify teacher has no schedule conflict
- Check teacher qualifications for course level

---

#### `allocate_room`

**Description**: Assign room to class

**Scopes Required**: `admin.write.class`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    class_id: { type: "string", format: "uuid" },
    room_id: { type: "string", format: "uuid" },
    check_capacity: { type: "boolean", default: true }
  },
  required: ["class_id", "room_id"]
}
```

---

#### `sync_calendar`

**Description**: Sync timetable to external calendar

**Scopes Required**: `admin.write.integration`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    provider: { type: "string", enum: ["google", "microsoft"] },
    calendar_id: { type: "string" },
    sync_mode: { type: "string", enum: ["one_time", "continuous"] }
  },
  required: ["provider", "calendar_id"]
}
```

---

#### `resolve_collision`

**Description**: Resolve scheduling conflict

**Scopes Required**: `admin.write.class`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    conflict_id: { type: "string", format: "uuid" },
    resolution: {
      type: "string",
      enum: ["move_class", "change_teacher", "change_room", "split_class"],
      description: "How to resolve conflict"
    },
    new_time: { type: "string", description: "New schedule time if moving class" }
  },
  required: ["conflict_id", "resolution"]
}
```

---

### 1.3.4 Lesson & Content Tools

#### `register_template`

**Description**: Register approved lesson template

**Scopes Required**: `admin.write.template`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    name: { type: "string" },
    cefr_level: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
    duration_minutes: { type: "integer" },
    objectives: { type: "array", items: { type: "string" } },
    sections: { type: "array", items: { type: "string" } },
    template_url: { type: "string", format: "uri" }
  },
  required: ["name", "cefr_level", "duration_minutes", "sections"]
}
```

---

#### `approve_lesson_plan`

**Description**: Approve teacher-submitted lesson plan

**Scopes Required**: `admin.write.lesson`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    lesson_plan_id: { type: "string", format: "uuid" },
    approved: { type: "boolean" },
    feedback: { type: "string", description: "Feedback to teacher" }
  },
  required: ["lesson_plan_id", "approved"]
}
```

---

#### `link_cefr_descriptor`

**Description**: Link CEFR descriptor to lesson content

**Scopes Required**: `admin.write.lesson`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    lesson_plan_id: { type: "string", format: "uuid" },
    descriptor_code: { type: "string" }
  },
  required: ["lesson_plan_id", "descriptor_code"]
}
```

---

#### `publish_materials`

**Description**: Publish learning materials

**Scopes Required**: `admin.write.materials`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    course_id: { type: "string", format: "uuid" },
    title: { type: "string" },
    file_url: { type: "string", format: "uri" },
    material_type: {
      type: "string",
      enum: ["handout", "worksheet", "presentation", "audio", "video"]
    },
    access_level: {
      type: "string",
      enum: ["public", "enrolled_only", "teacher_only"],
      default: "enrolled_only"
    }
  },
  required: ["course_id", "title", "file_url", "material_type"]
}
```

---

### 1.3.5 Attendance & Compliance Tools

#### `prepare_register`

**Description**: Prepare attendance register for session

**Scopes Required**: `admin.write.attendance`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    class_id: { type: "string", format: "uuid" },
    session_date: { type: "string", format: "date" },
    session_time: { type: "string", pattern: "^([0-1]\\d|2[0-3]):[0-5]\\d$" }
  },
  required: ["class_id", "session_date", "session_time"]
}
```

**Output**: Pre-filled register with expected students

---

#### `record_attendance_bulk`

**Description**: Record attendance for multiple students

**Scopes Required**: `admin.write.attendance`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    register_id: { type: "string", format: "uuid" },
    attendances: {
      type: "array",
      items: {
        type: "object",
        properties: {
          student_id: { type: "string", format: "uuid" },
          status: {
            type: "string",
            enum: ["present", "absent", "late", "excused"]
          },
          notes: { type: "string" }
        },
        required: ["student_id", "status"]
      }
    }
  },
  required: ["register_id", "attendances"]
}
```

---

#### `correct_attendance_admin`

**Description**: Admin correction to attendance record

**Scopes Required**: `admin.write.attendance`, `admin.correct.attendance`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    attendance_id: { type: "string", format: "uuid" },
    new_status: {
      type: "string",
      enum: ["present", "absent", "late", "excused"]
    },
    reason: {
      type: "string",
      description: "Reason for correction (audit trail)"
    }
  },
  required: ["attendance_id", "new_status", "reason"]
}
```

**Guardrails**:
- Corrections logged with timestamp and admin ID
- Original record preserved (immutable audit)

---

#### `visa_compliance_report`

**Description**: Generate visa attendance compliance report

**Scopes Required**: `admin.read.compliance`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    start_date: { type: "string", format: "date" },
    end_date: { type: "string", format: "date" },
    threshold: {
      type: "number",
      minimum: 0,
      maximum: 100,
      default: 80,
      description: "Minimum attendance percentage"
    },
    format: { type: "string", enum: ["json", "csv", "pdf"], default: "json" }
  },
  required: ["start_date", "end_date"]
}
```

**Output**: List of visa students below threshold with action plan

---

#### `export_attendance`

**Description**: Export attendance data

**Scopes Required**: `admin.read.attendance`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    class_id: { type: "string", format: "uuid" },
    start_date: { type: "string", format: "date" },
    end_date: { type: "string", format: "date" },
    format: { type: "string", enum: ["csv", "xlsx", "pdf"], default: "csv" }
  },
  required: ["class_id", "start_date", "end_date"]
}
```

---

### 1.3.6 Admissions & Bookings Tools

#### `create_booking`

**Description**: Create student booking

**Scopes Required**: `admin.write.booking`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    student_id: { type: "string", format: "uuid" },
    programme_id: { type: "string", format: "uuid" },
    start_date: { type: "string", format: "date" },
    weeks: { type: "integer", minimum: 1 },
    cohort_type: { type: "string", enum: ["exam", "non-exam"] },
    visa_required: { type: "boolean" },
    accommodation_required: { type: "boolean", default: false }
  },
  required: ["student_id", "programme_id", "start_date", "weeks", "cohort_type"]
}
```

---

#### `edit_booking`

**Description**: Modify existing booking

**Scopes Required**: `admin.write.booking`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    booking_id: { type: "string", format: "uuid" },
    changes: {
      type: "object",
      properties: {
        start_date: { type: "string", format: "date" },
        weeks: { type: "integer" },
        status: { type: "string", enum: ["pending", "confirmed", "cancelled"] }
      }
    },
    reason: { type: "string", description: "Reason for modification" }
  },
  required: ["booking_id", "changes"]
}
```

---

#### `confirm_intake`

**Description**: Confirm student into cohort

**Scopes Required**: `admin.write.enrolment`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    booking_id: { type: "string", format: "uuid" },
    class_id: { type: "string", format: "uuid" },
    initial_level: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2"] }
  },
  required: ["booking_id", "class_id", "initial_level"]
}
```

---

#### `issue_invoice`

**Description**: Generate invoice for booking

**Scopes Required**: `admin.write.invoice`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    booking_id: { type: "string", format: "uuid" },
    amount: { type: "number", minimum: 0 },
    currency: { type: "string", default: "EUR" },
    due_date: { type: "string", format: "date" },
    line_items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          description: { type: "string" },
          quantity: { type: "number" },
          unit_price: { type: "number" },
          total: { type: "number" }
        },
        required: ["description", "quantity", "unit_price", "total"]
      }
    }
  },
  required: ["booking_id", "amount", "line_items"]
}
```

---

#### `apply_discount`

**Description**: Apply discount to booking/invoice

**Scopes Required**: `admin.write.invoice`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    invoice_id: { type: "string", format: "uuid" },
    discount_type: { type: "string", enum: ["percentage", "fixed"] },
    discount_value: { type: "number", minimum: 0 },
    reason: { type: "string", description: "Reason for discount" }
  },
  required: ["invoice_id", "discount_type", "discount_value", "reason"]
}
```

---

#### `refund_payment`

**Description**: Process payment refund

**Scopes Required**: `admin.write.refund`, `admin.super`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    payment_id: { type: "string", format: "uuid" },
    amount: { type: "number", minimum: 0 },
    reason: { type: "string" },
    approval_token: {
      type: "string",
      description: "Manager approval token for refunds"
    }
  },
  required: ["payment_id", "amount", "reason", "approval_token"]
}
```

**Guardrails**:
- Requires manager override token
- Logged with full audit trail
- Cannot exceed original payment amount

---

### 1.3.7 Finance Tools

#### `reconcile_payouts`

**Description**: Reconcile payment gateway payouts

**Scopes Required**: `admin.write.finance`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    payout_id: { type: "string" },
    expected_amount: { type: "number" },
    actual_amount: { type: "number" },
    reconciliation_date: { type: "string", format: "date" },
    notes: { type: "string" }
  },
  required: ["payout_id", "expected_amount", "actual_amount"]
}
```

---

#### `ledger_export_csv`

**Description**: Export financial ledger

**Scopes Required**: `admin.read.finance`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    start_date: { type: "string", format: "date" },
    end_date: { type: "string", format: "date" },
    account_types: {
      type: "array",
      items: { type: "string", enum: ["revenue", "expense", "liability", "asset"] }
    }
  },
  required: ["start_date", "end_date"]
}
```

---

#### `aging_report`

**Description**: Generate accounts receivable aging report

**Scopes Required**: `admin.read.finance`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    as_of_date: { type: "string", format: "date" },
    format: { type: "string", enum: ["json", "csv", "xlsx"], default: "json" }
  }
}
```

---

### 1.3.8 Student Lifecycle Tools

#### `issue_letter`

**Description**: Issue official letter to student

**Scopes Required**: `admin.write.letter`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    student_id: { type: "string", format: "uuid" },
    letter_type: {
      type: "string",
      enum: ["enrolment", "attendance", "completion", "reference"]
    },
    date_range: {
      type: "object",
      properties: {
        start_date: { type: "string", format: "date" },
        end_date: { type: "string", format: "date" }
      }
    },
    signatory: {
      type: "string",
      description: "Name/title of person signing letter"
    },
    verification_qr: { type: "boolean", default: true }
  },
  required: ["student_id", "letter_type"]
}
```

**Output**: PDF letter with QR verification code

---

#### `approve_deferral`

**Description**: Approve student deferral request

**Scopes Required**: `admin.write.enrolment`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    enrolment_id: { type: "string", format: "uuid" },
    deferral_weeks: { type: "integer", minimum: 1 },
    reason: { type: "string" },
    new_start_date: { type: "string", format: "date" }
  },
  required: ["enrolment_id", "deferral_weeks", "new_start_date"]
}
```

---

#### `award_certificate`

**Description**: Award completion certificate

**Scopes Required**: `admin.write.certificate`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    student_id: { type: "string", format: "uuid" },
    course_id: { type: "string", format: "uuid" },
    completion_date: { type: "string", format: "date" },
    final_level: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
    grade: { type: "string" },
    certificate_type: { type: "string", enum: ["completion", "achievement"] }
  },
  required: ["student_id", "course_id", "completion_date", "final_level"]
}
```

---

### 1.3.9 Accommodation Tools

#### `register_host`

**Description**: Register accommodation host

**Scopes Required**: `admin.write.accommodation`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    name: { type: "string" },
    address: { type: "string" },
    contact_phone: { type: "string" },
    contact_email: { type: "string", format: "email" },
    capacity: { type: "integer", minimum: 1 },
    safeguarding_checked: { type: "boolean" },
    garda_vetting_expiry: { type: "string", format: "date" }
  },
  required: ["name", "address", "contact_phone", "capacity", "safeguarding_checked"]
}
```

**Validation**:
- Safeguarding check must be valid
- Garda vetting required for under-18 students

---

#### `allocate_accommodation`

**Description**: Allocate student to host

**Scopes Required**: `admin.write.accommodation`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    student_id: { type: "string", format: "uuid" },
    host_id: { type: "string", format: "uuid" },
    start_date: { type: "string", format: "date" },
    end_date: { type: "string", format: "date" },
    room_number: { type: "string" },
    guardianship_required: { type: "boolean", default: false }
  },
  required: ["student_id", "host_id", "start_date", "end_date"]
}
```

---

#### `swap_accommodation`

**Description**: Move student between hosts

**Scopes Required**: `admin.write.accommodation`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    placement_id: { type: "string", format: "uuid" },
    new_host_id: { type: "string", format: "uuid" },
    move_date: { type: "string", format: "date" },
    reason: { type: "string" }
  },
  required: ["placement_id", "new_host_id", "move_date", "reason"]
}
```

---

#### `export_placements`

**Description**: Export accommodation placements

**Scopes Required**: `admin.read.accommodation`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    start_date: { type: "string", format: "date" },
    end_date: { type: "string", format: "date" },
    format: { type: "string", enum: ["csv", "xlsx"], default: "csv" }
  },
  required: ["start_date", "end_date"]
}
```

---

### 1.3.10 Quality & CPD Tools

#### `record_observation`

**Description**: Record teacher observation

**Scopes Required**: `admin.write.quality`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    teacher_id: { type: "string", format: "uuid" },
    observer_id: { type: "string", format: "uuid" },
    class_id: { type: "string", format: "uuid" },
    observation_date: { type: "string", format: "date" },
    rating: { type: "integer", minimum: 1, maximum: 5 },
    strengths: { type: "array", items: { type: "string" } },
    development_areas: { type: "array", items: { type: "string" } },
    action_points: { type: "array", items: { type: "string" } },
    follow_up_date: { type: "string", format: "date" }
  },
  required: ["teacher_id", "observer_id", "class_id", "observation_date", "rating"]
}
```

---

#### `assign_cpd`

**Description**: Assign CPD activity to teacher

**Scopes Required**: `admin.write.cpd`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    teacher_id: { type: "string", format: "uuid" },
    activity_name: { type: "string" },
    activity_type: {
      type: "string",
      enum: ["workshop", "course", "conference", "observation", "self_study"]
    },
    deadline: { type: "string", format: "date" },
    mandatory: { type: "boolean", default: false }
  },
  required: ["teacher_id", "activity_name", "activity_type"]
}
```

---

#### `export_quality_report`

**Description**: Export quality assurance report

**Scopes Required**: `admin.read.quality`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    start_date: { type: "string", format: "date" },
    end_date: { type: "string", format: "date" },
    include_observations: { type: "boolean", default: true },
    include_cpd: { type: "boolean", default: true },
    format: { type: "string", enum: ["pdf", "xlsx"], default: "pdf" }
  },
  required: ["start_date", "end_date"]
}
```

---

### 1.3.11 Compliance & Operations Tools

#### `compile_compliance_pack`

**Description**: Compile compliance evidence pack

**Scopes Required**: `admin.read.compliance`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    pack_type: {
      type: "string",
      enum: ["visa", "accreditation", "safeguarding", "data_protection"]
    },
    start_date: { type: "string", format: "date" },
    end_date: { type: "string", format: "date" },
    include_policies: { type: "boolean", default: true },
    include_evidence: { type: "boolean", default: true },
    format: { type: "string", enum: ["zip", "pdf"], default: "zip" }
  },
  required: ["pack_type", "start_date", "end_date"]
}
```

**Output**: ZIP archive with documents, attendance records, policies

---

#### `anonymise_dataset`

**Description**: Anonymise data for GDPR/research

**Scopes Required**: `admin.super`, `admin.write.compliance`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    dataset_type: {
      type: "string",
      enum: ["student_records", "attendance", "financial"]
    },
    date_range: {
      type: "object",
      properties: {
        start_date: { type: "string", format: "date" },
        end_date: { type: "string", format: "date" }
      }
    },
    anonymisation_level: {
      type: "string",
      enum: ["pseudonymisation", "full_anonymisation"],
      default: "pseudonymisation"
    }
  },
  required: ["dataset_type", "date_range"]
}
```

---

#### `backup_db_snapshot`

**Description**: Create database backup

**Scopes Required**: `admin.super`

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
    include_attachments: { type: "boolean", default: false },
    retention_days: { type: "integer", default: 30 }
  }
}
```

---

#### `restore_snapshot`

**Description**: Restore from backup

**Scopes Required**: `admin.super`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    snapshot_id: { type: "string" },
    confirmation_token: {
      type: "string",
      description: "Explicit confirmation required for destructive operation"
    },
    target_environment: {
      type: "string",
      enum: ["production", "staging", "development"],
      default: "development"
    }
  },
  required: ["snapshot_id", "confirmation_token"]
}
```

**Guardrails**:
- Requires explicit confirmation token
- Dry-run mode available
- Cannot restore to production without additional approval

---

#### `policy_check`

**Description**: Check RLS policy compliance

**Scopes Required**: `admin.read.policy`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    table: { type: "string" },
    operation: { type: "string", enum: ["select", "insert", "update", "delete"] },
    user_context: {
      type: "object",
      properties: {
        user_id: { type: "string", format: "uuid" },
        role: { type: "string" },
        tenant_id: { type: "string", format: "uuid" }
      }
    }
  },
  required: ["table", "operation", "user_context"]
}
```

**Output**: Boolean allowed + policy name that would apply

---

### 1.3.12 Communication Tools

#### `bulk_email`

**Description**: Send bulk email using template

**Scopes Required**: `admin.write.comms`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    template_id: { type: "string" },
    recipient_filter: {
      type: "object",
      properties: {
        role: { type: "string", enum: ["student", "teacher", "admin"] },
        class_id: { type: "string", format: "uuid" },
        cohort_id: { type: "string", format: "uuid" }
      }
    },
    variables: {
      type: "object",
      additionalProperties: { type: "string" },
      description: "Template variable substitutions"
    },
    send_at: {
      type: "string",
      format: "date-time",
      description: "Schedule send time (optional)"
    }
  },
  required: ["template_id", "recipient_filter"]
}
```

**Guardrails**:
- Respect quiet hours (20:00 - 08:00)
- Check opt-out status
- Include unsubscribe link
- Audit footer with sender info

---

#### `notify_stakeholders`

**Description**: Send notification to specific users

**Scopes Required**: `admin.write.comms`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    user_ids: {
      type: "array",
      items: { type: "string", format: "uuid" }
    },
    subject: { type: "string" },
    message: { type: "string" },
    channel: {
      type: "string",
      enum: ["email", "sms", "in_app"],
      default: "email"
    },
    priority: {
      type: "string",
      enum: ["low", "normal", "high", "urgent"],
      default: "normal"
    }
  },
  required: ["user_ids", "subject", "message"]
}
```

---

#### `mail_merge_pdf`

**Description**: Generate mail-merged PDF documents

**Scopes Required**: `admin.write.comms`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    template_id: { type: "string" },
    recipients: {
      type: "array",
      items: {
        type: "object",
        properties: {
          student_id: { type: "string", format: "uuid" },
          variables: { type: "object" }
        }
      }
    },
    output_format: { type: "string", enum: ["individual_pdf", "combined_pdf"] }
  },
  required: ["template_id", "recipients"]
}
```

---

## 1.4 Prompts

Prompts provide persona and task templates for the Admin Agent.

### 1.4.1 System Prompt: Admin Agent

```
You are the Admin MCP agent for an ESL learning platform. Your role is to assist administrators with school operations while enforcing security, compliance, and data governance.

**Core Principles:**
1. **Security First**: Enforce Row-Level Security (RLS) and least-privilege access
2. **Auditability**: Log all mutations with who/what/when/why
3. **ISO Alignment**: Follow ISO 27001/27002 standards for data handling
4. **Dry-Run Destructive Ops**: For destructive operations (delete, refund, restore), always propose a dry-run first and request explicit confirmation
5. **Validation**: Validate all inputs; reject invalid data with clear error messages
6. **Idempotency**: Prefer idempotent operations where possible

**Guardrails:**
- Never bypass RLS policies unless explicit admin override with audit trail
- Require explicit confirmation for: user deletion, data restoration, bulk refunds
- For exports > 10,000 rows, use streaming with chunk size 2,000
- For refunds, require invoice link + manager override token
- Respect GDPR: mask PII unless admin has `admin.read.pii` scope

**Tone:**
- Professional, clear, action-oriented
- Explain what you're doing and why
- Provide context for recommendations
- Ask clarifying questions when ambiguous
```

---

### 1.4.2 Task Prompt: Create Term Intake

```
Create a new term intake with the following workflow:

1. **Input Collection**:
   - Term dates (start, end)
   - Class definitions (names, levels, capacities, schedules)
   - Teacher assignments
   - Room allocations
   - Timetable constraints (no teacher/room conflicts)

2. **Validation**:
   - Check for schedule collisions (teachers, rooms)
   - Verify teacher qualifications match course levels
   - Ensure room capacities ≥ class sizes
   - Validate date ranges are sequential

3. **Dry-Run**:
   - Generate proposed timetable
   - Highlight any detected clashes
   - Propose automatic fixes where possible
   - Show summary: X classes, Y teachers, Z rooms

4. **Confirmation**:
   - Display proposed schedule to admin
   - Request explicit confirmation before write
   - On confirmation, execute all creations in transaction
   - Return summary with class IDs and schedule links

5. **Error Handling**:
   - If validation fails, return clear errors with fix suggestions
   - If partial write fails, rollback transaction
   - Log all actions with audit trail
```

---

### 1.4.3 Task Prompt: Visa Risk Report

```
Generate a visa compliance risk report:

1. **Parameters**:
   - Date range (start_date, end_date)
   - Attendance threshold (default: 80%)
   - Risk levels: warning (< 85%), critical (< 80%)

2. **Data Collection**:
   - Query all students with visa_required = true
   - Calculate attendance rate for date range
   - Identify students below threshold
   - Check for consecutive absences

3. **Analysis**:
   - Flag students below threshold
   - Calculate days below compliance
   - Identify trends (improving, declining)
   - List recent absences with dates

4. **Action Plan** (per student):
   - "Contact student immediately" (critical)
   - "Monitor closely" (warning)
   - "Schedule welfare check"
   - "Notify immigration advisor if < 75%"

5. **Export**:
   - Generate CSV with: student_id, name, rate, status, actions
   - Generate PDF summary report
   - Include compliance statement
   - Attach action checklist for admin team

6. **Audit**:
   - Log report generation with parameters
   - Record which admin ran report
   - Store copy in compliance evidence folder
```

---

### 1.4.4 Task Prompt: Bulk Student Import

```
Import students from CSV file:

1. **CSV Validation**:
   - Check headers match expected: [email, name, programme, level, start_date, visa_required]
   - Validate data types and formats
   - Check for required fields
   - Detect duplicates (by email)

2. **Dry-Run Simulation**:
   - Parse all rows
   - Validate each row against schema
   - Check for existing users (by email)
   - Identify rejects with specific reasons:
     - "Invalid email format"
     - "User already exists"
     - "Invalid CEFR level"
     - "Start date in past"
     - "Programme not found"

3. **Report**:
   - Total rows: X
   - Valid: Y
   - Rejects: Z (with reasons)
   - Reject rate: Z/X %

4. **Decision Gate**:
   - If reject rate < 2%: Offer to proceed with valid rows
   - If reject rate ≥ 2%: Return reject list for fixing, do not proceed
   - Require explicit confirmation to proceed

5. **Bulk Insert**:
   - Create users in transaction
   - Send invitation emails (if enabled)
   - Create bookings for each student
   - Assign to classes based on level
   - Return summary with created user IDs

6. **Error Handling**:
   - If any insert fails, rollback entire transaction
   - Log failure with row number and error
   - Return partial success report if rollback
```

---

### 1.4.5 Task Prompt: Issue Enrolment Letters

```
Batch-issue enrolment letters for cohort:

1. **Cohort Selection**:
   - Input: cohort_id or class_id or date range
   - Retrieve all enrolled students

2. **Letter Generation** (per student):
   - Use template: "Enrolment Confirmation Letter"
   - Variables:
     - {student_name}
     - {course_name}
     - {start_date}
     - {end_date}
     - {hours_per_week}
     - {cefr_level}
   - Add signature: {admin_name}, {admin_title}
   - Embed QR verification URL: https://school.ie/verify/{letter_id}

3. **PDF Generation**:
   - Render PDF for each student
   - Include school letterhead
   - Add watermark with issue date
   - Generate unique verification code

4. **Storage**:
   - Save to student's files folder: /students/{student_id}/letters/
   - Update letter registry with issue date
   - Set expiry date (e.g., 6 months)

5. **Distribution**:
   - Option 1: Email PDF to students
   - Option 2: Bulk download ZIP for printing
   - Option 3: Both

6. **Audit**:
   - Log bulk letter issuance
   - Record: count, cohort, date, admin
   - Store copy in compliance archive
```

---

## 1.5 Authorization & Scopes

### Scope Hierarchy

```typescript
// Super Admin (all permissions)
"admin.super"

// User Management
"admin.read.user"
"admin.write.user"
"admin.delete.user"
"admin.read.pii"         // PII access (email, phone, address)
"admin.write.pii"

// Academic Operations
"admin.read.programme"
"admin.write.programme"
"admin.read.course"
"admin.write.course"
"admin.read.class"
"admin.write.class"

// Scheduling
"admin.read.timetable"
"admin.write.timetable"
"admin.write.room"

// Attendance & Compliance
"admin.read.attendance"
"admin.write.attendance"
"admin.correct.attendance"  // Retroactive corrections
"admin.read.compliance"

// Finance
"admin.read.invoice"
"admin.write.invoice"
"admin.read.finance"
"admin.write.finance"
"admin.write.refund"        // Refund permission

// Accommodation
"admin.read.accommodation"
"admin.write.accommodation"

// Quality & CPD
"admin.read.quality"
"admin.write.quality"
"admin.write.cpd"

// Communications
"admin.write.comms"

// System Operations
"admin.write.backup"
"admin.write.restore"
"admin.write.integration"
"admin.read.policy"
"admin.read.audit"
```

---

### RLS Policy Integration

All Admin MCP tools pass the user's JWT to Supabase, which enforces RLS policies:

```sql
-- Example: Users table policy
CREATE POLICY "admin_select_users"
ON users
FOR SELECT
TO authenticated
USING (
  auth.jwt()->>'role' = 'admin'
  AND auth.jwt()->>'tenant_id' = tenant_id::text
);

-- Example: PII masking
CREATE POLICY "admin_pii_masking"
ON users
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN 'admin.read.pii' = ANY(auth.jwt()->'scopes') THEN true
    ELSE (
      -- Mask PII fields
      email IS NULL
      AND phone IS NULL
    )
  END
);
```

---

## 1.6 Error Handling

### Error Codes

```typescript
enum AdminMCPError {
  // Authorization Errors (401-403)
  UNAUTHORIZED = "AUTH_001",
  INSUFFICIENT_SCOPE = "AUTH_002",
  TENANT_MISMATCH = "AUTH_003",

  // Validation Errors (400)
  INVALID_INPUT = "VAL_001",
  MISSING_REQUIRED_FIELD = "VAL_002",
  INVALID_FORMAT = "VAL_003",
  CONSTRAINT_VIOLATION = "VAL_004",

  // Resource Errors (404)
  USER_NOT_FOUND = "RES_001",
  CLASS_NOT_FOUND = "RES_002",
  PROGRAMME_NOT_FOUND = "RES_003",

  // Conflict Errors (409)
  SCHEDULE_CONFLICT = "CONF_001",
  DUPLICATE_EMAIL = "CONF_002",
  CAPACITY_EXCEEDED = "CONF_003",

  // System Errors (500)
  DATABASE_ERROR = "SYS_001",
  EXTERNAL_SERVICE_ERROR = "SYS_002",
  UNEXPECTED_ERROR = "SYS_999"
}
```

### Error Response Format

```typescript
{
  success: false,
  error: {
    code: "AUTH_002",
    message: "Insufficient scope for operation",
    details: {
      required_scope: "admin.write.user",
      user_scopes: ["admin.read.user"]
    },
    suggestion: "Contact your administrator to request elevated permissions"
  }
}
```

---

### Retry Strategy

```typescript
// Retryable errors
const RETRYABLE_ERRORS = [
  "SYS_001",      // Database timeout
  "SYS_002",      // External service unavailable
  "CONF_001"      // Optimistic lock conflict
];

// Retry configuration
{
  max_retries: 3,
  backoff_strategy: "exponential",
  initial_delay_ms: 100,
  max_delay_ms: 5000
}
```

---

## 1.7 Implementation Notes

### Dependencies

- **Supabase Client**: `@supabase/supabase-js` v2.39+
- **JWT Verification**: `jose` v5.1+ (JWKS)
- **Validation**: `zod` v3.22+
- **Excel Export**: `exceljs` v4.3+
- **PDF Generation**: `pdfkit` or `puppeteer`
- **Archive Creation**: `archiver` v7.0+

### Environment Variables

```bash
# Required
JWKS_URI=https://your-project.supabase.co/auth/v1/jwks
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional
JWT_AUDIENCE=admin-mcp
MCP_TRANSPORT=stdio|http
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info|debug
```

### Deployment

**Development**:
```bash
npm run dev:stdio    # For Claude Desktop, Cursor
npm run dev:http     # For web/API access
```

**Production**:
```bash
npm run build
npm start            # HTTPS transport
```

### Performance Considerations

- **Pagination**: All list operations support offset/limit
- **Streaming**: Large exports (>10k rows) use streaming
- **Caching**: Resource data cached for 60 seconds
- **Rate Limiting**: 100 requests/minute per user
- **Timeout**: Tool calls timeout after 30 seconds

---

## 1.8 Testing

### Unit Tests

```typescript
// Example: Test create_user tool
describe('create_user', () => {
  it('should create user with valid input', async () => {
    const result = await adminMCP.callTool('create_user', {
      email: 'test@example.com',
      name: 'Test User',
      role: 'student'
    });

    expect(result.success).toBe(true);
    expect(result.user_id).toBeDefined();
  });

  it('should reject duplicate email', async () => {
    await expect(
      adminMCP.callTool('create_user', {
        email: 'existing@example.com',
        name: 'Duplicate',
        role: 'student'
      })
    ).rejects.toThrow('DUPLICATE_EMAIL');
  });
});
```

### Integration Tests

```typescript
// Test full workflow: Create term intake
describe('term intake workflow', () => {
  it('should create classes, assign teachers, allocate rooms', async () => {
    // Create programme
    const programme = await adminMCP.callTool('create_programme', {...});

    // Create course
    const course = await adminMCP.callTool('create_course', {...});

    // Schedule class
    const classResult = await adminMCP.callTool('schedule_class', {...});

    // Assign teacher
    await adminMCP.callTool('assign_teacher', {...});

    // Allocate room
    await adminMCP.callTool('allocate_room', {...});

    // Verify timetable
    const timetable = await adminMCP.readResource('admin://timetable');
    expect(timetable.conflicts).toHaveLength(0);
  });
});
```

---

## 1.9 Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2025-10-31 | Complete specification rewrite with comprehensive resources, tools, and prompts |
| 1.0.0 | 2025-10-30 | Initial MVP specification |

---

**Document Status**: Complete - Ready for Implementation
**Next Steps**: Begin implementation of tools in `/admin-mcp/src/core/tools/`

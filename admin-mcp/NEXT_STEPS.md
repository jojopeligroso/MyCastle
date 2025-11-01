# Admin MCP - Next Implementation Steps

> **Priority**: High-priority items needed for MVP completion
> **Timeline**: 1-2 weeks for critical items

---

## Critical Missing Tools (MVP)

### 1. Assign Teacher Tool

**Priority**: 🔴 HIGH - Needed for class operations

**File**: `src/core/tools/assign-teacher.ts`

**Spec Reference**: Section 1.3.3 (Scheduling Tools)

#### Implementation Template

```typescript
import { z } from 'zod';
import type { AdminContext, MCPTool } from '../../types/index.js';
import { requireScope, SCOPES } from '../auth/scopes.js';
import { createSupabaseClient } from '../../lib/supabase.js';
import { audit, generateCorrelationId } from '../audit/index.js';

export const AssignTeacherInputSchema = z.object({
  class_id: z.string().uuid('Valid class ID required'),
  teacher_id: z.string().uuid('Valid teacher ID required'),
  check_availability: z.boolean().default(true),
});

export const AssignTeacherOutputSchema = z.object({
  assigned: z.boolean(),
  conflicts: z.array(z.string()).optional(),
});

export const assignTeacherMetadata: MCPTool = {
  name: 'assign-teacher',
  description: 'Assign teacher to class. Checks for schedule conflicts. Requires admin.write.class scope.',
  inputSchema: {
    type: 'object',
    properties: {
      class_id: {
        type: 'string',
        format: 'uuid',
        description: 'ID of the class',
      },
      teacher_id: {
        type: 'string',
        format: 'uuid',
        description: 'ID of the teacher to assign',
      },
      check_availability: {
        type: 'boolean',
        default: true,
        description: 'Check for schedule conflicts',
      },
    },
    required: ['class_id', 'teacher_id'],
  },
};

export async function executeAssignTeacher(
  context: AdminContext,
  input: z.infer<typeof AssignTeacherInputSchema>
): Promise<z.infer<typeof AssignTeacherOutputSchema>> {
  const validated = AssignTeacherInputSchema.parse(input);
  requireScope(context, SCOPES.ADMIN_WRITE_CLASS);

  const supabase = createSupabaseClient(context.supabaseToken);

  // 1. Verify class exists
  const { data: classData, error: classError } = await supabase
    .from('classes')
    .select('*')
    .eq('id', validated.class_id)
    .single();

  if (classError || !classData) {
    throw new Error(`Class not found: ${validated.class_id}`);
  }

  // 2. Verify teacher exists and has teacher role
  const { data: teacherData, error: teacherError } = await supabase
    .from('users')
    .select('*')
    .eq('id', validated.teacher_id)
    .single();

  if (teacherError || !teacherData) {
    throw new Error(`Teacher not found: ${validated.teacher_id}`);
  }

  if (teacherData.role !== 'teacher' && teacherData.role !== 'admin') {
    throw new Error(`User ${validated.teacher_id} is not a teacher`);
  }

  // 3. Check for schedule conflicts (if enabled)
  const conflicts: string[] = [];
  if (validated.check_availability && classData.schedule) {
    // Query other classes this teacher is assigned to
    const { data: teacherClasses } = await supabase
      .from('classes')
      .select('*')
      .eq('teacher_id', validated.teacher_id)
      .neq('id', validated.class_id)
      .eq('status', 'active');

    if (teacherClasses) {
      for (const otherClass of teacherClasses) {
        if (otherClass.schedule) {
          // Check for time overlap
          const hasOverlap = checkScheduleOverlap(
            classData.schedule,
            otherClass.schedule
          );
          if (hasOverlap) {
            conflicts.push(
              `Schedule conflict with class "${otherClass.name}" (${otherClass.id})`
            );
          }
        }
      }
    }
  }

  // 4. If conflicts found and checking enabled, warn but don't block
  if (conflicts.length > 0) {
    console.warn(`Warning: ${conflicts.length} schedule conflict(s) detected`);
  }

  // 5. Capture before state
  const before = { teacher_id: classData.teacher_id };

  // 6. Assign teacher
  const { error: updateError } = await supabase
    .from('classes')
    .update({ teacher_id: validated.teacher_id })
    .eq('id', validated.class_id);

  if (updateError) {
    throw new Error(`Failed to assign teacher: ${updateError.message}`);
  }

  // 7. Capture after state
  const { data: after } = await supabase
    .from('classes')
    .select('*')
    .eq('id', validated.class_id)
    .single();

  // 8. Audit log
  audit({
    actor: context.actorId,
    action: 'class.assign_teacher',
    target: `class/${validated.class_id}/teacher/${validated.teacher_id}`,
    scope: SCOPES.ADMIN_WRITE_CLASS,
    before,
    after,
    correlationId: generateCorrelationId(),
  });

  return {
    assigned: true,
    conflicts: conflicts.length > 0 ? conflicts : undefined,
  };
}

/**
 * Check if two schedules overlap
 */
function checkScheduleOverlap(
  schedule1: any[],
  schedule2: any[]
): boolean {
  for (const s1 of schedule1) {
    for (const s2 of schedule2) {
      // Same day of week
      if (s1.dayOfWeek === s2.dayOfWeek) {
        // Check time overlap
        const start1 = parseTime(s1.startTime);
        const end1 = parseTime(s1.endTime);
        const start2 = parseTime(s2.startTime);
        const end2 = parseTime(s2.endTime);

        if (start1 < end2 && start2 < end1) {
          return true; // Overlap detected
        }
      }
    }
  }
  return false;
}

/**
 * Parse time string (HH:MM) to minutes since midnight
 */
function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}
```

#### Registration Steps

1. Export from `src/core/tools/index.ts`:
```typescript
export * from './assign-teacher.js';
import { assignTeacherMetadata } from './assign-teacher.js';

export const toolRegistry: MCPTool[] = [
  // ... existing tools
  assignTeacherMetadata,
];
```

2. Add to server routing in `src/core/server.ts`:
```typescript
import { executeAssignTeacher } from './tools/assign-teacher.js';

case 'assign-teacher':
  return await executeAssignTeacher(context, request.params.arguments);
```

3. Add scope to `src/core/auth/scopes.ts` (if not exists):
```typescript
export const SCOPES = {
  // ... existing scopes
  ADMIN_WRITE_CLASS: 'admin.write.class',
} as const;
```

---

### 2. Correct Attendance Admin Tool

**Priority**: 🔴 HIGH - Needed for attendance corrections

**File**: `src/core/tools/correct-attendance-admin.ts`

**Spec Reference**: Section 1.3.5 (Attendance Tools)

#### Implementation Template

```typescript
import { z } from 'zod';
import type { AdminContext, MCPTool } from '../../types/index.js';
import { requireScope, requireAnyScope, SCOPES } from '../auth/scopes.js';
import { createSupabaseClient } from '../../lib/supabase.js';
import { audit, generateCorrelationId } from '../audit/index.js';

export const CorrectAttendanceInputSchema = z.object({
  attendance_id: z.string().uuid('Valid attendance ID required'),
  new_status: z.enum(['present', 'absent', 'late', 'excused']),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

export const CorrectAttendanceOutputSchema = z.object({
  corrected: z.boolean(),
  original_status: z.string(),
  new_status: z.string(),
});

export const correctAttendanceMetadata: MCPTool = {
  name: 'correct-attendance-admin',
  description: 'Admin correction to attendance record. Requires reason and creates immutable audit trail. Requires admin.write.attendance and admin.correct.attendance scopes.',
  inputSchema: {
    type: 'object',
    properties: {
      attendance_id: {
        type: 'string',
        format: 'uuid',
        description: 'ID of the attendance record to correct',
      },
      new_status: {
        type: 'string',
        enum: ['present', 'absent', 'late', 'excused'],
        description: 'New attendance status',
      },
      reason: {
        type: 'string',
        minLength: 10,
        description: 'Reason for correction (minimum 10 characters)',
      },
    },
    required: ['attendance_id', 'new_status', 'reason'],
  },
};

export async function executeCorrectAttendance(
  context: AdminContext,
  input: z.infer<typeof CorrectAttendanceInputSchema>
): Promise<z.infer<typeof CorrectAttendanceOutputSchema>> {
  const validated = CorrectAttendanceInputSchema.parse(input);

  // Require both write and correct scopes
  requireAnyScope(context, [
    SCOPES.ADMIN_CORRECT_ATTENDANCE,
    'admin.super',
  ]);

  const supabase = createSupabaseClient(context.supabaseToken);

  // 1. Fetch original attendance record
  const { data: original, error: fetchError } = await supabase
    .from('attendance')
    .select('*')
    .eq('id', validated.attendance_id)
    .single();

  if (fetchError || !original) {
    throw new Error(`Attendance record not found: ${validated.attendance_id}`);
  }

  // 2. Check if status is actually changing
  if (original.status === validated.new_status) {
    throw new Error(
      `Attendance is already marked as "${validated.new_status}". No correction needed.`
    );
  }

  // 3. Capture before state
  const before = {
    status: original.status,
    note: original.note,
  };

  // 4. Update attendance record
  const { error: updateError } = await supabase
    .from('attendance')
    .update({
      status: validated.new_status,
      note: `${original.note || ''}\n[ADMIN CORRECTION by ${context.actorId}]: ${validated.reason}`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', validated.attendance_id);

  if (updateError) {
    throw new Error(`Failed to correct attendance: ${updateError.message}`);
  }

  // 5. Capture after state
  const { data: after } = await supabase
    .from('attendance')
    .select('*')
    .eq('id', validated.attendance_id)
    .single();

  // 6. Create immutable audit entry
  audit({
    actor: context.actorId,
    action: 'attendance.correct',
    target: `attendance/${validated.attendance_id}`,
    scope: SCOPES.ADMIN_CORRECT_ATTENDANCE,
    before,
    after,
    correlationId: generateCorrelationId(),
  });

  // 7. Optional: Log to separate corrections table for compliance
  await supabase.from('attendance_corrections').insert({
    attendance_id: validated.attendance_id,
    corrected_by: context.actorId,
    original_status: original.status,
    new_status: validated.new_status,
    reason: validated.reason,
    corrected_at: new Date().toISOString(),
  });

  return {
    corrected: true,
    original_status: original.status,
    new_status: validated.new_status,
  };
}
```

#### Database Migration for Corrections Table

Create `drizzle/migrations/XXXX_attendance_corrections.sql`:

```sql
-- Track attendance corrections for compliance
CREATE TABLE attendance_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id UUID NOT NULL REFERENCES attendance(id),
  corrected_by UUID NOT NULL REFERENCES users(id),
  original_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  reason TEXT NOT NULL,
  corrected_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for querying corrections
CREATE INDEX idx_attendance_corrections_attendance ON attendance_corrections(attendance_id);
CREATE INDEX idx_attendance_corrections_corrected_by ON attendance_corrections(corrected_by);
CREATE INDEX idx_attendance_corrections_corrected_at ON attendance_corrections(corrected_at DESC);

-- RLS policy (only admins can read)
ALTER TABLE attendance_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_can_read_corrections" ON attendance_corrections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );
```

#### Add New Scope

In `src/core/auth/scopes.ts`:

```typescript
export const SCOPES = {
  // ... existing scopes
  ADMIN_CORRECT_ATTENDANCE: 'admin.correct.attendance',
} as const;
```

---

### 3. Email Invitation Integration

**Priority**: 🟡 MEDIUM - Enhances user creation

**File**: `src/lib/email.ts` (new)

#### Implementation Options

##### Option A: Supabase Auth Invites

```typescript
// src/lib/email.ts
import { createAdminClient } from './supabase.js';

export async function sendUserInvitation(
  email: string,
  role: string,
  invitedBy: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  // Use Supabase auth invite
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: {
      role,
      invited_by: invitedBy,
    },
    redirectTo: `${process.env.APP_URL}/auth/callback`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
```

##### Option B: External Email Service (Resend)

```bash
npm install resend
```

```typescript
// src/lib/email.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendUserInvitation(
  email: string,
  name: string,
  role: string,
  setupLink: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await resend.emails.send({
      from: 'ESL Platform <noreply@yourschool.com>',
      to: email,
      subject: 'Welcome to ESL Platform - Set up your account',
      html: `
        <h1>Welcome to ESL Platform!</h1>
        <p>Hi ${name},</p>
        <p>You've been invited to join ESL Platform as a <strong>${role}</strong>.</p>
        <p>Click the link below to set up your account:</p>
        <a href="${setupLink}">Set up account</a>
        <p>This link expires in 7 days.</p>
      `,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
```

#### Update create-user Tool

In `src/core/tools/create-user.ts`:

```typescript
import { sendUserInvitation } from '../../lib/email.js';

export const CreateUserInputSchema = z.object({
  email: z.string().email('Valid email address is required'),
  fullName: z.string().min(1, 'Full name is required'),
  roles: z.array(z.string()).min(1, 'At least one role is required'),
  send_invitation: z.boolean().default(true), // ADD THIS
});

// In executeCreateUser function, after user creation:

// 9. Send invitation email (if enabled)
if (validated.send_invitation) {
  const inviteResult = await sendUserInvitation(
    validated.email,
    validated.fullName,
    validated.roles[0],
    context.actorId
  );

  if (!inviteResult.success) {
    console.error(`Failed to send invitation: ${inviteResult.error}`);
    // Don't throw - user is created, email failure is not critical
  }
}

// 10. Update return message
return {
  userId: newUser.id,
  message: validated.send_invitation
    ? `User created successfully. Invitation email sent to ${validated.email}`
    : `User created successfully. No invitation sent.`,
};
```

#### Environment Variables

Add to `.env`:

```env
# Email Configuration (choose one)

# Option A: Supabase Auth
APP_URL=https://yourschool.com

# Option B: Resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@yourschool.com
```

---

## Implementation Checklist

### Week 1: Critical Tools

- [ ] Implement `assign-teacher` tool
  - [ ] Create `src/core/tools/assign-teacher.ts`
  - [ ] Add schedule conflict checking
  - [ ] Register in tool registry
  - [ ] Add to server routing
  - [ ] Write unit tests
  - [ ] Test with real data

- [ ] Implement `correct-attendance-admin` tool
  - [ ] Create `src/core/tools/correct-attendance-admin.ts`
  - [ ] Create migration for corrections table
  - [ ] Add correction scope
  - [ ] Register in tool registry
  - [ ] Add to server routing
  - [ ] Write unit tests
  - [ ] Test correction workflow

- [ ] Add email invitation
  - [ ] Choose email provider (Supabase Auth or Resend)
  - [ ] Create `src/lib/email.ts`
  - [ ] Update `create-user` tool
  - [ ] Add environment variables
  - [ ] Test email sending
  - [ ] Handle email failures gracefully

### Week 2: Testing & Documentation

- [ ] Write integration tests
  - [ ] Teacher assignment workflow
  - [ ] Attendance correction workflow
  - [ ] Email invitation flow

- [ ] Update documentation
  - [ ] Add new tools to README
  - [ ] Update TOOLS_REFERENCE.md
  - [ ] Document email configuration
  - [ ] Add troubleshooting guide

- [ ] Database validation
  - [ ] Inspect current schema
  - [ ] Compare with spec
  - [ ] Create missing tables
  - [ ] Add RLS policies
  - [ ] Add indexes

---

## Quick Start Commands

```bash
# Create new tool file
touch src/core/tools/assign-teacher.ts

# Create email library
touch src/lib/email.ts

# Create migration for corrections table
mkdir -p drizzle/migrations
touch drizzle/migrations/$(date +%Y%m%d%H%M%S)_attendance_corrections.sql

# Install email library (if using Resend)
npm install resend

# Run tests
npm test

# Build and test
npm run build
npm run dev:stdio
```

---

## Testing the New Tools

### Test assign-teacher

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "assign-teacher",
    "arguments": {
      "class_id": "class-uuid",
      "teacher_id": "teacher-uuid",
      "check_availability": true
    }
  },
  "id": 1,
  "meta": {
    "authorization": "Bearer YOUR_JWT"
  }
}
```

### Test correct-attendance-admin

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "correct-attendance-admin",
    "arguments": {
      "attendance_id": "attendance-uuid",
      "new_status": "present",
      "reason": "Student was present but marked absent by mistake. Verified with classroom camera footage."
    }
  },
  "id": 2,
  "meta": {
    "authorization": "Bearer YOUR_JWT"
  }
}
```

### Test create-user with email

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "create-user",
    "arguments": {
      "email": "newteacher@school.ie",
      "fullName": "Jane Smith",
      "roles": ["teacher"],
      "send_invitation": true
    }
  },
  "id": 3,
  "meta": {
    "authorization": "Bearer YOUR_JWT"
  }
}
```

---

## Success Criteria

### Assign Teacher
- ✅ Teacher assigned to class successfully
- ✅ Schedule conflicts detected and reported
- ✅ Audit log entry created
- ✅ Cannot assign non-teacher users
- ✅ Class not found returns clear error

### Correct Attendance
- ✅ Attendance status updated
- ✅ Original record preserved
- ✅ Correction logged to audit_logs
- ✅ Correction logged to attendance_corrections table
- ✅ Reason required and validated
- ✅ Admin scope required

### Email Invitation
- ✅ Email sent on user creation (when enabled)
- ✅ Email failure doesn't block user creation
- ✅ Email contains setup link
- ✅ Can disable email sending
- ✅ Email template is professional

---

## Questions? Issues?

Refer to:
- [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) - Full implementation status
- [README_COMPLETE.md](./README_COMPLETE.md) - Complete documentation
- [/esl-mcp-spec/spec/01-admin-mcp.md](/esl-mcp-spec/spec/01-admin-mcp.md) - Official specification

---

**Last Updated**: 2025-11-01
**Priority**: Complete Week 1 tasks for MVP readiness

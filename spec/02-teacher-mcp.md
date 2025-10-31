# 2. Teacher MCP Specification

> **Document Status:** Living specification | **Priority:** Phase 3 (After Admin MCP production)
> **Version:** 2.0.0 | **Last Updated:** 2025-10-31

---

## 2.1 Overview

### Purpose

The **Teacher MCP** provides teaching-focused tools and AI assistance for educators. It streamlines lesson planning, content delivery, assessment, attendance tracking, and student feedback while maintaining strict access boundaries to class-scoped data only.

### Role Requirements

- **Who Can Access**: Users with `role: "teacher"` in their JWT claims
- **Scope Isolation**: Access only to assigned classes and enrolled students
- **Authorization**: JWT verification + class-scoped RLS policies
- **No Cross-Class Access**: Teachers cannot access other teachers' classes without explicit permission

### MCP Server Identity

```typescript
{
  name: "teacher-mcp",
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

- **Development**: STDIO
- **Production**: HTTPS with TLS

---

## 2.2 Resources

Resources provide read-only context for teaching operations.

### 2.2.1 My Timetable

**URI**: `teacher://my_timetable`

**Description**: Teacher's personal schedule

**Schema**:
```json
{
  "timetable": [
    {
      "class_id": "uuid",
      "class_name": "B1 Morning Group A",
      "course": "English B1 Intermediate",
      "room": "Room 3",
      "day": "monday",
      "start_time": "09:00",
      "end_time": "13:00",
      "enrolled_count": 12,
      "capacity": 15
    }
  ],
  "total_hours_week": 20,
  "conflicts": []
}
```

---

### 2.2.2 My Classes

**URI**: `teacher://my_classes`

**Description**: Classes assigned to this teacher

**Schema**:
```json
{
  "classes": [
    {
      "id": "uuid",
      "name": "B1 Morning Group A",
      "course_name": "English B1 Intermediate",
      "cefr_level": "B1",
      "capacity": 15,
      "enrolled": 12,
      "start_date": "2025-01-06",
      "end_date": "2025-03-28",
      "room": "Room 3",
      "schedule": {
        "days": ["mon", "tue", "wed", "thu", "fri"],
        "start_time": "09:00",
        "end_time": "13:00"
      },
      "status": "active"
    }
  ]
}
```

---

### 2.2.3 Class Roster

**URI**: `teacher://class_roster/{class_id}`

**Description**: Student list for specific class

**Schema**:
```json
{
  "class_id": "uuid",
  "class_name": "B1 Morning Group A",
  "students": [
    {
      "id": "uuid",
      "name": "Student Name",
      "email": "student@example.com",
      "cefr_level": "B1",
      "enrolment_date": "2025-01-06",
      "attendance_rate": 95.5,
      "visa_student": true,
      "special_needs": null
    }
  ],
  "total_enrolled": 12
}
```

**Privacy**: Email masked unless teacher has `teacher.read.contact` scope

---

### 2.2.4 Lesson Plans

**URI**: `teacher://lesson_plans`

**Description**: Teacher's lesson plan library

**Schema**:
```json
{
  "lesson_plans": [
    {
      "id": "uuid",
      "title": "Past Simple vs Present Perfect",
      "cefr_level": "B1",
      "duration_minutes": 60,
      "class_id": "uuid",
      "delivery_date": "2025-02-10",
      "status": "approved | pending | draft",
      "objectives": ["Distinguish past simple from present perfect", "Use time markers correctly"],
      "materials_urls": ["https://..."],
      "created_at": "ISO8601"
    }
  ]
}
```

---

### 2.2.5 Materials Library

**URI**: `teacher://materials`

**Description**: Teaching materials and resources

**Schema**:
```json
{
  "materials": [
    {
      "id": "uuid",
      "title": "B1 Grammar Worksheets",
      "type": "worksheet | handout | presentation | audio | video",
      "cefr_level": "B1",
      "file_url": "https://...",
      "file_size_bytes": 2048000,
      "uploaded_at": "ISO8601",
      "shared": false,
      "tags": ["grammar", "present-perfect"]
    }
  ]
}
```

---

### 2.2.6 CEFR Descriptors

**URI**: `teacher://cefr_descriptors/{level}`

**Description**: CEFR competency descriptors for lesson planning

**Schema**:
```json
{
  "level": "B1",
  "descriptors": [
    {
      "code": "B1.SPEAK.001",
      "skill": "speaking",
      "descriptor": "Can deal with most situations likely to arise whilst travelling in an area where the language is spoken.",
      "can_do_statements": [
        "Describe experiences and events",
        "Give reasons and explanations",
        "Express opinions"
      ]
    }
  ]
}
```

---

### 2.2.7 Attendance Registers

**URI**: `teacher://registers/{class_id}`

**Description**: Attendance registers for assigned class

**Schema**:
```json
{
  "class_id": "uuid",
  "registers": [
    {
      "id": "uuid",
      "session_date": "2025-02-10",
      "session_time": "09:00",
      "status": "open | locked | submitted",
      "marked_count": 12,
      "total_expected": 12,
      "visa_absences": 0
    }
  ]
}
```

---

### 2.2.8 Student Progress Notes

**URI**: `teacher://progress_notes/{class_id}`

**Description**: Progress tracking for class students

**Schema**:
```json
{
  "class_id": "uuid",
  "notes": [
    {
      "id": "uuid",
      "student_id": "uuid",
      "student_name": "Student Name",
      "date": "2025-02-10",
      "note_type": "strength | concern | general",
      "content": "Shows good grasp of present perfect; struggles with time markers",
      "action_required": false,
      "created_by": "teacher-uuid"
    }
  ]
}
```

---

### 2.2.9 Homework & Assessments

**URI**: `teacher://homework/{class_id}`

**Description**: Assigned homework and assessments

**Schema**:
```json
{
  "class_id": "uuid",
  "homework": [
    {
      "id": "uuid",
      "title": "Present Perfect Exercise",
      "description": "Complete worksheet on present perfect tense",
      "assigned_date": "2025-02-10",
      "due_date": "2025-02-12",
      "submission_count": 10,
      "total_students": 12,
      "graded_count": 8,
      "status": "active | closed"
    }
  ]
}
```

---

### 2.2.10 CPD Tasks

**URI**: `teacher://cpd_tasks`

**Description**: Professional development tasks

**Schema**:
```json
{
  "cpd_tasks": [
    {
      "id": "uuid",
      "activity_name": "Differentiation Workshop",
      "activity_type": "workshop | course | observation | self_study",
      "deadline": "2025-03-15",
      "mandatory": true,
      "status": "pending | in_progress | completed",
      "completion_date": null
    }
  ]
}
```

---

## 2.3 Tools

Teaching-focused operations.

### 2.3.1 Timetable & Planning Tools

#### `view_timetable`

**Description**: View personal teaching schedule

**Scopes Required**: `teacher.read.own`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    start_date: { type: "string", format: "date" },
    end_date: { type: "string", format: "date" },
    include_conflicts: { type: "boolean", default: true }
  }
}
```

**Output**: Timetable with optional conflict detection

---

#### `request_room_swap`

**Description**: Request room change

**Scopes Required**: `teacher.write.request`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    class_id: { type: "string", format: "uuid" },
    current_room: { type: "string" },
    requested_room: { type: "string" },
    reason: { type: "string" },
    session_dates: {
      type: "array",
      items: { type: "string", format: "date" },
      description: "Specific dates or null for permanent change"
    }
  },
  required: ["class_id", "requested_room", "reason"]
}
```

---

### 2.3.2 Lesson Planning Tools

#### `create_lesson_plan`

**Description**: Create lesson plan (AI-assisted or manual)

**Scopes Required**: `teacher.write.lesson`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    class_id: { type: "string", format: "uuid" },
    title: { type: "string", minLength: 1 },
    delivery_date: { type: "string", format: "date" },
    duration_minutes: { type: "integer", minimum: 15 },
    cefr_level: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
    topic: { type: "string" },
    objectives: {
      type: "array",
      items: { type: "string" },
      description: "Learning objectives"
    },
    ai_generate: {
      type: "boolean",
      default: false,
      description: "Use AI to generate lesson structure"
    },
    template_id: {
      type: "string",
      format: "uuid",
      description: "Base on approved template (optional)"
    }
  },
  required: ["class_id", "title", "delivery_date", "duration_minutes", "cefr_level", "topic"]
}
```

**AI Generation**: If `ai_generate: true`, uses LLM to generate:
- Lesson staging (warm-up, presentation, practice, production)
- Target language examples
- ICQs (Instruction Checking Questions)
- CCQs (Concept Checking Questions)
- Differentiation strategies
- Homework suggestion

**Output**:
```json
{
  "lesson_plan_id": "uuid",
  "status": "draft",
  "preview_url": "https://...",
  "message": "Lesson plan created. Submit for approval or edit draft."
}
```

---

#### `attach_materials`

**Description**: Attach materials to lesson plan

**Scopes Required**: `teacher.write.lesson`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    lesson_plan_id: { type: "string", format: "uuid" },
    material_ids: {
      type: "array",
      items: { type: "string", format: "uuid" }
    }
  },
  required: ["lesson_plan_id", "material_ids"]
}
```

---

#### `map_cefr_objectives`

**Description**: Map CEFR descriptors to lesson

**Scopes Required**: `teacher.write.lesson`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    lesson_plan_id: { type: "string", format: "uuid" },
    descriptor_codes: {
      type: "array",
      items: { type: "string", pattern: "^[A-C][1-2]\\.[A-Z]+\\.\\d{3}$" },
      description: "CEFR descriptor codes (e.g., B1.SPEAK.001)"
    }
  },
  required: ["lesson_plan_id", "descriptor_codes"]
}
```

---

### 2.3.3 Attendance Tools

#### `mark_attendance`

**Description**: Mark attendance for session

**Scopes Required**: `teacher.write.attendance`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    class_id: { type: "string", format: "uuid" },
    session_date: { type: "string", format: "date" },
    session_time: { type: "string", pattern: "^([0-1]\\d|2[0-3]):[0-5]\\d$" },
    attendances: {
      type: "array",
      items: {
        type: "object",
        properties: {
          student_id: { type: "string", format: "uuid" },
          status: { type: "string", enum: ["present", "absent", "late", "excused"] },
          notes: { type: "string" }
        },
        required: ["student_id", "status"]
      }
    }
  },
  required: ["class_id", "session_date", "session_time", "attendances"]
}
```

**Validation**:
- Only students enrolled in class can be marked
- Visa students flagged if absent
- Duplicate attendance prevented

---

#### `quick_register_scan`

**Description**: Quick attendance via QR/NFC scan

**Scopes Required**: `teacher.write.attendance`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    class_id: { type: "string", format: "uuid" },
    session_date: { type: "string", format: "date" },
    session_time: { type: "string" },
    scan_codes: {
      type: "array",
      items: { type: "string", description: "Student QR/NFC codes" }
    }
  },
  required: ["class_id", "session_date", "scan_codes"]
}
```

**Behavior**: Marks scanned students as present; others as absent (with confirmation prompt)

---

### 2.3.4 Student Progress Tools

#### `record_progress_note`

**Description**: Add student progress note

**Scopes Required**: `teacher.write.progress`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    student_id: { type: "string", format: "uuid" },
    class_id: { type: "string", format: "uuid" },
    note_type: { type: "string", enum: ["strength", "concern", "general"] },
    content: { type: "string", minLength: 10 },
    action_required: { type: "boolean", default: false },
    notify_admin: {
      type: "boolean",
      default: false,
      description: "Flag for admin attention (e.g., safeguarding concern)"
    }
  },
  required: ["student_id", "class_id", "note_type", "content"]
}
```

**Guardrails**:
- If `notify_admin: true`, sends notification to admin team
- Notes are private to teaching staff + admin

---

### 2.3.5 Homework & Assessment Tools

#### `assign_homework`

**Description**: Assign homework to class

**Scopes Required**: `teacher.write.homework`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    class_id: { type: "string", format: "uuid" },
    title: { type: "string" },
    description: { type: "string" },
    due_date: { type: "string", format: "date" },
    material_ids: {
      type: "array",
      items: { type: "string", format: "uuid" },
      description: "Attached materials"
    },
    allow_late_submission: { type: "boolean", default: true },
    max_points: { type: "integer", minimum: 0 }
  },
  required: ["class_id", "title", "description", "due_date"]
}
```

---

#### `grade_submission`

**Description**: Grade student homework submission

**Scopes Required**: `teacher.write.grade`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    submission_id: { type: "string", format: "uuid" },
    points_earned: { type: "integer", minimum: 0 },
    feedback: { type: "string" },
    status: { type: "string", enum: ["graded", "needs_revision", "incomplete"] },
    ai_assist_feedback: {
      type: "boolean",
      default: false,
      description: "Use AI to generate formative feedback"
    }
  },
  required: ["submission_id", "points_earned", "status"]
}
```

**AI Assist**: If enabled, generates:
- Strengths identified
- Areas for improvement
- Specific examples from submission
- Constructive feedback tone

---

### 2.3.6 Class Analytics Tools

#### `export_class_csv`

**Description**: Export class data (attendance, grades)

**Scopes Required**: `teacher.read.class`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    class_id: { type: "string", format: "uuid" },
    data_type: {
      type: "string",
      enum: ["attendance", "grades", "roster", "combined"]
    },
    start_date: { type: "string", format: "date" },
    end_date: { type: "string", format: "date" }
  },
  required: ["class_id", "data_type"]
}
```

---

### 2.3.7 Communication Tools

#### `raise_admin_ticket`

**Description**: Submit request to admin

**Scopes Required**: `teacher.write.request`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    category: {
      type: "string",
      enum: ["room_issue", "equipment", "student_concern", "schedule", "other"]
    },
    priority: { type: "string", enum: ["low", "normal", "high", "urgent"] },
    subject: { type: "string" },
    description: { type: "string" },
    class_id: { type: "string", format: "uuid" },
    student_id: {
      type: "string",
      format: "uuid",
      description: "If student-related"
    }
  },
  required: ["category", "priority", "subject", "description"]
}
```

---

## 2.4 Prompts

Teaching assistant persona and templates.

### 2.4.1 System Prompt: Teacher Agent

```
You are the Teacher MCP agent for an ESL learning platform. Your role is to assist teachers with lesson planning, delivery, assessment, and student tracking while respecting class-scoped access boundaries.

**Core Principles:**
1. **Speed & Efficiency**: Optimize for quick lesson prep and minimal admin burden
2. **Quality & Standards**: Ensure CEFR alignment and pedagogical best practices
3. **Class Scope Only**: Access only assigned classes and enrolled students
4. **Privacy**: Respect student data privacy; no cross-class access
5. **Actionable**: Provide clear, practical teaching suggestions

**Capabilities:**
- AI-generated lesson plans (staging, target language, ICQs/CCQs)
- CEFR descriptor mapping
- Attendance tracking with visa flagging
- Progress notes and student analytics
- Homework assignment and grading
- Formative feedback generation

**Guardrails:**
- Cannot access students not enrolled in your classes
- Cannot modify other teachers' lesson plans
- Cannot correct locked attendance registers (request admin)
- Cannot issue official letters (request admin)

**Tone:**
- Supportive, practical, pedagogically sound
- Use teaching terminology (ICQs, CCQs, staging, TTT)
- Provide examples and templates
- Acknowledge time constraints
```

---

### 2.4.2 Task Prompt: AI Lesson Plan Generation

```
Generate a complete lesson plan for:

**Input Parameters:**
- CEFR Level: {level}
- Topic: {topic}
- Duration: {minutes} minutes
- Objectives: {objectives}

**Output Structure:**

1. **Lesson Overview:**
   - Title
   - Level
   - Duration
   - Main aim
   - Subsidiary aims

2. **Target Language:**
   - Form (e.g., "Subject + have/has + past participle")
   - Meaning (when to use vs past simple)
   - Pronunciation (weak forms, stress)
   - Examples (3-5 contextualized sentences)

3. **Staging (with timings):**

   a. **Warm-up (5 min):**
      - Activity description
      - Purpose
      - Materials needed

   b. **Lead-in (10 min):**
      - Context setting
      - Elicitation strategy
      - Visual/audio aids

   c. **Presentation (15 min):**
      - How to present target language
      - Concept Checking Questions (CCQs):
        * "Do we use this for finished time or unfinished time?"
        * "Can we say exactly when it happened?"
      - Drilling strategy

   d. **Controlled Practice (15 min):**
      - Gap-fill or substitution drills
      - Pair work structure
      - ICQs (Instruction Checking Questions):
        * "Are you working alone or in pairs?"
        * "How many sentences do you complete?"

   e. **Freer Practice (10 min):**
      - Communicative task
      - Personalization opportunity
      - Error correction strategy

   f. **Wrap-up (5 min):**
      - Summary
      - Error correction
      - Preview next lesson

4. **Differentiation:**
   - Support for weaker students
   - Extension for stronger students

5. **Homework:**
   - Written exercise (specific instructions)
   - Estimated time: 20 minutes

6. **Materials:**
   - Worksheet (brief description)
   - Visuals needed
   - Audio files (if applicable)

7. **Anticipated Problems & Solutions:**
   - Language: Confusion with past simple
     * Solution: Clear timeline visual, more CCQs
   - Procedure: Students finish controlled practice early
     * Solution: Extra challenge questions prepared

8. **CEFR Alignment:**
   - Descriptor codes: B1.GRAM.012, B1.SPEAK.005
   - Can-do statements addressed
```

---

### 2.4.3 Task Prompt: Prepare Attendance Register

```
Prepare attendance register for class session:

1. **Input:**
   - class_id: {class_id}
   - session_date: {date}
   - session_time: {time}

2. **Actions:**
   - Fetch enrolled students
   - Pre-fill register with expected attendees
   - Flag visa students (highlight in UI)
   - Check recent absence patterns
   - Alert if any student has < 80% recent attendance

3. **Output:**
   - Register ID for marking
   - Student list with:
     * Name
     * Visa status indicator
     * Recent attendance rate
     * Previous session status
   - Warnings for at-risk students

4. **UX:**
   - Quick mark-all-present button
   - Tap student name to toggle absent
   - Add notes for individual students
   - Submit when complete (locks register after 7 days)
```

---

### 2.4.4 Task Prompt: Weekly Class Summary

```
Generate weekly class progress summary:

1. **Data Collection** (class_id: {class_id}, week_ending: {date}):
   - Attendance data
   - Progress notes
   - Homework submissions
   - Lesson topics covered

2. **Per-Student Analysis:**
   - Attendance rate this week
   - Strengths observed
   - Misconceptions or struggles
   - Homework completion
   - Action recommendation

3. **Class-Wide Insights:**
   - Overall attendance rate
   - Common misconceptions to address
   - Topics mastered
   - Topics needing reinforcement

4. **Next Week Plan:**
   - Suggested focus areas
   - Students needing individual attention
   - Differentiation strategies

5. **Export Options:**
   - View in-app
   - Export to admin (for records)
   - Print as PDF
```

---

## 2.5 Authorization & Scopes

### Scope Hierarchy

```typescript
// Teacher Read Scopes
"teacher.read.own"           // Own timetable and profile
"teacher.read.class"         // Assigned class data
"teacher.read.student"       // Enrolled students (limited)
"teacher.read.contact"       // Student contact info (if needed)

// Teacher Write Scopes
"teacher.write.lesson"       // Lesson plans
"teacher.write.attendance"   // Mark attendance
"teacher.write.progress"     // Student progress notes
"teacher.write.homework"     // Assign homework
"teacher.write.grade"        // Grade submissions
"teacher.write.request"      // Submit requests to admin

// Restricted Scopes (require admin approval)
"teacher.read.all_classes"   // Access to all classes (e.g., Director of Studies)
"teacher.write.materials_shared" // Publish materials school-wide
```

---

### RLS Policy Enforcement

```sql
-- Example: Teachers can only access their assigned classes
CREATE POLICY "teacher_select_own_classes"
ON classes
FOR SELECT
TO authenticated
USING (
  auth.jwt()->>'role' = 'teacher'
  AND teacher_id = auth.uid()
  AND auth.jwt()->>'tenant_id' = tenant_id::text
);

-- Example: Teachers can only mark attendance for their classes
CREATE POLICY "teacher_insert_attendance"
ON attendance
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM classes
    WHERE id = class_id
    AND teacher_id = auth.uid()
  )
);
```

---

## 2.6 Error Handling

### Error Codes

```typescript
enum TeacherMCPError {
  // Authorization
  NOT_YOUR_CLASS = "AUTH_101",
  NOT_YOUR_STUDENT = "AUTH_102",
  REGISTER_LOCKED = "AUTH_103",

  // Validation
  INVALID_CEFR_LEVEL = "VAL_101",
  FUTURE_ATTENDANCE_DATE = "VAL_102",
  STUDENT_NOT_ENROLLED = "VAL_103",

  // Conflicts
  LESSON_ALREADY_EXISTS = "CONF_101",
  HOMEWORK_DUE_PAST = "CONF_102"
}
```

---

## 2.7 Implementation Notes

### Dependencies

- **Supabase Client**: `@supabase/supabase-js`
- **JWT Verification**: `jose`
- **Validation**: `zod`
- **AI Integration**: OpenAI API (for lesson generation)
- **PDF Generation**: `pdfkit`

### AI Features

**Lesson Plan Generation** (uses LLM):
```typescript
const prompt = `
Generate a ${duration}-minute ${level} lesson on "${topic}".
Include: staging, target language, ICQs/CCQs, differentiation, homework.
Format: JSON
`;

const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [
    { role: "system", content: "You are an experienced ESL teacher trainer." },
    { role: "user", content: prompt }
  ],
  response_format: { type: "json_object" }
});
```

**Feedback Generation** (uses LLM):
```typescript
const prompt = `
Student submission: "${submission_text}"
Task: "${task_description}"
Level: ${cefr_level}

Provide constructive feedback:
1. Strengths (2-3 points)
2. Areas for improvement (2-3 points with examples)
3. Specific suggestions

Tone: Encouraging, formative, specific
`;
```

---

## 2.8 Testing

### Unit Tests

```typescript
describe('create_lesson_plan', () => {
  it('should generate AI lesson plan for B1 grammar topic', async () => {
    const result = await teacherMCP.callTool('create_lesson_plan', {
      class_id: 'test-class-id',
      title: 'Present Perfect',
      delivery_date: '2025-02-15',
      duration_minutes: 60,
      cefr_level: 'B1',
      topic: 'Present Perfect vs Past Simple',
      ai_generate: true
    });

    expect(result.lesson_plan_id).toBeDefined();
    expect(result.status).toBe('draft');
  });
});
```

---

## 2.9 Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2025-10-31 | Complete specification with AI features, comprehensive tools, and prompts |
| 1.0.0 | 2025-10-30 | Initial specification |

---

**Document Status**: Complete - Ready for Phase 3 Implementation
**Dependencies**: Admin MCP must be production-ready first
**Next Steps**: Implement after Admin MCP + Identity MCP + Payments MCP are stable

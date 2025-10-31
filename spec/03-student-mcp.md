# 3. Student MCP Specification

> **Document Status:** Living specification | **Priority:** Phase 3 (After Teacher MCP)
> **Version:** 2.0.0 | **Last Updated:** 2025-10-31

---

## 3.1 Overview

### Purpose

The **Student MCP** provides AI-powered learning assistance, personalized tutoring, progress tracking, and administrative self-service for enrolled students. It creates a supportive, private learning environment with strict data boundaries.

### Role Requirements

- **Who Can Access**: Users with `role: "student"` in their JWT claims
- **Scope Isolation**: Access only to own data, assigned classes, and course materials
- **Privacy Protection**: Cannot access other students' data
- **Authorization**: JWT verification + self-scoped RLS policies

### MCP Server Identity

```typescript
{
  name: "student-mcp",
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

## 3.2 Resources

Resources provide student-scoped context.

### 3.2.1 My Profile

**URI**: `student://profile`

**Description**: Student's personal profile

**Schema**:
```json
{
  "id": "uuid",
  "name": "Student Name",
  "email": "student@example.com",
  "date_of_birth": "1998-05-15",
  "nationality": "Brazil",
  "phone": "+353...",
  "emergency_contact": {
    "name": "Emergency Contact",
    "phone": "+55...",
    "relationship": "Parent"
  },
  "visa_status": {
    "required": true,
    "type": "Student Visa Tier 4",
    "expiry_date": "2026-06-30",
    "compliance_status": "compliant | at_risk"
  },
  "enrolment": {
    "start_date": "2025-01-06",
    "end_date": "2025-03-28",
    "programme": "General English",
    "initial_level": "A2",
    "current_level": "B1"
  }
}
```

**Privacy**: Sensitive data (DOB, visa info) only accessible by student

---

### 3.2.2 My Schedule

**URI**: `student://schedule`

**Description**: Student's class timetable

**Schema**:
```json
{
  "timetable": [
    {
      "class_id": "uuid",
      "class_name": "B1 Morning Group A",
      "teacher_name": "John Doe",
      "room": "Room 3",
      "day": "monday",
      "start_time": "09:00",
      "end_time": "13:00",
      "course": "English B1 Intermediate"
    }
  ],
  "total_hours_week": 20,
  "next_session": {
    "date": "2025-02-10",
    "time": "09:00",
    "class_name": "B1 Morning Group A",
    "room": "Room 3"
  }
}
```

---

### 3.2.3 Course Materials

**URI**: `student://materials`

**Description**: Downloadable learning materials

**Schema**:
```json
{
  "materials": [
    {
      "id": "uuid",
      "title": "B1 Grammar Workbook",
      "type": "handout | worksheet | presentation | audio | video",
      "course": "English B1 Intermediate",
      "uploaded_date": "2025-02-01",
      "file_url": "https://...",
      "file_size_bytes": 2048000,
      "tags": ["grammar", "present-perfect"]
    }
  ],
  "total_materials": 15
}
```

---

### 3.2.4 My Homework

**URI**: `student://homework`

**Description**: Assigned homework and submissions

**Schema**:
```json
{
  "homework": [
    {
      "id": "uuid",
      "title": "Present Perfect Exercise",
      "description": "Complete worksheet on present perfect tense",
      "assigned_date": "2025-02-10",
      "due_date": "2025-02-12",
      "status": "pending | submitted | graded | overdue",
      "submission_id": "uuid",
      "grade": {
        "points_earned": 18,
        "max_points": 20,
        "feedback": "Excellent use of time markers. Watch for spelling.",
        "graded_date": "2025-02-13"
      }
    }
  ],
  "pending_count": 2,
  "overdue_count": 0
}
```

---

### 3.2.5 My Grades

**URI**: `student://grades`

**Description**: Academic performance summary

**Schema**:
```json
{
  "grades": [
    {
      "assignment": "Present Perfect Exercise",
      "date": "2025-02-13",
      "points_earned": 18,
      "max_points": 20,
      "percentage": 90.0,
      "feedback": "Excellent use of time markers."
    }
  ],
  "overall_average": 87.5,
  "trend": "improving | stable | declining"
}
```

---

### 3.2.6 My Attendance

**URI**: `student://attendance`

**Description**: Attendance record and compliance

**Schema**:
```json
{
  "summary": {
    "total_sessions": 45,
    "present": 43,
    "absent": 1,
    "late": 1,
    "attendance_rate": 95.6,
    "visa_threshold": 80.0,
    "compliance_status": "compliant"
  },
  "recent_sessions": [
    {
      "date": "2025-02-10",
      "class": "B1 Morning Group A",
      "status": "present",
      "notes": null
    },
    {
      "date": "2025-02-09",
      "class": "B1 Morning Group A",
      "status": "late",
      "notes": "Arrived 15 minutes late"
    }
  ],
  "warnings": []
}
```

---

### 3.2.7 My Progress

**URI**: `student://progress`

**Description**: Learning progress tracking

**Schema**:
```json
{
  "current_level": "B1",
  "started_level": "A2",
  "weeks_enrolled": 6,
  "skills_progress": {
    "reading": {
      "level": "B1",
      "strength": "moderate",
      "recent_feedback": "Good comprehension of main ideas"
    },
    "writing": {
      "level": "B1",
      "strength": "strong",
      "recent_feedback": "Excellent paragraph structure"
    },
    "listening": {
      "level": "B1-",
      "strength": "developing",
      "recent_feedback": "Practice with faster speech needed"
    },
    "speaking": {
      "level": "B1",
      "strength": "strong",
      "recent_feedback": "Confident and fluent"
    }
  },
  "next_level_readiness": {
    "target_level": "B1+",
    "estimated_weeks": 4,
    "criteria_met": 3,
    "criteria_total": 5
  }
}
```

---

### 3.2.8 My Invoices & Payments

**URI**: `student://invoices`

**Description**: Financial account summary

**Schema**:
```json
{
  "invoices": [
    {
      "id": "uuid",
      "invoice_number": "INV-2025-001",
      "amount": 2400.00,
      "currency": "EUR",
      "issued_date": "2025-01-01",
      "due_date": "2025-01-15",
      "status": "paid | pending | overdue",
      "paid_amount": 2400.00,
      "paid_date": "2025-01-10"
    }
  ],
  "balance_due": 0.00,
  "next_payment_date": null
}
```

---

### 3.2.9 My Accommodation

**URI**: `student://accommodation`

**Description**: Accommodation placement details

**Schema**:
```json
{
  "placement": {
    "host_name": "Host Family Name",
    "address": "123 Main St, Dublin 2",
    "contact_phone": "+353...",
    "room": "Room 1",
    "start_date": "2025-01-05",
    "end_date": "2025-03-29",
    "status": "active",
    "house_rules_url": "https://..."
  },
  "emergency_contact": {
    "name": "Host Name",
    "phone": "+353..."
  }
}
```

---

### 3.2.10 Support Requests

**URI**: `student://support_requests`

**Description**: Student's support ticket history

**Schema**:
```json
{
  "requests": [
    {
      "id": "uuid",
      "category": "academic | accommodation | financial | technical | other",
      "subject": "Request for Enrolment Letter",
      "description": "Need letter for GNIB appointment",
      "status": "open | in_progress | resolved | closed",
      "created_at": "2025-02-08",
      "resolved_at": null,
      "response": null
    }
  ]
}
```

---

## 3.3 Tools

Student-focused operations and AI tutoring.

### 3.3.1 Schedule & Timetable Tools

#### `view_timetable`

**Description**: View personal class schedule

**Scopes Required**: `student.read.own`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    start_date: { type: "string", format: "date" },
    end_date: { type: "string", format: "date" },
    include_upcoming_only: { type: "boolean", default: true }
  }
}
```

**Output**: Timetable with next session highlighted

---

### 3.3.2 Learning Materials Tools

#### `download_materials`

**Description**: Download course materials

**Scopes Required**: `student.read.materials`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    material_id: { type: "string", format: "uuid" }
  },
  required: ["material_id"]
}
```

**Output**: Presigned download URL (expires in 1 hour)

---

### 3.3.3 Homework & Submission Tools

#### `submit_homework`

**Description**: Submit homework assignment

**Scopes Required**: `student.write.homework`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    homework_id: { type: "string", format: "uuid" },
    submission_type: {
      type: "string",
      enum: ["text", "file_upload", "link"]
    },
    content: {
      type: "string",
      description: "Text content or file URL"
    },
    late_reason: {
      type: "string",
      description: "Reason if submitting after due date"
    }
  },
  required: ["homework_id", "submission_type", "content"]
}
```

**Validation**:
- Check homework exists and belongs to student's class
- Flag if past due date
- Prevent duplicate submissions

---

#### `view_grades`

**Description**: View assignment grades and feedback

**Scopes Required**: `student.read.own`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    assignment_id: {
      type: "string",
      format: "uuid",
      description: "Specific assignment or null for all"
    }
  }
}
```

---

### 3.3.4 AI Tutoring Tools

#### `ask_tutor`

**Description**: Ask AI tutor a question (conversational learning)

**Scopes Required**: `student.use.ai_tutor`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    question: { type: "string", minLength: 5 },
    context: {
      type: "string",
      enum: ["homework_help", "grammar_question", "vocabulary", "pronunciation", "general"],
      default: "general"
    },
    assignment_id: {
      type: "string",
      format: "uuid",
      description: "Related assignment if homework help"
    }
  },
  required: ["question"]
}
```

**AI Behavior**:
- Adapt to student's CEFR level
- Provide explanations suitable for current level
- Use examples relevant to student's course
- Avoid giving direct homework answers
- Guide with Socratic questioning

**Example**:
```
Student: "What's the difference between past simple and present perfect?"

AI Tutor (B1-adapted):
"Great question! Let me help you understand the difference:

Past Simple: We use this when something happened at a specific time in the past that's finished.
Example: "I visited Paris in 2020." (We know WHEN)

Present Perfect: We use this when the action happened at an unspecified time, OR the action is connected to now.
Example: "I have visited Paris." (We don't know exactly when, and the experience is still relevant now)

Can you tell me which one you would use in this sentence?
"Yesterday, I ___ (see) my friend."

Try to explain why you chose that tense!"
```

---

#### `explain_concept`

**Description**: Request detailed explanation of language concept

**Scopes Required**: `student.use.ai_tutor`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    concept: { type: "string" },
    level: {
      type: "string",
      enum: ["simple", "detailed"],
      default: "simple"
    }
  },
  required: ["concept"]
}
```

**AI Output Format**:
1. Definition (simple language)
2. When to use
3. Form/structure
4. 3-5 examples
5. Common mistakes to avoid
6. Practice suggestion

---

#### `practice_exercise`

**Description**: Generate practice exercises

**Scopes Required**: `student.use.ai_tutor`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    topic: { type: "string" },
    exercise_type: {
      type: "string",
      enum: ["gap_fill", "multiple_choice", "transformation", "error_correction"],
      default: "gap_fill"
    },
    difficulty: {
      type: "string",
      enum: ["easy", "medium", "hard"],
      default: "medium"
    },
    quantity: {
      type: "integer",
      minimum: 5,
      maximum: 20,
      default: 10
    }
  },
  required: ["topic"]
}
```

**AI Output**:
- Generated exercises
- Answer key (hidden, revealed on request)
- Explanations for each answer

---

### 3.3.5 Progress Tracking Tools

#### `track_goal`

**Description**: Set learning goal and track progress

**Scopes Required**: `student.write.goal`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    goal_type: {
      type: "string",
      enum: ["level_progression", "skill_improvement", "vocabulary_target", "custom"]
    },
    target: { type: "string", description: "E.g., 'Reach B2', 'Learn 500 new words'" },
    deadline: { type: "string", format: "date" }
  },
  required: ["goal_type", "target"]
}
```

---

### 3.3.6 Attendance Tools

#### `attendance_summary`

**Description**: View attendance record

**Scopes Required**: `student.read.own`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    start_date: { type: "string", format: "date" },
    end_date: { type: "string", format: "date" }
  }
}
```

**Output**: Attendance summary with visa compliance status

---

### 3.3.7 Administrative Self-Service Tools

#### `request_letter`

**Description**: Request official letter (enrolment/attendance)

**Scopes Required**: `student.write.request`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    letter_type: {
      type: "string",
      enum: ["enrolment", "attendance"],
      description: "Type of letter required"
    },
    purpose: {
      type: "string",
      description: "E.g., 'GNIB appointment', 'Visa renewal', 'Bank account'"
    },
    date_range: {
      type: "object",
      properties: {
        start_date: { type: "string", format: "date" },
        end_date: { type: "string", format: "date" }
      },
      description: "For attendance letters"
    }
  },
  required: ["letter_type", "purpose"]
}
```

**Process**:
1. Student submits request
2. System generates preview (watermarked "DRAFT")
3. Student reviews and confirms
4. Admin approves and issues official letter
5. Student receives PDF via email

---

#### `raise_support_request`

**Description**: Submit support ticket

**Scopes Required**: `student.write.request`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    category: {
      type: "string",
      enum: ["academic", "accommodation", "financial", "technical", "other"]
    },
    subject: { type: "string" },
    description: { type: "string", minLength: 20 },
    urgent: { type: "boolean", default: false }
  },
  required: ["category", "subject", "description"]
}
```

---

#### `update_contact_details`

**Description**: Update personal contact information

**Scopes Required**: `student.write.own`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    phone: { type: "string", pattern: "^\\+[1-9]\\d{1,14}$" },
    emergency_contact_name: { type: "string" },
    emergency_contact_phone: { type: "string" },
    emergency_contact_relationship: { type: "string" }
  }
}
```

**Validation**:
- Cannot change: name, email, date of birth (requires admin)
- Phone must be valid international format

---

### 3.3.8 Payment Tools

#### `pay_invoice`

**Description**: Pay outstanding invoice (redirect to payment gateway)

**Scopes Required**: `student.write.payment`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    invoice_id: { type: "string", format: "uuid" },
    amount: {
      type: "number",
      minimum: 0,
      description: "Amount to pay (can be partial)"
    },
    payment_method: {
      type: "string",
      enum: ["card", "bank_transfer"],
      default: "card"
    }
  },
  required: ["invoice_id", "amount"]
}
```

**Output**: Payment gateway URL (Stripe Checkout or similar)

---

#### `view_installments`

**Description**: View payment plan installments

**Scopes Required**: `student.read.own`

**Input Schema**: None required

**Output**: Payment plan schedule with due dates

---

## 3.4 Prompts

Student AI tutor persona and templates.

### 3.4.1 System Prompt: Student Agent

```
You are the Student MCP AI tutor for an ESL learning platform. Your role is to support students' language learning with personalized, level-appropriate assistance while respecting their privacy and progress.

**Core Principles:**
1. **Privacy First**: Only access the student's own data
2. **Level-Appropriate**: Adapt explanations to student's CEFR level
3. **Supportive & Encouraging**: Build confidence, celebrate progress
4. **Pedagogically Sound**: Don't give direct answers to homework; guide with questions
5. **Simple & Clear**: Use accessible language for explanations
6. **Action-Oriented**: Provide clear next steps

**Capabilities:**
- Answer grammar and vocabulary questions
- Explain language concepts at appropriate level
- Generate practice exercises
- Provide homework guidance (without answers)
- Track learning goals
- Explain attendance and visa requirements

**Guardrails:**
- Cannot access other students' data
- Cannot mark own attendance
- Cannot issue official letters (only request)
- Cannot modify grades or course content
- No homework answers (guide with questions instead)

**Tone:**
- Friendly, patient, encouraging
- Simple explanations
- Use examples from student's life
- Celebrate small wins
```

---

### 3.4.2 Task Prompt: Grammar Explanation (Level-Adapted)

```
Explain {grammar_topic} to {student_name} (CEFR level: {level}):

**Structure:**

1. **Simple Definition** (one sentence):
   "The present perfect talks about actions that happened at an unknown time or are connected to now."

2. **When to Use** (2-3 bullet points):
   - When the exact time doesn't matter
   - When an action started in the past and continues now
   - For life experiences

3. **Form** (simple breakdown):
   Subject + have/has + past participle

   Examples:
   - I have visited Paris.
   - She has lived here for 3 years.
   - They have never eaten sushi.

4. **Compare to Similar Structure** (if applicable):
   Present Perfect vs Past Simple:
   - Present Perfect: "I have been to Paris." (time unknown)
   - Past Simple: "I went to Paris in 2020." (specific time)

5. **Common Mistakes** (for {level}):
   ❌ "I have visited Paris yesterday." (can't use specific time)
   ✓ "I visited Paris yesterday."

6. **Practice Suggestion**:
   "Try making 3 sentences about your life experiences using have/has + past participle. For example: places you've visited, food you've tried, or skills you've learned!"

**Adaptation Guidelines:**
- A1/A2: Very simple explanations, basic vocabulary, short sentences
- B1/B2: More detail, introduce exceptions, compare/contrast structures
- C1/C2: Nuanced explanations, stylistic considerations, advanced usage
```

---

### 3.4.3 Task Prompt: Homework Guidance (No Direct Answers)

```
Student asks for homework help:

**Student:** "I don't understand question 5 on the present perfect worksheet."

**AI Tutor Response Pattern:**

1. **Acknowledge** the difficulty:
   "I can see why that question is tricky! Let's work through it together."

2. **Recall the Rule**:
   "Remember, we use present perfect when the exact time isn't important. Can you identify the time marker in the sentence?"

3. **Guide with Questions** (Socratic method):
   - "Does the sentence mention a specific time?"
   - "Is the action finished or does it continue to now?"
   - "Which form should we use: have or has?"

4. **Provide Example** (similar but different):
   "Here's a similar example:
   'I ___ (live) in Dublin for 2 years.'
   We use 'have lived' because it started in the past and continues now."

5. **Encourage Attempt**:
   "Now try question 5 again. What do you think the answer is? I'll check it for you!"

6. **If Still Stuck** (only after student tries):
   Give a strong hint, not the answer:
   "Look at 'for' in the sentence. This usually means the action continues to now. What tense do we use for that?"

**Never:**
- Give the complete answer immediately
- Do the homework for the student
- Skip the thinking process
```

---

### 3.4.4 Task Prompt: Next 7 Days Overview

```
Show student's schedule and tasks for next 7 days:

**Output Format:**

---
📅 **Your Week Ahead** (Feb 10 - Feb 16)

**Classes This Week:**
- Mon, Wed, Thu, Fri: 09:00-13:00 | B1 Morning Group A | Room 3
- Total: 16 hours

**Homework Due:**
⏰ **Tomorrow (Feb 11):**
- Present Perfect Exercise (10 questions)

⏰ **Friday (Feb 14):**
- Vocabulary Quiz - Unit 5

**Special Events:**
📝 **Wednesday (Feb 12):** Progress Test (grammar + reading)

**Your Stats:**
✅ Attendance: 95.6% (great job!)
📊 Homework completion: 9/10 submitted on time

**Next Steps:**
1. Complete Present Perfect Exercise tonight
2. Review Unit 5 vocabulary before Friday
3. Practice grammar for Wednesday's test

Need help with anything? Just ask!
---
```

---

### 3.4.5 Task Prompt: GNIB Attendance Letter Request

```
Student requests attendance letter for GNIB (Irish immigration):

**Process:**

1. **Gather Information:**
   - Date range required
   - Purpose: "GNIB appointment"
   - Student details (auto-filled from profile)

2. **Calculate Attendance:**
   - Query attendance records for date range
   - Calculate percentage
   - Check visa compliance (>80%)

3. **Generate Preview:**
   ```
   [DRAFT - NOT OFFICIAL]

   To Whom It May Concern,

   This is to certify that [Student Name], date of birth [DOB],
   nationality [Nationality], has been enrolled at [School Name]
   from [Start Date] to present.

   During the period [Requested Range], [Student Name] attended
   [X] out of [Y] sessions, representing an attendance rate of [Z]%.

   [Student Name] is enrolled in the [Programme Name] programme,
   [Hours] hours per week, CEFR level [Level].

   This letter is issued for the purpose of [Purpose].

   Signed: [Admin Name]
   Position: [Title]
   Date: [Today]

   Verification Code: [QR Code]
   Verify at: https://school.ie/verify/[code]
   ```

4. **Student Review:**
   - Show preview with watermark
   - "Does this look correct?"
   - "Any changes needed to dates?"

5. **Submit Request:**
   - Send to admin for approval
   - Notify: "Your request has been submitted. Official letter will be emailed within 1-2 business days."

6. **Follow-up:**
   - Track request status
   - Notify when approved and sent
```

---

## 3.5 Authorization & Scopes

### Scope Hierarchy

```typescript
// Student Read Scopes
"student.read.own"          // Own profile and data
"student.read.materials"    // Course materials
"student.read.class"        // Class timetable

// Student Write Scopes
"student.write.own"         // Update contact info
"student.write.homework"    // Submit homework
"student.write.goal"        // Set learning goals
"student.write.request"     // Submit support requests
"student.write.payment"     // Make payments

// AI Feature Scopes
"student.use.ai_tutor"      // Access AI tutoring
"student.use.practice"      // Generate practice exercises
```

---

### RLS Policy Enforcement

```sql
-- Example: Students can only view own homework
CREATE POLICY "student_select_own_homework"
ON homework_submissions
FOR SELECT
TO authenticated
USING (
  auth.jwt()->>'role' = 'student'
  AND student_id = auth.uid()
);

-- Example: Students can only submit to assigned classes
CREATE POLICY "student_insert_homework"
ON homework_submissions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM enrolments
    WHERE student_id = auth.uid()
    AND class_id = (
      SELECT class_id FROM homework
      WHERE id = homework_id
    )
  )
);
```

---

## 3.6 Error Handling

### Error Codes

```typescript
enum StudentMCPError {
  // Authorization
  NOT_YOUR_HOMEWORK = "AUTH_201",
  NOT_ENROLLED = "AUTH_202",

  // Validation
  HOMEWORK_ALREADY_SUBMITTED = "VAL_201",
  PAST_DUE_NO_LATE_ALLOWED = "VAL_202",
  INVALID_FILE_TYPE = "VAL_203",

  // Payment
  INVOICE_ALREADY_PAID = "PAY_201",
  PAYMENT_AMOUNT_INVALID = "PAY_202"
}
```

---

## 3.7 Implementation Notes

### AI Tutor Features

**Conversation Context**:
```typescript
// Maintain conversation history per student
const conversationHistory = [
  { role: "system", content: studentAgentSystemPrompt },
  { role: "assistant", content: `Hi ${studentName}! I'm your AI tutor. How can I help you today?` },
  { role: "user", content: "What's the difference between past simple and present perfect?" },
  { role: "assistant", content: aiResponse }
];

// Include student context
const studentContext = {
  name: student.name,
  level: student.current_level,
  recent_topics: ["present perfect", "time markers"],
  struggling_areas: ["listening comprehension"],
  strengths: ["writing", "vocabulary"]
};
```

**Level Adaptation** (LLM prompt injection):
```typescript
const levelGuide = {
  A1: "Use very simple vocabulary. Short sentences (max 10 words). Present tense only in examples.",
  A2: "Simple vocabulary. Basic grammar. Short paragraphs. Use familiar topics.",
  B1: "Intermediate vocabulary. Mix simple and complex sentences. Use real-world examples.",
  B2: "Wider vocabulary range. Explain nuances. Use idiomatic expressions appropriately.",
  C1: "Advanced vocabulary. Discuss stylistic choices. Compare registers.",
  C2: "Near-native explanations. Subtle distinctions. Cultural context."
};
```

---

## 3.8 Testing

### Unit Tests

```typescript
describe('ask_tutor', () => {
  it('should adapt explanation to student CEFR level', async () => {
    const student = { id: 'test-student', current_level: 'A2' };

    const result = await studentMCP.callTool('ask_tutor', {
      question: 'What is present perfect?',
      context: 'grammar_question'
    });

    expect(result.answer).toContain('have');
    expect(result.answer).toContain('has');
    // Check for A2-appropriate language (simple vocab)
    expect(result.complexity_level).toBe('A2');
  });

  it('should not give direct homework answers', async () => {
    const result = await studentMCP.callTool('ask_tutor', {
      question: 'What is the answer to question 5?',
      context: 'homework_help',
      assignment_id: 'test-hw-id'
    });

    expect(result.answer).not.toContain('answer is');
    expect(result.answer).toContain('?'); // Should ask guiding question
  });
});
```

---

## 3.9 Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2025-10-31 | Complete specification with AI tutoring, comprehensive tools, and prompts |
| 1.0.0 | 2025-10-30 | Initial specification |

---

**Document Status**: Complete - Ready for Phase 3 Implementation
**Dependencies**: Admin MCP + Teacher MCP must be production-ready first
**Next Steps**: Implement after Teacher MCP is stable; focus on AI tutoring features

# Data Model & Entity-Relationship Design

## Overview
This document defines the database schema and entity relationships for the ESL Learning Platform (MCP Architecture).

## Core Entities

### 1. Users
Primary entity for all platform users (students, teachers, admins).

**Fields:**
- `id` (UUID, Primary Key)
- `email` (String, Unique, Required)
- `role` (Enum: 'student', 'teacher', 'admin')
- `full_name` (String)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)
- `is_active` (Boolean, default: true)

**Relationships:**
- One user can have multiple enrollments (if student)
- One user can teach multiple courses (if teacher)
- One user can have multiple conversation sessions

---

### 2. Courses
Courses available on the platform.

**Fields:**
- `id` (UUID, Primary Key)
- `title` (String, Required)
- `description` (Text)
- `curriculum` (JSONB) - Structured course objectives/standards
- `grade_level` (String)
- `is_published` (Boolean, default: false)
- `created_by` (UUID, Foreign Key → Users)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

**Relationships:**
- Belongs to one creator (teacher/admin)
- Has many lessons
- Has many enrollments
- Has many assignments

---

### 3. Lessons
Individual lessons within a course.

**Fields:**
- `id` (UUID, Primary Key)
- `course_id` (UUID, Foreign Key → Courses)
- `title` (String, Required)
- `content` (Text/JSONB) - Lesson materials, slides, etc.
- `order` (Integer) - Position in course
- `duration_minutes` (Integer)
- `learning_objectives` (JSONB)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

**Relationships:**
- Belongs to one course
- Has many assignments

---

### 4. Enrollments
Junction table linking students to courses.

**Fields:**
- `id` (UUID, Primary Key)
- `student_id` (UUID, Foreign Key → Users)
- `course_id` (UUID, Foreign Key → Courses)
- `enrolled_at` (Timestamp)
- `status` (Enum: 'active', 'completed', 'dropped')
- `progress_percentage` (Decimal)

**Relationships:**
- Links one student to one course
- Has many progress records

---

### 5. Assignments
Assignments/quizzes for a course.

**Fields:**
- `id` (UUID, Primary Key)
- `course_id` (UUID, Foreign Key → Courses)
- `lesson_id` (UUID, Foreign Key → Lessons, Optional)
- `title` (String, Required)
- `description` (Text)
- `type` (Enum: 'quiz', 'homework', 'exam', 'practice')
- `questions` (JSONB) - Array of question objects
- `answer_key` (JSONB) - Solutions
- `max_score` (Integer)
- `due_date` (Timestamp, Optional)
- `created_by` (UUID, Foreign Key → Users)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

**Relationships:**
- Belongs to one course
- Optionally belongs to one lesson
- Has many submissions

---

### 6. Submissions
Student submissions for assignments.

**Fields:**
- `id` (UUID, Primary Key)
- `assignment_id` (UUID, Foreign Key → Assignments)
- `student_id` (UUID, Foreign Key → Users)
- `answers` (JSONB) - Student's answers
- `score` (Decimal, Optional)
- `feedback` (Text, Optional)
- `submitted_at` (Timestamp)
- `graded_at` (Timestamp, Optional)
- `graded_by` (UUID, Foreign Key → Users, Optional)

**Relationships:**
- Belongs to one assignment
- Belongs to one student
- Optionally graded by one teacher

---

### 7. StudentProgress
Tracks student progress through course materials.

**Fields:**
- `id` (UUID, Primary Key)
- `student_id` (UUID, Foreign Key → Users)
- `course_id` (UUID, Foreign Key → Courses)
- `lesson_id` (UUID, Foreign Key → Lessons, Optional)
- `topic` (String)
- `mastery_level` (Enum: 'not_started', 'struggling', 'learning', 'mastered')
- `attempts` (Integer)
- `last_activity` (Timestamp)
- `metadata` (JSONB) - Additional tracking data

**Relationships:**
- Belongs to one student
- Belongs to one course
- Optionally relates to one lesson

---

### 8. ConversationSessions
AI chat sessions for each user.

**Fields:**
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key → Users)
- `role_context` (Enum: 'student', 'teacher', 'admin') - Which AI assistant
- `started_at` (Timestamp)
- `ended_at` (Timestamp, Optional)
- `metadata` (JSONB) - Session context data

**Relationships:**
- Belongs to one user
- Has many conversation messages

---

### 9. ConversationMessages
Individual messages in AI conversations.

**Fields:**
- `id` (UUID, Primary Key)
- `session_id` (UUID, Foreign Key → ConversationSessions)
- `role` (Enum: 'user', 'assistant', 'system')
- `content` (Text)
- `metadata` (JSONB) - Tool calls, context used, etc.
- `created_at` (Timestamp)

**Relationships:**
- Belongs to one conversation session

---

### 10. ContentLibrary
Repository of teaching materials and reference content.

**Fields:**
- `id` (UUID, Primary Key)
- `title` (String, Required)
- `content_type` (Enum: 'textbook', 'reference', 'worksheet', 'lesson_plan', 'quiz_template')
- `content` (Text/JSONB)
- `tags` (Array<String>)
- `course_id` (UUID, Foreign Key → Courses, Optional)
- `is_public` (Boolean)
- `created_by` (UUID, Foreign Key → Users)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

**Relationships:**
- Optionally belongs to one course
- Created by one user

---

### 11. Feedback
User feedback and support tickets.

**Fields:**
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key → Users)
- `category` (Enum: 'bug', 'feature_request', 'content_feedback', 'ai_response', 'other')
- `subject` (String)
- `message` (Text)
- `status` (Enum: 'open', 'in_progress', 'resolved', 'closed')
- `priority` (Enum: 'low', 'medium', 'high')
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

**Relationships:**
- Belongs to one user

---

### 12. Announcements
Teacher/admin announcements to students.

**Fields:**
- `id` (UUID, Primary Key)
- `course_id` (UUID, Foreign Key → Courses, Optional)
- `author_id` (UUID, Foreign Key → Users)
- `title` (String)
- `message` (Text)
- `target_audience` (Enum: 'all', 'course_students', 'specific_users')
- `created_at` (Timestamp)
- `is_published` (Boolean)

**Relationships:**
- Optionally belongs to one course
- Created by one user (teacher/admin)

---

### 13. SystemLogs
Platform usage and system activity logs.

**Fields:**
- `id` (UUID, Primary Key)
- `event_type` (String) - e.g., 'ai_query', 'user_login', 'content_created'
- `user_id` (UUID, Foreign Key → Users, Optional)
- `metadata` (JSONB) - Event details
- `created_at` (Timestamp)

**Relationships:**
- Optionally relates to one user

---

## Entity-Relationship Diagram (Text Format)

```
Users (1) ──< (M) Enrollments >── (1) Courses
  │                                    │
  │                                    ├──< (M) Lessons
  │                                    │         │
  │                                    ├──< (M) Assignments
  │                                    │         │
  │                                    └──< (M) ContentLibrary
  │
  ├──< (M) Submissions
  ├──< (M) StudentProgress
  ├──< (M) ConversationSessions
  │         └──< (M) ConversationMessages
  ├──< (M) Feedback
  ├──< (M) Announcements
  └──< (M) SystemLogs

Assignments (1) ──< (M) Submissions
```

---

## MCP Server Data Requirements

### Student MCP Server Needs:
- User profile (Users table, role='student')
- Current enrollments (Enrollments)
- Progress data (StudentProgress)
- Assignment submissions (Submissions)
- Conversation history (ConversationSessions, ConversationMessages)
- Course content (Courses, Lessons, ContentLibrary)

### Teacher MCP Server Needs:
- User profile (Users table, role='teacher')
- Courses taught (Courses where created_by = teacher_id)
- Student enrollments in their courses
- Assignment data (Assignments)
- Student submissions and grades (Submissions)
- Class performance analytics (aggregated from Submissions, StudentProgress)
- Content library access

### Admin MCP Server Needs:
- Platform-wide user statistics (Users)
- Course metrics (Courses, Enrollments)
- Performance data (aggregated Submissions, StudentProgress)
- Feedback/support tickets (Feedback)
- System logs (SystemLogs)
- Content management (ContentLibrary, Courses)

---

## Row-Level Security (RLS) Policies

### Students:
- Can read their own user record
- Can read courses they're enrolled in
- Can read/write their own submissions
- Can read their own progress data
- Can read/write their own conversation sessions

### Teachers:
- Can read their own user record
- Can read/write courses they created
- Can read enrollments for their courses
- Can read/write assignments for their courses
- Can read/grade submissions for their courses
- Can read student progress for their courses

### Admins:
- Full read access to most tables (except sensitive auth data)
- Write access to users, courses, content
- Read access to all feedback and logs

---

## Indexes for Performance

Key indexes to create:
- `users.email` (unique)
- `users.role`
- `enrollments.student_id`
- `enrollments.course_id`
- `assignments.course_id`
- `submissions.assignment_id`
- `submissions.student_id`
- `student_progress.student_id`
- `student_progress.course_id`
- `conversation_sessions.user_id`
- `conversation_messages.session_id`
- `content_library.course_id`
- `feedback.status`
- `system_logs.event_type`
- `system_logs.created_at`

---

## JSONB Field Structures

### `assignments.questions` Example:
```json
[
  {
    "id": "q1",
    "type": "multiple_choice",
    "question": "What is 2+2?",
    "options": ["3", "4", "5", "6"],
    "correct_answer": "4",
    "points": 1
  },
  {
    "id": "q2",
    "type": "short_answer",
    "question": "Explain photosynthesis.",
    "points": 5
  }
]
```

### `student_progress.metadata` Example:
```json
{
  "hints_used": 2,
  "time_spent_minutes": 45,
  "common_mistakes": ["off-by-one errors"],
  "recommended_resources": ["lesson_5", "practice_quiz_3"]
}
```

### `conversation_messages.metadata` Example:
```json
{
  "tool_calls": [
    {
      "tool": "searchCourseContent",
      "params": {"query": "photosynthesis"},
      "result": "..."
    }
  ],
  "tokens_used": 850,
  "model": "gpt-4"
}
```

---

## Next Steps
1. Implement this schema in Supabase
2. Set up RLS policies
3. Create seed data for testing
4. Generate TypeScript types from schema

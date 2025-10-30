# 5. Teacher-MCP Specification

> **Document status:** Future scope. To be implemented after Admin MCP + Host MVP is complete.

---

## 5.1 Overview

### Purpose

The **Teacher MCP** server provides tools and context for teaching workflows. It serves teachers who need to:

- Plan and create lessons
- Generate assessment materials (quizzes, worksheets, exams)
- Record attendance and grades
- Analyze student performance
- Provide feedback to students
- Manage class rosters and schedules

### Role Requirements

- **Who Can Access**: Users with `role: "teacher"` in their JWT claims
- **Tenant Isolation**: All operations are scoped to the teacher's `tenant_id`
- **Class Scope**: Teachers can only access data for classes they teach

---

## 5.2 Resources (Planned)

### 5.2.1 My Classes
**URI**: `teacher://my_classes`
- List of classes taught by this teacher
- Includes rosters, schedules, and current enrollment

### 5.2.2 Student Performance
**URI**: `teacher://student_performance/{class_id}`
- Performance metrics for students in a specific class
- Grade distributions, attendance rates, assignment completion

### 5.2.3 Lesson Plans
**URI**: `teacher://lesson_plans`
- Library of lesson plans for this teacher
- Past lessons, templates, shared resources

### 5.2.4 Curriculum Content
**URI**: `teacher://curriculum/{subject}`
- Course materials, textbooks, reference content
- Organized by subject and difficulty level

---

## 5.3 Tools (Planned)

### 5.3.1 Lesson Planning
- `create_lesson_plan` - Generate a structured lesson plan
- `get_lesson_suggestions` - AI-suggested activities for a topic

### 5.3.2 Content Generation
- `generate_quiz` - Create quiz questions on a topic
- `create_worksheet` - Generate practice exercises
- `generate_exam` - Create assessment with answer key

### 5.3.3 Assessment and Grading
- `record_grades` - Enter grades for an assignment
- `auto_grade_quiz` - Automatically grade objective questions
- `generate_feedback` - AI-assisted feedback for student work

### 5.3.4 Class Management
- `mark_attendance` - Quick attendance marking (simplified from admin)
- `send_class_announcement` - Notify students in a class
- `view_class_analytics` - Get performance insights for class

### 5.3.5 Student Insights
- `analyze_student_performance` - Detailed analysis of individual student
- `identify_struggling_students` - Flag students needing intervention
- `suggest_remediation` - Recommend resources for struggling students

---

## 5.4 Prompts (Planned)

### 5.4.1 teacher_persona
- Persona for teacher assistant AI
- Professional, supportive, pedagogically sound
- Focused on student outcomes and teaching effectiveness

### 5.4.2 lesson_generator
- Dynamic prompt for generating lesson plans
- Takes parameters: topic, duration, level, learning objectives

### 5.4.3 feedback_assistant
- Helps formulate constructive student feedback
- Balances encouragement with areas for improvement

---

## 5.5 User Stories (from Original Spec)

**Epic 2: Teacher's Assistant and Classroom Management**

- **Story 2.1**: Generate quiz questions, worksheets, or exam problems on a given topic
- **Story 2.2**: Request lesson plan outlines or activity ideas
- **Story 2.3**: Automatically grade objective-type quizzes
- **Story 2.4**: Get summary of which topics the class found most difficult
- **Story 2.5**: Be notified if a particular student is consistently struggling
- **Story 2.6**: Send quick announcements or reminders to all students
- **Story 2.7**: Have AI answer routine student questions with teacher oversight

---

## 5.6 Implementation Notes

### Authorization Considerations
- Teachers can only access classes assigned to them
- Cannot view other teachers' data
- Limited access to student data (only for their classes)
- Cannot perform administrative functions (use Admin MCP for that)

### Integration with Admin MCP
- Teacher may request admin actions via Host (host-mediated)
- Example: "Request class capacity increase" → Host routes to Admin MCP

### Future Enhancements
- Integration with external LMS (Moodle, Canvas)
- AI-powered plagiarism detection
- Automated progress reports
- Parent communication tools

---

*This specification will be fully developed in Phase 2 after Admin MCP MVP is complete.*

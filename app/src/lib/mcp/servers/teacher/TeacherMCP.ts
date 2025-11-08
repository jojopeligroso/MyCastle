/**
 * Teacher MCP Server - T-022 (21 points, XL)
 *
 * Provides 10 tools for teacher workflows:
 * 1. view_timetable - Weekly timetable
 * 2. create_lesson_plan - AI-powered lesson planning
 * 3. mark_attendance - Attendance marking
 * 4. view_class_roster - Student roster
 * 5. create_assignment - Assignment creation
 * 6. grade_submission - Grade student work
 * 7. view_class_analytics - Performance analytics
 * 8. create_class_session - Create sessions
 * 9. update_session_notes - Update notes
 * 10. view_student_progress - Individual progress
 *
 * Resources:
 * - mycastle://teacher/timetable
 * - mycastle://teacher/lesson-plans
 * - mycastle://teacher/registers
 * - mycastle://teacher/classes
 *
 * Prompts:
 * - plan_lesson - Lesson planning workflow
 * - analyze_performance - Student performance analysis
 * - mark_register - Attendance marking workflow
 */

import { z } from 'zod';
import { db } from '@/db';
import {
  classes,
  classSessions,
  attendance,
  enrollments,
  assignments,
  submissions,
  grades,
  lessonPlans,
} from '@/db/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { MCPServerConfig, MCPTool, MCPResource, MCPPrompt, MCPSession } from '../../types';
import { computeAttendanceHash, getLastHash, isWithinEditWindow } from '@/lib/hash-chain';

/**
 * Tool 1: View Timetable
 */
const viewTimetableTool: MCPTool = {
  name: 'view_timetable',
  description: 'View teacher\'s weekly timetable with class sessions',
  requiredScopes: ['teacher:view_timetable'],
  inputSchema: z.object({
    weekStart: z.string().describe('Week start date (YYYY-MM-DD)'),
    weekEnd: z.string().optional().describe('Week end date (optional, defaults to weekStart + 7 days)'),
  }),
  handler: async (input, session) => {
    const { weekStart, weekEnd } = input as { weekStart: string; weekEnd?: string };

    const endDate = weekEnd || new Date(new Date(weekStart).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const sessions = await db
      .select({
        session: classSessions,
        class: classes,
      })
      .from(classSessions)
      .innerJoin(classes, eq(classSessions.class_id, classes.id))
      .where(
        and(
          eq(classes.teacher_id, session.userId),
          eq(classes.tenant_id, session.tenantId),
          gte(classSessions.session_date, weekStart),
          lte(classSessions.session_date, endDate)
        )
      )
      .orderBy(classSessions.session_date, classSessions.start_time);

    return {
      weekStart,
      weekEnd: endDate,
      sessions: sessions.map(s => ({
        sessionId: s.session.id,
        className: s.class.name,
        classCode: s.class.code,
        date: s.session.session_date,
        startTime: s.session.start_time,
        endTime: s.session.end_time,
        topic: s.session.topic,
        status: s.session.status,
      })),
      totalSessions: sessions.length,
    };
  },
};

/**
 * Tool 2: Create Lesson Plan
 */
const createLessonPlanTool: MCPTool = {
  name: 'create_lesson_plan',
  description: 'Create or generate an AI-powered lesson plan',
  requiredScopes: ['teacher:create_lesson_plan'],
  inputSchema: z.object({
    classId: z.string().uuid().optional(),
    cefrLevel: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
    topic: z.string(),
    durationMinutes: z.number(),
    jsonPlan: z.record(z.unknown()).describe('Structured lesson plan JSON'),
    isAiGenerated: z.boolean().default(false),
  }),
  handler: async (input, session) => {
    const { classId, cefrLevel, topic, durationMinutes, jsonPlan, isAiGenerated } = input as {
      classId?: string;
      cefrLevel: string;
      topic: string;
      durationMinutes: number;
      jsonPlan: Record<string, unknown>;
      isAiGenerated: boolean;
    };

    const [lessonPlan] = await db
      .insert(lessonPlans)
      .values({
        tenant_id: session.tenantId,
        class_id: classId,
        teacher_id: session.userId,
        cefr_level: cefrLevel,
        title: `${topic} (${cefrLevel})`,
        topic,
        duration_minutes: String(durationMinutes),
        json_plan: jsonPlan,
        is_ai_generated: String(isAiGenerated),
        status: 'draft',
      })
      .returning();

    return {
      lessonPlanId: lessonPlan.id,
      title: lessonPlan.title,
      topic: lessonPlan.topic,
      cefrLevel: lessonPlan.cefr_level,
      status: lessonPlan.status,
      createdAt: lessonPlan.created_at,
    };
  },
};

/**
 * Tool 3: Mark Attendance
 */
const markAttendanceTool: MCPTool = {
  name: 'mark_attendance',
  description: 'Mark student attendance for a class session',
  requiredScopes: ['teacher:mark_attendance'],
  inputSchema: z.object({
    sessionId: z.string().uuid(),
    studentId: z.string().uuid(),
    status: z.enum(['present', 'absent', 'late', 'excused']),
    notes: z.string().optional(),
  }),
  handler: async (input, session) => {
    const { sessionId, studentId, status, notes } = input as {
      sessionId: string;
      studentId: string;
      status: string;
      notes?: string;
    };

    // Verify session belongs to teacher
    const [classSession] = await db
      .select({ session: classSessions, class: classes })
      .from(classSessions)
      .innerJoin(classes, eq(classSessions.class_id, classes.id))
      .where(and(eq(classSessions.id, sessionId), eq(classes.teacher_id, session.userId)))
      .limit(1);

    if (!classSession) {
      throw new Error('Session not found or not authorized');
    }

    // Check if this is an update (edit) or new record
    const existingRecord = await db
      .select()
      .from(attendance)
      .where(and(eq(attendance.class_session_id, sessionId), eq(attendance.student_id, studentId)))
      .limit(1);

    const isEdit = existingRecord.length > 0;
    const now = new Date();

    // T-053: Check 48-hour edit window policy
    if (isEdit) {
      const withinWindow = isWithinEditWindow(existingRecord[0].recorded_at, now);

      if (!withinWindow && session.role !== 'admin') {
        throw new Error('Cannot edit attendance after 48-hour window. Admin override required.');
      }
    }

    // T-052: Get last hash in chain for this session (for new records)
    let previousHash: string | null = null;

    if (!isEdit) {
      const sessionRecords = await db
        .select({ hash: attendance.hash, created_at: attendance.created_at })
        .from(attendance)
        .where(eq(attendance.class_session_id, sessionId))
        .orderBy(desc(attendance.created_at))
        .limit(1);

      previousHash = getLastHash(sessionRecords);
    } else {
      // For edits, use the existing previous_hash
      previousHash = existingRecord[0].previous_hash;
    }

    // Compute hash for this record
    const recordedAt = isEdit ? existingRecord[0].recorded_at : now;
    const hash = computeAttendanceHash(
      {
        tenantId: session.tenantId,
        classSessionId: sessionId,
        studentId,
        status,
        recordedBy: session.userId,
        recordedAt,
        notes,
      },
      previousHash
    );

    // Upsert attendance record with hash
    const [attendanceRecord] = await db
      .insert(attendance)
      .values({
        tenant_id: session.tenantId,
        class_session_id: sessionId,
        student_id: studentId,
        status,
        notes,
        recorded_by: session.userId,
        hash,
        previous_hash: previousHash,
        is_within_edit_window: 'false', // New records don't need edit tracking
      })
      .onConflictDoUpdate({
        target: [attendance.class_session_id, attendance.student_id],
        set: {
          status,
          notes,
          hash,
          edited_by: session.userId,
          edited_at: now,
          edit_count: sql`${attendance.edit_count} + 1`,
          is_within_edit_window: isWithinEditWindow(recordedAt, now) ? 'true' : 'false',
          updated_at: now,
        },
      })
      .returning();

    return {
      attendanceId: attendanceRecord.id,
      sessionId,
      studentId,
      status: attendanceRecord.status,
      recordedAt: attendanceRecord.recorded_at,
      hash: attendanceRecord.hash,
      isEdit,
      withinEditWindow: attendanceRecord.is_within_edit_window === 'true',
    };
  },
};

/**
 * Tool 4: View Class Roster
 */
const viewClassRosterTool: MCPTool = {
  name: 'view_class_roster',
  description: 'View list of students enrolled in a class',
  requiredScopes: ['teacher:view_class_roster'],
  inputSchema: z.object({
    classId: z.string().uuid(),
  }),
  handler: async (input, session) => {
    const { classId } = input as { classId: string };

    // Verify class belongs to teacher
    const [classRecord] = await db
      .select()
      .from(classes)
      .where(and(eq(classes.id, classId), eq(classes.teacher_id, session.userId)))
      .limit(1);

    if (!classRecord) {
      throw new Error('Class not found or not authorized');
    }

    const roster = await db
      .select({
        enrollment: enrollments,
        student: {
          id: sql`users.id`,
          name: sql`users.name`,
          email: sql`users.email`,
        },
      })
      .from(enrollments)
      .innerJoin(sql`users`, eq(enrollments.student_id, sql`users.id`))
      .where(and(eq(enrollments.class_id, classId), eq(enrollments.status, 'active')))
      .orderBy(sql`users.name`);

    return {
      classId,
      className: classRecord.name,
      students: roster.map(r => ({
        studentId: r.student.id,
        name: r.student.name,
        email: r.student.email,
        enrollmentDate: r.enrollment.enrollment_date,
        attendanceRate: r.enrollment.attendance_rate,
        currentGrade: r.enrollment.current_grade,
      })),
      totalStudents: roster.length,
    };
  },
};

/**
 * Tool 5: Create Assignment
 */
const createAssignmentTool: MCPTool = {
  name: 'create_assignment',
  description: 'Create a new assignment for a class',
  requiredScopes: ['teacher:create_assignment'],
  inputSchema: z.object({
    classId: z.string().uuid(),
    title: z.string(),
    description: z.string().optional(),
    type: z.enum(['homework', 'quiz', 'exam', 'project']),
    assignedDate: z.string(),
    dueDate: z.string(),
    maxScore: z.number().optional(),
    content: z.record(z.unknown()).optional(),
  }),
  handler: async (input, session) => {
    const { classId, title, description, type, assignedDate, dueDate, maxScore, content } = input as {
      classId: string;
      title: string;
      description?: string;
      type: string;
      assignedDate: string;
      dueDate: string;
      maxScore?: number;
      content?: Record<string, unknown>;
    };

    // Verify class belongs to teacher
    const [classRecord] = await db
      .select()
      .from(classes)
      .where(and(eq(classes.id, classId), eq(classes.teacher_id, session.userId)))
      .limit(1);

    if (!classRecord) {
      throw new Error('Class not found or not authorized');
    }

    const [assignment] = await db
      .insert(assignments)
      .values({
        tenant_id: session.tenantId,
        class_id: classId,
        title,
        description,
        type,
        assigned_date: assignedDate,
        due_date: dueDate,
        max_score: maxScore,
        content,
        status: 'active',
      })
      .returning();

    return {
      assignmentId: assignment.id,
      title: assignment.title,
      type: assignment.type,
      dueDate: assignment.due_date,
      createdAt: assignment.created_at,
    };
  },
};

/**
 * Tool 6: Grade Submission
 */
const gradeSubmissionTool: MCPTool = {
  name: 'grade_submission',
  description: 'Grade a student submission',
  requiredScopes: ['teacher:grade_submission'],
  inputSchema: z.object({
    submissionId: z.string().uuid(),
    score: z.number(),
    grade: z.string().optional(),
    feedback: z.string().optional(),
  }),
  handler: async (input, session) => {
    const { submissionId, score, grade: gradeValue, feedback } = input as {
      submissionId: string;
      score: number;
      grade?: string;
      feedback?: string;
    };

    // Verify submission belongs to teacher's class
    const [submission] = await db
      .select({
        submission: submissions,
        assignment: assignments,
        class: classes,
      })
      .from(submissions)
      .innerJoin(assignments, eq(submissions.assignment_id, assignments.id))
      .innerJoin(classes, eq(assignments.class_id, classes.id))
      .where(and(eq(submissions.id, submissionId), eq(classes.teacher_id, session.userId)))
      .limit(1);

    if (!submission) {
      throw new Error('Submission not found or not authorized');
    }

    const [gradeRecord] = await db
      .insert(grades)
      .values({
        tenant_id: session.tenantId,
        submission_id: submissionId,
        score: String(score),
        grade: gradeValue,
        feedback,
        graded_by: session.userId,
      })
      .onConflictDoUpdate({
        target: grades.submission_id,
        set: {
          score: String(score),
          grade: gradeValue,
          feedback,
          graded_by: session.userId,
          updated_at: new Date(),
        },
      })
      .returning();

    // Update submission status
    await db.update(submissions).set({ status: 'graded' }).where(eq(submissions.id, submissionId));

    return {
      gradeId: gradeRecord.id,
      submissionId,
      score: gradeRecord.score,
      grade: gradeRecord.grade,
      gradedAt: gradeRecord.graded_at,
    };
  },
};

/**
 * Tool 7: View Class Analytics
 */
const viewClassAnalyticsTool: MCPTool = {
  name: 'view_class_analytics',
  description: 'View performance analytics for a class',
  requiredScopes: ['teacher:view_class_analytics'],
  inputSchema: z.object({
    classId: z.string().uuid(),
  }),
  handler: async (input, session) => {
    const { classId } = input as { classId: string };

    // Verify class belongs to teacher
    const [classRecord] = await db
      .select()
      .from(classes)
      .where(and(eq(classes.id, classId), eq(classes.teacher_id, session.userId)))
      .limit(1);

    if (!classRecord) {
      throw new Error('Class not found or not authorized');
    }

    // Get enrollment stats
    const enrollmentStats = await db
      .select({
        totalStudents: sql<number>`count(*)`,
        avgAttendance: sql<number>`avg(attendance_rate)`,
      })
      .from(enrollments)
      .where(and(eq(enrollments.class_id, classId), eq(enrollments.status, 'active')));

    // Get assignment stats
    const assignmentStats = await db
      .select({
        totalAssignments: sql<number>`count(*)`,
        activeAssignments: sql<number>`count(*) filter (where status = 'active')`,
      })
      .from(assignments)
      .where(eq(assignments.class_id, classId));

    return {
      classId,
      className: classRecord.name,
      enrollment: {
        totalStudents: enrollmentStats[0]?.totalStudents || 0,
        capacity: classRecord.capacity,
        averageAttendance: enrollmentStats[0]?.avgAttendance || 0,
      },
      assignments: {
        total: assignmentStats[0]?.totalAssignments || 0,
        active: assignmentStats[0]?.activeAssignments || 0,
      },
    };
  },
};

/**
 * Tool 8: Create Class Session
 */
const createClassSessionTool: MCPTool = {
  name: 'create_class_session',
  description: 'Create a new class session',
  requiredScopes: ['teacher:create_class_session'],
  inputSchema: z.object({
    classId: z.string().uuid(),
    sessionDate: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    topic: z.string().optional(),
    notes: z.string().optional(),
  }),
  handler: async (input, session) => {
    const { classId, sessionDate, startTime, endTime, topic, notes } = input as {
      classId: string;
      sessionDate: string;
      startTime: string;
      endTime: string;
      topic?: string;
      notes?: string;
    };

    // Verify class belongs to teacher
    const [classRecord] = await db
      .select()
      .from(classes)
      .where(and(eq(classes.id, classId), eq(classes.teacher_id, session.userId)))
      .limit(1);

    if (!classRecord) {
      throw new Error('Class not found or not authorized');
    }

    const [sessionRecord] = await db
      .insert(classSessions)
      .values({
        tenant_id: session.tenantId,
        class_id: classId,
        session_date: sessionDate,
        start_time: startTime,
        end_time: endTime,
        topic,
        notes,
        status: 'scheduled',
      })
      .returning();

    return {
      sessionId: sessionRecord.id,
      classId,
      sessionDate: sessionRecord.session_date,
      startTime: sessionRecord.start_time,
      endTime: sessionRecord.end_time,
      topic: sessionRecord.topic,
      status: sessionRecord.status,
    };
  },
};

/**
 * Tool 9: Update Session Notes
 */
const updateSessionNotesTool: MCPTool = {
  name: 'update_session_notes',
  description: 'Update notes for a class session after class',
  requiredScopes: ['teacher:update_session_notes'],
  inputSchema: z.object({
    sessionId: z.string().uuid(),
    notes: z.string(),
    topic: z.string().optional(),
    status: z.enum(['scheduled', 'completed', 'cancelled']).optional(),
  }),
  handler: async (input, session) => {
    const { sessionId, notes, topic, status } = input as {
      sessionId: string;
      notes: string;
      topic?: string;
      status?: string;
    };

    // Verify session belongs to teacher
    const [sessionRecord] = await db
      .select({ session: classSessions, class: classes })
      .from(classSessions)
      .innerJoin(classes, eq(classSessions.class_id, classes.id))
      .where(and(eq(classSessions.id, sessionId), eq(classes.teacher_id, session.userId)))
      .limit(1);

    if (!sessionRecord) {
      throw new Error('Session not found or not authorized');
    }

    const [updated] = await db
      .update(classSessions)
      .set({
        notes,
        topic: topic || sessionRecord.session.topic,
        status: status || sessionRecord.session.status,
        updated_at: new Date(),
      })
      .where(eq(classSessions.id, sessionId))
      .returning();

    return {
      sessionId: updated.id,
      notes: updated.notes,
      topic: updated.topic,
      status: updated.status,
      updatedAt: updated.updated_at,
    };
  },
};

/**
 * Tool 10: View Student Progress
 */
const viewStudentProgressTool: MCPTool = {
  name: 'view_student_progress',
  description: 'View individual student progress in a class',
  requiredScopes: ['teacher:view_student_progress'],
  inputSchema: z.object({
    classId: z.string().uuid(),
    studentId: z.string().uuid(),
  }),
  handler: async (input, session) => {
    const { classId, studentId } = input as { classId: string; studentId: string };

    // Verify class belongs to teacher
    const [classRecord] = await db
      .select()
      .from(classes)
      .where(and(eq(classes.id, classId), eq(classes.teacher_id, session.userId)))
      .limit(1);

    if (!classRecord) {
      throw new Error('Class not found or not authorized');
    }

    // Get enrollment info
    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.class_id, classId), eq(enrollments.student_id, studentId)))
      .limit(1);

    if (!enrollment) {
      throw new Error('Student not enrolled in this class');
    }

    // Get attendance records
    const attendanceRecords = await db
      .select({
        attendance: attendance,
        session: classSessions,
      })
      .from(attendance)
      .innerJoin(classSessions, eq(attendance.class_session_id, classSessions.id))
      .where(and(eq(attendance.student_id, studentId), eq(classSessions.class_id, classId)))
      .orderBy(desc(classSessions.session_date));

    // Get grades
    const gradeRecords = await db
      .select({
        grade: grades,
        submission: submissions,
        assignment: assignments,
      })
      .from(grades)
      .innerJoin(submissions, eq(grades.submission_id, submissions.id))
      .innerJoin(assignments, eq(submissions.assignment_id, assignments.id))
      .where(and(eq(submissions.student_id, studentId), eq(assignments.class_id, classId)))
      .orderBy(desc(assignments.due_date));

    return {
      classId,
      studentId,
      enrollment: {
        enrollmentDate: enrollment.enrollment_date,
        status: enrollment.status,
        attendanceRate: enrollment.attendance_rate,
        currentGrade: enrollment.current_grade,
      },
      attendance: {
        total: attendanceRecords.length,
        present: attendanceRecords.filter(a => a.attendance.status === 'present').length,
        absent: attendanceRecords.filter(a => a.attendance.status === 'absent').length,
        late: attendanceRecords.filter(a => a.attendance.status === 'late').length,
        recentRecords: attendanceRecords.slice(0, 10).map(a => ({
          date: a.session.session_date,
          status: a.attendance.status,
          notes: a.attendance.notes,
        })),
      },
      grades: {
        total: gradeRecords.length,
        averageScore:
          gradeRecords.length > 0
            ? gradeRecords.reduce((sum, g) => sum + parseFloat(g.grade.score || '0'), 0) / gradeRecords.length
            : 0,
        recentGrades: gradeRecords.slice(0, 10).map(g => ({
          assignmentTitle: g.assignment.title,
          score: g.grade.score,
          grade: g.grade.grade,
          feedback: g.grade.feedback,
          gradedAt: g.grade.graded_at,
        })),
      },
    };
  },
};

/**
 * Resources
 */

const timetableResource: MCPResource = {
  uri: 'mycastle://teacher/timetable',
  name: 'Teacher Timetable',
  description: 'Current week\'s timetable for the teacher',
  requiredScopes: ['teacher:view_timetable'],
  mimeType: 'application/json',
  handler: async (session, params) => {
    // Get current week
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay() + 1)); // Monday
    const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000); // Sunday

    return viewTimetableTool.handler(
      {
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
      },
      session
    );
  },
};

const lessonPlansResource: MCPResource = {
  uri: 'mycastle://teacher/lesson-plans',
  name: 'Lesson Plans',
  description: 'Teacher\'s lesson plans',
  requiredScopes: ['teacher:view_lesson_plans'],
  mimeType: 'application/json',
  handler: async (session, params) => {
    const plans = await db
      .select()
      .from(lessonPlans)
      .where(and(eq(lessonPlans.teacher_id, session.userId), eq(lessonPlans.tenant_id, session.tenantId)))
      .orderBy(desc(lessonPlans.created_at))
      .limit(50);

    return {
      lessonPlans: plans.map(p => ({
        id: p.id,
        title: p.title,
        topic: p.topic,
        cefrLevel: p.cefr_level,
        durationMinutes: p.duration_minutes,
        status: p.status,
        isAiGenerated: p.is_ai_generated === 'true',
        createdAt: p.created_at,
      })),
      total: plans.length,
    };
  },
};

const classesResource: MCPResource = {
  uri: 'mycastle://teacher/classes',
  name: 'Teacher Classes',
  description: 'Classes taught by the teacher',
  requiredScopes: ['teacher:view_classes'],
  mimeType: 'application/json',
  handler: async (session, params) => {
    const teacherClasses = await db
      .select()
      .from(classes)
      .where(and(eq(classes.teacher_id, session.userId), eq(classes.tenant_id, session.tenantId)))
      .orderBy(classes.name);

    return {
      classes: teacherClasses.map(c => ({
        id: c.id,
        name: c.name,
        code: c.code,
        level: c.level,
        subject: c.subject,
        capacity: c.capacity,
        enrolledCount: c.enrolled_count,
        status: c.status,
        startDate: c.start_date,
        endDate: c.end_date,
      })),
      total: teacherClasses.length,
    };
  },
};

/**
 * Prompts
 */

const planLessonPrompt: MCPPrompt = {
  name: 'plan_lesson',
  description: 'Lesson planning workflow prompt',
  requiredScopes: ['teacher:create_lesson_plan'],
  variables: ['cefrLevel', 'topic', 'duration'],
  template: `You are helping a teacher plan a lesson.

CEFR Level: {{cefrLevel}}
Topic: {{topic}}
Duration: {{duration}} minutes

Please help the teacher create a comprehensive lesson plan that includes:
1. Learning objectives aligned with CEFR descriptors
2. Warm-up activity (5-10 minutes)
3. Main activities with timings
4. Assessment methods
5. Required materials
6. Differentiation strategies for mixed-ability classes

Use the create_lesson_plan tool to save the plan once finalized.`,
};

const analyzePerformancePrompt: MCPPrompt = {
  name: 'analyze_performance',
  description: 'Student performance analysis workflow',
  requiredScopes: ['teacher:view_class_analytics', 'teacher:view_student_progress'],
  variables: ['classId'],
  template: `You are helping a teacher analyze class performance.

Class ID: {{classId}}

Use the view_class_analytics tool to get overall class statistics, then identify:
1. Students with low attendance rates (< 80%)
2. Students struggling academically
3. Patterns in assignment completion
4. Recommendations for intervention

For at-risk students, use view_student_progress to get detailed information.`,
};

const markRegisterPrompt: MCPPrompt = {
  name: 'mark_register',
  description: 'Attendance marking workflow',
  requiredScopes: ['teacher:mark_attendance', 'teacher:view_class_roster'],
  variables: ['sessionId'],
  template: `You are helping a teacher mark attendance.

Session ID: {{sessionId}}

1. Use view_class_roster to get the full student list
2. For each student, use mark_attendance to record their status
3. Use keyboard shortcuts for efficiency:
   - P = Present
   - A = Absent
   - L = Late
   - E = Excused

After marking, provide a summary of attendance for this session.`,
};

/**
 * Teacher MCP Server Configuration
 */
export const teacherMCPConfig: MCPServerConfig = {
  name: 'Teacher MCP',
  version: '1.0.0',
  scopePrefix: 'teacher',
  tools: [
    viewTimetableTool,
    createLessonPlanTool,
    markAttendanceTool,
    viewClassRosterTool,
    createAssignmentTool,
    gradeSubmissionTool,
    viewClassAnalyticsTool,
    createClassSessionTool,
    updateSessionNotesTool,
    viewStudentProgressTool,
  ],
  resources: [timetableResource, lessonPlansResource, classesResource],
  prompts: [planLessonPrompt, analyzePerformancePrompt, markRegisterPrompt],
};

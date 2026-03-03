/**
 * GET /api/teacher/students/[id]
 * Get student profile for teacher view
 * Excludes sensitive PII (contact details, visa info, address)
 * Only accessible if student is enrolled in teacher's classes
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, classes, enrollments, attendance } from '@/db/schema';
import { eq, and, sql, desc, inArray } from 'drizzle-orm';
import { requireAuth, getTenantId, getCurrentUser } from '@/lib/auth/utils';
import { canTeacherAccessStudent, getSharedClasses } from '@/lib/teachers';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(['teacher']);
    const user = await getCurrentUser();
    const tenantId = await getTenantId();
    const { id: studentId } = await params;

    if (!user || !tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify teacher can access this student
    const canAccess = await canTeacherAccessStudent(user.id, studentId, tenantId);
    if (!canAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this student' },
        { status: 403 }
      );
    }

    // Fetch student basic info (exclude sensitive data)
    const [student] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        currentLevel: users.currentLevel,
        initialLevel: users.initialLevel,
        levelStatus: users.levelStatus,
        avatarUrl: users.avatarUrl,
        isActive: users.isActive,
        createdAt: users.createdAt,
        // Explicitly NOT including: phone, metadata (contains address, visa, etc.)
      })
      .from(users)
      .where(and(eq(users.id, studentId), eq(users.role, 'student')))
      .limit(1);

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Get shared classes (classes where both teacher and student are connected)
    const sharedClasses = await getSharedClasses(user.id, studentId, tenantId);

    // Get enrollment info for shared classes only
    const sharedClassIds = sharedClasses.map(c => c.id);
    const studentEnrollments = await db
      .select({
        id: enrollments.id,
        classId: enrollments.classId,
        enrollmentDate: enrollments.enrollmentDate,
        expectedEndDate: enrollments.expectedEndDate,
        status: enrollments.status,
        attendanceRate: enrollments.attendanceRate,
        currentGrade: enrollments.currentGrade,
      })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.studentId, studentId),
          eq(enrollments.tenantId, tenantId),
          inArray(enrollments.classId, sharedClassIds)
        )
      )
      .orderBy(desc(enrollments.enrollmentDate));

    // Get attendance summary for shared classes
    const attendanceRecords = await db
      .select({
        status: attendance.status,
        count: sql<number>`count(*)::int`,
      })
      .from(attendance)
      .innerJoin(
        classes,
        sql`${attendance.classSessionId} IN (
          SELECT cs.id FROM class_sessions cs WHERE cs.class_id = ${classes.id}
        )`
      )
      .where(and(eq(attendance.studentId, studentId), inArray(classes.id, sharedClassIds)))
      .groupBy(attendance.status);

    const attendanceSummary = {
      present: attendanceRecords.find(r => r.status === 'present')?.count || 0,
      absent: attendanceRecords.find(r => r.status === 'absent')?.count || 0,
      late: attendanceRecords.find(r => r.status === 'late')?.count || 0,
      excused: attendanceRecords.find(r => r.status === 'excused')?.count || 0,
    };

    const totalSessions =
      attendanceSummary.present +
      attendanceSummary.absent +
      attendanceSummary.late +
      attendanceSummary.excused;

    const attendanceRate =
      totalSessions > 0
        ? Math.round(((attendanceSummary.present + attendanceSummary.late) / totalSessions) * 100)
        : null;

    // Build response with enrollments including class info
    const enrichedEnrollments = studentEnrollments.map(enrollment => {
      const classInfo = sharedClasses.find(c => c.id === enrollment.classId);
      return {
        ...enrollment,
        className: classInfo?.name || 'Unknown',
        classCode: classInfo?.code,
        classLevel: classInfo?.level,
      };
    });

    return NextResponse.json({
      student: {
        ...student,
        // Map isActive to status for UI consistency
        status: student.isActive ? 'active' : 'inactive',
        // Teacher-specific context
        isTeacherView: true,
      },
      sharedClasses,
      enrollments: enrichedEnrollments,
      attendance: {
        summary: attendanceSummary,
        rate: attendanceRate,
        total: totalSessions,
      },
    });
  } catch (error) {
    console.error('Error fetching student for teacher:', error);
    return NextResponse.json({ error: 'Failed to fetch student details' }, { status: 500 });
  }
}

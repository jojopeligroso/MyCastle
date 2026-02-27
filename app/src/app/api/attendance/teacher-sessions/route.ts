/**
 * Teacher Sessions API
 * GET /api/attendance/teacher-sessions?date=YYYY-MM-DD
 * Returns today's sessions for the authenticated teacher with roster
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { classes, classSessions, enrollments, users, students, attendance } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getCurrentUser, getTenantId } from '@/lib/auth/utils';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await getTenantId();
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'No tenant context' }, { status: 403 });
    }

    const userRole = user.user_metadata?.role || user.app_metadata?.role || 'student';
    const isAdmin = userRole === 'admin' || userRole === 'super_admin';
    const isTeacher = userRole === 'teacher';

    if (!isAdmin && !isTeacher) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // Get classes for this teacher (or all classes for admin)
    const classConditions = [eq(classes.tenantId, tenantId), eq(classes.status, 'active')];

    if (isTeacher) {
      classConditions.push(eq(classes.teacherId, user.id));
    }

    const teacherClasses = await db
      .select({
        id: classes.id,
        name: classes.name,
        level: classes.level,
        startTime: classes.startTime,
        endTime: classes.endTime,
      })
      .from(classes)
      .where(and(...classConditions));

    if (teacherClasses.length === 0) {
      return NextResponse.json({
        success: true,
        data: { sessions: [] },
      });
    }

    // Build sessions with roster for each class
    const sessions = [];

    for (const cls of teacherClasses) {
      // Find or create session for today
      let [session] = await db
        .select()
        .from(classSessions)
        .where(
          and(
            eq(classSessions.classId, cls.id),
            eq(classSessions.sessionDate, date),
            eq(classSessions.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!session && cls.startTime) {
        // Auto-create session
        [session] = await db
          .insert(classSessions)
          .values({
            tenantId,
            classId: cls.id,
            sessionDate: date,
            startTime: cls.startTime,
            endTime: cls.endTime || calculateEndTime(cls.startTime),
            status: 'scheduled',
          })
          .returning();
      }

      if (!session) continue;

      // Get enrolled students with attendance
      const roster = await db
        .select({
          student: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
          studentRecord: {
            isVisaStudent: students.isVisaStudent,
          },
          attendance: {
            id: attendance.id,
            status: attendance.status,
            notes: attendance.notes,
          },
        })
        .from(enrollments)
        .innerJoin(users, eq(enrollments.studentId, users.id))
        .leftJoin(students, eq(students.userId, users.id))
        .leftJoin(
          attendance,
          and(
            eq(attendance.studentId, users.id),
            eq(attendance.classSessionId, session.id),
            eq(attendance.tenantId, tenantId)
          )
        )
        .where(
          and(
            eq(enrollments.classId, cls.id),
            eq(enrollments.status, 'active'),
            eq(enrollments.tenantId, tenantId)
          )
        )
        .orderBy(users.name);

      sessions.push({
        id: session.id,
        classId: cls.id,
        className: cls.name,
        classLevel: cls.level,
        startTime: session.startTime,
        endTime: session.endTime,
        status: session.status,
        roster: roster.map(r => ({
          id: r.student.id,
          name: r.student.name,
          email: r.student.email,
          visaStudent: r.studentRecord?.isVisaStudent ?? false,
          attendance: r.attendance?.id
            ? {
                id: r.attendance.id,
                status: r.attendance.status,
                notes: r.attendance.notes,
              }
            : null,
        })),
      });
    }

    // Sort by start time
    sessions.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

    return NextResponse.json({
      success: true,
      data: { sessions },
    });
  } catch (error) {
    console.error('[Teacher Sessions API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function calculateEndTime(startTime: string): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const endHour = (hours + 1) % 24;
  return `${String(endHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

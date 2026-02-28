/**
 * Admin Attendance Stats API
 * GET /api/attendance/admin/stats?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Returns school-wide attendance statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attendance, classSessions, enrollments, users, students, classes } from '@/db/schema';
import { eq, and, gte, lte, sql, count } from 'drizzle-orm';
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
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const dateFrom = searchParams.get('from');
    const dateTo = searchParams.get('to');

    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { success: false, error: 'Missing date range parameters' },
        { status: 400 }
      );
    }

    // Get attendance counts by status
    const attendanceCounts = await db
      .select({
        status: attendance.status,
        count: count(),
      })
      .from(attendance)
      .innerJoin(classSessions, eq(attendance.classSessionId, classSessions.id))
      .where(
        and(
          eq(attendance.tenantId, tenantId),
          gte(classSessions.sessionDate, dateFrom),
          lte(classSessions.sessionDate, dateTo)
        )
      )
      .groupBy(attendance.status);

    const statusMap: Record<string, number> = {};
    attendanceCounts.forEach(row => {
      statusMap[row.status] = Number(row.count);
    });

    const presentCount = statusMap['present'] || 0;
    const absentCount = statusMap['absent'] || 0;
    const lateCount = statusMap['late'] || 0;
    const excusedCount = statusMap['excused'] || 0;
    const totalRecords = presentCount + absentCount + lateCount + excusedCount;
    const overallAttendanceRate =
      totalRecords > 0 ? ((presentCount + lateCount) / totalRecords) * 100 : 0;

    // Get total students
    const [studentCountResult] = await db
      .select({ count: count() })
      .from(enrollments)
      .where(and(eq(enrollments.tenantId, tenantId), eq(enrollments.status, 'active')));

    const totalStudents = Number(studentCountResult?.count || 0);

    // Get total sessions in date range
    const [sessionCountResult] = await db
      .select({ count: count() })
      .from(classSessions)
      .where(
        and(
          eq(classSessions.tenantId, tenantId),
          gte(classSessions.sessionDate, dateFrom),
          lte(classSessions.sessionDate, dateTo)
        )
      );

    const totalSessions = Number(sessionCountResult?.count || 0);

    // Get students with low attendance (below 85%)
    const lowAttendanceQuery = await db
      .select({
        studentId: users.id,
        studentName: users.name,
        studentEmail: users.email,
        className: classes.name,
        isVisaStudent: students.isVisaStudent,
        presentCount: sql<number>`SUM(CASE WHEN ${attendance.status} = 'present' THEN 1 ELSE 0 END)::int`,
        lateCount: sql<number>`SUM(CASE WHEN ${attendance.status} = 'late' THEN 1 ELSE 0 END)::int`,
        absentCount: sql<number>`SUM(CASE WHEN ${attendance.status} = 'absent' THEN 1 ELSE 0 END)::int`,
        totalSessions: sql<number>`COUNT(${attendance.id})::int`,
      })
      .from(attendance)
      .innerJoin(users, eq(attendance.studentId, users.id))
      .innerJoin(classSessions, eq(attendance.classSessionId, classSessions.id))
      .innerJoin(classes, eq(classSessions.classId, classes.id))
      .leftJoin(students, eq(students.userId, users.id))
      .where(
        and(
          eq(attendance.tenantId, tenantId),
          gte(classSessions.sessionDate, dateFrom),
          lte(classSessions.sessionDate, dateTo)
        )
      )
      .groupBy(users.id, users.name, users.email, classes.name, students.isVisaStudent)
      .having(sql`COUNT(${attendance.id}) > 0`);

    const lowAttendanceStudents = lowAttendanceQuery
      .map(row => {
        const total = row.totalSessions || 1;
        const present = row.presentCount || 0;
        const late = row.lateCount || 0;
        const attendanceRate = ((present + late) / total) * 100;
        return {
          id: row.studentId,
          name: row.studentName || 'Unknown',
          email: row.studentEmail || '',
          className: row.className || '',
          isVisaStudent: row.isVisaStudent || false,
          attendanceRate,
          totalSessions: total,
          presentCount: present,
          absentCount: row.absentCount || 0,
          lateCount: late,
        };
      })
      .filter(s => s.attendanceRate < 85)
      .sort((a, b) => a.attendanceRate - b.attendanceRate);

    // Count visa students at risk
    const visaStudentsAtRisk = lowAttendanceStudents.filter(s => s.isVisaStudent).length;

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalStudents,
          totalSessions,
          overallAttendanceRate,
          presentCount,
          absentCount,
          lateCount,
          excusedCount,
          visaStudentsAtRisk,
        },
        lowAttendanceStudents: lowAttendanceStudents.slice(0, 20), // Top 20 lowest
      },
    });
  } catch (error) {
    console.error('[Admin Stats API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

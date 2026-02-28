/**
 * Admin Student Search API
 * GET /api/attendance/admin/search-students?q=query&from=YYYY-MM-DD&to=YYYY-MM-DD
 * Search students with attendance stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attendance, classSessions, enrollments, users, students, classes } from '@/db/schema';
import { eq, and, gte, lte, sql, or, ilike } from 'drizzle-orm';
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
    const query = searchParams.get('q') || '';
    const dateFrom = searchParams.get('from');
    const dateTo = searchParams.get('to');

    if (!query.trim()) {
      return NextResponse.json({ success: true, data: { students: [] } });
    }

    // Search students
    const searchPattern = `%${query}%`;

    const results = await db
      .select({
        studentId: users.id,
        studentName: users.name,
        studentEmail: users.email,
        className: classes.name,
      })
      .from(enrollments)
      .innerJoin(users, eq(enrollments.studentId, users.id))
      .innerJoin(classes, eq(enrollments.classId, classes.id))
      .where(
        and(
          eq(enrollments.tenantId, tenantId),
          eq(enrollments.status, 'active'),
          or(ilike(users.name, searchPattern), ilike(users.email, searchPattern))
        )
      )
      .limit(20);

    // Get attendance stats for each student
    const studentsWithStats = await Promise.all(
      results.map(async row => {
        let attendanceRate = 0;
        let totalSessions = 0;
        let presentCount = 0;
        let absentCount = 0;
        let lateCount = 0;

        if (dateFrom && dateTo) {
          const stats = await db
            .select({
              presentCount: sql<number>`SUM(CASE WHEN ${attendance.status} = 'present' THEN 1 ELSE 0 END)::int`,
              lateCount: sql<number>`SUM(CASE WHEN ${attendance.status} = 'late' THEN 1 ELSE 0 END)::int`,
              absentCount: sql<number>`SUM(CASE WHEN ${attendance.status} = 'absent' THEN 1 ELSE 0 END)::int`,
              totalSessions: sql<number>`COUNT(${attendance.id})::int`,
            })
            .from(attendance)
            .innerJoin(classSessions, eq(attendance.classSessionId, classSessions.id))
            .where(
              and(
                eq(attendance.studentId, row.studentId),
                eq(attendance.tenantId, tenantId),
                gte(classSessions.sessionDate, dateFrom),
                lte(classSessions.sessionDate, dateTo)
              )
            );

          if (stats[0]) {
            totalSessions = stats[0].totalSessions || 0;
            presentCount = stats[0].presentCount || 0;
            absentCount = stats[0].absentCount || 0;
            lateCount = stats[0].lateCount || 0;
            attendanceRate =
              totalSessions > 0 ? ((presentCount + lateCount) / totalSessions) * 100 : 0;
          }
        }

        return {
          id: row.studentId,
          name: row.studentName || 'Unknown',
          email: row.studentEmail || '',
          className: row.className || '',
          attendanceRate,
          totalSessions,
          presentCount,
          absentCount,
          lateCount,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: { students: studentsWithStats },
    });
  } catch (error) {
    console.error('[Admin Search Students API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

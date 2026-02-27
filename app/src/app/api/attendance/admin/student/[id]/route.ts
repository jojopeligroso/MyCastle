/**
 * Admin Student Attendance Records API
 * GET /api/attendance/admin/student/[id]?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Returns detailed attendance records for a specific student
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attendance, classSessions, classes } from '@/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { getCurrentUser, getTenantId } from '@/lib/auth/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
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

    const { id: studentId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const dateFrom = searchParams.get('from');
    const dateTo = searchParams.get('to');

    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { success: false, error: 'Missing date range parameters' },
        { status: 400 }
      );
    }

    // Get attendance records
    const records = await db
      .select({
        date: classSessions.sessionDate,
        className: classes.name,
        status: attendance.status,
        notes: attendance.notes,
      })
      .from(attendance)
      .innerJoin(classSessions, eq(attendance.classSessionId, classSessions.id))
      .innerJoin(classes, eq(classSessions.classId, classes.id))
      .where(
        and(
          eq(attendance.studentId, studentId),
          eq(attendance.tenantId, tenantId),
          gte(classSessions.sessionDate, dateFrom),
          lte(classSessions.sessionDate, dateTo)
        )
      )
      .orderBy(desc(classSessions.sessionDate));

    return NextResponse.json({
      success: true,
      data: {
        records: records.map(r => ({
          date: r.date,
          className: r.className,
          status: r.status,
          notes: r.notes,
        })),
      },
    });
  } catch (error) {
    console.error('[Admin Student Records API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

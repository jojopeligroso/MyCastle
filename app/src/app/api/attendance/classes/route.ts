/**
 * Attendance Classes API - Get classes available for attendance marking
 * GET /api/attendance/classes
 * Returns all active classes (for admins) or teacher's assigned classes (for teachers)
 */

import { NextResponse } from 'next/server';
import { db } from '@/db';
import { classes, users, enrollments } from '@/db/schema';
import { eq, and, count } from 'drizzle-orm';
import { getCurrentUser, getTenantId } from '@/lib/auth/utils';

export async function GET(): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    const tenantId = await getTenantId();
    if (!tenantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'No tenant context',
        },
        { status: 403 }
      );
    }

    const userRole = user.user_metadata?.role || user.app_metadata?.role || 'student';
    const isAdmin = userRole === 'admin' || userRole === 'super_admin';
    const isTeacher = userRole === 'teacher';

    if (!isAdmin && !isTeacher) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden - Teacher or Admin access required',
        },
        { status: 403 }
      );
    }

    // Build query conditions
    const conditions = [eq(classes.tenantId, tenantId), eq(classes.status, 'active')];

    // Teachers only see their assigned classes
    if (isTeacher) {
      conditions.push(eq(classes.teacherId, user.id));
    }

    // Fetch classes with enrollment count and teacher info
    const classData = await db
      .select({
        id: classes.id,
        name: classes.name,
        code: classes.code,
        level: classes.level,
        subject: classes.subject,
        enrolledCount: classes.enrolledCount,
        capacity: classes.capacity,
        teacherId: classes.teacherId,
        teacherName: users.name,
        startTime: classes.startTime,
        endTime: classes.endTime,
        daysOfWeek: classes.daysOfWeek,
        activeEnrollments: count(enrollments.id),
      })
      .from(classes)
      .leftJoin(users, eq(classes.teacherId, users.id))
      .leftJoin(
        enrollments,
        and(eq(enrollments.classId, classes.id), eq(enrollments.status, 'active'))
      )
      .where(and(...conditions))
      .groupBy(classes.id, users.id)
      .orderBy(classes.name);

    // Format response
    const formattedClasses = classData.map(c => ({
      id: c.id,
      name: c.name,
      code: c.code,
      level: c.level,
      subject: c.subject,
      enrolledCount: c.activeEnrollments || c.enrolledCount || 0,
      capacity: c.capacity,
      teacherId: c.teacherId,
      teacherName: c.teacherName,
      schedule: {
        startTime: c.startTime,
        endTime: c.endTime,
        daysOfWeek: c.daysOfWeek || [],
      },
    }));

    return NextResponse.json(
      {
        success: true,
        data: {
          classes: formattedClasses,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Attendance Classes API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

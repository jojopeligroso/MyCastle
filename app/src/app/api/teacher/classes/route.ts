/**
 * Teacher Classes API
 * GET /api/teacher/classes
 * Returns list of classes for the authenticated teacher
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { classes, enrollments } from '@/db/schema';
import { eq, and, count } from 'drizzle-orm';
import { getNormalizedUser } from '@/lib/auth/utils';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify authentication
    const user = await getNormalizedUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    // Verify user is a teacher or admin
    if (user.role !== 'teacher' && user.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden - only teachers and admins can access this endpoint',
        },
        { status: 403 }
      );
    }

    // Fetch classes for the teacher
    const teacherClasses = await db
      .select({
        id: classes.id,
        name: classes.name,
        code: classes.code,
        level: classes.level,
        subject: classes.subject,
        enrolledCount: classes.enrolled_count,
        capacity: classes.capacity,
        status: classes.status,
        room: classes.room,
        schedule: classes.schedule,
      })
      .from(classes)
      .where(
        and(
          eq(classes.teacher_id, user.id),
          eq(classes.tenant_id, user.tenant_id),
          eq(classes.status, 'active')
        )
      )
      .orderBy(classes.name);

    return NextResponse.json(
      {
        success: true,
        data: teacherClasses,
        count: teacherClasses.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Teacher Classes API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

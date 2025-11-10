/**
 * Timetable API - Optimized weekly timetable for teachers
 * GET /api/timetable?weekStart=YYYY-MM-DD
 *
 * T-044: Timetable Query Optimization (8 points, Medium)
 * - Compound indexes on (teacher_id, week_range)
 * - Optimized SQL query for p95 < 200ms
 * - Next.js revalidateTag caching
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { classSessions, classes, enrollments } from '@/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { getNormalizedUser } from '@/lib/auth/utils';
import { revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';
export const revalidate = 300; // Cache for 5 minutes

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const searchParams = request.nextUrl.searchParams;
    const weekStart = searchParams.get('weekStart');

    if (!weekStart) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter: weekStart',
        },
        { status: 400 }
      );
    }

    // Calculate week end (7 days later)
    const weekEnd = new Date(new Date(weekStart).getTime() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

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

    // Optimized query using compound indexes
    // Uses idx_classes_teacher_status and idx_class_sessions_teacher_date
    const sessions = await db
      .select({
        session: {
          id: classSessions.id,
          sessionDate: classSessions.session_date,
          startTime: classSessions.start_time,
          endTime: classSessions.end_time,
          topic: classSessions.topic,
          notes: classSessions.notes,
          status: classSessions.status,
        },
        class: {
          id: classes.id,
          name: classes.name,
          code: classes.code,
          level: classes.level,
          subject: classes.subject,
          enrolledCount: classes.enrolled_count,
          capacity: classes.capacity,
        },
      })
      .from(classSessions)
      .innerJoin(classes, eq(classSessions.class_id, classes.id))
      .where(
        and(
          eq(classes.teacher_id, user.id),
          eq(classes.tenant_id, user.tenant_id),
          eq(classes.status, 'active'),
          gte(classSessions.session_date, weekStart),
          lte(classSessions.session_date, weekEnd)
        )
      )
      .orderBy(classSessions.session_date, classSessions.start_time);

    const executionTime = Date.now() - startTime;

    // Log performance warning if query is slow
    if (executionTime > 200) {
      console.warn(`[Timetable API] Slow query: ${executionTime}ms (p95 target: 200ms)`);
    }

    // Group sessions by day
    const sessionsByDay: Record<string, typeof sessions> = {};

    for (const session of sessions) {
      const day = session.session.sessionDate;
      if (!sessionsByDay[day]) {
        sessionsByDay[day] = [];
      }
      sessionsByDay[day].push(session);
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          weekStart,
          weekEnd,
          sessions,
          sessionsByDay,
          totalSessions: sessions.length,
        },
        metadata: {
          executionTimeMs: executionTime,
          userId: user.id,
          userName: user.name,
        },
      },
      {
        status: 200,
        headers: {
          'X-Execution-Time-Ms': String(executionTime),
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('[Timetable API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/timetable - Revalidate timetable cache
 * Called when timetable data changes (new sessions, updates, etc.)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
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

    // Revalidate cache tag
    revalidateTag('timetable');
    revalidateTag(`timetable-${user.id}`);

    return NextResponse.json(
      {
        success: true,
        message: 'Timetable cache revalidated',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Timetable Revalidate API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

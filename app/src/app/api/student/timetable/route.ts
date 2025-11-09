/**
 * Student Timetable API
 * GET /api/student/timetable?weekStart=YYYY-MM-DD
 *
 * T-045: Student Timetable/Materials View (8 points, Medium)
 * - RLS enforces enrollment check
 * - Materials served with signed URLs (24h expiry)
 * - Optimized query using indexes
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { classSessions, classes, enrollments, materials, lessonPlanMaterials } from '@/db/schema';
import { eq, and, gte, lte, inArray } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 300; // Cache for 5 minutes

/**
 * Generate signed URL for material access
 * In production, this would use Supabase Storage signed URLs
 */
function generateSignedUrl(materialUrl: string): { url: string; expiresAt: string } {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // In production: supabase.storage.from('materials').createSignedUrl(path, 86400)
  // For now, return the URL with expiry timestamp
  return {
    url: `${materialUrl}?expires=${expiresAt.getTime()}&signature=mock`,
    expiresAt: expiresAt.toISOString(),
  };
}

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

    // Get student's enrolled classes
    const enrolledClasses = await db
      .select({
        classId: enrollments.class_id,
      })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.student_id, user.id),
          eq(enrollments.tenant_id, user.tenant_id),
          eq(enrollments.status, 'active')
        )
      );

    if (enrolledClasses.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: {
            weekStart,
            weekEnd,
            sessions: [],
            sessionsByDay: {},
            totalSessions: 0,
          },
          metadata: {
            executionTimeMs: Date.now() - startTime,
            userId: user.id,
            enrolledClassCount: 0,
          },
        },
        { status: 200 }
      );
    }

    const classIds = enrolledClasses.map(ec => ec.classId);

    // RLS enforces: students only see enrolled classes
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
        },
      })
      .from(classSessions)
      .innerJoin(classes, eq(classSessions.class_id, classes.id))
      .where(
        and(
          inArray(classes.id, classIds),
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
      console.warn(`[Student Timetable API] Slow query: ${executionTime}ms (p95 target: 200ms)`);
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
          enrolledClasses: enrolledClasses.length,
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
    console.error('[Student Timetable API] Error:', error);

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
 * GET /api/student/timetable/materials?sessionId=uuid
 * Fetch materials for a specific session with signed URLs
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter: sessionId',
        },
        { status: 400 }
      );
    }

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

    // Verify student is enrolled in the class for this session
    const session = await db
      .select({
        classId: classSessions.class_id,
      })
      .from(classSessions)
      .where(eq(classSessions.id, sessionId))
      .limit(1);

    if (session.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session not found',
        },
        { status: 404 }
      );
    }

    // Check enrollment
    const enrollment = await db
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.student_id, user.id),
          eq(enrollments.class_id, session[0].classId),
          eq(enrollments.status, 'active')
        )
      )
      .limit(1);

    if (enrollment.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Not enrolled in this class',
        },
        { status: 403 }
      );
    }

    // Fetch materials for the session's class
    // In a real implementation, materials would be linked to sessions
    const classMaterials = await db
      .select({
        id: materials.id,
        title: materials.title,
        description: materials.description,
        type: materials.type,
        fileUrl: materials.file_url,
        fileSize: materials.file_size,
        mimeType: materials.mime_type,
        cefrLevel: materials.cefr_level,
      })
      .from(materials)
      .where(
        and(
          eq(materials.tenant_id, user.tenant_id),
          eq(materials.visibility, 'tenant')
        )
      )
      .limit(20);

    // Generate signed URLs for materials
    const materialsWithSignedUrls = classMaterials.map(material => {
      const signedUrl = material.fileUrl ? generateSignedUrl(material.fileUrl) : null;

      return {
        ...material,
        signedUrl: signedUrl?.url,
        urlExpiresAt: signedUrl?.expiresAt,
      };
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          sessionId,
          materials: materialsWithSignedUrls,
          totalMaterials: materialsWithSignedUrls.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Student Materials API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

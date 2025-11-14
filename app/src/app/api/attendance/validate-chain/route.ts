/**
 * Attendance Hash-Chain Validation API
 * GET /api/attendance/validate-chain?sessionId=<uuid>
 *
 * T-052: Hash validation on read
 * Validates the integrity of the hash chain for a class session
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attendance, classSessions, classes } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { validateHashChain } from '@/lib/hash-chain';
import { getCurrentUser } from '@/lib/auth/utils';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter: sessionId',
        },
        { status: 400 }
      );
    }

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

    const userRole = user.user_metadata?.role || user.app_metadata?.role || 'student';

    // Verify session belongs to teacher (or admin)
    const [classSession] = await db
      .select({ session: classSessions, class: classes })
      .from(classSessions)
      .innerJoin(classes, eq(classSessions.class_id, classes.id))
      .where(eq(classSessions.id, sessionId))
      .limit(1);

    if (!classSession) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session not found',
        },
        { status: 404 }
      );
    }

    // Check authorization (teacher or admin)
    const isAuthorized =
      userRole === 'admin' ||
      (userRole === 'teacher' && classSession.class.teacher_id === user.id);

    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
        },
        { status: 403 }
      );
    }

    // Get all attendance records for this session in chronological order
    const records = await db
      .select()
      .from(attendance)
      .where(eq(attendance.class_session_id, sessionId))
      .orderBy(attendance.created_at);

    // Validate hash chain
    // Map records to ensure recorded_by is non-null (fallback to empty string if null)
    const validation = validateHashChain(
      records.map((r) => ({
        ...r,
        recorded_by: r.recorded_by || '',
      }))
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          sessionId,
          validation,
          sessionDetails: {
            date: classSession.session.session_date,
            topic: classSession.session.topic,
            className: classSession.class.name,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Attendance Hash Validation API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

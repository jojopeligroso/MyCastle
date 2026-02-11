/**
 * Session Attendance API - Get/Create session and fetch roster with attendance
 * GET /api/attendance/session?classId=<uuid>&date=YYYY-MM-DD&startTime=HH:MM
 * POST /api/attendance/session - Create new session
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attendance, classSessions, classes, enrollments } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getCurrentUser, getTenantId } from '@/lib/auth/utils';
import { z } from 'zod';

/**
 * GET - Fetch or create session and return roster with current attendance
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const classId = searchParams.get('classId');
    const date = searchParams.get('date');
    const startTime = searchParams.get('startTime');

    if (!classId || !date || !startTime) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: classId, date, startTime',
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

    // Verify class belongs to teacher
    const [classRecord] = await db
      .select()
      .from(classes)
      .where(and(eq(classes.id, classId), eq(classes.tenantId, tenantId)))
      .limit(1);

    if (!classRecord) {
      return NextResponse.json(
        {
          success: false,
          error: 'Class not found',
        },
        { status: 404 }
      );
    }

    const isAuthorized =
      userRole === 'admin' || (userRole === 'teacher' && classRecord.teacherId === user.id);

    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
        },
        { status: 403 }
      );
    }

    // Find or create session
    let [session] = await db
      .select()
      .from(classSessions)
      .where(
        and(
          eq(classSessions.classId, classId),
          eq(classSessions.sessionDate, date),
          eq(classSessions.startTime, startTime),
          eq(classSessions.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!session) {
      // Auto-create session if it doesn't exist
      const endTime = calculateEndTime(startTime); // Add 1 hour by default

      [session] = await db
        .insert(classSessions)
        .values({
          tenantId: tenantId,
          classId: classId,
          sessionDate: date,
          startTime: startTime,
          endTime: endTime,
          status: 'scheduled',
        })
        .returning();
    }

    // Get enrolled students with attendance
    const roster = await db
      .select({
        student: {
          id: sql`users.id`,
          name: sql`users.name`,
          email: sql`users.email`,
        },
        enrollment: {
          enrollmentDate: enrollments.enrollmentDate,
          attendanceRate: enrollments.attendanceRate,
          currentGrade: enrollments.currentGrade,
        },
        attendance: {
          id: attendance.id,
          status: attendance.status,
          notes: attendance.notes,
          recordedAt: attendance.recordedAt,
          hash: attendance.hash,
        },
      })
      .from(enrollments)
      .innerJoin(sql`users`, eq(enrollments.studentId, sql`users.id`))
      .leftJoin(
        attendance,
        and(
          eq(attendance.studentId, sql`users.id`),
          eq(attendance.classSessionId, session.id),
          eq(attendance.tenantId, tenantId)
        )
      )
      .where(
        and(
          eq(enrollments.classId, classId),
          eq(enrollments.status, 'active'),
          eq(enrollments.tenantId, tenantId)
        )
      )
      .orderBy(sql`users.name`);

    return NextResponse.json(
      {
        success: true,
        data: {
          session: {
            id: session.id,
            classId: session.classId,
            sessionDate: session.sessionDate,
            startTime: session.startTime,
            endTime: session.endTime,
            topic: session.topic,
            status: session.status,
          },
          class: {
            id: classRecord.id,
            name: classRecord.name,
            code: classRecord.code,
            level: classRecord.level,
            subject: classRecord.subject,
          },
          roster: roster.map(r => ({
            id: r.student.id,
            name: r.student.name,
            email: r.student.email,
            visaStudent: false, // TODO: Add this field to users table
            attendanceRate: r.enrollment.attendanceRate
              ? parseFloat(String(r.enrollment.attendanceRate))
              : undefined,
            currentGrade: r.enrollment.currentGrade,
            attendance: r.attendance?.id
              ? {
                  id: r.attendance.id,
                  status: r.attendance.status,
                  notes: r.attendance.notes,
                  recordedAt: r.attendance.recordedAt,
                  hash: r.attendance.hash,
                }
              : null,
          })),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Session Attendance API] Error:', error);

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
 * Helper: Calculate end time (1 hour after start by default)
 */
function calculateEndTime(startTime: string): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const endHour = (hours + 1) % 24;
  return `${String(endHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * POST - Create a new session explicitly
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    const schema = z.object({
      classId: z.string().uuid(),
      sessionDate: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      topic: z.string().optional(),
    });

    const validation = schema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { classId, sessionDate, startTime, endTime, topic } = validation.data;

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

    // Verify class ownership
    const [classRecord] = await db
      .select()
      .from(classes)
      .where(and(eq(classes.id, classId), eq(classes.tenantId, tenantId)))
      .limit(1);

    if (!classRecord) {
      return NextResponse.json(
        {
          success: false,
          error: 'Class not found',
        },
        { status: 404 }
      );
    }

    const isAuthorized =
      userRole === 'admin' || (userRole === 'teacher' && classRecord.teacherId === user.id);

    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
        },
        { status: 403 }
      );
    }

    // Create session
    const [session] = await db
      .insert(classSessions)
      .values({
        tenantId: tenantId,
        classId: classId,
        sessionDate: sessionDate,
        startTime: startTime,
        endTime: endTime,
        topic,
        status: 'scheduled',
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        data: {
          sessionId: session.id,
          classId: session.classId,
          sessionDate: session.sessionDate,
          startTime: session.startTime,
          endTime: session.endTime,
          topic: session.topic,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Create Session API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

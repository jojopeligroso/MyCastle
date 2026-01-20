/**
 * Bulk Attendance API - Mark attendance for multiple students
 * POST /api/attendance/bulk
 *
 * T-050: Register UI (Bulk Present + Overrides)
 * Supports bulk operations like "Mark All Present"
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attendance, classSessions, classes } from '@/db/schema';
import { eq, sql, and } from 'drizzle-orm';
import { getCurrentUser, getTenantId } from '@/lib/auth/utils';
import { computeAttendanceHash, getLastHash } from '@/lib/hash-chain';
import { z } from 'zod';

const BulkAttendanceSchema = z.object({
  sessionId: z.string().uuid(),
  attendances: z.array(
    z
      .object({
        studentId: z.string().uuid(),
        status: z.enum(['present', 'absent', 'late', 'excused', 'late_absent']),
        notes: z.string().optional(),
        minutesLate: z.number().int().min(0).max(89).optional().default(0),
        minutesLeftEarly: z.number().int().min(0).max(89).optional().default(0),
      })
      .refine(
        data => {
          // late_absent requires >16 minutes late
          if (data.status === 'late_absent') {
            return (data.minutesLate || 0) > 16;
          }
          // late requires 1-16 minutes late
          if (data.status === 'late') {
            const late = data.minutesLate || 0;
            return late > 0 && late <= 16;
          }
          return true;
        },
        {
          message:
            'Status validation failed: late_absent requires >16 min late, late requires 1-16 min late',
        }
      )
  ),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const body = await request.json();

    // Validate input
    const validation = BulkAttendanceSchema.safeParse(body);
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

    const { sessionId, attendances: attendanceList } = validation.data;

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

    // Verify session belongs to teacher
    const [classSession] = await db
      .select({ session: classSessions, class: classes })
      .from(classSessions)
      .innerJoin(classes, eq(classSessions.class_id, classes.id))
      .where(
        and(
          eq(classSessions.id, sessionId),
          eq(classSessions.tenant_id, tenantId),
          eq(classes.tenant_id, tenantId)
        )
      )
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
      user.role === 'admin' ||
      (user.role === 'teacher' && classSession.class.teacher_id === user.id);

    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden - you do not own this class session',
        },
        { status: 403 }
      );
    }

    // Get last hash for the session
    const sessionRecords = await db
      .select({ hash: attendance.hash, created_at: attendance.created_at })
      .from(attendance)
      .where(and(eq(attendance.class_session_id, sessionId), eq(attendance.tenant_id, tenantId)))
      .orderBy(sql`${attendance.created_at} DESC`)
      .limit(1);

    let currentHash = getLastHash(sessionRecords);

    // Process each attendance record
    const results = [];
    const errors = [];

    for (const item of attendanceList) {
      try {
        const now = new Date();

        // Compute hash for this record
        const hash = computeAttendanceHash(
          {
            tenantId,
            classSessionId: sessionId,
            studentId: item.studentId,
            status: item.status,
            recordedBy: user.id,
            recordedAt: now,
            notes: item.notes,
            minutesLate: item.minutesLate,
            minutesLeftEarly: item.minutesLeftEarly,
          },
          currentHash
        );

        // Upsert attendance record
        const [record] = await db
          .insert(attendance)
          .values({
            tenant_id: tenantId,
            class_session_id: sessionId,
            student_id: item.studentId,
            status: item.status,
            notes: item.notes || null,
            minutes_late: item.minutesLate || 0,
            minutes_left_early: item.minutesLeftEarly || 0,
            recorded_by: user.id,
            hash,
            previous_hash: currentHash,
            is_within_edit_window: 'false',
          })
          .onConflictDoUpdate({
            target: [attendance.class_session_id, attendance.student_id],
            set: {
              status: item.status,
              notes: item.notes || null,
              minutes_late: item.minutesLate || 0,
              minutes_left_early: item.minutesLeftEarly || 0,
              hash,
              edited_by: user.id,
              edited_at: now,
              edit_count: sql`${attendance.edit_count} + 1`,
              is_within_edit_window: 'true',
              updated_at: now,
            },
          })
          .returning();

        results.push({
          studentId: item.studentId,
          status: item.status,
          hash: record.hash,
          success: true,
        });

        // Update current hash for next record in chain
        currentHash = hash;
      } catch (error) {
        console.error(`[Bulk Attendance] Error for student ${item.studentId}:`, error);
        errors.push({
          studentId: item.studentId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const executionTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: errors.length === 0,
        data: {
          sessionId,
          processed: results.length,
          total: attendanceList.length,
          results,
          errors: errors.length > 0 ? errors : undefined,
        },
        metadata: {
          executionTimeMs: executionTime,
        },
      },
      { status: errors.length === 0 ? 200 : 207 } // 207 = Multi-Status
    );
  } catch (error) {
    console.error('[Bulk Attendance API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

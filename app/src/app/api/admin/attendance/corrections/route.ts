import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attendanceCorrections, attendance } from '@/db/schema';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const correctionRequestSchema = z.object({
  sessionId: z.string().uuid(),
  studentId: z.string().uuid(),
  attendanceId: z.string().uuid().optional(),
  originalStatus: z.string(),
  originalNotes: z.string().nullable(),
  correctedStatus: z.string(),
  correctedNotes: z.string(),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

/**
 * POST /api/admin/attendance/corrections
 * Create a new attendance correction request
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 });
    }

    const body = await request.json();
    const validation = correctionRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const {
      sessionId,
      studentId,
      attendanceId: providedAttendanceId,
      originalStatus,
      originalNotes,
      correctedStatus,
      correctedNotes,
      reason,
    } = validation.data;

    // Find the attendance record if not provided
    let attendanceId = providedAttendanceId;
    if (!attendanceId) {
      const record = await db.query.attendance.findFirst({
        where: (attendance, { and, eq }) =>
          and(
            eq(attendance.classSessionId, sessionId),
            eq(attendance.studentId, studentId),
            eq(attendance.tenantId, tenantId)
          ),
      });

      if (!record) {
        return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
      }

      attendanceId = record.id;
    }

    // Check if there's already a pending correction for this attendance record
    const existingCorrection = await db.query.attendanceCorrections.findFirst({
      where: (corrections, { and, eq }) =>
        and(
          eq(corrections.attendanceId, attendanceId),
          eq(corrections.status, 'pending'),
          eq(corrections.tenantId, tenantId)
        ),
    });

    if (existingCorrection) {
      return NextResponse.json(
        { error: 'A pending correction already exists for this attendance record' },
        { status: 409 }
      );
    }

    // Create the correction request
    const [correction] = await db
      .insert(attendanceCorrections)
      .values({
        tenantId,
        attendanceId,
        classSessionId: sessionId,
        studentId,
        originalStatus,
        originalNotes,
        correctedStatus,
        correctedNotes,
        reason,
        requestedBy: user.id,
        status: 'pending',
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        correction: {
          id: correction.id,
          status: correction.status,
          requestedAt: correction.requestedAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating correction request:', error);
    return NextResponse.json({ error: 'Failed to create correction request' }, { status: 500 });
  }
}

/**
 * GET /api/admin/attendance/corrections
 * List all correction requests (with optional filters)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const sessionId = searchParams.get('sessionId');
    const limit = parseInt(searchParams.get('limit') || '50');

    const query = db
      .select({
        id: attendanceCorrections.id,
        sessionId: attendanceCorrections.classSessionId,
        studentId: attendanceCorrections.studentId,
        originalStatus: attendanceCorrections.originalStatus,
        originalNotes: attendanceCorrections.originalNotes,
        correctedStatus: attendanceCorrections.correctedStatus,
        correctedNotes: attendanceCorrections.correctedNotes,
        reason: attendanceCorrections.reason,
        requestedBy: attendanceCorrections.requestedBy,
        requestedAt: attendanceCorrections.requestedAt,
        status: attendanceCorrections.status,
        reviewedBy: attendanceCorrections.reviewedBy,
        reviewedAt: attendanceCorrections.reviewedAt,
        reviewNotes: attendanceCorrections.reviewNotes,
      })
      .from(attendanceCorrections)
      .where(eq(attendanceCorrections.tenantId, tenantId))
      .limit(limit);

    // Apply filters
    const corrections = await query;

    // Filter in-memory for now (can optimize with SQL WHERE clauses later)
    let filtered = corrections;
    if (status) {
      filtered = filtered.filter(c => c.status === status);
    }
    if (sessionId) {
      filtered = filtered.filter(c => c.sessionId === sessionId);
    }

    return NextResponse.json({ corrections: filtered });
  } catch (error) {
    console.error('Error fetching corrections:', error);
    return NextResponse.json({ error: 'Failed to fetch corrections' }, { status: 500 });
  }
}

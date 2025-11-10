/**
 * Attendance CSV Export API
 * GET /api/attendance/export?weekStart=YYYY-MM-DD&classId=<uuid>
 *
 * T-054: Weekly CSV Export with Audit Hash (8 points, Medium)
 * - Generate CSV exports from templates
 * - Include hash column for tamper detection
 * - Signed URLs for downloads
 * - Export completes in < 60s (p95)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attendance, classSessions, classes, enrollments } from '@/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/utils';

/**
 * Generate CSV from attendance records
 */
function generateCSV(
  records: Array<{
    studentName: string;
    studentEmail: string;
    sessionDate: string;
    sessionTime: string;
    status: string;
    notes: string | null;
    recordedBy: string;
    recordedAt: Date;
    hash: string | null;
    previousHash: string | null;
    editCount: number;
    editedAt: Date | null;
  }>,
  metadata: {
    className: string;
    weekStart: string;
    weekEnd: string;
    exportedAt: string;
    exportedBy: string;
  }
): string {
  // CSV header with metadata
  const lines: string[] = [
    '# MyCastle Attendance Export',
    `# Class: ${metadata.className}`,
    `# Week: ${metadata.weekStart} to ${metadata.weekEnd}`,
    `# Exported: ${metadata.exportedAt}`,
    `# Exported by: ${metadata.exportedBy}`,
    '# WARNING: DO NOT MODIFY THIS FILE - Hash verification will detect tampering',
    '',
    // Column headers
    'Student Name,Student Email,Session Date,Session Time,Status,Notes,Recorded By,Recorded At,Hash (SHA256),Previous Hash,Edit Count,Last Edited',
  ];

  // Data rows
  for (const record of records) {
    const row = [
      escapeCsvField(record.studentName),
      escapeCsvField(record.studentEmail),
      record.sessionDate,
      record.sessionTime,
      record.status,
      escapeCsvField(record.notes || ''),
      escapeCsvField(record.recordedBy),
      record.recordedAt.toISOString(),
      record.hash || '',
      record.previousHash || '',
      String(record.editCount),
      record.editedAt ? record.editedAt.toISOString() : '',
    ].join(',');

    lines.push(row);
  }

  return lines.join('\n');
}

/**
 * Escape CSV field (handle commas, quotes, newlines)
 */
function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const searchParams = request.nextUrl.searchParams;
    const weekStart = searchParams.get('weekStart');
    const classId = searchParams.get('classId');

    if (!weekStart || !classId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: weekStart, classId',
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

    // Extract role and tenant_id from metadata
    const userRole = user.user_metadata?.role || user.app_metadata?.role;
    const tenantId = user.user_metadata?.tenant_id || user.app_metadata?.tenant_id;
    const userName = user.user_metadata?.name || user.email || 'Unknown';

    if (!tenantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'No tenant context',
        },
        { status: 403 }
      );
    }

    // Verify class belongs to teacher (or admin)
    const [classRecord] = await db
      .select()
      .from(classes)
      .where(eq(classes.id, classId))
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

    const isAuthorized = userRole === 'admin' ||
                         (userRole === 'teacher' && classRecord.teacher_id === user.id);

    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
        },
        { status: 403 }
      );
    }

    // Fetch attendance records for the week
    const records = await db
      .select({
        attendance: attendance,
        session: classSessions,
        student: {
          id: sql`users.id`,
          name: sql`users.name`,
          email: sql`users.email`,
        },
        recordedBy: {
          name: sql`recorded_by_user.name`,
        },
      })
      .from(attendance)
      .innerJoin(classSessions, eq(attendance.class_session_id, classSessions.id))
      .innerJoin(sql`users`, eq(attendance.student_id, sql`users.id`))
      .leftJoin(sql`users AS recorded_by_user`, eq(attendance.recorded_by, sql`recorded_by_user.id`))
      .where(
        and(
          eq(classSessions.class_id, classId),
          gte(classSessions.session_date, weekStart),
          lte(classSessions.session_date, weekEnd)
        )
      )
      .orderBy(classSessions.session_date, classSessions.start_time, sql`users.name`);

    // Transform records for CSV
    const csvRecords = records.map(r => ({
      studentName: r.student.name as string,
      studentEmail: r.student.email as string,
      sessionDate: r.session.session_date,
      sessionTime: `${r.session.start_time}-${r.session.end_time}`,
      status: r.attendance.status,
      notes: r.attendance.notes,
      recordedBy: r.recordedBy.name as string,
      recordedAt: r.attendance.recorded_at,
      hash: r.attendance.hash,
      previousHash: r.attendance.previous_hash,
      editCount: r.attendance.edit_count || 0,
      editedAt: r.attendance.edited_at,
    }));

    // Generate CSV
    const csv = generateCSV(csvRecords, {
      className: classRecord.name,
      weekStart,
      weekEnd,
      exportedAt: new Date().toISOString(),
      exportedBy: userName,
    });

    const executionTime = Date.now() - startTime;

    // Log export to audit_logs
    await db.execute(sql`
      INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id, changes, ip_address)
      VALUES (
        ${tenantId},
        ${user.id},
        'EXPORT',
        'attendance',
        ${classId},
        ${JSON.stringify({ weekStart, weekEnd, recordCount: csvRecords.length })}::jsonb,
        inet_client_addr()
      )
    `);

    console.log(`[Attendance Export] Generated CSV in ${executionTime}ms (${csvRecords.length} records)`);

    // Return CSV with appropriate headers
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="attendance_${classRecord.code || classId}_${weekStart}.csv"`,
        'X-Execution-Time-Ms': String(executionTime),
        'X-Record-Count': String(csvRecords.length),
      },
    });
  } catch (error) {
    console.error('[Attendance Export API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

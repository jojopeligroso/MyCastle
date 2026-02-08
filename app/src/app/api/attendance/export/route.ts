/**
 * Attendance Export API (CSV/XLSX)
 * GET /api/attendance/export?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&classIds=uuid1,uuid2&format=csv|xlsx
 *
 * Task 1.4.4: Bulk Attendance Export
 * - Date range support (startDate + endDate)
 * - Multi-class export (comma-separated classIds)
 * - Format selection (CSV or XLSX)
 * - Include hash column for tamper detection
 * - Signed URLs with 24h expiry
 * - Export completes in < 60s (p95)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attendance, classSessions, classes } from '@/db/schema';
import { eq, and, gte, lte, sql, inArray, or } from 'drizzle-orm';
import { getCurrentUser, getTenantId } from '@/lib/auth/utils';
import ExcelJS from 'exceljs';
import { createClient } from '@supabase/supabase-js';

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

/**
 * Generate XLSX from attendance records
 */
async function generateXLSX(
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
    classNames: string;
    startDate: string;
    endDate: string;
    exportedAt: string;
    exportedBy: string;
  }
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Attendance');

  // Add metadata as header rows
  worksheet.addRow(['MyCastle Attendance Export']);
  worksheet.addRow(['Classes:', metadata.classNames]);
  worksheet.addRow(['Period:', `${metadata.startDate} to ${metadata.endDate}`]);
  worksheet.addRow(['Exported:', metadata.exportedAt]);
  worksheet.addRow(['Exported by:', metadata.exportedBy]);
  worksheet.addRow(['WARNING: DO NOT MODIFY THIS FILE - Hash verification will detect tampering']);
  worksheet.addRow([]); // Empty row

  // Add column headers
  const headerRow = worksheet.addRow([
    'Student Name',
    'Student Email',
    'Session Date',
    'Session Time',
    'Status',
    'Notes',
    'Recorded By',
    'Recorded At',
    'Hash (SHA256)',
    'Previous Hash',
    'Edit Count',
    'Last Edited',
  ]);

  // Style header row
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  // Add data rows
  for (const record of records) {
    worksheet.addRow([
      record.studentName,
      record.studentEmail,
      record.sessionDate,
      record.sessionTime,
      record.status,
      record.notes || '',
      record.recordedBy,
      record.recordedAt.toISOString(),
      record.hash || '',
      record.previousHash || '',
      record.editCount,
      record.editedAt ? record.editedAt.toISOString() : '',
    ]);
  }

  // Auto-fit columns
  worksheet.columns.forEach(column => {
    column.width = 15;
  });

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const searchParams = request.nextUrl.searchParams;

    // Support both new params (startDate/endDate/classIds) and legacy (weekStart/classId)
    const startDate = searchParams.get('startDate') || searchParams.get('weekStart');
    const endDate = searchParams.get('endDate');
    const classIdsParam = searchParams.get('classIds') || searchParams.get('classId');
    const format = searchParams.get('format') || 'csv'; // csv or xlsx

    if (!startDate || !classIdsParam) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: startDate (or weekStart) and classIds (or classId)',
        },
        { status: 400 }
      );
    }

    // Parse multiple class IDs
    const classIds = classIdsParam.split(',').map(id => id.trim());

    // Calculate end date if not provided (7 days from start for backward compatibility)
    const finalEndDate =
      endDate ||
      new Date(new Date(startDate).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

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
    const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'Unknown';

    // Verify classes belong to teacher (or admin)
    const classRecords = await db
      .select()
      .from(classes)
      .where(and(inArray(classes.id, classIds), eq(classes.tenantId, tenantId)));

    if (classRecords.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No classes found',
        },
        { status: 404 }
      );
    }

    // Check authorization for all classes
    if (userRole !== 'admin') {
      const unauthorizedClasses = classRecords.filter(c => c.teacherId !== user.id);
      if (unauthorizedClasses.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Forbidden: You do not have access to all requested classes',
          },
          { status: 403 }
        );
      }
    }

    const classNames = classRecords
      .map(c => `${c.name} (${c.code || c.id.slice(0, 8)})`)
      .join(', ');

    // Fetch attendance records for the date range and classes
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
      .innerJoin(classSessions, eq(attendance.classSessionId, classSessions.id))
      .innerJoin(sql`users`, eq(attendance.studentId, sql`users.id`))
      .leftJoin(sql`users AS recorded_by_user`, eq(attendance.recordedBy, sql`recorded_by_user.id`))
      .where(
        and(
          inArray(classSessions.classId, classIds),
          eq(classSessions.tenantId, tenantId),
          eq(attendance.tenantId, tenantId),
          gte(classSessions.sessionDate, startDate),
          lte(classSessions.sessionDate, finalEndDate)
        )
      )
      .orderBy(classSessions.sessionDate, classSessions.startTime, sql`users.name`);

    // Transform records for export
    const exportRecords = records.map(r => ({
      studentName: r.student.name as string,
      studentEmail: r.student.email as string,
      sessionDate: r.session.sessionDate,
      sessionTime: `${r.session.startTime}-${r.session.endTime}`,
      status: r.attendance.status,
      notes: r.attendance.notes,
      recordedBy: r.recordedBy.name as string,
      recordedAt: r.attendance.recordedAt,
      hash: r.attendance.hash,
      previousHash: r.attendance.previousHash,
      editCount: r.attendance.editCount || 0,
      editedAt: r.attendance.editedAt,
    }));

    const metadata = {
      classNames,
      startDate,
      endDate: finalEndDate,
      exportedAt: new Date().toISOString(),
      exportedBy: userName,
    };

    // Generate export based on format
    let fileContent: Uint8Array;
    let contentType: string;
    let fileExtension: string;

    if (format === 'xlsx') {
      const buffer = await generateXLSX(exportRecords, metadata);
      fileContent = new Uint8Array(buffer);
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      fileExtension = 'xlsx';
    } else {
      // Default to CSV
      const csvString = generateCSV(exportRecords, {
        className: classNames,
        weekStart: startDate,
        weekEnd: finalEndDate,
        exportedAt: metadata.exportedAt,
        exportedBy: metadata.exportedBy,
      });
      fileContent = new TextEncoder().encode(csvString);
      contentType = 'text/csv';
      fileExtension = 'csv';
    }

    const filename = `attendance_export_${startDate}_to_${finalEndDate}.${fileExtension}`;

    const executionTime = Date.now() - startTime;

    // Upload to Supabase storage and generate signed URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let signedUrl: string | null = null;

    if (supabaseUrl && supabaseServiceKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const storagePath = `exports/${tenantId}/${Date.now()}_${filename}`;

        // Upload file
        const { error: uploadError } = await supabase.storage
          .from('attendance-exports')
          .upload(storagePath, fileContent, {
            contentType,
            upsert: false,
          });

        if (uploadError) {
          console.error('[Attendance Export] Storage upload error:', uploadError);
        } else {
          // Generate signed URL (24 hours expiry)
          const { data: urlData, error: urlError } = await supabase.storage
            .from('attendance-exports')
            .createSignedUrl(storagePath, 86400); // 24 hours in seconds

          if (urlError) {
            console.error('[Attendance Export] Signed URL error:', urlError);
          } else {
            signedUrl = urlData.signedUrl;
          }
        }
      } catch (storageError) {
        console.error('[Attendance Export] Storage error:', storageError);
        // Continue with direct download if storage fails
      }
    }

    // Log export to audit_logs
    await db.execute(sql`
      INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, changes)
      VALUES (
        ${tenantId},
        ${user.id},
        'EXPORT',
        'attendance',
        ${classIds[0]},
        ${JSON.stringify({
          startDate,
          endDate: finalEndDate,
          classIds,
          format,
          recordCount: exportRecords.length,
          signedUrl: signedUrl ? 'generated' : 'direct_download',
        })}::jsonb
      )
    `);

    console.log(
      `[Attendance Export] Generated ${format.toUpperCase()} in ${executionTime}ms (${exportRecords.length} records)`
    );

    // If signed URL was generated, return JSON with URL
    if (signedUrl) {
      return NextResponse.json({
        success: true,
        signedUrl,
        filename,
        recordCount: exportRecords.length,
        executionTime,
        expiresIn: '24 hours',
      });
    }

    // Otherwise, return file directly
    return new NextResponse(fileContent as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Execution-Time-Ms': String(executionTime),
        'X-Record-Count': String(exportRecords.length),
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

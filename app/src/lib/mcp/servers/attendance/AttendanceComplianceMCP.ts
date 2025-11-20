/**
 * Attendance & Compliance MCP Server
 *
 * Provides 8 tools for attendance tracking and regulatory compliance:
 * 1. mark_attendance - Record attendance with hash-chain integrity
 * 2. bulk_import_attendance - Import attendance from CSV
 * 3. get_attendance_register - Get attendance register for reporting
 * 4. check_visa_compliance - Verify student visa compliance
 * 5. generate_attendance_report - Generate compliance reports
 * 6. track_absence_pattern - Identify concerning absence patterns
 * 7. export_compliance_data - Export data for audits
 * 8. send_absence_notification - Notify about absences
 */

import { z } from 'zod';
import { db } from '@/db';
import {
  attendance,
  classSessions,
  enrollments,
  classes,
  users,
} from '@/db/schema';
import { eq, and, gte, lte, count, sql } from 'drizzle-orm';
import { createHash } from 'crypto';
import type { MCPServer, MCPTool, MCPResource, MCPPrompt, MCPSession } from '../../types';

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

const markAttendanceSchema = z.object({
  class_session_id: z.string().uuid(),
  student_id: z.string().uuid(),
  status: z.enum(['present', 'absent', 'late', 'excused']),
  notes: z.string().optional(),
});

const bulkImportAttendanceSchema = z.object({
  class_session_id: z.string().uuid(),
  attendance_records: z.array(z.object({
    student_id: z.string().uuid(),
    status: z.enum(['present', 'absent', 'late', 'excused']),
    notes: z.string().optional(),
  })),
});

const getAttendanceRegisterSchema = z.object({
  class_id: z.string().uuid(),
  start_date: z.string(),
  end_date: z.string(),
});

const checkVisaComplianceSchema = z.object({
  student_id: z.string().uuid(),
  check_type: z.enum(['current_status', 'attendance_requirement', 'full_check']),
});

const generateAttendanceReportSchema = z.object({
  report_type: z.enum(['monthly', 'term', 'custom']),
  class_id: z.string().uuid().optional(),
  student_id: z.string().uuid().optional(),
  start_date: z.string(),
  end_date: z.string(),
  format: z.enum(['json', 'csv', 'pdf']).default('json'),
});

const trackAbsencePatternSchema = z.object({
  student_id: z.string().uuid().optional(),
  class_id: z.string().uuid().optional(),
  threshold_days: z.number().default(3), // Flag if absent N consecutive days
  period_days: z.number().default(30), // Look back period
});

const exportComplianceDataSchema = z.object({
  export_type: z.enum(['ukvi', 'accreditation', 'full_audit']),
  start_date: z.string(),
  end_date: z.string(),
  student_ids: z.array(z.string().uuid()).optional(),
});

const sendAbsenceNotificationSchema = z.object({
  student_id: z.string().uuid(),
  absence_date: z.string(),
  class_id: z.string().uuid(),
  notification_type: z.enum(['student', 'guardian', 'both']),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate SHA256 hash for attendance record integrity
 * Implements hash-chain for tamper detection (T-052)
 */
function calculateAttendanceHash(
  attendanceData: {
    class_session_id: string;
    student_id: string;
    status: string;
    recorded_at: Date;
  },
  previousHash: string | null,
): string {
  const payload = JSON.stringify({
    class_session_id: attendanceData.class_session_id,
    student_id: attendanceData.student_id,
    status: attendanceData.status,
    recorded_at: attendanceData.recorded_at.toISOString(),
  });

  const dataToHash = previousHash ? `${payload}||${previousHash}` : payload;
  return createHash('sha256').update(dataToHash).digest('hex');
}

/**
 * Get the previous attendance hash for hash-chain
 */
async function getPreviousAttendanceHash(
  class_session_id: string,
  tenant_id: string,
): Promise<string | null> {
  const [previousRecord] = await db
    .select({ hash: attendance.hash })
    .from(attendance)
    .where(
      and(
        eq(attendance.class_session_id, class_session_id),
        eq(attendance.tenant_id, tenant_id),
      ),
    )
    .orderBy(sql`${attendance.created_at} DESC`)
    .limit(1);

  return previousRecord?.hash || null;
}

/**
 * Calculate attendance rate for a student
 */
async function calculateAttendanceRate(
  student_id: string,
  class_id: string,
  tenant_id: string,
): Promise<number> {
  const sessions = await db
    .select({
      total: count(),
      present: sql<number>`COUNT(CASE WHEN ${attendance.status} = 'present' THEN 1 END)`,
    })
    .from(attendance)
    .innerJoin(classSessions, eq(attendance.class_session_id, classSessions.id))
    .where(
      and(
        eq(attendance.student_id, student_id),
        eq(classSessions.class_id, class_id),
        eq(attendance.tenant_id, tenant_id),
      ),
    );

  if (!sessions[0] || sessions[0].total === 0) return 0;

  return Math.round((Number(sessions[0].present) / Number(sessions[0].total)) * 100);
}

/**
 * Check visa compliance based on attendance
 * UK Tier 4 visa requires minimum 80% attendance
 */
async function checkVisaAttendanceCompliance(
  student_id: string,
  tenant_id: string,
): Promise<{
  compliant: boolean;
  attendance_rate: number;
  required_rate: number;
  risk_level: 'low' | 'medium' | 'high';
}> {
  const REQUIRED_ATTENDANCE_RATE = 80; // UK Tier 4 requirement

  // Get all active enrollments for student
  const activeEnrollments = await db
    .select({ class_id: enrollments.class_id })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.student_id, student_id),
        eq(enrollments.tenant_id, tenant_id),
        eq(enrollments.status, 'active'),
      ),
    );

  if (activeEnrollments.length === 0) {
    return {
      compliant: true,
      attendance_rate: 100,
      required_rate: REQUIRED_ATTENDANCE_RATE,
      risk_level: 'low',
    };
  }

  // Calculate overall attendance rate across all classes
  let totalSessions = 0;
  let presentSessions = 0;

  for (const enrollment of activeEnrollments) {
    const rate = await calculateAttendanceRate(student_id, enrollment.class_id, tenant_id);
    const sessions = await db
      .select({ count: count() })
      .from(attendance)
      .innerJoin(classSessions, eq(attendance.class_session_id, classSessions.id))
      .where(
        and(
          eq(attendance.student_id, student_id),
          eq(classSessions.class_id, enrollment.class_id),
          eq(attendance.tenant_id, tenant_id),
        ),
      );

    const sessionCount = Number(sessions[0]?.count || 0);
    totalSessions += sessionCount;
    presentSessions += Math.round((rate / 100) * sessionCount);
  }

  const overallRate = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 100;

  const compliant = overallRate >= REQUIRED_ATTENDANCE_RATE;
  let risk_level: 'low' | 'medium' | 'high' = 'low';

  if (overallRate < 70) risk_level = 'high';
  else if (overallRate < 80) risk_level = 'medium';

  return {
    compliant,
    attendance_rate: overallRate,
    required_rate: REQUIRED_ATTENDANCE_RATE,
    risk_level,
  };
}

// ============================================================================
// MCP TOOLS
// ============================================================================

/**
 * Tool 1: Mark Attendance
 * Records student attendance with hash-chain integrity
 */
const markAttendanceTool: MCPTool = {
  name: 'mark_attendance',
  description: 'Record student attendance for a class session with tamper-proof hash-chain',
  requiredScopes: ['attendance:write'],
  inputSchema: markAttendanceSchema,
  handler: async (input, session: MCPSession) => {
    const { class_session_id, student_id, status, notes } = input;
    const { userId, tenantId } = session;

    // Verify session exists
    const [classSession] = await db
      .select()
      .from(classSessions)
      .where(
        and(
          eq(classSessions.id, class_session_id),
          eq(classSessions.tenant_id, tenantId),
        ),
      )
      .limit(1);

    if (!classSession) {
      throw new Error('Class session not found');
    }

    // Verify student is enrolled
    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.student_id, student_id),
          eq(enrollments.class_id, classSession.class_id),
          eq(enrollments.status, 'active'),
        ),
      )
      .limit(1);

    if (!enrollment) {
      throw new Error('Student not enrolled in this class');
    }

    // Get previous hash for chain
    const previousHash = await getPreviousAttendanceHash(class_session_id, tenantId);

    const recorded_at = new Date();
    const hash = calculateAttendanceHash(
      { class_session_id, student_id, status, recorded_at },
      previousHash,
    );

    // Check if edit window is still open (within 48 hours of session)
    const sessionDate = new Date(classSession.session_date);
    const hoursSinceSession = (recorded_at.getTime() - sessionDate.getTime()) / (1000 * 60 * 60);
    const is_within_edit_window = hoursSinceSession <= 48 ? 'true' : 'false';

    // Insert or update attendance record
    const [record] = await db
      .insert(attendance)
      .values({
        tenant_id: tenantId,
        class_session_id,
        student_id,
        status,
        notes,
        recorded_by: userId,
        recorded_at,
        hash,
        previous_hash: previousHash,
        is_within_edit_window,
        edit_count: 0,
      })
      .onConflictDoUpdate({
        target: [attendance.class_session_id, attendance.student_id],
        set: {
          status,
          notes,
          edited_by: userId,
          edited_at: new Date(),
          edit_count: sql`${attendance.edit_count} + 1`,
          updated_at: new Date(),
        },
      })
      .returning();

    // Update enrollment attendance rate
    const attendanceRate = await calculateAttendanceRate(
      student_id,
      classSession.class_id,
      tenantId,
    );

    await db
      .update(enrollments)
      .set({
        attendance_rate: attendanceRate.toString(),
        updated_at: new Date(),
      })
      .where(
        and(
          eq(enrollments.student_id, student_id),
          eq(enrollments.class_id, classSession.class_id),
        ),
      );

    return {
      success: true,
      attendance_id: record.id,
      hash: record.hash,
      attendance_rate: attendanceRate,
      is_within_edit_window: record.is_within_edit_window === 'true',
    };
  },
};

/**
 * Tool 2: Bulk Import Attendance
 * Import multiple attendance records at once
 */
const bulkImportAttendanceTool: MCPTool = {
  name: 'bulk_import_attendance',
  description: 'Import multiple attendance records for a class session from CSV or spreadsheet',
  requiredScopes: ['attendance:write'],
  inputSchema: bulkImportAttendanceSchema,
  handler: async (input, session: MCPSession) => {
    const { class_session_id, attendance_records } = input;
    const { userId, tenantId } = session;

    const results = [];
    const errors = [];

    for (const record of attendance_records) {
      try {
        const result = await markAttendanceTool.handler(
          {
            class_session_id,
            student_id: record.student_id,
            status: record.status,
            notes: record.notes,
          },
          session,
        );
        results.push({ student_id: record.student_id, ...result });
      } catch (error: any) {
        errors.push({
          student_id: record.student_id,
          error: error.message,
        });
      }
    }

    return {
      success: true,
      imported: results.length,
      failed: errors.length,
      results,
      errors,
    };
  },
};

/**
 * Tool 3: Get Attendance Register
 * Retrieve attendance register for a class period
 */
const getAttendanceRegisterTool: MCPTool = {
  name: 'get_attendance_register',
  description: 'Get comprehensive attendance register for a class over a date range',
  requiredScopes: ['attendance:read'],
  inputSchema: getAttendanceRegisterSchema,
  handler: async (input, session: MCPSession) => {
    const { class_id, start_date, end_date } = input;
    const { tenantId } = session;

    // Get class info
    const [classInfo] = await db
      .select()
      .from(classes)
      .where(and(eq(classes.id, class_id), eq(classes.tenant_id, tenantId)))
      .limit(1);

    if (!classInfo) {
      throw new Error('Class not found');
    }

    // Get all sessions in date range
    const sessions = await db
      .select()
      .from(classSessions)
      .where(
        and(
          eq(classSessions.class_id, class_id),
          eq(classSessions.tenant_id, tenantId),
          gte(classSessions.session_date, start_date),
          lte(classSessions.session_date, end_date),
        ),
      )
      .orderBy(classSessions.session_date);

    // Get all enrolled students
    const enrolledStudents = await db
      .select({
        student: users,
        enrollment: enrollments,
      })
      .from(enrollments)
      .innerJoin(users, eq(enrollments.student_id, users.id))
      .where(
        and(
          eq(enrollments.class_id, class_id),
          eq(enrollments.status, 'active'),
        ),
      )
      .orderBy(users.name);

    // Get attendance records for all sessions
    const attendanceRecords = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.tenant_id, tenantId),
          sql`${attendance.class_session_id} IN (${sql.join(sessions.map(s => sql`${s.id}`), sql`, `)})`,
        ),
      );

    // Build register matrix
    const register = enrolledStudents.map(({ student, enrollment }) => {
      const studentAttendance = sessions.map(session => {
        const record = attendanceRecords.find(
          r => r.class_session_id === session.id && r.student_id === student.id,
        );
        return {
          session_id: session.id,
          session_date: session.session_date,
          status: record?.status || 'not_marked',
          notes: record?.notes,
        };
      });

      const presentCount = studentAttendance.filter(a => a.status === 'present').length;
      const attendanceRate =
        sessions.length > 0 ? Math.round((presentCount / sessions.length) * 100) : 0;

      return {
        student_id: student.id,
        student_name: student.name,
        student_email: student.email,
        attendance_rate: attendanceRate,
        attendance: studentAttendance,
      };
    });

    return {
      class_id,
      class_name: classInfo.name,
      class_code: classInfo.code,
      start_date,
      end_date,
      total_sessions: sessions.length,
      total_students: enrolledStudents.length,
      register,
    };
  },
};

/**
 * Tool 4: Check Visa Compliance
 * Verify student visa compliance status
 */
const checkVisaComplianceTool: MCPTool = {
  name: 'check_visa_compliance',
  description: 'Check student visa compliance including attendance requirements (UK Tier 4, etc.)',
  requiredScopes: ['compliance:read'],
  inputSchema: checkVisaComplianceSchema,
  handler: async (input, session: MCPSession) => {
    const { student_id, check_type } = input;
    const { tenantId } = session;

    // Get student info with metadata
    const [student] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, student_id), eq(users.tenant_id, tenantId)))
      .limit(1);

    if (!student) {
      throw new Error('Student not found');
    }

    const visaData = (student.metadata as any)?.visa || {};

    // Check current visa status
    const currentStatus = {
      has_visa: !!visaData.visa_number,
      visa_type: visaData.visa_type || 'unknown',
      visa_number: visaData.visa_number,
      expiry_date: visaData.expiry_date,
      is_expired: visaData.expiry_date
        ? new Date(visaData.expiry_date) < new Date()
        : false,
      sponsor_license: visaData.sponsor_license,
    };

    if (check_type === 'current_status') {
      return {
        student_id,
        student_name: student.name,
        visa_status: currentStatus,
      };
    }

    // Check attendance requirement
    const attendanceCompliance = await checkVisaAttendanceCompliance(student_id, tenantId);

    if (check_type === 'attendance_requirement') {
      return {
        student_id,
        student_name: student.name,
        attendance_compliance: attendanceCompliance,
      };
    }

    // Full check
    const fullCompliance = {
      overall_compliant:
        !currentStatus.is_expired &&
        currentStatus.has_visa &&
        attendanceCompliance.compliant,
      visa_status: currentStatus,
      attendance_compliance: attendanceCompliance,
      issues: [] as string[],
      recommendations: [] as string[],
    };

    if (currentStatus.is_expired) {
      fullCompliance.issues.push('Visa has expired');
      fullCompliance.recommendations.push('Request updated visa documentation');
    }

    if (!currentStatus.has_visa) {
      fullCompliance.issues.push('No visa information on file');
      fullCompliance.recommendations.push('Collect visa documentation');
    }

    if (!attendanceCompliance.compliant) {
      fullCompliance.issues.push(
        `Attendance rate ${attendanceCompliance.attendance_rate}% below required ${attendanceCompliance.required_rate}%`,
      );
      fullCompliance.recommendations.push('Immediate intervention required for attendance');
    }

    if (attendanceCompliance.risk_level === 'medium') {
      fullCompliance.recommendations.push('Monitor attendance closely');
    }

    return {
      student_id,
      student_name: student.name,
      full_compliance: fullCompliance,
    };
  },
};

/**
 * Tool 5: Generate Attendance Report
 * Generate compliance reports for authorities
 */
const generateAttendanceReportTool: MCPTool = {
  name: 'generate_attendance_report',
  description: 'Generate attendance reports for compliance authorities (UKVI, accreditation, etc.)',
  requiredScopes: ['compliance:read', 'reports:generate'],
  inputSchema: generateAttendanceReportSchema,
  handler: async (input, session: MCPSession) => {
    const { report_type, class_id, student_id, start_date, end_date, format } = input;
    const { tenantId } = session;

    let reportData: any = {
      report_type,
      generated_at: new Date().toISOString(),
      period: { start_date, end_date },
      tenant_id: tenantId,
    };

    if (student_id) {
      // Student-specific report
      const [student] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, student_id), eq(users.tenant_id, tenantId)))
        .limit(1);

      if (!student) {
        throw new Error('Student not found');
      }

      const enrolledClasses = await db
        .select({
          class: classes,
          enrollment: enrollments,
        })
        .from(enrollments)
        .innerJoin(classes, eq(enrollments.class_id, classes.id))
        .where(
          and(
            eq(enrollments.student_id, student_id),
            eq(enrollments.tenant_id, tenantId),
          ),
        );

      const classAttendance = [];
      for (const { class: cls, enrollment } of enrolledClasses) {
        const register = await getAttendanceRegisterTool.handler(
          {
            class_id: cls.id,
            start_date,
            end_date,
          },
          session,
        );

        const studentData = (register as any).register.find(
          (r: any) => r.student_id === student_id,
        );

        classAttendance.push({
          class_id: cls.id,
          class_name: cls.name,
          class_code: cls.code,
          attendance_rate: studentData?.attendance_rate || 0,
          total_sessions: (register as any).total_sessions,
        });
      }

      reportData.student = {
        id: student.id,
        name: student.name,
        email: student.email,
        classes: classAttendance,
        overall_attendance_rate: Math.round(
          classAttendance.reduce((sum, c) => sum + c.attendance_rate, 0) /
            (classAttendance.length || 1),
        ),
      };
    } else if (class_id) {
      // Class-specific report
      const register = await getAttendanceRegisterTool.handler(
        { class_id, start_date, end_date },
        session,
      );

      reportData.class_report = register;
    } else {
      // School-wide report
      const allClasses = await db
        .select()
        .from(classes)
        .where(and(eq(classes.tenant_id, tenantId), eq(classes.status, 'active')));

      const classReports = [];
      for (const cls of allClasses) {
        const register = await getAttendanceRegisterTool.handler(
          {
            class_id: cls.id,
            start_date,
            end_date,
          },
          session,
        );

        classReports.push({
          class_id: cls.id,
          class_name: cls.name,
          class_code: cls.code,
          total_sessions: (register as any).total_sessions,
          total_students: (register as any).total_students,
          average_attendance: Math.round(
            (register as any).register.reduce(
              (sum: number, r: any) => sum + r.attendance_rate,
              0,
            ) / ((register as any).total_students || 1),
          ),
        });
      }

      reportData.school_report = {
        total_classes: allClasses.length,
        classes: classReports,
        overall_average_attendance: Math.round(
          classReports.reduce((sum, c) => sum + c.average_attendance, 0) /
            (classReports.length || 1),
        ),
      };
    }

    // Format conversion (simplified - in production would use proper formatters)
    if (format === 'csv') {
      // Convert to CSV string
      reportData.format = 'csv';
      reportData.note = 'CSV formatting would be implemented here';
    } else if (format === 'pdf') {
      // Generate PDF
      reportData.format = 'pdf';
      reportData.note = 'PDF generation would be implemented here';
    }

    return reportData;
  },
};

/**
 * Tool 6: Track Absence Pattern
 * Identify concerning absence patterns
 */
const trackAbsencePatternTool: MCPTool = {
  name: 'track_absence_pattern',
  description: 'Track and flag concerning absence patterns (consecutive absences, chronic absenteeism)',
  requiredScopes: ['attendance:read'],
  inputSchema: trackAbsencePatternSchema,
  handler: async (input, session: MCPSession) => {
    const { student_id, class_id, threshold_days, period_days } = input;
    const { tenantId } = session;

    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - period_days);

    let query = db
      .select({
        attendance: attendance,
        session: classSessions,
        student: users,
        class: classes,
      })
      .from(attendance)
      .innerJoin(classSessions, eq(attendance.class_session_id, classSessions.id))
      .innerJoin(users, eq(attendance.student_id, users.id))
      .innerJoin(classes, eq(classSessions.class_id, classes.id))
      .where(
        and(
          eq(attendance.tenant_id, tenantId),
          gte(classSessions.session_date, lookbackDate.toISOString().split('T')[0]),
        ),
      )
      .orderBy(classSessions.session_date);

    if (student_id) {
      query = query.where(and(eq(attendance.student_id, student_id)));
    }

    if (class_id) {
      query = query.where(and(eq(classSessions.class_id, class_id)));
    }

    const records = await query;

    // Group by student
    const studentGroups = new Map<
      string,
      Array<{ date: string; status: string; class_id: string; class_name: string }>
    >();

    for (const record of records) {
      if (!studentGroups.has(record.student.id)) {
        studentGroups.set(record.student.id, []);
      }

      studentGroups.get(record.student.id)!.push({
        date: record.session.session_date,
        status: record.attendance.status,
        class_id: record.class.id,
        class_name: record.class.name,
      });
    }

    // Analyze patterns
    const alerts = [];

    for (const [studentId, studentRecords] of studentGroups.entries()) {
      studentRecords.sort((a, b) => a.date.localeCompare(b.date));

      // Check for consecutive absences
      let consecutiveAbsences = 0;
      let consecutiveAbsenceDates = [];

      for (const record of studentRecords) {
        if (record.status === 'absent') {
          consecutiveAbsences++;
          consecutiveAbsenceDates.push(record.date);

          if (consecutiveAbsences >= threshold_days) {
            const student = records.find(r => r.student.id === studentId)!.student;
            alerts.push({
              alert_type: 'consecutive_absences',
              severity: 'high',
              student_id: studentId,
              student_name: student.name,
              consecutive_days: consecutiveAbsences,
              absence_dates: [...consecutiveAbsenceDates],
              class_id: record.class_id,
              class_name: record.class_name,
              message: `${student.name} has been absent for ${consecutiveAbsences} consecutive sessions`,
            });
          }
        } else {
          consecutiveAbsences = 0;
          consecutiveAbsenceDates = [];
        }
      }

      // Check overall absence rate
      const totalSessions = studentRecords.length;
      const absentSessions = studentRecords.filter(r => r.status === 'absent').length;
      const absenceRate = totalSessions > 0 ? (absentSessions / totalSessions) * 100 : 0;

      if (absenceRate > 20) {
        const student = records.find(r => r.student.id === studentId)!.student;
        alerts.push({
          alert_type: 'chronic_absenteeism',
          severity: absenceRate > 30 ? 'high' : 'medium',
          student_id: studentId,
          student_name: student.name,
          absence_rate: Math.round(absenceRate),
          total_sessions: totalSessions,
          absent_sessions: absentSessions,
          message: `${student.name} has ${Math.round(absenceRate)}% absence rate over the last ${period_days} days`,
        });
      }
    }

    return {
      period_days,
      threshold_days,
      total_alerts: alerts.length,
      alerts: alerts.sort((a, b) => {
        if (a.severity === b.severity) return 0;
        return a.severity === 'high' ? -1 : 1;
      }),
    };
  },
};

/**
 * Tool 7: Export Compliance Data
 * Export compliance data for audits
 */
const exportComplianceDataTool: MCPTool = {
  name: 'export_compliance_data',
  description: 'Export compliance data for UKVI, accreditation bodies, or full audits',
  requiredScopes: ['compliance:read', 'exports:create'],
  inputSchema: exportComplianceDataSchema,
  handler: async (input, session: MCPSession) => {
    const { export_type, start_date, end_date, student_ids } = input;
    const { tenantId } = session;

    const exportData: any = {
      export_type,
      generated_at: new Date().toISOString(),
      period: { start_date, end_date },
    };

    if (export_type === 'ukvi') {
      // UKVI-specific export format
      let studentQuery = db
        .select({
          student: users,
          enrollments: enrollments,
        })
        .from(users)
        .leftJoin(enrollments, eq(users.id, enrollments.student_id))
        .where(and(eq(users.tenant_id, tenantId), eq(users.role, 'student')));

      if (student_ids && student_ids.length > 0) {
        studentQuery = studentQuery.where(
          sql`${users.id} IN (${sql.join(student_ids.map(id => sql`${id}`), sql`, `)})`,
        );
      }

      const students = await studentQuery;

      const ukviData = [];
      for (const { student, enrollments: enrollment } of students) {
        const visaData = (student.metadata as any)?.visa || {};

        // Get attendance compliance
        const compliance = await checkVisaAttendanceCompliance(student.id, tenantId);

        ukviData.push({
          student_id: student.id,
          student_name: student.name,
          student_email: student.email,
          visa_number: visaData.visa_number,
          visa_type: visaData.visa_type,
          visa_expiry: visaData.expiry_date,
          attendance_rate: compliance.attendance_rate,
          compliance_status: compliance.compliant ? 'compliant' : 'non-compliant',
          risk_level: compliance.risk_level,
        });
      }

      exportData.ukvi_report = {
        total_students: ukviData.length,
        compliant_students: ukviData.filter(s => s.compliance_status === 'compliant').length,
        high_risk_students: ukviData.filter(s => s.risk_level === 'high').length,
        students: ukviData,
      };
    } else if (export_type === 'accreditation') {
      // Accreditation body export
      const report = await generateAttendanceReportTool.handler(
        {
          report_type: 'custom',
          start_date,
          end_date,
          format: 'json',
        },
        session,
      );

      exportData.accreditation_report = report;
    } else {
      // Full audit export
      exportData.full_audit = {
        note: 'Full audit export would include all tables and audit logs',
      };
    }

    return exportData;
  },
};

/**
 * Tool 8: Send Absence Notification
 * Send notifications for absences
 */
const sendAbsenceNotificationTool: MCPTool = {
  name: 'send_absence_notification',
  description: 'Send notifications to student/guardian about absences',
  requiredScopes: ['attendance:write', 'notifications:send'],
  inputSchema: sendAbsenceNotificationSchema,
  handler: async (input, session: MCPSession) => {
    const { student_id, absence_date, class_id, notification_type } = input;
    const { tenantId } = session;

    // Get student and class info
    const [student] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, student_id), eq(users.tenant_id, tenantId)))
      .limit(1);

    const [classInfo] = await db
      .select()
      .from(classes)
      .where(and(eq(classes.id, class_id), eq(classes.tenant_id, tenantId)))
      .limit(1);

    if (!student || !classInfo) {
      throw new Error('Student or class not found');
    }

    const guardianEmail = (student.metadata as any)?.guardian_email;

    // In production, this would integrate with email service
    const notifications = [];

    if (notification_type === 'student' || notification_type === 'both') {
      notifications.push({
        recipient: 'student',
        email: student.email,
        subject: `Absence Notification - ${classInfo.name}`,
        message: `You were marked absent for ${classInfo.name} on ${absence_date}`,
      });
    }

    if ((notification_type === 'guardian' || notification_type === 'both') && guardianEmail) {
      notifications.push({
        recipient: 'guardian',
        email: guardianEmail,
        subject: `Student Absence Notification - ${student.name}`,
        message: `${student.name} was marked absent for ${classInfo.name} on ${absence_date}`,
      });
    }

    return {
      success: true,
      notifications_sent: notifications.length,
      notifications,
      note: 'In production, emails would be sent via email service',
    };
  },
};

// ============================================================================
// MCP SERVER CONFIGURATION
// ============================================================================

export const attendanceComplianceMCPConfig: MCPServer = {
  name: 'attendance-compliance',
  version: '1.0.0',
  description: 'Attendance tracking and regulatory compliance for UK language schools',

  tools: [
    markAttendanceTool,
    bulkImportAttendanceTool,
    getAttendanceRegisterTool,
    checkVisaComplianceTool,
    generateAttendanceReportTool,
    trackAbsencePatternTool,
    exportComplianceDataTool,
    sendAbsenceNotificationTool,
  ],

  resources: [],
  prompts: [],

  capabilities: {
    tools: true,
    resources: false,
    prompts: false,
  },
};

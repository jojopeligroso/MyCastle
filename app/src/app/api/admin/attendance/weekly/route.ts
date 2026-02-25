/**
 * Weekly Attendance API - Admin view for weekly attendance grid
 * GET /api/admin/attendance/weekly?weekStart=2026-02-24
 * POST /api/admin/attendance/weekly - Batch save attendance with session auto-creation
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { classes, enrollments, classSessions, attendance, users, students } from '@/db/schema';
import { and, eq, gte, lte, inArray, sql } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { z } from 'zod';

type WeekDay = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';

const WEEKDAYS: WeekDay[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

interface StudentAttendance {
  id: string;
  name: string | null;
  isVisaStudent: boolean;
  attendance: Record<string, { status: string; sessionId: string | null } | null>;
}

interface ClassWeekData {
  id: string;
  name: string;
  code: string | null;
  teacherId: string | null;
  teacherName: string | null;
  startTime: string | null;
  endTime: string | null;
  daysOfWeek: string[];
  students: StudentAttendance[];
  sessions: Record<string, string>; // date -> sessionId
}

function getWeekDates(weekStart: Date): { date: Date; dayName: WeekDay; isoDate: string }[] {
  const dates: { date: Date; dayName: WeekDay; isoDate: string }[] = [];
  for (let i = 0; i < 5; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    dates.push({
      date,
      dayName: WEEKDAYS[i],
      isoDate: date.toISOString().split('T')[0],
    });
  }
  return dates;
}

function parseWeekStart(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  // Ensure it's a Monday
  const day = parsed.getDay();
  if (day !== 1) {
    // Adjust to nearest Monday (previous)
    const diff = day === 0 ? -6 : 1 - day;
    parsed.setDate(parsed.getDate() + diff);
  }
  return parsed;
}

function getCurrentWeekStart(): Date {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  today.setDate(today.getDate() + diff);
  today.setHours(0, 0, 0, 0);
  return today;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAuth();
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const weekStartParam = searchParams.get('weekStart');
    const weekStart = parseWeekStart(weekStartParam) || getCurrentWeekStart();
    const weekDates = getWeekDates(weekStart);
    const weekEnd = weekDates[4].date;

    // Fetch active classes
    const activeClasses = await db
      .select({
        id: classes.id,
        name: classes.name,
        code: classes.code,
        teacherId: classes.teacherId,
        startTime: classes.startTime,
        endTime: classes.endTime,
        daysOfWeek: classes.daysOfWeek,
        startDate: classes.startDate,
        endDate: classes.endDate,
      })
      .from(classes)
      .where(
        and(
          eq(classes.tenantId, tenantId),
          eq(classes.status, 'active'),
          lte(classes.startDate, weekEnd.toISOString().split('T')[0]),
          sql`(${classes.endDate} IS NULL OR ${classes.endDate} >= ${weekStart.toISOString().split('T')[0]})`
        )
      )
      .orderBy(classes.name);

    if (activeClasses.length === 0) {
      return NextResponse.json({
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        weekDates: weekDates.map(d => ({ date: d.isoDate, dayName: d.dayName })),
        classes: [],
      });
    }

    const classIds = activeClasses.map(c => c.id);

    // Fetch teacher names
    const teacherIds = activeClasses
      .map(c => c.teacherId)
      .filter((id): id is string => id !== null);
    const teachersMap = new Map<string, string>();
    if (teacherIds.length > 0) {
      const teachers = await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(inArray(users.id, teacherIds));
      teachers.forEach(t => teachersMap.set(t.id, t.name ?? 'Unknown'));
    }

    // Fetch enrollments for all classes
    const classEnrollments = await db
      .select({
        classId: enrollments.classId,
        studentId: enrollments.studentId,
        studentName: users.name,
        isVisaStudent: students.isVisaStudent,
      })
      .from(enrollments)
      .innerJoin(users, eq(enrollments.studentId, users.id))
      .leftJoin(students, eq(students.userId, users.id))
      .where(
        and(
          eq(enrollments.tenantId, tenantId),
          eq(enrollments.status, 'active'),
          inArray(enrollments.classId, classIds)
        )
      )
      .orderBy(users.name);

    // Fetch sessions for the week
    const weekSessions = await db
      .select({
        id: classSessions.id,
        classId: classSessions.classId,
        sessionDate: classSessions.sessionDate,
      })
      .from(classSessions)
      .where(
        and(
          eq(classSessions.tenantId, tenantId),
          inArray(classSessions.classId, classIds),
          gte(classSessions.sessionDate, weekStart.toISOString().split('T')[0]),
          lte(classSessions.sessionDate, weekEnd.toISOString().split('T')[0])
        )
      );

    const sessionIds = weekSessions.map(s => s.id);

    // Fetch attendance for all sessions
    const weekAttendance =
      sessionIds.length > 0
        ? await db
            .select({
              classSessionId: attendance.classSessionId,
              studentId: attendance.studentId,
              status: attendance.status,
            })
            .from(attendance)
            .where(
              and(eq(attendance.tenantId, tenantId), inArray(attendance.classSessionId, sessionIds))
            )
        : [];

    // Build session lookup: classId -> date -> sessionId
    const sessionLookup = new Map<string, Map<string, string>>();
    weekSessions.forEach(s => {
      if (!sessionLookup.has(s.classId)) {
        sessionLookup.set(s.classId, new Map());
      }
      sessionLookup.get(s.classId)!.set(s.sessionDate, s.id);
    });

    // Build attendance lookup: sessionId -> studentId -> status
    const attendanceLookup = new Map<string, Map<string, string>>();
    weekAttendance.forEach(a => {
      if (!attendanceLookup.has(a.classSessionId)) {
        attendanceLookup.set(a.classSessionId, new Map());
      }
      attendanceLookup.get(a.classSessionId)!.set(a.studentId, a.status);
    });

    // Build enrollment lookup: classId -> students[]
    const enrollmentLookup = new Map<
      string,
      { studentId: string; studentName: string | null; isVisaStudent: boolean }[]
    >();
    classEnrollments.forEach(e => {
      if (!enrollmentLookup.has(e.classId)) {
        enrollmentLookup.set(e.classId, []);
      }
      enrollmentLookup.get(e.classId)!.push({
        studentId: e.studentId,
        studentName: e.studentName,
        isVisaStudent: e.isVisaStudent ?? false,
      });
    });

    // Build response
    const classesData: ClassWeekData[] = activeClasses.map(cls => {
      const classDaysOfWeek = (cls.daysOfWeek as string[]) || [];
      const classStudents = enrollmentLookup.get(cls.id) || [];
      const classSessLookup = sessionLookup.get(cls.id) || new Map();

      const studentsWithAttendance: StudentAttendance[] = classStudents.map(student => {
        const attendanceByDate: Record<
          string,
          { status: string; sessionId: string | null } | null
        > = {};

        weekDates.forEach(({ isoDate, dayName }) => {
          const isClassDay = classDaysOfWeek.includes(dayName);
          if (!isClassDay) {
            attendanceByDate[isoDate] = null; // Non-class day
          } else {
            const sessionId = classSessLookup.get(isoDate) || null;
            const status = sessionId
              ? attendanceLookup.get(sessionId)?.get(student.studentId) || null
              : null;
            attendanceByDate[isoDate] = {
              status: status || '',
              sessionId,
            };
          }
        });

        return {
          id: student.studentId,
          name: student.studentName,
          isVisaStudent: student.isVisaStudent,
          attendance: attendanceByDate,
        };
      });

      const sessions: Record<string, string> = {};
      classSessLookup.forEach((sessionId, date) => {
        sessions[date] = sessionId;
      });

      return {
        id: cls.id,
        name: cls.name,
        code: cls.code,
        teacherId: cls.teacherId,
        teacherName: cls.teacherId ? teachersMap.get(cls.teacherId) || null : null,
        startTime: cls.startTime?.toString().slice(0, 5) || null,
        endTime: cls.endTime?.toString().slice(0, 5) || null,
        daysOfWeek: classDaysOfWeek,
        students: studentsWithAttendance,
        sessions,
      };
    });

    return NextResponse.json({
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: weekEnd.toISOString().split('T')[0],
      weekDates: weekDates.map(d => ({ date: d.isoDate, dayName: d.dayName })),
      classes: classesData,
    });
  } catch (error) {
    console.error('[Weekly Attendance GET] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST schema for saving attendance
const SaveAttendanceSchema = z.object({
  classId: z.string().uuid(),
  attendance: z.array(
    z.object({
      studentId: z.string().uuid(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      status: z.enum(['present', 'absent', 'late', 'excused', '']),
    })
  ),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAuth();
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
    }

    const body = await request.json();
    const validation = SaveAttendanceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { classId, attendance: attendanceData } = validation.data;

    // Verify class exists and belongs to tenant
    const [cls] = await db
      .select({ id: classes.id, startTime: classes.startTime, endTime: classes.endTime })
      .from(classes)
      .where(and(eq(classes.id, classId), eq(classes.tenantId, tenantId)))
      .limit(1);

    if (!cls) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Group attendance by date to find/create sessions
    const byDate = new Map<string, { studentId: string; status: string }[]>();
    attendanceData.forEach(a => {
      if (!byDate.has(a.date)) {
        byDate.set(a.date, []);
      }
      byDate.get(a.date)!.push({ studentId: a.studentId, status: a.status });
    });

    const results: { date: string; sessionId: string; saved: number; deleted: number }[] = [];

    for (const [date, records] of byDate) {
      // Find or create session for this date
      let [session] = await db
        .select({ id: classSessions.id })
        .from(classSessions)
        .where(
          and(
            eq(classSessions.tenantId, tenantId),
            eq(classSessions.classId, classId),
            eq(classSessions.sessionDate, date)
          )
        )
        .limit(1);

      if (!session) {
        // Auto-create session
        const startTime = cls.startTime || '09:00:00';
        const endTime = cls.endTime || '11:00:00';

        const [newSession] = await db
          .insert(classSessions)
          .values({
            tenantId,
            classId,
            sessionDate: date,
            startTime,
            endTime,
            status: 'scheduled',
          })
          .returning({ id: classSessions.id });

        session = newSession;
      }

      let saved = 0;
      let deleted = 0;

      for (const record of records) {
        if (record.status === '') {
          // Delete attendance if status is empty
          const deleteResult = await db
            .delete(attendance)
            .where(
              and(
                eq(attendance.tenantId, tenantId),
                eq(attendance.classSessionId, session.id),
                eq(attendance.studentId, record.studentId)
              )
            )
            .returning({ id: attendance.id });
          if (deleteResult.length > 0) deleted++;
        } else {
          // Upsert attendance
          await db
            .insert(attendance)
            .values({
              tenantId,
              classSessionId: session.id,
              studentId: record.studentId,
              status: record.status,
              recordedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [attendance.classSessionId, attendance.studentId],
              set: {
                status: record.status,
                updatedAt: new Date(),
              },
            });
          saved++;
        }
      }

      results.push({ date, sessionId: session.id, saved, deleted });
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('[Weekly Attendance POST] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

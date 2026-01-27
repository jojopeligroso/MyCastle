/**
 * Attendance Dashboard
 * List of class sessions to manage attendance
 */

import { db } from '@/db';
import { attendance, classSessions, classes, enrollments, students, users } from '@/db/schema';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const PendingCorrections = dynamic(
  () => import('@/components/admin/attendance/PendingCorrections'),
  { ssr: false }
);

type SearchParams = {
  classId?: string;
  studentId?: string;
  startDate?: string;
  endDate?: string;
};

interface PageProps {
  searchParams?: SearchParams;
}

const VISA_ATTENDANCE_THRESHOLD = 80;

function toDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default async function AttendanceDashboard({ searchParams }: PageProps) {
  await requireAuth();
  const tenantId = await getTenantId();

  if (!tenantId) return <div>Error: No tenant found</div>;

  const selectedClassId = searchParams?.classId || '';
  const selectedStudentId = searchParams?.studentId || '';
  const startDate = toDate(searchParams?.startDate);
  const endDate = toDate(searchParams?.endDate);

  const sessionConditions = [eq(classSessions.tenantId, tenantId)];
  if (selectedClassId) {
    sessionConditions.push(eq(classSessions.classId, selectedClassId));
  }
  if (startDate) {
    sessionConditions.push(gte(classSessions.sessionDate, startDate));
  }
  if (endDate) {
    sessionConditions.push(lte(classSessions.sessionDate, endDate));
  }

  const classesList = await db
    .select({
      id: classes.id,
      name: classes.name,
      code: classes.code,
    })
    .from(classes)
    .where(eq(classes.tenantId, tenantId))
    .orderBy(classes.name);

  const studentsList = await db
    .select({
      id: users.id,
      name: users.name,
    })
    .from(students)
    .innerJoin(users, eq(students.userId, users.id))
    .where(eq(students.tenantId, tenantId))
    .orderBy(users.name);

  let sessionsQuery = db
    .select({
      id: classSessions.id,
      date: classSessions.sessionDate,
      startTime: classSessions.startTime,
      endTime: classSessions.endTime,
      topic: classSessions.topic,
      className: classes.name,
      classCode: classes.code,
      attendanceCount: sql<number>`coalesce(count(${attendance.id}), 0)`,
      presentCount: sql<number>`coalesce(sum(case when ${attendance.status} = 'present' then 1 else 0 end), 0)`,
      lateCount: sql<number>`coalesce(sum(case when ${attendance.status} = 'late' then 1 else 0 end), 0)`,
      absentCount: sql<number>`coalesce(sum(case when ${attendance.status} = 'absent' then 1 else 0 end), 0)`,
      excusedCount: sql<number>`coalesce(sum(case when ${attendance.status} = 'excused' then 1 else 0 end), 0)`,
    })
    .from(classSessions)
    .innerJoin(classes, eq(classSessions.classId, classes.id))
    .leftJoin(
      attendance,
      selectedStudentId
        ? and(
            eq(attendance.classSessionId, classSessions.id),
            eq(attendance.studentId, selectedStudentId)
          )
        : eq(attendance.classSessionId, classSessions.id)
    );

  if (selectedStudentId) {
    sessionsQuery = sessionsQuery.innerJoin(
      enrollments,
      and(
        eq(enrollments.classId, classSessions.classId),
        eq(enrollments.studentId, selectedStudentId),
        eq(enrollments.status, 'active')
      )
    );
  }

  const sessions = await sessionsQuery
    .where(and(...sessionConditions))
    .groupBy(classSessions.id, classes.name, classes.code)
    .orderBy(desc(classSessions.sessionDate))
    .limit(50); // Show last 50 sessions

  let summaryQuery = db
    .select({
      totalSessions: sql<number>`count(distinct ${classSessions.id})`,
      attendanceRecords: sql<number>`coalesce(count(${attendance.id}), 0)`,
      presentCount: sql<number>`coalesce(sum(case when ${attendance.status} in ('present', 'late') then 1 else 0 end), 0)`,
    })
    .from(classSessions)
    .innerJoin(classes, eq(classSessions.classId, classes.id))
    .leftJoin(
      attendance,
      selectedStudentId
        ? and(
            eq(attendance.classSessionId, classSessions.id),
            eq(attendance.studentId, selectedStudentId)
          )
        : eq(attendance.classSessionId, classSessions.id)
    );

  if (selectedStudentId) {
    summaryQuery = summaryQuery.innerJoin(
      enrollments,
      and(
        eq(enrollments.classId, classSessions.classId),
        eq(enrollments.studentId, selectedStudentId),
        eq(enrollments.status, 'active')
      )
    );
  }

  const [summary] = await summaryQuery.where(and(...sessionConditions));
  const totalSessions = summary?.totalSessions || 0;
  const attendanceRecords = summary?.attendanceRecords || 0;
  const presentCount = summary?.presentCount || 0;
  const avgAttendanceRate =
    attendanceRecords > 0 ? Math.round((presentCount / attendanceRecords) * 100) : null;

  const visaConditions = [
    eq(students.tenantId, tenantId),
    eq(students.isVisaStudent, true),
    eq(enrollments.status, 'active'),
    sql`coalesce(${enrollments.attendanceRate}, 0) < ${VISA_ATTENDANCE_THRESHOLD}`,
  ];
  if (selectedClassId) {
    visaConditions.push(eq(classes.id, selectedClassId));
  }
  if (selectedStudentId) {
    visaConditions.push(eq(users.id, selectedStudentId));
  }

  const [visaSummary] = await db
    .select({
      atRiskCount: sql<number>`count(distinct ${users.id})`,
    })
    .from(students)
    .innerJoin(users, eq(students.userId, users.id))
    .innerJoin(enrollments, eq(enrollments.studentId, users.id))
    .innerJoin(classes, eq(enrollments.classId, classes.id))
    .where(and(...visaConditions));

  const visaAlerts = await db
    .select({
      studentId: users.id,
      studentName: users.name,
      className: classes.name,
      classCode: classes.code,
      attendanceRate: enrollments.attendanceRate,
    })
    .from(students)
    .innerJoin(users, eq(students.userId, users.id))
    .innerJoin(enrollments, eq(enrollments.studentId, users.id))
    .innerJoin(classes, eq(enrollments.classId, classes.id))
    .where(and(...visaConditions))
    .orderBy(sql`coalesce(${enrollments.attendanceRate}, 0) asc`)
    .limit(5);

  const filterParams = new URLSearchParams();
  if (selectedClassId) filterParams.set('classId', selectedClassId);
  if (selectedStudentId) filterParams.set('studentId', selectedStudentId);
  if (searchParams?.startDate) filterParams.set('startDate', searchParams.startDate);
  if (searchParams?.endDate) filterParams.set('endDate', searchParams.endDate);
  const filterQuery = filterParams.toString();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="text-gray-600">Manage student attendance for recent sessions</p>
        </div>
        <Link
          href="/admin/classes?action=create"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700"
        >
          Schedule New Session
        </Link>
      </div>

      <form
        method="get"
        className="bg-white shadow sm:rounded-lg p-4 grid grid-cols-1 gap-4 md:grid-cols-5"
      >
        <div className="space-y-1">
          <label htmlFor="startDate" className="text-sm font-medium text-gray-700">
            Start date
          </label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={searchParams?.startDate || ''}
            className="block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-purple-500 focus:ring-purple-500"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="endDate" className="text-sm font-medium text-gray-700">
            End date
          </label>
          <input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={searchParams?.endDate || ''}
            className="block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-purple-500 focus:ring-purple-500"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="classId" className="text-sm font-medium text-gray-700">
            Class
          </label>
          <select
            id="classId"
            name="classId"
            defaultValue={selectedClassId}
            className="block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-purple-500 focus:ring-purple-500"
          >
            <option value="">All classes</option>
            {classesList.map(item => (
              <option key={item.id} value={item.id}>
                {item.name} {item.code ? `(${item.code})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="studentId" className="text-sm font-medium text-gray-700">
            Student
          </label>
          <select
            id="studentId"
            name="studentId"
            defaultValue={selectedStudentId}
            className="block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-purple-500 focus:ring-purple-500"
          >
            <option value="">All students</option>
            {studentsList.map(item => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="inline-flex flex-1 items-center justify-center rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700"
          >
            Apply filters
          </button>
          <Link
            href="/admin/attendance"
            className="inline-flex flex-1 items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Clear
          </Link>
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <p className="text-sm text-gray-500">Total sessions</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{totalSessions}</p>
          <p className="mt-1 text-xs text-gray-500">Filters applied to session count</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <p className="text-sm text-gray-500">Average attendance</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {avgAttendanceRate === null ? 'N/A' : `${avgAttendanceRate}%`}
          </p>
          <p className="mt-1 text-xs text-gray-500">Based on present + late records in scope</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <p className="text-sm text-gray-500">Visa compliance alerts</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {visaSummary?.atRiskCount || 0}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Attendance below {VISA_ATTENDANCE_THRESHOLD}%
          </p>
        </div>
      </div>

      {/* Pending Corrections */}
      <PendingCorrections />

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <div className="bg-white shadow sm:rounded-md">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Recent sessions</h2>
              <p className="text-sm text-gray-500">Latest 50 sessions matching current filters</p>
            </div>
            {filterQuery ? <span className="text-xs text-gray-500">Filters applied</span> : null}
          </div>
          <ul className="divide-y divide-gray-200">
            {sessions.map(session => {
              const attendanceCount = Number(session.attendanceCount) || 0;
              const presentCountValue = Number(session.presentCount) + Number(session.lateCount);
              const attendanceRate =
                attendanceCount > 0 ? Math.round((presentCountValue / attendanceCount) * 100) : 0;
              const isReported = attendanceCount > 0;
              const statusColor = isReported
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800';
              const statusText = isReported ? 'Reported' : 'Pending';
              const detailLink = filterQuery
                ? `/admin/attendance/${session.id}?${filterQuery}`
                : `/admin/attendance/${session.id}`;

              return (
                <li key={session.id}>
                  <Link href={detailLink} className="block hover:bg-gray-50">
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-sm font-medium text-purple-600 truncate">
                          {session.className}{' '}
                          <span className="text-gray-500">({session.classCode})</span>
                        </div>
                        <div className="ml-2 flex-shrink-0 flex items-center gap-3">
                          <span className="text-xs text-gray-500">{attendanceRate}%</span>
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}`}
                          >
                            {statusText}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap justify-between gap-3 text-sm text-gray-500">
                        <div className="flex flex-wrap gap-4">
                          <span>
                            {new Date(session.date).toLocaleDateString()} ·{' '}
                            {session.startTime.toString().slice(0, 5)} -{' '}
                            {session.endTime.toString().slice(0, 5)}
                          </span>
                          <span>
                            Present {session.presentCount} · Late {session.lateCount} · Absent{' '}
                            {session.absentCount} · Excused {session.excusedCount}
                          </span>
                        </div>
                        <span>{session.topic ? `Topic: ${session.topic}` : 'No topic set'}</span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
            {sessions.length === 0 && (
              <li className="px-4 py-12 text-center text-gray-500">
                No class sessions found for the selected filters.
              </li>
            )}
          </ul>
        </div>

        <div className="bg-white shadow sm:rounded-md">
          <div className="border-b border-gray-200 px-4 py-3">
            <h2 className="text-lg font-semibold text-gray-900">Compliance alerts</h2>
            <p className="text-sm text-gray-500">Visa students below attendance threshold</p>
          </div>
          <ul className="divide-y divide-gray-200">
            {visaAlerts.map(alert => (
              <li key={`${alert.studentId}-${alert.className}`} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{alert.studentName}</p>
                    <p className="text-xs text-gray-500">
                      {alert.className} {alert.classCode ? `(${alert.classCode})` : ''}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-red-600">
                    {alert.attendanceRate ? `${alert.attendanceRate}%` : 'N/A'}
                  </span>
                </div>
              </li>
            ))}
            {visaAlerts.length === 0 && (
              <li className="px-4 py-8 text-center text-gray-500">No visa alerts in scope.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

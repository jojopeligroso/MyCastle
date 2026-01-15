/**
 * Attendance Dashboard
 * List of class sessions to manage attendance
 */

import { db } from '@/db';
import { classSessions, classes, attendance } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import Link from 'next/link';

export default async function AttendanceDashboard() {
  await requireAuth();
  const tenantId = await getTenantId();

  if (!tenantId) return <div>Error: No tenant found</div>;

  // Fetch recent sessions with attendance counts
  // Note: This is a simplified query. in production we might need more complex joins or aggregations
  const sessions = await db
    .select({
      id: classSessions.id,
      date: classSessions.session_date,
      startTime: classSessions.start_time,
      endTime: classSessions.end_time,
      topic: classSessions.topic,
      className: classes.name,
      classCode: classes.code,
      // We'll count attendance records for this session to see if it's "Reported"
      attendanceCount: sql<number>`count(${attendance.id})`,
    })
    .from(classSessions)
    .innerJoin(classes, eq(classSessions.class_id, classes.id))
    .leftJoin(attendance, eq(attendance.class_session_id, classSessions.id))
    .where(eq(classSessions.tenant_id, tenantId))
    .groupBy(classSessions.id, classes.name, classes.code)
    .orderBy(desc(classSessions.session_date))
    .limit(50); // Show last 50 sessions

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
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

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {sessions.map(session => {
            const isReported = Number(session.attendanceCount) > 0;
            const statusColor = isReported
              ? 'bg-green-100 text-green-800'
              : 'bg-yellow-100 text-yellow-800';
            const statusText = isReported ? 'Reported' : 'Pending';

            return (
              <li key={session.id}>
                <Link href={`/admin/attendance/${session.id}`} className="block hover:bg-gray-50">
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-purple-600 truncate">
                        {session.className}{' '}
                        <span className="text-gray-500">({session.classCode})</span>
                      </div>
                      <div className="ml-2 flex-shrink-0 flex">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}`}
                        >
                          {statusText}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          <svg
                            className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          {new Date(session.date).toLocaleDateString()}
                        </p>
                        <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                          <svg
                            className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          {session.startTime.toString().slice(0, 5)} -{' '}
                          {session.endTime.toString().slice(0, 5)}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        {session.topic ? `Topic: ${session.topic}` : 'No topic set'}
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
          {sessions.length === 0 && (
            <li className="px-4 py-12 text-center text-gray-500">
              No class sessions found. Schedule classes to start tracking attendance.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

import { db } from '@/db';
import { classSessions, classes, enrollments, users, attendance } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import AttendanceSheet from './AttendanceSheet';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function AttendanceDetailPage({ params }: PageProps) {
  await requireAuth();
  const tenantId = await getTenantId();
  if (!tenantId) return <div>Error: No tenant context</div>;

  const { sessionId } = await params;

  // 1. Fetch Session Details
  const sessionData = await db
    .select({
      id: classSessions.id,
      date: classSessions.sessionDate,
      startTime: classSessions.startTime,
      endTime: classSessions.endTime,
      topic: classSessions.topic,
      className: classes.name,
      classCode: classes.code,
      classId: classes.id,
    })
    .from(classSessions)
    .innerJoin(classes, eq(classSessions.classId, classes.id))
    .where(and(eq(classSessions.id, sessionId), eq(classSessions.tenantId, tenantId)))
    .limit(1);

  if (sessionData.length === 0) {
    notFound();
  }

  const session = sessionData[0];

  // 2. Fetch Enrolled Students for this Class
  const enrolledStudents = await db
    .select({
      id: users.id,
      name: users.name,
      avatarUrl: users.avatarUrl,
    })
    .from(enrollments)
    .innerJoin(users, eq(enrollments.studentId, users.id))
    .where(and(eq(enrollments.classId, session.classId), eq(enrollments.status, 'active')));

  // 3. Fetch Existing Attendance Records
  const existingRecords = await db
    .select()
    .from(attendance)
    .where(eq(attendance.classSessionId, sessionId));

  // Transform to map for O(1) lookup
  const attendanceMap: Record<string, { status: string; notes: string | null }> = {};
  existingRecords.forEach(r => {
    attendanceMap[r.studentId] = { status: r.status, notes: r.notes };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow sm:rounded-lg p-6">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <Link
              href="/admin/attendance"
              className="text-sm text-purple-600 hover:text-purple-800 mb-2 inline-block"
            >
              &larr; Back to Dashboard
            </Link>
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              {session.className}{' '}
              <span className="text-gray-500 font-normal">({session.classCode})</span>
            </h2>
            <div className="mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:mt-0 sm:space-x-6">
              <div className="mt-2 flex items-center text-sm text-gray-500">
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
              </div>
              <div className="mt-2 flex items-center text-sm text-gray-500">
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
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Sheet */}
      <AttendanceSheet
        sessionId={sessionId}
        students={enrolledStudents}
        initialAttendance={attendanceMap}
      />
    </div>
  );
}

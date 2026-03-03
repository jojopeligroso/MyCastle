/**
 * Session Planning Page
 * View and edit session details including learning objectives
 */

import { db } from '@/db';
import { classes, classSessions } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { LearningObjectiveSelector } from '@/components/admin/sessions/LearningObjectiveSelector';

interface PageProps {
  params: Promise<{ id: string; sessionId: string }>;
}

async function getSessionWithClass(sessionId: string, classId: string, tenantId: string) {
  // Set RLS context
  await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

  const result = await db
    .select({
      session: classSessions,
      class: classes,
    })
    .from(classSessions)
    .innerJoin(classes, eq(classSessions.classId, classes.id))
    .where(
      and(
        eq(classSessions.id, sessionId),
        eq(classSessions.classId, classId),
        eq(classSessions.tenantId, tenantId)
      )
    )
    .limit(1);

  return result[0] || null;
}

export default async function SessionPlanningPage({ params }: PageProps) {
  await requireAuth(['admin', 'teacher', 'dos']);
  const { id: classId, sessionId } = await params;
  const tenantId = await getTenantId();

  if (!tenantId) {
    notFound();
  }

  const data = await getSessionWithClass(sessionId, classId, tenantId);

  if (!data) {
    notFound();
  }

  const { session, class: cls } = data;

  // Format date and time for display
  const sessionDate = new Date(session.sessionDate).toLocaleDateString('en-IE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const startTime = session.startTime?.toString().slice(0, 5) || '--:--';
  const endTime = session.endTime?.toString().slice(0, 5) || '--:--';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <nav className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Link href="/admin/classes" className="hover:text-purple-600">
                Classes
              </Link>
              <span>/</span>
              <Link href={`/admin/classes/${classId}`} className="hover:text-purple-600">
                {cls.name}
              </Link>
              <span>/</span>
              <span className="text-gray-900">Session Planning</span>
            </nav>
            <h1 className="text-2xl font-bold text-gray-900">Session Planning</h1>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600">
              <div className="flex items-center gap-1.5">
                <svg
                  className="w-4 h-4 text-gray-400"
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
                <span>{sessionDate}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg
                  className="w-4 h-4 text-gray-400"
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
                <span>
                  {startTime} - {endTime}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                  {cls.level || 'No Level'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/attendance/${sessionId}`}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Take Attendance
            </Link>
            <Link
              href={`/admin/classes/${classId}`}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Back to Class
            </Link>
          </div>
        </div>
      </div>

      {/* Session Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Learning Objectives */}
        <div className="lg:col-span-2">
          <LearningObjectiveSelector
            sessionId={sessionId}
            classLevel={cls.level || 'B1'}
            primaryCoursebookId={cls.primaryCoursebookId || undefined}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Session Details Card */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Session Details</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Class</dt>
                <dd className="mt-1 text-sm text-gray-900">{cls.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Class Code
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{cls.code}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Level</dt>
                <dd className="mt-1">
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                    {cls.level || 'Not Set'}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Subject
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{cls.subject || 'General English'}</dd>
              </div>
              {session.topic && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Topic
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">{session.topic}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link
                href={`/admin/attendance/${sessionId}`}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-gray-700 rounded-md hover:bg-gray-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
                Take Attendance
              </Link>
              <Link
                href={`/admin/classes/${classId}`}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-gray-700 rounded-md hover:bg-gray-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                View Class Details
              </Link>
              <Link
                href="/admin/curriculum/cefr"
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-gray-700 rounded-md hover:bg-gray-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                Browse CEFR Descriptors
              </Link>
            </div>
          </div>

          {/* Tips Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Planning Tips</h4>
            <ul className="text-xs text-blue-800 space-y-1.5">
              <li className="flex items-start gap-1.5">
                <span className="text-blue-500 mt-0.5">•</span>
                Select up to 2 primary objectives for focus
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-blue-500 mt-0.5">•</span>
                Add secondary objectives for supporting skills
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-blue-500 mt-0.5">•</span>
                Use textbook references for coursebook alignment
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-blue-500 mt-0.5">•</span>
                Create custom objectives when needed
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Teacher Timetable Page
 * Weekly schedule view for teachers
 * Ref: spec/02-teacher-mcp.md §2.2.1
 */

import { requireRole, requireAuth } from '@/lib/auth/utils';
import { redirect } from 'next/navigation';
import { Navigation } from '@/components/layout/Navigation';
import { TimetableWeekView } from '@/components/timetable/TimetableWeekView';

export default async function TimetablePage() {
  await requireRole(['teacher', 'admin']).catch(() => {
    redirect('/login');
  });

  const user = await requireAuth();
  const userRole = user.user_metadata?.role || 'teacher';

  // TODO: Fetch actual timetable data from database
  // const timetableData = await getTimetableForTeacher(user.id);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userEmail={user.email} userRole={userRole} currentPath="/teacher/timetable" />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">My Timetable</h1>
            <p className="mt-2 text-sm text-gray-600">Your weekly teaching schedule</p>
          </div>

          {/* Timetable View */}
          <TimetableWeekView teacherId={user.id} />
        </div>
      </main>
    </div>
  );
}

/**
 * Attendance Register Page
 * Mark attendance for class sessions
 * Ref: spec/02-teacher-mcp.md §2.2.7, §2.3.3
 */

import { requireRole, requireAuth } from '@/lib/auth/utils';
import { redirect } from 'next/navigation';
import { Navigation } from '@/components/layout/Navigation';
import { AttendanceRegister } from '@/components/attendance/AttendanceRegister';

export default async function AttendancePage() {
  await requireRole(['teacher', 'admin']).catch(() => {
    redirect('/login');
  });

  const user = await requireAuth();
  const userRole = user.user_metadata?.role || 'teacher';

  // TODO: Fetch teacher's classes from database
  // const classes = await getTeacherClasses(user.id);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation
        userEmail={user.email}
        userRole={userRole}
        currentPath="/teacher/attendance"
      />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Attendance Register</h1>
            <p className="mt-2 text-sm text-gray-600">
              Mark attendance for your class sessions
            </p>
          </div>

          {/* Attendance Register */}
          <AttendanceRegister teacherId={user.id} />
        </div>
      </main>
    </div>
  );
}

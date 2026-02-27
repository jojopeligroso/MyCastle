/**
 * Attendance Page
 * Role-based attendance views for teachers and admins
 * - Teacher View: Current date, teacher's sessions only
 * - Admin View: Date range, student or school-wide view
 */

import { requireRole, requireAuth } from '@/lib/auth/utils';
import { redirect } from 'next/navigation';
import { Navigation } from '@/components/layout/Navigation';
import { AttendanceViewSelector } from '@/components/attendance/AttendanceViewSelector';

export default async function AttendancePage() {
  await requireRole(['teacher', 'admin']).catch(() => {
    redirect('/login');
  });

  const user = await requireAuth();
  const userRole = user.user_metadata?.role || 'teacher';
  const isAdmin =
    userRole === 'admin' || userRole === 'super_admin' || userRole.startsWith('admin_');

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userEmail={user.email} userRole={userRole} currentPath="/teacher/attendance" />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <AttendanceViewSelector userId={user.id} userRole={userRole} isAdmin={isAdmin} />
        </div>
      </main>
    </div>
  );
}

/**
 * Students List Page - View and manage all students
 * Student Registry for visa compliance and academic tracking
 */

import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { StudentList } from '@/components/admin/StudentList';
import { getStudentsWithMetadata } from './_actions/studentActions';

async function getStudentStats(students: any[]) {
  const totalStudents = students.length;
  const activeStudents = students.filter(s => s.status === 'active').length;

  // Visa compliance
  const visaAlerts = students.filter(
    s => s.visa_status === 'expiring_soon' || s.visa_status === 'expired'
  ).length;

  const stamp2Students = students.filter(s => s.visa_type === 'Stamp 2').length;

  // Attendance
  const lowAttendance = students.filter(
    s => s.overall_attendance_rate > 0 && s.overall_attendance_rate < 85
  ).length;

  // Safeguarding
  const safeguardingNotes = students.filter(s => s.has_safeguarding_notes).length;

  // Average attendance
  const avgAttendance = activeStudents > 0
    ? students.reduce((sum, s) => sum + Number(s.overall_attendance_rate || 0), 0) / totalStudents
    : 0;

  return {
    totalStudents,
    activeStudents,
    visaAlerts,
    stamp2Students,
    lowAttendance,
    safeguardingNotes,
    avgAttendance,
  };
}

export default async function StudentsPage() {
  await requireAuth();
  const tenantId = await getTenantId();

  if (!tenantId) {
    notFound();
  }

  const students = await getStudentsWithMetadata();
  const stats = await getStudentStats(students);

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Student Registry</h1>
          <p className="mt-2 text-gray-600">
            Manage student profiles, visa compliance, and academic progress
          </p>
        </div>
        <Link
          href="/admin/students/create"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
        >
          + Add Student
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Total Students</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{stats.totalStudents}</div>
          <div className="mt-1 text-sm text-gray-500">
            {stats.activeStudents} active
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Visa Compliance</div>
          <div className="mt-2 text-3xl font-bold text-red-600">{stats.visaAlerts}</div>
          <div className="mt-1 text-sm text-gray-500">
            {stats.stamp2Students} Stamp 2 students
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Average Attendance</div>
          <div className="mt-2 text-3xl font-bold text-purple-600">
            {stats.avgAttendance.toFixed(1)}%
          </div>
          <div className="mt-1 text-sm text-gray-500">
            {stats.lowAttendance} below 85%
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Safeguarding</div>
          <div className="mt-2 text-3xl font-bold text-orange-600">
            {stats.safeguardingNotes}
          </div>
          <div className="mt-1 text-sm text-gray-500">
            students with notes
          </div>
        </div>
      </div>

      {/* Visa Alert Banner */}
      {stats.visaAlerts > 0 && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                <strong>{stats.visaAlerts}</strong> student
                {stats.visaAlerts === 1 ? ' has an' : 's have'} expiring or expired visa. Review visa
                status for compliance reporting.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Students List */}
      <StudentList students={students} />
    </div>
  );
}

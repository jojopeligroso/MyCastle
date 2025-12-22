/**
 * Teachers List Page - View and manage all teachers
 * Teacher Registry for compliance and workload management
 */

import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { TeacherList } from '@/components/admin/TeacherList';
import { getTeachersWithMetadata } from './_actions/teacherActions';

async function getTeacherStats(teachers: any[]) {
  const totalTeachers = teachers.length;
  const activeTeachers = teachers.filter(t => t.status === 'active').length;
  const fullTimeTeachers = teachers.filter(t => t.employment_type === 'full-time').length;
  const partTimeTeachers = teachers.filter(t => t.employment_type === 'part-time').length;

  // Compliance alerts
  const complianceAlerts = teachers.filter(
    t => t.expiring_soon_count > 0 || t.work_permit_expiring_soon
  ).length;

  // Total hours this week
  const totalHoursThisWeek = teachers.reduce((sum, t) => sum + Number(t.hours_this_week || 0), 0);

  // Average classes per teacher
  const avgClassesPerTeacher = activeTeachers > 0
    ? teachers.reduce((sum, t) => sum + Number(t.active_classes_count || 0), 0) / activeTeachers
    : 0;

  return {
    totalTeachers,
    activeTeachers,
    fullTimeTeachers,
    partTimeTeachers,
    complianceAlerts,
    totalHoursThisWeek,
    avgClassesPerTeacher,
  };
}

export default async function TeachersPage() {
  await requireAuth();
  const tenantId = await getTenantId();

  if (!tenantId) {
    notFound();
  }

  const teachers = await getTeachersWithMetadata();
  const stats = await getTeacherStats(teachers);

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Teacher Registry</h1>
          <p className="mt-2 text-gray-600">
            Manage teacher profiles, qualifications, and availability for ILEP compliance
          </p>
        </div>
        <Link
          href="/admin/teachers/create"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
        >
          + Add Teacher
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-500">Total Teachers</div>
          </div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{stats.totalTeachers}</div>
          <div className="mt-1 text-sm text-gray-500">
            {stats.activeTeachers} active
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Employment Mix</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-600">{stats.fullTimeTeachers}</span>
            <span className="text-sm text-gray-500">FT</span>
            <span className="text-2xl font-bold text-indigo-600">{stats.partTimeTeachers}</span>
            <span className="text-sm text-gray-500">PT</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Workload This Week</div>
          <div className="mt-2 text-3xl font-bold text-purple-600">
            {stats.totalHoursThisWeek.toFixed(0)}h
          </div>
          <div className="mt-1 text-sm text-gray-500">
            {stats.avgClassesPerTeacher.toFixed(1)} avg classes/teacher
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Compliance Status</div>
          <div className="mt-2 text-3xl font-bold text-red-600">
            {stats.complianceAlerts}
          </div>
          <div className="mt-1 text-sm text-gray-500">
            {stats.complianceAlerts === 0 ? 'All compliant' : 'alerts requiring attention'}
          </div>
        </div>
      </div>

      {/* Compliance Alert Banner */}
      {stats.complianceAlerts > 0 && (
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>{stats.complianceAlerts}</strong> teacher
                {stats.complianceAlerts === 1 ? ' has' : 's have'} expiring qualifications or work
                permits. Review compliance status for Trust-ED and ILEP requirements.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Teachers List */}
      <TeacherList teachers={teachers} />
    </div>
  );
}

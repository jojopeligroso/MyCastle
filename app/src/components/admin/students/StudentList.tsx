'use client';

import Link from 'next/link';
import { type User } from '@/db/schema/core';

interface StudentWithMetadata extends User {
  active_enrollments?: number;
  attendance_rate?: number | null;
  visa_expiring_soon?: boolean;
  at_risk_attendance?: boolean;
}

interface StudentListProps {
  students: StudentWithMetadata[];
  onStudentClick: (studentId: string) => void;
}

export function StudentList({ students, onStudentClick }: StudentListProps) {
  const getLevelBadgeColor = (level: string | null): string => {
    if (!level) return 'bg-gray-100 text-gray-600';

    const colors: Record<string, string> = {
      A1: 'bg-green-100 text-green-800',
      A2: 'bg-green-200 text-green-900',
      B1: 'bg-blue-100 text-blue-800',
      B2: 'bg-blue-200 text-blue-900',
      C1: 'bg-purple-100 text-purple-800',
      C2: 'bg-purple-200 text-purple-900',
    };

    return colors[level] || 'bg-gray-100 text-gray-600';
  };

  const getLevelDisplay = (student: StudentWithMetadata): JSX.Element => {
    if (!student.current_level) {
      return <span className="text-gray-400 text-sm">Not assessed</span>;
    }

    const isProvisional = student.level_status === 'provisional';
    const isPending = student.level_status === 'pending_approval';

    return (
      <div className="flex items-center gap-1.5">
        <span
          className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded ${getLevelBadgeColor(student.current_level)}`}
        >
          {student.current_level}
        </span>
        {isProvisional && (
          <span className="text-amber-500" title="Provisional level - requires approval">
            ⚠️
          </span>
        )}
        {isPending && (
          <span className="text-blue-500" title="Pending approval">
            ⏳
          </span>
        )}
      </div>
    );
  };

  const getAttendanceDisplay = (rate: number | null | undefined): JSX.Element => {
    if (rate === null || rate === undefined) {
      return <span className="text-gray-400 text-sm">N/A</span>;
    }

    const percentage = Math.round(rate);
    const color =
      percentage >= 90
        ? 'text-green-700'
        : percentage >= 80
          ? 'text-blue-700'
          : percentage >= 70
            ? 'text-amber-700'
            : 'text-red-700';

    return <span className={`font-medium ${color}`}>{percentage}%</span>;
  };

  const getVisaStatusBadge = (student: StudentWithMetadata): JSX.Element | null => {
    if (!student.visa_expiry) return null;

    const expiryDate = new Date(student.visa_expiry);
    const today = new Date();
    const daysUntilExpiry = Math.floor(
      (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry < 0) {
      return (
        <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded">
          Expired
        </span>
      );
    }

    if (daysUntilExpiry <= 30) {
      return (
        <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded">
          Expiring Soon
        </span>
      );
    }

    return (
      <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">
        Valid
      </span>
    );
  };

  const getStatusBadge = (status: string): JSX.Element => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-red-100 text-red-800',
      archived: 'bg-gray-100 text-gray-800',
    };

    return (
      <span
        className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${colors[status] || 'bg-gray-100 text-gray-800'}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (students.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-semibold text-gray-900">No students found</h3>
        <p className="mt-1 text-sm text-gray-500">
          Try adjusting your filters or create a new student.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Student
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Level
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Enrollments
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Attendance
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Visa Status
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {students.map(student => (
              <tr
                key={student.id}
                onClick={() => onStudentClick(student.id)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      {student.avatar_url ? (
                        <img className="h-10 w-10 rounded-full" src={student.avatar_url} alt="" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-purple-600">
                            {student.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{student.name}</div>
                      <div className="text-sm text-gray-500">{student.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{getLevelDisplay(student)}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900">
                    {student.active_enrollments !== undefined ? student.active_enrollments : '-'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {getAttendanceDisplay(student.attendance_rate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{getVisaStatusBadge(student)}</td>
                <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(student.status)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Link
                    href={`/admin/students/${student.id}`}
                    className="text-purple-600 hover:text-purple-900 font-medium"
                    onClick={e => e.stopPropagation()}
                  >
                    View Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile view - Hidden on desktop */}
      <div className="sm:hidden space-y-4 p-4">
        {students.map(student => (
          <div
            key={student.id}
            onClick={() => onStudentClick(student.id)}
            className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-purple-300 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3 mb-3">
              {student.avatar_url ? (
                <img className="h-12 w-12 rounded-full" src={student.avatar_url} alt="" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <span className="text-base font-medium text-purple-600">
                    {student.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{student.name}</div>
                <div className="text-xs text-gray-500 truncate">{student.email}</div>
              </div>
              {getStatusBadge(student.status)}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-500">Level:</span>
                <div className="mt-1">{getLevelDisplay(student)}</div>
              </div>
              <div>
                <span className="text-gray-500">Enrollments:</span>
                <div className="mt-1 text-gray-900">
                  {student.active_enrollments !== undefined ? student.active_enrollments : '-'}
                </div>
              </div>
              <div>
                <span className="text-gray-500">Attendance:</span>
                <div className="mt-1">{getAttendanceDisplay(student.attendance_rate)}</div>
              </div>
              <div>
                <span className="text-gray-500">Visa:</span>
                <div className="mt-1">
                  {getVisaStatusBadge(student) || <span className="text-gray-400">N/A</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

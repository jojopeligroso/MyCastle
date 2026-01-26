'use client';

/**
 * EnrollmentList Component - Display and manage enrollments table with filters
 */

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCallback, useState, useTransition } from 'react';

interface EnrollmentData {
  enrolment: {
    id: string;
    enrollmentDate: Date;
    expectedEndDate: Date | null;
    completionDate: Date | null;
    status: string;
    attendanceRate: string | null;
    currentGrade: string | null;
    bookedWeeks: number | null;
  };
  student: {
    id: string;
    name: string;
    email: string;
  } | null;
  class: {
    id: string;
    name: string;
    code: string | null;
    level: string | null;
  } | null;
}

interface Student {
  id: string;
  name: string;
}

interface Class {
  id: string;
  name: string;
  code: string | null;
}

interface Filters {
  studentId?: string;
  classId?: string;
  status?: string;
  search?: string;
  sortBy?: 'enrollmentDate' | 'studentName';
  sortOrder?: 'asc' | 'desc';
}

interface Props {
  enrollments: EnrollmentData[];
  students: Student[];
  classes: Class[];
  filters: Filters;
}

export function EnrollmentList({ enrollments, students, classes, filters }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(filters.search || '');

  // Update URL with new filter
  const updateFilter = useCallback(
    (key: string, value: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString());

      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [searchParams, pathname, router]
  );

  // Handle search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter('search', searchInput || undefined);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchInput('');
    startTransition(() => {
      router.push(pathname);
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      dropped: 'bg-gray-100 text-gray-800',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const getAttendanceColor = (rate: string | null) => {
    if (!rate) return 'text-gray-500';
    const percentage = parseFloat(rate);
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 70) return 'text-orange-600';
    return 'text-red-600';
  };

  const hasActiveFilters = filters.studentId || filters.classId || filters.status || filters.search;

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Filters */}
      <div className="p-6 border-b border-gray-200">
        <div className="space-y-4">
          {/* Search and Sort Row */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by student or class name..."
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      updateFilter('search', undefined);
                    }}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </form>

            {/* Sort Controls */}
            <div className="flex gap-2">
              <select
                value={filters.sortBy || 'enrollmentDate'}
                onChange={e => updateFilter('sortBy', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 text-sm"
              >
                <option value="enrollmentDate">Sort by Enrollment Date</option>
                <option value="studentName">Sort by Student Name</option>
              </select>
              <button
                onClick={() =>
                  updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')
                }
                className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
                title={filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              >
                {filters.sortOrder === 'asc' ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Filter Row */}
          <div className="flex flex-wrap gap-3">
            {/* Student Filter */}
            <select
              value={filters.studentId || ''}
              onChange={e => updateFilter('studentId', e.target.value || undefined)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 text-sm"
            >
              <option value="">All Students</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>

            {/* Class Filter */}
            <select
              value={filters.classId || ''}
              onChange={e => updateFilter('classId', e.target.value || undefined)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 text-sm"
            >
              <option value="">All Classes</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} {cls.code ? `(${cls.code})` : ''}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filters.status || ''}
              onChange={e => updateFilter('status', e.target.value || undefined)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 text-sm"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="dropped">Dropped</option>
            </select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-md"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Class
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Enrollment Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Expected End
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Attendance
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isPending && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5 text-purple-600"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Loading...
                  </div>
                </td>
              </tr>
            )}
            {!isPending && enrollments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  {hasActiveFilters
                    ? 'No enrollments match your filters'
                    : 'No enrollments found. Students can be enrolled from the class pages.'}
                </td>
              </tr>
            ) : (
              !isPending &&
              enrollments.map(({ enrolment, student, class: classInfo }) => (
                <tr key={enrolment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {student?.name || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500">{student?.email || ''}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {classInfo?.name || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {classInfo?.code} • {classInfo?.level || 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(enrolment.enrollmentDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {enrolment.expectedEndDate
                      ? new Date(enrolment.expectedEndDate).toLocaleDateString()
                      : enrolment.bookedWeeks
                        ? `${enrolment.bookedWeeks} weeks`
                        : 'Ongoing'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div
                      className={`text-sm font-medium ${getAttendanceColor(enrolment.attendanceRate)}`}
                    >
                      {enrolment.attendanceRate
                        ? `${parseFloat(enrolment.attendanceRate).toFixed(1)}%`
                        : 'N/A'}
                    </div>
                    {enrolment.currentGrade && (
                      <div className="text-xs text-gray-500">Grade: {enrolment.currentGrade}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(enrolment.status)}`}
                    >
                      {enrolment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/admin/enrolments/${enrolment.id}`}
                      className="text-purple-600 hover:text-purple-900 mr-4"
                    >
                      View
                    </Link>
                    <Link
                      href={`/admin/students/${student?.id}`}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Student
                    </Link>
                    <Link
                      href={`/admin/classes/${classInfo?.id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Class
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-700">
          Showing <span className="font-medium">{enrollments.length}</span>
          {hasActiveFilters ? ' filtered' : ''} enrollment{enrollments.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}

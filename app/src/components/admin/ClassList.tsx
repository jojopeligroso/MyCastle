'use client';

/**
 * ClassList Component - Display and manage classes table with filters
 */

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCallback, useState, useTransition, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ClassData {
  class: {
    id: string;
    code: string | null;
    name: string;
    level: string | null;
    subject: string | null;
    capacity: number;
    enrolledCount: number;
    status: string;
    scheduleDescription: string | null;
    startTime: string | null;
    endTime: string | null;
    breakDurationMinutes: number | null;
    daysOfWeek: string[];
    startDate: string;
    endDate: string | null;
    teacherId: string | null;
    showCapacityPublicly: boolean;
  };
  teacher: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  enrollmentCount: number;
}

interface Teacher {
  id: string;
  name: string | null;
  email: string;
}

interface Filters {
  teacherId?: string;
  level?: string;
  status?: string;
  search?: string;
  sortBy?: 'name' | 'startDate';
  sortOrder?: 'asc' | 'desc';
}

interface Props {
  classes: ClassData[];
  teachers: Teacher[];
  filters: Filters;
}

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export function ClassList({ classes, teachers, filters }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search || '');
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== debouncedSearch) {
        setDebouncedSearch(searchInput);
        updateFilter('search', searchInput || undefined);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, debouncedSearch, updateFilter]);

  // Auto-clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Delete class handler
  const handleDeleteClass = async (classId: string, className: string) => {
    if (!confirm(`Are you sure you want to delete "${className}"? This will cancel the class.`)) {
      return;
    }

    setDeletingClassId(classId);
    setError(null);
    try {
      const response = await fetch(`/api/admin/classes/${classId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete class');
      }

      // Refresh the page to show updated data
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete class');
    } finally {
      setDeletingClassId(null);
    }
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
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const getCapacityColor = (enrolled: number, capacity: number) => {
    const percentage = (enrolled / capacity) * 100;
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-orange-600';
    return 'text-green-600';
  };

  const hasActiveFilters = filters.teacherId || filters.level || filters.status || filters.search;

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Error Alert */}
      {error && (
        <div className="p-4 border-b border-gray-200">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Filters */}
      <div className="p-6 border-b border-gray-200">
        <div className="space-y-4">
          {/* Search and Sort Row */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search - auto-search with debounce */}
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search by class name or code..."
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      setDebouncedSearch('');
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
            </div>

            {/* Sort Controls */}
            <div className="flex gap-2">
              <select
                value={filters.sortBy || 'startDate'}
                onChange={e => updateFilter('sortBy', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 text-sm"
              >
                <option value="startDate">Sort by Start Date</option>
                <option value="name">Sort by Name</option>
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
            {/* Teacher Filter */}
            <select
              value={filters.teacherId || ''}
              onChange={e => updateFilter('teacherId', e.target.value || undefined)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 text-sm"
            >
              <option value="">All Teachers</option>
              {teachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>

            {/* CEFR Level Filter */}
            <select
              value={filters.level || ''}
              onChange={e => updateFilter('level', e.target.value || undefined)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 text-sm"
            >
              <option value="">All Levels</option>
              {CEFR_LEVELS.map(level => (
                <option key={level} value={level}>
                  {level}
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
              <option value="cancelled">Cancelled</option>
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

      {/* Desktop Table - hidden on mobile */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Class
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Teacher
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Schedule
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Enrollment
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
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
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
            {!isPending && classes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  {hasActiveFilters ? 'No classes match your filters' : 'No classes found'}
                </td>
              </tr>
            ) : (
              !isPending &&
              classes.map(({ class: cls, teacher, enrollmentCount }) => (
                <tr key={cls.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{cls.name}</div>
                      <div className="text-sm text-gray-500">
                        {cls.code} • {cls.level}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {teacher ? (
                      <div>
                        <Link
                          href={`/admin/users/${teacher.id}`}
                          className="text-sm text-gray-900 hover:text-purple-600"
                        >
                          {teacher.name}
                        </Link>
                        <div className="text-sm text-gray-500">{teacher.email}</div>
                      </div>
                    ) : (
                      <span className="text-sm text-orange-600">Not assigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {cls.daysOfWeek && cls.daysOfWeek.length > 0
                        ? cls.daysOfWeek.map(d => d.substring(0, 3)).join(', ')
                        : cls.scheduleDescription || 'Not scheduled'}
                    </div>
                    <div className="text-sm font-medium text-gray-700">
                      {cls.startTime && cls.endTime
                        ? `${cls.startTime.substring(0, 5)} - ${cls.endTime.substring(0, 5)}`
                        : 'Times TBD'}
                      {cls.breakDurationMinutes && cls.breakDurationMinutes > 0
                        ? ` (${cls.breakDurationMinutes}min break)`
                        : ''}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(cls.startDate).toLocaleDateString()}
                      {cls.endDate && ` - ${new Date(cls.endDate).toLocaleDateString()}`}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {cls.showCapacityPublicly ? (
                      <>
                        <div
                          className={`text-sm font-medium ${getCapacityColor(enrollmentCount, cls.capacity)}`}
                        >
                          {enrollmentCount} / {cls.capacity}
                        </div>
                        <div className="text-xs text-gray-500">
                          {Math.round((enrollmentCount / cls.capacity) * 100)}% full
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-gray-500">
                        {enrollmentCount} enrolled
                        <div className="text-xs text-gray-400">(capacity hidden)</div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(cls.status)}`}
                    >
                      {cls.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/admin/classes/${cls.id}`}
                      className="text-purple-600 hover:text-purple-900 mr-4"
                    >
                      View
                    </Link>
                    <Link
                      href={`/admin/classes/${cls.id}/edit`}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Edit
                    </Link>
                    {cls.status !== 'cancelled' && (
                      <button
                        onClick={() => handleDeleteClass(cls.id, cls.name)}
                        disabled={deletingClassId === cls.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        {deletingClassId === cls.id ? 'Deleting...' : 'Delete'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card view - visible only on mobile */}
      <div className="md:hidden">
        {isPending && (
          <div className="p-8 text-center text-gray-500">
            <div className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24">
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
          </div>
        )}
        {!isPending && classes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {hasActiveFilters ? 'No classes match your filters' : 'No classes found'}
          </div>
        ) : (
          !isPending && (
            <div className="divide-y divide-gray-200">
              {classes.map(({ class: cls, teacher, enrollmentCount }) => (
                <div
                  key={cls.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/admin/classes/${cls.id}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{cls.name}</h3>
                      <p className="text-xs text-gray-500">
                        {cls.code} {cls.level && `• ${cls.level}`}
                      </p>
                    </div>
                    <span
                      className={`ml-2 px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusBadge(cls.status)}`}
                    >
                      {cls.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div>
                      <span className="text-gray-500">Teacher:</span>
                      <p className="text-gray-900 truncate">
                        {teacher?.name || <span className="text-orange-600">Not assigned</span>}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Enrollment:</span>
                      <p className={getCapacityColor(enrollmentCount, cls.capacity)}>
                        {enrollmentCount} / {cls.capacity}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Schedule:</span>
                      <p className="text-gray-900">
                        {cls.daysOfWeek && cls.daysOfWeek.length > 0
                          ? cls.daysOfWeek.map(d => d.substring(0, 3)).join(', ')
                          : 'Not scheduled'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Time:</span>
                      <p className="text-gray-900">
                        {cls.startTime && cls.endTime
                          ? `${cls.startTime.substring(0, 5)} - ${cls.endTime.substring(0, 5)}`
                          : 'TBD'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 text-xs">
                    <Link
                      href={`/admin/classes/${cls.id}`}
                      className="text-purple-600 font-medium"
                      onClick={e => e.stopPropagation()}
                    >
                      View
                    </Link>
                    <Link
                      href={`/admin/classes/${cls.id}/edit`}
                      className="text-blue-600 font-medium"
                      onClick={e => e.stopPropagation()}
                    >
                      Edit
                    </Link>
                    {cls.status !== 'cancelled' && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleDeleteClass(cls.id, cls.name);
                        }}
                        disabled={deletingClassId === cls.id}
                        className="text-red-600 font-medium disabled:opacity-50"
                      >
                        {deletingClassId === cls.id ? 'Deleting...' : 'Delete'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-700">
          Showing <span className="font-medium">{classes.length}</span>
          {hasActiveFilters ? ' filtered' : ''} class{classes.length !== 1 ? 'es' : ''}
        </p>
      </div>
    </div>
  );
}

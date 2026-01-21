'use client';

/**
 * ClassList Component - Display and manage classes table
 */

import { useState } from 'react';
import Link from 'next/link';

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
    name: string;
    email: string;
  } | null;
  enrollmentCount: number;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
}

interface Props {
  classes: ClassData[];
  teachers: Teacher[];
}

export function ClassList({ classes, teachers }: Props) {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter classes
  const filteredClasses = classes.filter(c => {
    const matchesFilter = filter === 'all' || c.class.status === filter;
    const matchesSearch =
      c.class.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.class.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.teacher?.name.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

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

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Filters */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search classes..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'active'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'completed'
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Completed
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
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
            {filteredClasses.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No classes found
                </td>
              </tr>
            ) : (
              filteredClasses.map(({ class: cls, teacher, enrollmentCount }) => (
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
                        <div className="text-sm text-gray-900">{teacher.name}</div>
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
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
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
          Showing <span className="font-medium">{filteredClasses.length}</span> of{' '}
          <span className="font-medium">{classes.length}</span> classes
        </p>
      </div>
    </div>
  );
}

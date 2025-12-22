'use client';

/**
 * TeacherList Component - Display and manage teachers table
 * Shows teachers with workload, qualifications, and compliance status
 */

import { useState } from 'react';
import Link from 'next/link';
import type { TeacherWithMetadata } from '@/app/admin/teachers/_actions/teacherActions';

interface Props {
  teachers: TeacherWithMetadata[];
}

export function TeacherList({ teachers }: Props) {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter teachers
  const filteredTeachers = teachers.filter((t) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'active' && t.status === 'active') ||
      (filter === 'on_leave' && t.status === 'on_leave') ||
      (filter === 'full-time' && t.employment_type === 'full-time') ||
      (filter === 'part-time' && t.employment_type === 'part-time') ||
      (filter === 'compliance_alert' && (t.expiring_soon_count > 0 || t.work_permit_expiring_soon));

    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.employee_number && t.employee_number.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      on_leave: 'bg-yellow-100 text-yellow-800',
      inactive: 'bg-gray-100 text-gray-800',
      terminated: 'bg-red-100 text-red-800',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const getEmploymentTypeBadge = (type: string) => {
    const styles = {
      'full-time': 'bg-blue-100 text-blue-800',
      'part-time': 'bg-indigo-100 text-indigo-800',
      'contractor': 'bg-purple-100 text-purple-800',
      'substitute': 'bg-pink-100 text-pink-800',
    };
    return styles[type as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const formatEmploymentType = (type: string) => {
    return type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Filters */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col gap-4">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search teachers by name, email, or employee #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
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
              onClick={() => setFilter('full-time')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'full-time'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Full-Time
            </button>
            <button
              onClick={() => setFilter('part-time')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'part-time'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Part-Time
            </button>
            <button
              onClick={() => setFilter('compliance_alert')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'compliance_alert'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Compliance Alerts
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
                Teacher
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employment
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Workload
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Qualifications
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Compliance
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTeachers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No teachers found
                </td>
              </tr>
            ) : (
              filteredTeachers.map((teacher) => (
                <tr key={teacher.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {teacher.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {teacher.email}
                      </div>
                      {teacher.employee_number && (
                        <div className="text-xs text-gray-400">
                          #{teacher.employee_number}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getEmploymentTypeBadge(
                        teacher.employment_type
                      )}`}
                    >
                      {formatEmploymentType(teacher.employment_type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(
                        teacher.status
                      )}`}
                    >
                      {teacher.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      <div>{teacher.active_classes_count} classes</div>
                      <div className="text-xs text-gray-400">
                        {teacher.hours_this_week.toFixed(1)}h this week
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-900">
                        {teacher.verified_qualifications}
                      </span>
                      <span className="text-gray-400">/</span>
                      <span className="text-gray-500">
                        {teacher.total_qualifications}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">verified</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {teacher.expiring_soon_count > 0 || teacher.work_permit_expiring_soon ? (
                      <div className="flex flex-col gap-1">
                        {teacher.expiring_soon_count > 0 && (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            {teacher.expiring_soon_count} expiring
                          </span>
                        )}
                        {teacher.work_permit_expiring_soon && (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Work permit
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">All good</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex justify-end gap-3">
                      <Link
                        href={`/admin/teachers/${teacher.id}`}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        View
                      </Link>
                      <Link
                        href={`/admin/teachers/${teacher.id}/edit`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </Link>
                    </div>
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
          Showing <span className="font-medium">{filteredTeachers.length}</span> of{' '}
          <span className="font-medium">{teachers.length}</span> teachers
        </p>
      </div>
    </div>
  );
}

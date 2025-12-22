'use client';

/**
 * StudentList Component - Display and manage students table
 * Shows students with visa status, attendance, and compliance alerts
 */

import { useState } from 'react';
import Link from 'next/link';
import type { StudentWithMetadata } from '@/app/admin/students/_actions/studentActions';

interface Props {
  students: StudentWithMetadata[];
}

export function StudentList({ students }: Props) {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter students
  const filteredStudents = students.filter((s) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'active' && s.status === 'active') ||
      (filter === 'visa_alert' && (s.visa_status === 'expiring_soon' || s.visa_status === 'expired')) ||
      (filter === 'new_this_week' &&
        s.intake_date &&
        new Date(s.intake_date) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) ||
      (filter === 'safeguarding' && s.has_safeguarding_notes);

    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.student_number && s.student_number.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      on_leave: 'bg-yellow-100 text-yellow-800',
      withdrawn: 'bg-gray-100 text-gray-800',
      completed: 'bg-blue-100 text-blue-800',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const getVisaStatusBadge = (status: string) => {
    const styles = {
      valid: 'bg-green-100 text-green-800',
      ilr: 'bg-blue-100 text-blue-800',
      expiring_soon: 'bg-yellow-100 text-yellow-800',
      expiring_within_90_days: 'bg-orange-100 text-orange-800',
      expired: 'bg-red-100 text-red-800',
      no_visa_recorded: 'bg-gray-100 text-gray-800',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const formatVisaStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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
              placeholder="Search students by name, email, or student #..."
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
              onClick={() => setFilter('visa_alert')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'visa_alert'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Visa Alerts
            </button>
            <button
              onClick={() => setFilter('new_this_week')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'new_this_week'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              New This Week
            </button>
            <button
              onClick={() => setFilter('safeguarding')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'safeguarding'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Safeguarding
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
                Student
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Level
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Visa Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Attendance
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Alerts
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No students found
                </td>
              </tr>
            ) : (
              filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {student.name}
                        {student.has_safeguarding_notes && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                            SG
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{student.email}</div>
                      {student.student_number && (
                        <div className="text-xs text-gray-400">#{student.student_number}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.current_level || 'Not set'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(
                        student.status
                      )}`}
                    >
                      {student.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getVisaStatusBadge(
                          student.visa_status
                        )}`}
                      >
                        {formatVisaStatus(student.visa_status)}
                      </span>
                      {student.days_until_visa_expiry !== null && student.days_until_visa_expiry >= 0 && (
                        <span className="text-xs text-gray-500">
                          {student.days_until_visa_expiry} days
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm text-gray-900">
                        {student.overall_attendance_rate.toFixed(1)}%
                      </div>
                      {student.overall_attendance_rate < 85 && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          Low
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {student.outstanding_followups > 0 && (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        {student.outstanding_followups} followup{student.outstanding_followups !== 1 ? 's' : ''}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex justify-end gap-3">
                      <Link
                        href={`/admin/students/${student.id}`}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        View
                      </Link>
                      <Link
                        href={`/admin/students/${student.id}/edit`}
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
          Showing <span className="font-medium">{filteredStudents.length}</span> of{' '}
          <span className="font-medium">{students.length}</span> students
        </p>
      </div>
    </div>
  );
}

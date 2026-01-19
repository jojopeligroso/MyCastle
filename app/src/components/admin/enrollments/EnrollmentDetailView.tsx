/**
 * Enrollment Detail View Component
 * Displays enrollment information, amendment history, and action buttons
 */

'use client';

import Link from 'next/link';
import { useState } from 'react';

interface Student {
  id: string;
  name: string;
  email: string;
  studentNumber?: string;
}

interface Class {
  id: string;
  name: string;
  code?: string;
  level?: string;
  teacherName?: string;
}

interface Amendment {
  id: string;
  amendmentType: string;
  amendmentDate: string;
  previousValue?: string;
  newValue?: string;
  reason?: string;
  status: string;
  metadata?: Record<string, unknown>;
}

interface Enrollment {
  id: string;
  enrollmentDate: string;
  expectedEndDate?: string;
  status: string;
  attendanceRate?: string;
  currentGrade?: string;
}

interface EnrollmentDetailViewProps {
  enrollment: Enrollment;
  student: Student;
  classInfo: Class;
  amendments: Amendment[];
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'completed':
      return 'bg-blue-100 text-blue-800';
    case 'transferred':
      return 'bg-purple-100 text-purple-800';
    case 'dropped':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getAmendmentTypeBadge = (type: string) => {
  switch (type.toUpperCase()) {
    case 'EXTENSION':
      return 'bg-blue-100 text-blue-800';
    case 'REDUCTION':
      return 'bg-amber-100 text-amber-800';
    case 'LEVEL_CHANGE':
      return 'bg-green-100 text-green-800';
    case 'TRANSFER':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getAmendmentDetails = (amendment: Amendment) => {
  switch (amendment.amendmentType.toUpperCase()) {
    case 'EXTENSION':
      return `Extended to ${new Date(amendment.newValue || '').toLocaleDateString()}`;
    case 'REDUCTION':
      return `Reduced to ${new Date(amendment.newValue || '').toLocaleDateString()}`;
    case 'LEVEL_CHANGE':
      return `Level changed from ${amendment.previousValue} to ${amendment.newValue}`;
    case 'TRANSFER':
      return `Transferred to another class`;
    default:
      return 'Amendment recorded';
  }
};

export default function EnrollmentDetailView({
  enrollment,
  student,
  classInfo,
  amendments,
}: EnrollmentDetailViewProps) {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const handleStatusUpdate = async (newStatus: string) => {
    if (!confirm(`Are you sure you want to mark this enrollment as ${newStatus}?`)) {
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const response = await fetch(`/api/admin/enrollments/${enrollment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      // Refresh the page to show updated data
      window.location.reload();
    } catch {
      alert('Failed to update enrollment status. Please try again.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div>
        <nav className="text-sm text-gray-500 mb-2">
          <Link href="/admin" className="hover:text-gray-700">
            Admin
          </Link>
          {' > '}
          <Link href="/admin/enrolments" className="hover:text-gray-700">
            Enrolments
          </Link>
          {' > '}
          <span className="text-gray-900">{student.name}</span>
        </nav>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {student.name} - {classInfo.name}
            </h1>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(enrollment.status)}`}
          >
            {enrollment.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Info Cards (3-column grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Student Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Student Information</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-500">Name</p>
              <p className="text-sm text-gray-900">{student.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Email</p>
              <p className="text-sm text-gray-900">{student.email}</p>
            </div>
            {student.studentNumber && (
              <div>
                <p className="text-sm font-medium text-gray-500">Student Number</p>
                <p className="text-sm text-gray-900">{student.studentNumber}</p>
              </div>
            )}
            <Link
              href={`/admin/students/${student.id}`}
              className="text-sm text-blue-600 hover:text-blue-900"
            >
              View Student Profile →
            </Link>
          </div>
        </div>

        {/* Class Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Class Information</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-500">Class Name</p>
              <p className="text-sm text-gray-900">{classInfo.name}</p>
            </div>
            {classInfo.code && (
              <div>
                <p className="text-sm font-medium text-gray-500">Class Code</p>
                <p className="text-sm text-gray-900">{classInfo.code}</p>
              </div>
            )}
            {classInfo.level && (
              <div>
                <p className="text-sm font-medium text-gray-500">Level</p>
                <p className="text-sm text-gray-900">{classInfo.level}</p>
              </div>
            )}
            {classInfo.teacherName && (
              <div>
                <p className="text-sm font-medium text-gray-500">Teacher</p>
                <p className="text-sm text-gray-900">{classInfo.teacherName}</p>
              </div>
            )}
            <Link
              href={`/admin/classes/${classInfo.id}`}
              className="text-sm text-blue-600 hover:text-blue-900"
            >
              View Class Details →
            </Link>
          </div>
        </div>

        {/* Enrollment Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Enrollment Details</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-500">Enrollment Date</p>
              <p className="text-sm text-gray-900">
                {new Date(enrollment.enrollmentDate).toLocaleDateString()}
              </p>
            </div>
            {enrollment.expectedEndDate && (
              <div>
                <p className="text-sm font-medium text-gray-500">Expected End Date</p>
                <p className="text-sm text-gray-900">
                  {new Date(enrollment.expectedEndDate).toLocaleDateString()}
                </p>
              </div>
            )}
            {enrollment.attendanceRate && (
              <div>
                <p className="text-sm font-medium text-gray-500">Attendance Rate</p>
                <p className="text-sm text-gray-900">
                  {parseFloat(enrollment.attendanceRate).toFixed(1)}%
                </p>
              </div>
            )}
            {enrollment.currentGrade && (
              <div>
                <p className="text-sm font-medium text-gray-500">Current Grade</p>
                <p className="text-sm text-gray-900">{enrollment.currentGrade}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Amendment History Section */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Amendment History</h2>
          {amendments.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No amendments recorded</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {amendments.map(amendment => (
                    <tr key={amendment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(amendment.amendmentDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getAmendmentTypeBadge(amendment.amendmentType)}`}
                        >
                          {amendment.amendmentType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {getAmendmentDetails(amendment)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{amendment.reason || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {amendment.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Actions</h2>
        <div className="flex flex-wrap gap-3">
          {/* Primary Actions */}
          {enrollment.status === 'active' && (
            <>
              <Link
                href={`/admin/enrolments/${enrollment.id}/amend?tab=extension`}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Extend Enrollment
              </Link>
              <Link
                href={`/admin/enrolments/${enrollment.id}/amend?tab=reduction`}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Reduce Enrollment
              </Link>
              <Link
                href={`/admin/enrolments/${enrollment.id}/amend?tab=level`}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Change Level
              </Link>

              {/* Secondary Actions */}
              <Link
                href={`/admin/enrolments/${enrollment.id}/transfer`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Transfer to Another Class
              </Link>

              {/* Danger Actions */}
              <button
                onClick={() => handleStatusUpdate('completed')}
                disabled={isUpdatingStatus}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                Mark as Completed
              </button>
              <button
                onClick={() => handleStatusUpdate('dropped')}
                disabled={isUpdatingStatus}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                Mark as Dropped
              </button>
            </>
          )}

          {enrollment.status !== 'active' && (
            <p className="text-sm text-gray-500">
              This enrollment is {enrollment.status}. No further actions available.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

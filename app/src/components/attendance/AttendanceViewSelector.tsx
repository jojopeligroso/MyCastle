/**
 * Attendance View Selector
 * Allows admins to choose between Teacher View and Admin View
 * Teachers go directly to Teacher View
 */

'use client';

import { useState } from 'react';
import { TeacherAttendanceView } from './TeacherAttendanceView';
import { AdminAttendanceView } from './AdminAttendanceView';

interface AttendanceViewSelectorProps {
  userId: string;
  userRole: string;
  isAdmin: boolean;
}

type ViewMode = 'select' | 'teacher' | 'admin';

export function AttendanceViewSelector({ userId, userRole, isAdmin }: AttendanceViewSelectorProps) {
  // Teachers go directly to teacher view, admins get to choose
  const [viewMode, setViewMode] = useState<ViewMode>(isAdmin ? 'select' : 'teacher');

  if (viewMode === 'select') {
    return (
      <div className="space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Attendance</h1>
          <p className="mt-2 text-sm text-gray-600">Choose how you want to view attendance</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Teacher View Card */}
          <button
            onClick={() => setViewMode('teacher')}
            className="bg-white rounded-lg shadow-md border-2 border-transparent hover:border-blue-500 p-6 text-left transition-all hover:shadow-lg group"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Teacher View</h2>
                <span className="text-sm text-blue-600 font-medium">Quick daily attendance</span>
              </div>
            </div>
            <p className="text-gray-600 mb-4">
              Mark attendance for today&apos;s class sessions. Simple interface focused on the
              current day with morning and afternoon sessions.
            </p>
            <ul className="text-sm text-gray-500 space-y-1">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Current date only
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Your assigned classes
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Keyboard shortcuts (P/A/L/E)
              </li>
            </ul>
          </button>

          {/* Admin View Card */}
          <button
            onClick={() => setViewMode('admin')}
            className="bg-white rounded-lg shadow-md border-2 border-transparent hover:border-purple-500 p-6 text-left transition-all hover:shadow-lg group"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                <svg
                  className="w-8 h-8 text-purple-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Admin View</h2>
                <span className="text-sm text-purple-600 font-medium">Comprehensive overview</span>
              </div>
            </div>
            <p className="text-gray-600 mb-4">
              View attendance across the school with flexible date ranges. Filter by student, class,
              or view school-wide statistics.
            </p>
            <ul className="text-sm text-gray-500 space-y-1">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Custom date range
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Single student or school-wide
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Attendance statistics & reports
              </li>
            </ul>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with back button for admins */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {viewMode === 'teacher' ? 'Daily Attendance' : 'Attendance Overview'}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {viewMode === 'teacher'
              ? "Mark attendance for today's sessions"
              : 'View and analyze attendance records'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setViewMode('select')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Switch View
          </button>
        )}
      </div>

      {/* Render appropriate view */}
      {viewMode === 'teacher' ? <TeacherAttendanceView userId={userId} /> : <AdminAttendanceView />}
    </div>
  );
}

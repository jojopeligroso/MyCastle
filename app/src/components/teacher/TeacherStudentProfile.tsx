'use client';

/**
 * TeacherStudentProfile Component
 * Teacher-specific view of a student's profile
 *
 * Features:
 * - View only students enrolled in teacher's classes
 * - No access to sensitive PII (contact, visa, address)
 * - Can view competency progress and skill gaps
 * - Can add notes (general, academic, behavioral)
 * - Cannot see audit trail
 *
 * Ref: STUDENT_PROFILE_ROADMAP.md Task #4
 */

import React, { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';

// Import shared tab components (use teacher API endpoints)
import { CompetencyProgressTab } from '@/components/admin/students/tabs/CompetencyProgressTab';
import { EnhancedNotesTab } from '@/components/admin/students/tabs/EnhancedNotesTab';
import { AttendanceSummaryTab } from '@/components/admin/students/tabs/AttendanceSummaryTab';
import { LevelHistoryTab } from '@/components/admin/students/tabs/LevelHistoryTab';

interface SharedClass {
  id: string;
  name: string;
  code: string | null;
  level: string | null;
}

interface Enrollment {
  id: string;
  classId: string;
  className: string;
  classCode: string | null;
  classLevel: string | null;
  enrollmentDate: string;
  expectedEndDate: string | null;
  status: string;
  attendanceRate: string | null;
  currentGrade: string | null;
}

interface StudentData {
  student: {
    id: string;
    name: string | null;
    email: string;
    currentLevel: string | null;
    initialLevel: string | null;
    levelStatus: string | null;
    avatarUrl: string | null;
    status: string | null;
    createdAt: string;
    isTeacherView: boolean;
  };
  sharedClasses: SharedClass[];
  enrollments: Enrollment[];
  attendance: {
    summary: {
      present: number;
      absent: number;
      late: number;
      excused: number;
    };
    rate: number | null;
    total: number;
  };
}

interface TeacherStudentProfileProps {
  studentId: string;
  teacherId: string;
}

type TabId = 'overview' | 'progress' | 'notes' | 'attendance' | 'level-history';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function TeacherStudentProfile({ studentId, teacherId }: TeacherStudentProfileProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Fetch student data from teacher API
  const { data, isLoading, error } = useSWR<StudentData>(
    `/api/teacher/students/${studentId}`,
    fetcher
  );

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
    },
    {
      id: 'progress',
      label: 'Competency Progress',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
    {
      id: 'notes',
      label: 'Notes',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
    {
      id: 'attendance',
      label: 'Attendance',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      ),
    },
    {
      id: 'level-history',
      label: 'Level History',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !data?.student) {
    return (
      <div className="bg-red-50 text-red-800 p-4 rounded-lg">
        <h3 className="font-medium">Error loading student profile</h3>
        <p className="text-sm mt-1">
          {error?.message || 'Unable to load student data. Please try again.'}
        </p>
      </div>
    );
  }

  const { student, sharedClasses, enrollments, attendance } = data;

  const getLevelBadgeColor = (level: string | null): string => {
    if (!level) return 'bg-gray-100 text-gray-800';
    if (level.startsWith('C')) return 'bg-purple-100 text-purple-800';
    if (level.startsWith('B2')) return 'bg-blue-100 text-blue-800';
    if (level.startsWith('B1')) return 'bg-green-100 text-green-800';
    if (level.startsWith('A2')) return 'bg-yellow-100 text-yellow-800';
    if (level.startsWith('A1')) return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-semibold">
              {student.name
                ?.split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase() || '?'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{student.name || 'Unknown'}</h1>
              <p className="text-sm text-gray-500">{student.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelBadgeColor(student.currentLevel)}`}
                >
                  {student.currentLevel || 'No level'}
                </span>
                {student.status && (
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      student.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {student.status}
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* Back link */}
          <Link
            href="/teacher/students"
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Students
          </Link>
        </div>

        {/* Shared Classes */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Your Classes with this Student</h3>
          <div className="flex flex-wrap gap-2">
            {sharedClasses.map(cls => (
              <Link
                key={cls.id}
                href={`/teacher/classes/${cls.id}`}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
              >
                {cls.name}
                {cls.level && <span className="ml-1 text-blue-500">({cls.level})</span>}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px overflow-x-auto" aria-label="Tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <OverviewTab student={student} enrollments={enrollments} attendance={attendance} />
          )}

          {activeTab === 'progress' && (
            <CompetencyProgressTab
              studentId={studentId}
              currentLevel={student.currentLevel}
              isTeacher={true}
              isAdmin={false}
            />
          )}

          {activeTab === 'notes' && (
            <EnhancedNotesTab
              studentId={studentId}
              currentUserId={teacherId}
              currentUserRole="teacher"
              canViewSensitiveNotes={false}
              canAddNotes={true}
              canShareNotes={true}
            />
          )}

          {activeTab === 'attendance' && <AttendanceSummaryTab studentId={studentId} />}

          {activeTab === 'level-history' && (
            <LevelHistoryTab
              studentId={studentId}
              currentLevel={student.currentLevel}
              initialLevel={student.initialLevel}
              levelStatus={
                student.levelStatus as 'confirmed' | 'provisional' | 'pending_approval' | null
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Overview Tab Component
interface OverviewTabProps {
  student: StudentData['student'];
  enrollments: Enrollment[];
  attendance: StudentData['attendance'];
}

function OverviewTab({ student, enrollments, attendance }: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Attendance Summary */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">Attendance Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Total Sessions</p>
            <p className="text-2xl font-semibold text-gray-900">{attendance.total}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-green-600">Present</p>
            <p className="text-2xl font-semibold text-green-700">{attendance.summary.present}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-sm text-red-600">Absent</p>
            <p className="text-2xl font-semibold text-red-700">{attendance.summary.absent}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <p className="text-sm text-yellow-600">Late</p>
            <p className="text-2xl font-semibold text-yellow-700">{attendance.summary.late}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-600">Attendance Rate</p>
            <p className="text-2xl font-semibold text-blue-700">
              {attendance.rate !== null ? `${attendance.rate}%` : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Enrollments */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">Current Enrollments</h3>
        {enrollments.length === 0 ? (
          <p className="text-sm text-gray-500">No active enrollments in your classes.</p>
        ) : (
          <div className="bg-gray-50 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Class
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Level
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Enrolled
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {enrollments.map(enrollment => (
                  <tr key={enrollment.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {enrollment.className}
                      {enrollment.classCode && (
                        <span className="ml-2 text-gray-500">({enrollment.classCode})</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {enrollment.classLevel || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(enrollment.enrollmentDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          enrollment.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {enrollment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Info */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">Student Information</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-gray-500">Current Level</dt>
              <dd className="text-sm font-medium text-gray-900">
                {student.currentLevel || 'Not set'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Initial Level</dt>
              <dd className="text-sm font-medium text-gray-900">
                {student.initialLevel || 'Not set'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Level Status</dt>
              <dd className="text-sm font-medium text-gray-900">{student.levelStatus || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Member Since</dt>
              <dd className="text-sm font-medium text-gray-900">
                {new Date(student.createdAt).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Note about restricted access */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-blue-600 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-blue-800">Teacher View</h4>
            <p className="text-sm text-blue-700 mt-1">
              You are viewing a limited profile. Contact details, visa information, and
              administrative data are only available to office staff.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeacherStudentProfile;

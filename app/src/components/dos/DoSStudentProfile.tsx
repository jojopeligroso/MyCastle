'use client';

/**
 * DoSStudentProfile Component
 * Director of Studies view of a student's profile
 *
 * Features:
 * - Full access to all students org-wide
 * - Promotion-focused overview with approval actions
 * - Can view competency progress and assessment evidence
 * - Can add/view all notes
 * - Can approve/reject promotions
 *
 * Ref: STUDENT_PROFILE_ROADMAP.md Task #6
 */

import React, { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Import shared tab components
import { CompetencyProgressTab } from '@/components/admin/students/tabs/CompetencyProgressTab';
import { EnhancedNotesTab } from '@/components/admin/students/tabs/EnhancedNotesTab';
import { AttendanceSummaryTab } from '@/components/admin/students/tabs/AttendanceSummaryTab';
import { LevelHistoryTab } from '@/components/admin/students/tabs/LevelHistoryTab';
import { AssessmentsTab } from '@/components/admin/students/tabs/AssessmentsTab';

interface PromotionRecord {
  id: string;
  fromLevel: string;
  toLevel: string;
  status: string;
  recommendedAt: string;
  recommendationReason: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  appliedAt: string | null;
}

interface StudentData {
  student: {
    id: string;
    userId: string;
    name: string | null;
    email: string | null;
    currentLevel: string | null;
    initialLevel: string | null;
    levelStatus: string | null;
    avatarUrl: string | null;
    status: string;
    createdAt: string;
    studentNumber: string | null;
  };
  currentEnrollment: {
    id: string;
    classId: string;
    className: string;
    classLevel: string | null;
    enrollmentDate: string;
    status: string;
  } | null;
  promotionStatus: {
    hasPending: boolean;
    pending: PromotionRecord | null;
    history: PromotionRecord[];
    meetsThreshold: boolean;
    strongCandidate: boolean;
  };
  assessmentSummary: {
    competencyRate: number;
    competencyTotal: number;
    competencyAchieved: number;
    summativeAvg: number | null;
    summativeCount: number;
  };
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
  isDoSView: boolean;
}

interface DoSStudentProfileProps {
  studentId: string;
  dosUserId: string;
}

type TabId = 'overview' | 'progress' | 'assessments' | 'notes' | 'attendance' | 'level-history';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function DoSStudentProfile({ studentId, dosUserId }: DoSStudentProfileProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch student data from DoS API
  const {
    data,
    isLoading,
    error: fetchError,
    mutate,
  } = useSWR<StudentData>(`/api/dos/students/${studentId}`, fetcher);

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
      id: 'assessments',
      label: 'Assessments',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
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

  const handleReview = async (action: 'approve' | 'reject') => {
    if (!data?.promotionStatus.pending) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/promotions/${data.promotionStatus.pending.id}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          notes: reviewNotes,
        }),
      });

      if (!res.ok) {
        const resData = await res.json();
        throw new Error(resData.error || `Failed to ${action} promotion`);
      }

      // Refresh data
      mutate();
      setIsReviewing(false);
      setReviewNotes('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (fetchError || !data?.student) {
    return (
      <div className="bg-red-50 text-red-800 p-4 rounded-lg">
        <h3 className="font-medium">Error loading student profile</h3>
        <p className="text-sm mt-1">
          {fetchError?.message || 'Unable to load student data. Please try again.'}
        </p>
      </div>
    );
  }

  const { student, currentEnrollment, promotionStatus, assessmentSummary, attendance } = data;

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
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-2xl font-semibold">
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
                {promotionStatus.hasPending && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    Pending Promotion
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* Back link */}
          <Link
            href="/dos/students"
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

        {/* Current Class */}
        {currentEnrollment && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Current Class</h3>
            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-50 text-purple-700">
              {currentEnrollment.className}
              {currentEnrollment.classLevel && (
                <span className="ml-1 text-purple-500">({currentEnrollment.classLevel})</span>
              )}
            </div>
          </div>
        )}

        {/* Pending Promotion Alert */}
        {promotionStatus.pending && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-amber-800">
                  Pending Level Promotion Request
                </h3>
                <p className="text-sm text-amber-700 mt-1">
                  {promotionStatus.pending.fromLevel} → {promotionStatus.pending.toLevel}
                </p>
                {promotionStatus.pending.recommendationReason && (
                  <p className="text-sm text-amber-600 mt-2">
                    <span className="font-medium">Reason:</span>{' '}
                    {promotionStatus.pending.recommendationReason}
                  </p>
                )}
                <p className="text-xs text-amber-500 mt-2">
                  Requested on{' '}
                  {new Date(promotionStatus.pending.recommendedAt).toLocaleDateString('en-GB')}
                </p>
              </div>
              {!isReviewing ? (
                <button
                  onClick={() => setIsReviewing(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700"
                >
                  Review Now
                </button>
              ) : (
                <div className="space-y-3">
                  <textarea
                    value={reviewNotes}
                    onChange={e => setReviewNotes(e.target.value)}
                    placeholder="Add review notes (optional)..."
                    rows={2}
                    className="w-64 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReview('approve')}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      {isSubmitting ? '...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleReview('reject')}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => {
                        setIsReviewing(false);
                        setReviewNotes('');
                        setError(null);
                      }}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
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
                    ? 'border-purple-500 text-purple-600'
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
            <DoSOverviewTab
              student={student}
              currentEnrollment={currentEnrollment}
              promotionStatus={promotionStatus}
              assessmentSummary={assessmentSummary}
              attendance={attendance}
            />
          )}

          {activeTab === 'progress' && (
            <CompetencyProgressTab
              studentId={studentId}
              studentName={student.name || 'Student'}
              currentLevel={student.currentLevel}
              isTeacher={false}
              isAdmin={true}
            />
          )}

          {activeTab === 'assessments' && (
            <AssessmentsTab studentId={studentId} studentName={student.name || undefined} />
          )}

          {activeTab === 'notes' && (
            <EnhancedNotesTab
              studentId={studentId}
              currentUserId={dosUserId}
              currentUserRole="dos"
              canViewSensitiveNotes={true}
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

// DoS Overview Tab Component
interface DoSOverviewTabProps {
  student: StudentData['student'];
  currentEnrollment: StudentData['currentEnrollment'];
  promotionStatus: StudentData['promotionStatus'];
  assessmentSummary: StudentData['assessmentSummary'];
  attendance: StudentData['attendance'];
}

function DoSOverviewTab({
  student,
  currentEnrollment,
  promotionStatus,
  assessmentSummary,
  attendance,
}: DoSOverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Assessment Evidence Summary */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">Assessment Evidence</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm text-purple-600">Summative Average</p>
            <p className="text-2xl font-semibold text-purple-700">
              {assessmentSummary.summativeAvg !== null
                ? `${assessmentSummary.summativeAvg.toFixed(1)}%`
                : 'N/A'}
            </p>
            <p className="text-xs text-purple-500 mt-1">
              {assessmentSummary.summativeCount} assessments (90 days)
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-600">Competency Progress</p>
            <p className="text-2xl font-semibold text-blue-700">
              {assessmentSummary.competencyRate}%
            </p>
            <p className="text-xs text-blue-500 mt-1">
              {assessmentSummary.competencyAchieved} / {assessmentSummary.competencyTotal} achieved
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-green-600">Attendance Rate</p>
            <p className="text-2xl font-semibold text-green-700">
              {attendance.rate !== null ? `${attendance.rate}%` : 'N/A'}
            </p>
            <p className="text-xs text-green-500 mt-1">{attendance.total} sessions</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Promotion Readiness</p>
            {promotionStatus.strongCandidate ? (
              <div className="flex items-center text-green-700 mt-1">
                <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-semibold">Strong Candidate</span>
              </div>
            ) : promotionStatus.meetsThreshold ? (
              <p className="text-lg font-semibold text-blue-700 mt-1">Meets Threshold</p>
            ) : (
              <p className="text-lg font-semibold text-amber-700 mt-1">Below Threshold</p>
            )}
          </div>
        </div>
      </div>

      {/* Attendance Summary */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">Attendance Breakdown</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-semibold text-green-700">{attendance.summary.present}</p>
            <p className="text-sm text-green-600">Present</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-semibold text-red-700">{attendance.summary.absent}</p>
            <p className="text-sm text-red-600">Absent</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-semibold text-yellow-700">{attendance.summary.late}</p>
            <p className="text-sm text-yellow-600">Late</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-semibold text-blue-700">{attendance.summary.excused}</p>
            <p className="text-sm text-blue-600">Excused</p>
          </div>
        </div>
      </div>

      {/* Promotion History */}
      {promotionStatus.history.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Promotion History</h3>
          <div className="bg-gray-50 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Level Change
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Requested
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Reviewed
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {promotionStatus.history.map(promotion => (
                  <tr key={promotion.id}>
                    <td className="px-4 py-3 text-sm">
                      <span className="font-medium">{promotion.fromLevel}</span>
                      <span className="mx-2 text-gray-400">→</span>
                      <span className="font-medium">{promotion.toLevel}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          promotion.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : promotion.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {promotion.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(promotion.recommendedAt).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {promotion.reviewedAt
                        ? new Date(promotion.reviewedAt).toLocaleDateString('en-GB')
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Student Info */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">Student Information</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <dt className="text-sm text-gray-500">Student Number</dt>
              <dd className="text-sm font-medium text-gray-900">
                {student.studentNumber || 'N/A'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Current Class</dt>
              <dd className="text-sm font-medium text-gray-900">
                {currentEnrollment?.className || 'Not enrolled'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Member Since</dt>
              <dd className="text-sm font-medium text-gray-900">
                {new Date(student.createdAt).toLocaleDateString('en-GB')}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

export default DoSStudentProfile;

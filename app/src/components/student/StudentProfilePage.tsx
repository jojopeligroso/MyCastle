'use client';

/**
 * StudentProfilePage Component
 * Student's own profile view with limited access to shared data
 *
 * Features:
 * - View own profile information
 * - Edit contact with verification
 * - See shared assessments and notes
 * - View diagnostic and level history
 *
 * Ref: STUDENT_PROFILE_ROADMAP.md Task #5
 */

import React, { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { ContactChangeForm } from './ContactChangeForm';
import { PendingVerificationBadge } from './PendingVerificationBadge';

interface ProfileData {
  profile: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    avatarUrl: string | null;
    studentNumber: string | null;
    currentLevel: string | null;
    initialLevel: string | null;
    levelStatus: string | null;
    memberSince: string;
  };
  currentClass: {
    id: string;
    classId: string;
    className: string;
    classLevel: string | null;
    enrollmentDate: string;
    status: string;
  } | null;
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
  progress: {
    competencyRate: number;
    total: number;
    achieved: number;
  };
  diagnosticHistory: Array<{
    id: string;
    date: string;
    status: string;
    recommendedLevel: string | null;
    placedLevel: string | null;
  }>;
  levelHistory: Array<{
    id: string;
    fromLevel: string;
    toLevel: string;
    date: string | null;
  }>;
}

interface Assessment {
  id: string;
  date: string;
  progress: string | null;
  demonstratedLevel: string | null;
  isComplete: boolean;
  notes: string | null;
  descriptor: {
    text: string;
    level: string;
    category: string;
    subcategory: string | null;
  };
}

interface Note {
  id: string;
  content: string;
  type: string;
  sharedAt: string;
  author: string;
}

type TabId = 'overview' | 'progress' | 'assessments' | 'notes' | 'history' | 'tutor';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function StudentProfilePage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [editingContact, setEditingContact] = useState<'email' | 'phone' | null>(null);

  const {
    data: profileData,
    isLoading: profileLoading,
    mutate: mutateProfile,
  } = useSWR<ProfileData>('/api/student/profile', fetcher);

  const { data: assessmentsData, isLoading: assessmentsLoading } = useSWR<{
    assessments: Assessment[];
  }>(activeTab === 'assessments' ? '/api/student/assessments' : null, fetcher);

  const { data: notesData, isLoading: notesLoading } = useSWR<{ notes: Note[] }>(
    activeTab === 'notes' ? '/api/student/notes' : null,
    fetcher
  );

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
      label: 'Progress',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
      id: 'history',
      label: 'History',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      ),
    },
    {
      id: 'tutor',
      label: 'AI Tutor',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      ),
    },
  ];

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!profileData?.profile) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Unable to load your profile. Please try again.</p>
      </div>
    );
  }

  const { profile, currentClass, attendance, progress, diagnosticHistory, levelHistory } =
    profileData;

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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          {/* Avatar */}
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-3xl font-semibold flex-shrink-0">
            {profile.name
              ?.split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase() || '?'}
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold text-gray-900">{profile.name || 'Student'}</h1>
            <p className="text-gray-500">{profile.email}</p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getLevelBadgeColor(profile.currentLevel)}`}
              >
                {profile.currentLevel || 'No level'}
              </span>
              {currentClass && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
                  {currentClass.className}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Pending Verifications */}
        <div className="mt-4">
          <PendingVerificationBadge />
        </div>
      </div>

      {/* Tab Navigation - Mobile Scrollable */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="flex min-w-max" aria-label="Tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[80px] flex flex-col items-center gap-1 px-4 py-3 text-sm font-medium border-b-2 ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600 bg-purple-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.icon}
                <span className="text-xs">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6">
          {activeTab === 'overview' && (
            <OverviewTab
              profile={profile}
              currentClass={currentClass}
              attendance={attendance}
              progress={progress}
              editingContact={editingContact}
              setEditingContact={setEditingContact}
              onContactUpdated={() => {
                setEditingContact(null);
                mutateProfile();
              }}
            />
          )}

          {activeTab === 'progress' && <ProgressTab progress={progress} attendance={attendance} />}

          {activeTab === 'assessments' && (
            <AssessmentsTab
              assessments={assessmentsData?.assessments || []}
              isLoading={assessmentsLoading}
            />
          )}

          {activeTab === 'notes' && (
            <NotesTab notes={notesData?.notes || []} isLoading={notesLoading} />
          )}

          {activeTab === 'history' && (
            <HistoryTab
              diagnosticHistory={diagnosticHistory}
              levelHistory={levelHistory}
              initialLevel={profile.initialLevel}
              currentLevel={profile.currentLevel}
            />
          )}

          {activeTab === 'tutor' && <TutorTab />}
        </div>
      </div>
    </div>
  );
}

// Overview Tab
function OverviewTab({
  profile,
  currentClass,
  attendance,
  progress,
  editingContact,
  setEditingContact,
  onContactUpdated,
}: {
  profile: ProfileData['profile'];
  currentClass: ProfileData['currentClass'];
  attendance: ProfileData['attendance'];
  progress: ProfileData['progress'];
  editingContact: 'email' | 'phone' | null;
  setEditingContact: (type: 'email' | 'phone' | null) => void;
  onContactUpdated: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-purple-700">{profile.currentLevel || '-'}</p>
          <p className="text-xs text-purple-600">Current Level</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-700">
            {attendance.rate !== null ? `${attendance.rate}%` : '-'}
          </p>
          <p className="text-xs text-green-600">Attendance</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-blue-700">{progress.competencyRate}%</p>
          <p className="text-xs text-blue-600">Progress</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-gray-700">{attendance.total}</p>
          <p className="text-xs text-gray-600">Sessions</p>
        </div>
      </div>

      {/* Contact Information */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">Contact Information</h3>

        {editingContact ? (
          <ContactChangeForm
            contactType={editingContact}
            currentValue={
              editingContact === 'email' ? profile.email || undefined : profile.phone || undefined
            }
            onSuccess={onContactUpdated}
            onCancel={() => setEditingContact(null)}
          />
        ) : (
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{profile.email || 'Not set'}</p>
              </div>
              <button
                onClick={() => setEditingContact('email')}
                className="text-sm text-purple-600 hover:text-purple-700"
              >
                Change
              </button>
            </div>
            <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium text-gray-900">{profile.phone || 'Not set'}</p>
              </div>
              <button
                onClick={() => setEditingContact('phone')}
                className="text-sm text-purple-600 hover:text-purple-700"
              >
                Change
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Current Class */}
      {currentClass && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Current Class</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="font-medium text-gray-900">{currentClass.className}</p>
            {currentClass.classLevel && (
              <p className="text-sm text-gray-500">Level: {currentClass.classLevel}</p>
            )}
            <p className="text-sm text-gray-500">
              Enrolled: {new Date(currentClass.enrollmentDate).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}

      {/* Account Info */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">Account</h3>
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          {profile.studentNumber && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Student Number</span>
              <span className="font-medium">{profile.studentNumber}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Member Since</span>
            <span className="font-medium">
              {new Date(profile.memberSince).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Progress Tab
function ProgressTab({
  progress,
  attendance,
}: {
  progress: ProfileData['progress'];
  attendance: ProfileData['attendance'];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">Competency Progress</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Overall Progress</span>
            <span className="text-sm font-medium">{progress.competencyRate}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-purple-600 h-3 rounded-full transition-all"
              style={{ width: `${progress.competencyRate}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {progress.achieved} of {progress.total} competencies achieved
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">Attendance</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-green-700">{attendance.summary.present}</p>
            <p className="text-xs text-green-600">Present</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-red-700">{attendance.summary.absent}</p>
            <p className="text-xs text-red-600">Absent</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-yellow-700">{attendance.summary.late}</p>
            <p className="text-xs text-yellow-600">Late</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-blue-700">{attendance.summary.excused}</p>
            <p className="text-xs text-blue-600">Excused</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Assessments Tab
function AssessmentsTab({
  assessments,
  isLoading,
}: {
  assessments: Assessment[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (assessments.length === 0) {
    return (
      <div className="text-center py-8">
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
            d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <p className="mt-2 text-sm text-gray-500">No shared assessments yet</p>
        <p className="text-xs text-gray-400">Your teacher will share assessments with you</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {assessments.map(assessment => (
        <div key={assessment.id} className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{assessment.descriptor.text}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500">{assessment.descriptor.category}</span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-500">{assessment.descriptor.level}</span>
              </div>
            </div>
            <div className="text-right">
              <span
                className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
                  assessment.isComplete
                    ? 'bg-green-100 text-green-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {assessment.progress || (assessment.isComplete ? 'Achieved' : 'In Progress')}
              </span>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(assessment.date).toLocaleDateString()}
              </p>
            </div>
          </div>
          {assessment.notes && (
            <p className="mt-2 text-sm text-gray-600 bg-white rounded p-2">{assessment.notes}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// Notes Tab
function NotesTab({ notes, isLoading }: { notes: Note[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="text-center py-8">
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
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="mt-2 text-sm text-gray-500">No shared notes yet</p>
        <p className="text-xs text-gray-400">Your teacher will share notes with you</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notes.map(note => (
        <div key={note.id} className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-900">{note.content}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">From: {note.author}</span>
            <span className="text-xs text-gray-400">
              {new Date(note.sharedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// History Tab
function HistoryTab({
  diagnosticHistory,
  levelHistory,
  initialLevel,
  currentLevel,
}: {
  diagnosticHistory: ProfileData['diagnosticHistory'];
  levelHistory: ProfileData['levelHistory'];
  initialLevel: string | null;
  currentLevel: string | null;
}) {
  return (
    <div className="space-y-6">
      {/* Level Journey */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">Level Journey</h3>
        <div className="relative">
          <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-200"></div>
          <div className="space-y-4">
            {/* Current Level */}
            <div className="relative flex items-start pl-10">
              <div className="absolute left-2 w-4 h-4 rounded-full bg-purple-600"></div>
              <div className="bg-purple-50 rounded-lg p-3 flex-1">
                <p className="text-sm font-medium text-purple-800">
                  Current: {currentLevel || 'N/A'}
                </p>
                <p className="text-xs text-purple-600">Now</p>
              </div>
            </div>

            {/* Level Changes */}
            {levelHistory.map(change => (
              <div key={change.id} className="relative flex items-start pl-10">
                <div className="absolute left-2 w-4 h-4 rounded-full bg-green-500"></div>
                <div className="bg-green-50 rounded-lg p-3 flex-1">
                  <p className="text-sm font-medium text-green-800">
                    Promoted: {change.fromLevel} → {change.toLevel}
                  </p>
                  <p className="text-xs text-green-600">
                    {change.date ? new Date(change.date).toLocaleDateString() : 'Date unknown'}
                  </p>
                </div>
              </div>
            ))}

            {/* Initial Level */}
            <div className="relative flex items-start pl-10">
              <div className="absolute left-2 w-4 h-4 rounded-full bg-gray-400"></div>
              <div className="bg-gray-50 rounded-lg p-3 flex-1">
                <p className="text-sm font-medium text-gray-800">
                  Initial: {initialLevel || 'N/A'}
                </p>
                <p className="text-xs text-gray-600">Start</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Diagnostic History */}
      {diagnosticHistory.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Diagnostic Tests</h3>
          <div className="space-y-3">
            {diagnosticHistory.map(test => (
              <div key={test.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {test.status === 'completed' ? 'Completed' : 'In Progress'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(test.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    {test.recommendedLevel && (
                      <p className="text-sm text-gray-600">
                        Recommended: <span className="font-medium">{test.recommendedLevel}</span>
                      </p>
                    )}
                    {test.placedLevel && (
                      <p className="text-sm text-gray-600">
                        Placed: <span className="font-medium">{test.placedLevel}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// AI Tutor Tab - Placeholder for future LLM integration
function TutorTab() {
  return (
    <div className="text-center py-12">
      {/* AI Tutor Icon */}
      <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-4">
        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      </div>

      <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Tutor Coming Soon</h3>

      <p className="text-gray-500 max-w-md mx-auto mb-6">
        Your personal AI language tutor is being developed. Soon you will be able to practice
        speaking, get instant feedback, and work on personalized exercises.
      </p>

      {/* Feature Preview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mt-8">
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-5 h-5 text-purple-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </div>
          <h4 className="font-medium text-purple-900 mb-1">Speaking Practice</h4>
          <p className="text-xs text-purple-600">Conversational AI partner</p>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-5 h-5 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <h4 className="font-medium text-blue-900 mb-1">Vocabulary Builder</h4>
          <p className="text-xs text-blue-600">Personalized word lists</p>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-5 h-5 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
          </div>
          <h4 className="font-medium text-green-900 mb-1">Smart Exercises</h4>
          <p className="text-xs text-green-600">Targeted skill practice</p>
        </div>
      </div>

      {/* Coming Soon Badge */}
      <div className="mt-8">
        <span className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 text-sm font-medium">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          In Development
        </span>
      </div>
    </div>
  );
}

export default StudentProfilePage;

'use client';

import React, { useState } from 'react';
import useSWR from 'swr';

interface AuditEntry {
  id: string;
  action: string;
  resourceType: string;
  changes: Record<string, { old: unknown; new: unknown }> | null;
  metadata: Record<string, unknown> | null;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
}

interface AuditTrailTabProps {
  studentId: string;
  studentUserId: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function AuditTrailTab({ studentId, studentUserId: _studentUserId }: AuditTrailTabProps) {
  const [filter, setFilter] = useState<string>('all');

  // Fetch audit entries
  const { data, isLoading, error } = useSWR<{ auditEntries: AuditEntry[] }>(
    studentId ? `/api/admin/students/${studentId}/audit?filter=${filter}` : null,
    fetcher
  );

  const auditEntries = data?.auditEntries || [];

  const getActionIcon = (action: string): React.ReactNode => {
    const icons: Record<string, React.ReactNode> = {
      user_created: (
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
          <svg
            className="w-4 h-4 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
            />
          </svg>
        </div>
      ),
      user_updated: (
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
          <svg
            className="w-4 h-4 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </div>
      ),
      level_changed: (
        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
          <svg
            className="w-4 h-4 text-purple-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
        </div>
      ),
      enrollment_created: (
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
          <svg
            className="w-4 h-4 text-indigo-600"
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
      ),
      attendance_recorded: (
        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
          <svg
            className="w-4 h-4 text-emerald-600"
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
      ),
      note_added: (
        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
          <svg
            className="w-4 h-4 text-amber-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
            />
          </svg>
        </div>
      ),
    };

    return (
      icons[action] || (
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
          <svg
            className="w-4 h-4 text-gray-600"
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
        </div>
      )
    );
  };

  const getActionLabel = (action: string): string => {
    const labels: Record<string, string> = {
      user_created: 'Profile Created',
      user_updated: 'Profile Updated',
      level_changed: 'Level Changed',
      enrollment_created: 'Enrolled in Class',
      enrollment_amended: 'Enrollment Amended',
      attendance_recorded: 'Attendance Recorded',
      note_added: 'Note Added',
      note_shared: 'Note Shared with Student',
      email_verified: 'Email Verified',
      phone_verified: 'Phone Verified',
      promotion_requested: 'Promotion Requested',
      promotion_approved: 'Promotion Approved',
      promotion_rejected: 'Promotion Rejected',
    };
    return labels[action] || action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatChanges = (changes: Record<string, { old: unknown; new: unknown }> | null) => {
    if (!changes || Object.keys(changes).length === 0) return null;

    return Object.entries(changes).map(([field, { old: oldVal, new: newVal }]) => (
      <div key={field} className="text-xs">
        <span className="text-gray-500">{field.replace(/_/g, ' ')}:</span>{' '}
        <span className="text-red-600 line-through">{String(oldVal ?? '(empty)')}</span>
        {' → '}
        <span className="text-green-600">{String(newVal ?? '(empty)')}</span>
      </div>
    ));
  };

  const filterOptions = [
    { value: 'all', label: 'All Activity' },
    { value: 'profile', label: 'Profile Changes' },
    { value: 'level', label: 'Level Changes' },
    { value: 'enrollment', label: 'Enrollments' },
    { value: 'attendance', label: 'Attendance' },
    { value: 'notes', label: 'Notes' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-lg p-4 text-center">
        <p className="text-sm text-red-600">Failed to load audit trail</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filter */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Complete Audit Trail</h3>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          {filterOptions.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Audit Timeline */}
      {auditEntries.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
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
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-600">No audit history available</p>
          <p className="mt-1 text-xs text-gray-500">
            All profile changes, level adjustments, and key events will be logged here
          </p>
        </div>
      ) : (
        <div className="flow-root">
          <ul className="-mb-8">
            {auditEntries.map((entry: AuditEntry, idx: number) => (
              <li key={entry.id}>
                <div className="relative pb-8">
                  {idx !== auditEntries.length - 1 && (
                    <span
                      className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                      aria-hidden="true"
                    />
                  )}
                  <div className="relative flex space-x-3">
                    {getActionIcon(entry.action)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {getActionLabel(entry.action)}
                        </p>
                        <time className="text-xs text-gray-500">
                          {new Date(entry.timestamp).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </time>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        By {entry.userName} ({entry.userRole})
                      </p>
                      {entry.changes && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                          {formatChanges(entry.changes)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Export Button */}
      {auditEntries.length > 0 && (
        <div className="pt-4 border-t border-gray-200">
          <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
            Export Audit Trail (CSV)
          </button>
        </div>
      )}
    </div>
  );
}

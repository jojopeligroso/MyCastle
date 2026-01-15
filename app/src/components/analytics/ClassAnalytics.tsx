/**
 * Class Analytics Component
 * Uses MCP view_class_analytics tool to display class performance metrics
 */

'use client';

import { useState, useEffect } from 'react';

interface ClassAnalytics {
  classId: string;
  className: string;
  enrollment: {
    totalStudents: number;
    capacity: number;
    averageAttendance: number;
  };
  assignments: {
    total: number;
    active: number;
  };
}

interface ClassAnalyticsProps {
  classId: string;
}

export function ClassAnalytics({ classId }: ClassAnalyticsProps) {
  const [analytics, setAnalytics] = useState<ClassAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/mcp/tools/view_class_analytics`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ classId }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch analytics');
        }

        const data = await response.json();

        if (data.success) {
          setAnalytics(data.data);
        } else {
          setError(data.error?.message || 'Unknown error');
        }
      } catch (err) {
        console.error('[ClassAnalytics] Fetch error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    if (classId) {
      fetchAnalytics();
    }
  }, [classId]);

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <div className="mt-2 text-sm text-gray-600">Loading analytics...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center gap-2 text-red-800">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium">Error: {error}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  const enrollmentPercentage =
    (analytics.enrollment.totalStudents / analytics.enrollment.capacity) * 100;
  const isNearCapacity = enrollmentPercentage > 80;

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Class Analytics</h2>
        <p className="text-sm text-gray-500 mt-1">{analytics.className}</p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Enrollment Card */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-blue-900">Enrollment</h3>
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <div className="text-3xl font-bold text-blue-900">
                {analytics.enrollment.totalStudents}
              </div>
              <div className="text-sm text-blue-700">
                / {analytics.enrollment.capacity} capacity
              </div>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
              <div
                className={`h-2 rounded-full ${isNearCapacity ? 'bg-orange-500' : 'bg-blue-600'}`}
                style={{ width: `${Math.min(enrollmentPercentage, 100)}%` }}
              />
            </div>
            <div className="text-xs text-blue-700">{enrollmentPercentage.toFixed(0)}% full</div>
            {isNearCapacity && (
              <div className="mt-2 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                Near capacity
              </div>
            )}
          </div>

          {/* Attendance Card */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-green-900">Average Attendance</h3>
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="text-3xl font-bold text-green-900 mb-2">
              {analytics.enrollment.averageAttendance?.toFixed(1) || 0}%
            </div>
            <div className="w-full bg-green-200 rounded-full h-2 mb-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{ width: `${analytics.enrollment.averageAttendance || 0}%` }}
              />
            </div>
            <div className="text-xs text-green-700">
              {analytics.enrollment.averageAttendance > 90
                ? 'Excellent'
                : analytics.enrollment.averageAttendance > 75
                  ? 'Good'
                  : 'Needs improvement'}
            </div>
          </div>

          {/* Assignments Card */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-purple-900">Assignments</h3>
              <svg
                className="w-8 h-8 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div className="flex items-baseline gap-3 mb-2">
              <div className="text-3xl font-bold text-purple-900">
                {analytics.assignments.total}
              </div>
              <div className="text-sm text-purple-700">total</div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <div className="flex-1">
                <div className="text-xs text-purple-700 mb-1">Active</div>
                <div className="text-lg font-semibold text-purple-900">
                  {analytics.assignments.active}
                </div>
              </div>
              <div className="flex-1">
                <div className="text-xs text-purple-700 mb-1">Completed</div>
                <div className="text-lg font-semibold text-purple-900">
                  {analytics.assignments.total - analytics.assignments.active}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-900">Quick Actions</h3>
              <svg
                className="w-8 h-8 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div className="space-y-2">
              <button className="w-full text-left px-3 py-2 text-sm bg-white rounded border border-gray-200 hover:bg-gray-50 transition-colors">
                📊 View Student Progress
              </button>
              <button className="w-full text-left px-3 py-2 text-sm bg-white rounded border border-gray-200 hover:bg-gray-50 transition-colors">
                ✏️ Create Assignment
              </button>
              <button className="w-full text-left px-3 py-2 text-sm bg-white rounded border border-gray-200 hover:bg-gray-50 transition-colors">
                📥 Export Attendance
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

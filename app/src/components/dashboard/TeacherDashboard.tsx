/**
 * Teacher Dashboard - Comprehensive Overview
 * Integrates MCP tools and resources for a complete teacher workflow
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DashboardStats {
  classes: number;
  sessionsToday: number;
  sessionsThisWeek: number;
  totalStudents: number;
  pendingAssignments: number;
}

interface UpcomingSession {
  id: string;
  className: string;
  startTime: string;
  endTime: string;
  room?: string;
  enrolledCount: number;
}

interface TeacherDashboardProps {
  teacherId: string;
  teacherName: string;
}

export function TeacherDashboard({ teacherId, teacherName }: TeacherDashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    classes: 0,
    sessionsToday: 0,
    sessionsThisWeek: 0,
    totalStudents: 0,
    pendingAssignments: 0,
  });
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch classes resource from MCP
        const classesResponse = await fetch('/api/mcp/resources?uri=mycastle://teacher/classes');

        if (!classesResponse.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const classesData = await classesResponse.json();

        if (classesData.success) {
          const classes = classesData.data.classes || [];

          // Fetch timetable for this week
          const today = new Date();
          const monday = new Date(today);
          monday.setDate(today.getDate() - today.getDay() + 1);
          const weekStart = monday.toISOString().split('T')[0];

          const timetableResponse = await fetch(`/api/timetable?weekStart=${weekStart}`);

          if (timetableResponse.ok) {
            const timetableData = await timetableResponse.json();
            const sessions = timetableData.data?.sessions || [];

            // Calculate stats
            const todayStr = today.toISOString().split('T')[0];
            const sessionsToday = sessions.filter(
              (s: any) => s.session.sessionDate === todayStr
            ).length;

            setStats({
              classes: classes.length,
              sessionsToday,
              sessionsThisWeek: sessions.length,
              totalStudents: classes.reduce((sum: number, c: any) => sum + (c.enrolledCount || 0), 0),
              pendingAssignments: 0, // TODO: fetch from assignments API
            });

            // Get upcoming sessions (today + next 3 days)
            const upcoming = sessions
              .filter((s: any) => new Date(s.session.sessionDate) >= new Date(todayStr))
              .slice(0, 5)
              .map((s: any) => ({
                id: s.session.id,
                className: s.class.name,
                startTime: `${s.session.sessionDate} ${s.session.startTime}`,
                endTime: s.session.endTime,
                enrolledCount: s.class.enrolledCount,
              }));

            setUpcomingSessions(upcoming);
          }
        } else {
          setError(classesData.error?.message || 'Unknown error');
        }
      } catch (err) {
        console.error('[TeacherDashboard] Fetch error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [teacherId]);

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <div className="mt-4 text-lg text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome back, {teacherName}!</h1>
        <p className="text-blue-100">Here's your teaching overview for today</p>
      </div>

      {/* Error Display */}
      {error && (
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
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Classes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.classes}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Today's Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{stats.sessionsToday}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">This Week</p>
              <p className="text-2xl font-bold text-gray-900">{stats.sessionsThisWeek}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingAssignments}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Sessions */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Sessions</h2>
          </div>
          <div className="p-6">
            {upcomingSessions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No upcoming sessions</p>
            ) : (
              <div className="space-y-3">
                {upcomingSessions.map(session => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{session.className}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(session.startTime).toLocaleString()} - {session.endTime}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{session.enrolledCount} students</p>
                      <Link
                        href={`/teacher/attendance?session=${session.id}`}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Mark Attendance →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6 space-y-3">
            <Link
              href="/teacher/timetable"
              className="block w-full text-left px-4 py-3 bg-blue-50 text-blue-900 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="font-medium">View Timetable</span>
              </div>
            </Link>

            <Link
              href="/teacher/attendance"
              className="block w-full text-left px-4 py-3 bg-green-50 text-green-900 rounded-lg hover:bg-green-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
                <span className="font-medium">Mark Attendance</span>
              </div>
            </Link>

            <Link
              href="/teacher/lesson-planner"
              className="block w-full text-left px-4 py-3 bg-purple-50 text-purple-900 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                <span className="font-medium">Create Lesson Plan</span>
              </div>
            </Link>

            <button
              className="block w-full text-left px-4 py-3 bg-orange-50 text-orange-900 rounded-lg hover:bg-orange-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span className="font-medium">Export Attendance</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

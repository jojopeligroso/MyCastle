/**
 * Dashboard Page
 * Protected route - requires authentication
 * Main landing page after login with feature cards
 */

import { requireAuth } from '@/lib/auth/utils';
import { redirect } from 'next/navigation';
import { Navigation } from '@/components/layout/Navigation';
import { FeatureCard } from '@/components/dashboard/FeatureCard';

export default async function DashboardPage() {
  const user = await requireAuth().catch(() => {
    redirect('/login');
  });

  const userRole = user.user_metadata?.role || 'student';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation
        userEmail={user.email}
        userRole={userRole}
        currentPath="/dashboard"
      />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {user.user_metadata?.name || user.email?.split('@')[0]}!
            </h1>
            <p className="text-gray-600">
              You&apos;re logged in as <span className="font-medium">{userRole}</span>
            </p>
          </div>

          {/* Feature Cards Grid */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Lesson Planner */}
              {(userRole === 'teacher' || userRole === 'admin') && (
                <FeatureCard
                  title="AI Lesson Planner"
                  description="Generate CEFR-aligned lesson plans with AI assistance in seconds"
                  href="/teacher/lesson-planner"
                  badge="AI Powered"
                  color="purple"
                  icon={
                    <svg
                      className="w-8 h-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                  }
                />
              )}

              {/* Timetable */}
              {userRole === 'teacher' && (
                <FeatureCard
                  title="My Timetable"
                  description="View your weekly schedule and upcoming classes"
                  href="/teacher/timetable"
                  color="blue"
                  icon={
                    <svg
                      className="w-8 h-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  }
                />
              )}

              {/* Attendance */}
              {(userRole === 'teacher' || userRole === 'admin') && (
                <FeatureCard
                  title="Attendance Register"
                  description="Mark attendance with keyboard shortcuts and hash-chain verification"
                  href="/teacher/attendance"
                  color="green"
                  icon={
                    <svg
                      className="w-8 h-8"
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
                  }
                />
              )}

              {/* Classes (for students) */}
              {userRole === 'student' && (
                <FeatureCard
                  title="My Classes"
                  description="View your enrolled classes and upcoming sessions"
                  href="/student/classes"
                  color="blue"
                  icon={
                    <svg
                      className="w-8 h-8"
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
                  }
                />
              )}

              {/* Admin Panel */}
              {userRole === 'admin' && (
                <FeatureCard
                  title="Admin Panel"
                  description="Manage users, classes, and system settings"
                  href="/admin"
                  color="orange"
                  badge="Admin Only"
                  icon={
                    <svg
                      className="w-8 h-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  }
                />
              )}
            </div>
          </div>

          {/* User Info Card */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Email:</dt>
                <dd className="text-sm font-medium text-gray-900">{user.email}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">User ID:</dt>
                <dd className="text-sm font-mono text-gray-900">{user.id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Role:</dt>
                <dd className="text-sm font-medium text-gray-900">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                    {userRole}
                  </span>
                </dd>
              </div>
              {user.user_metadata?.tenant_id && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Organization:</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {user.user_metadata.tenant_id}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </main>
    </div>
  );
}

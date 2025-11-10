/**
 * MyCastle Landing Page
 * Root entry point - redirects authenticated users to dashboard
 */

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/utils';
import Link from 'next/link';

export default async function Home() {
  const user = await getCurrentUser();

  // If user is authenticated, redirect to dashboard
  if (user) {
    redirect('/dashboard');
  }

  // Show landing page for anonymous users
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <main className="mx-auto max-w-4xl px-6 py-16 text-center">
        <div className="mb-8">
          <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Welcome to <span className="text-indigo-600">MyCastle</span>
          </h1>
          <p className="mt-6 text-xl leading-8 text-gray-600">
            Your comprehensive educational management platform for teachers, students, and administrators.
          </p>
        </div>

        <div className="mt-10 flex items-center justify-center gap-6">
          <Link
            href="/login"
            className="rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg bg-white px-6 py-3 text-base font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors"
          >
            View Dashboard
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="text-3xl mb-3">📚</div>
            <h3 className="text-lg font-semibold text-gray-900">Lesson Planning</h3>
            <p className="mt-2 text-sm text-gray-600">
              AI-powered CEFR-aligned lesson plans tailored to your curriculum
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="text-3xl mb-3">📅</div>
            <h3 className="text-lg font-semibold text-gray-900">Timetable Management</h3>
            <p className="mt-2 text-sm text-gray-600">
              Optimize your schedule and track class sessions effortlessly
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="text-3xl mb-3">✓</div>
            <h3 className="text-lg font-semibold text-gray-900">Attendance Tracking</h3>
            <p className="mt-2 text-sm text-gray-600">
              Secure blockchain-verified attendance with real-time insights
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

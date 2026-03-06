/**
 * Curriculum Settings Page
 * /admin/settings/curriculum
 *
 * Allows admins to configure curriculum settings including active textbooks
 */

import { requireAuth } from '@/lib/auth/utils';
import Link from 'next/link';
import { TextbookSelector } from '@/components/admin/settings/TextbookSelector';

export default async function CurriculumSettingsPage() {
  await requireAuth(['admin']);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/admin" className="hover:text-purple-600">
              Admin
            </Link>
            <span>/</span>
            <Link href="/admin/settings" className="hover:text-purple-600">
              Settings
            </Link>
            <span>/</span>
            <span className="text-gray-900">Curriculum</span>
          </nav>

          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 text-purple-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Curriculum Settings</h1>
              <p className="text-sm text-gray-500">
                Configure textbooks and learning objectives for your school
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Textbook Selection */}
        <TextbookSelector />

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <svg
              className="w-5 h-5 text-blue-600 shrink-0 mt-0.5"
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
              <h4 className="text-sm font-medium text-blue-900">How Textbook Selection Works</h4>
              <ul className="mt-2 text-sm text-blue-800 space-y-1">
                <li>
                  <strong>Active textbooks</strong> appear in the Learning Objectives selector when
                  teachers plan sessions
                </li>
                <li>
                  <strong>Deactivated textbooks</strong> are hidden from the selector but their data
                  is preserved
                </li>
                <li>Changes take effect immediately for all teachers in your school</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Related Links */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Related Settings</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/admin/curriculum/cefr"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">CEFR Browser</p>
                <p className="text-xs text-gray-500">View official CEFR descriptors</p>
              </div>
            </Link>

            <Link
              href="/admin/settings/assessment-types"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Assessment Types</p>
                <p className="text-xs text-gray-500">Manage summative assessment types</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

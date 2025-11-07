/**
 * Lesson Planner Page
 * Teacher-only route for AI-assisted lesson planning
 */

import { requireRole } from '@/lib/auth/utils';
import { redirect } from 'next/navigation';
import { LessonPlannerForm } from '@/components/lessons/LessonPlannerForm';

export default async function LessonPlannerPage() {
  await requireRole(['teacher', 'admin']).catch(() => {
    redirect('/login');
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">MyCastle - Lesson Planner</h1>
            </div>
            <div className="flex items-center">
              <a
                href="/dashboard"
                className="text-sm text-gray-700 hover:text-gray-900"
              >
                Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      </nav>

      <main className="py-8">
        <LessonPlannerForm />
      </main>
    </div>
  );
}

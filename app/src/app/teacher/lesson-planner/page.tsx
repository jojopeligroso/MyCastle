/**
 * Lesson Planner Page
 * Teacher-only route for AI-assisted lesson planning
 */

import { requireRole, requireAuth } from '@/lib/auth/utils';
import { redirect } from 'next/navigation';
import { LessonPlannerForm } from '@/components/lessons/LessonPlannerForm';
import { Navigation } from '@/components/layout/Navigation';

export default async function LessonPlannerPage() {
  await requireRole(['teacher', 'admin']).catch(() => {
    redirect('/login');
  });

  const user = await requireAuth();
  const userRole = user.user_metadata?.role || 'teacher';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation
        userEmail={user.email}
        userRole={userRole}
        currentPath="/teacher/lesson-planner"
      />

      <main className="py-8">
        <LessonPlannerForm />
      </main>
    </div>
  );
}

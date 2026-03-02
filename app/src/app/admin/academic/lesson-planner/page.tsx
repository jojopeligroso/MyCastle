/**
 * Lesson Planner Page
 * Admin route for creating and managing AI-assisted lesson plans
 * Uses Speakout textbook as RAG context with post-communicative methodology
 */

import LessonPlannerWizard from '@/components/lessons/LessonPlannerWizard';

export const metadata = {
  title: 'Lesson Planner | MyCastle',
  description: 'Create AI-assisted lesson plans aligned with Speakout and CEFR',
};

export default function LessonPlannerPage() {
  return <LessonPlannerWizard />;
}

/**
 * Teacher Student Detail Page
 * Shows teacher-specific view of a student profile
 */

import { requireAuth, getTenantId, getCurrentUser } from '@/lib/auth/utils';
import { notFound } from 'next/navigation';
import { canTeacherAccessStudent } from '@/lib/teachers';
import { TeacherStudentProfile } from '@/components/teacher';

export default async function TeacherStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth(['teacher']);
  const user = await getCurrentUser();
  const tenantId = await getTenantId();
  const { id: studentId } = await params;

  if (!user || !tenantId) {
    notFound();
  }

  // Verify teacher can access this student
  const canAccess = await canTeacherAccessStudent(user.id, studentId, tenantId);
  if (!canAccess) {
    notFound();
  }

  return <TeacherStudentProfile studentId={studentId} teacherId={user.id} />;
}

/**
 * Edit Teacher Page - Form to update teacher profile
 */

import { requireAuth } from '@/lib/auth/utils';
import { notFound } from 'next/navigation';
import { getTeacherById } from '../../_actions/teacherActions';

export default async function EditTeacherPage({ params }: { params: { id: string } }) {
  await requireAuth();

  const teacher = await getTeacherById(params.id);

  if (!teacher) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Edit Teacher: {teacher.name}</h1>
        <p className="mt-2 text-gray-600">
          Update employment details, qualifications, and permissions
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="h-96 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center">
          <span className="text-gray-400">Teacher edit form - Coming soon</span>
        </div>
      </div>
    </div>
  );
}

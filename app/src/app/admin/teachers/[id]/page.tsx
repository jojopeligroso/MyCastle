/**
 * Teacher Detail Page - View teacher profile with tabs
 */

import { requireAuth } from '@/lib/auth/utils';
import { notFound } from 'next/navigation';
import { getTeacherById } from '../_actions/teacherActions';

export default async function TeacherDetailPage({ params }: { params: { id: string } }) {
  await requireAuth();

  const teacher = await getTeacherById(params.id);

  if (!teacher) {
    notFound();
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{teacher.name}</h1>
        <p className="mt-2 text-gray-600">{teacher.email}</p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button className="border-purple-500 text-purple-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
              Profile
            </button>
            <button className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
              Qualifications
            </button>
            <button className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
              Permissions
            </button>
            <button className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
              Timetable
            </button>
          </nav>
        </div>

        <div className="space-y-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Employment Type</dt>
            <dd className="mt-1 text-sm text-gray-900">{teacher.employment_type}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1 text-sm text-gray-900">{teacher.status}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Active Classes</dt>
            <dd className="mt-1 text-sm text-gray-900">{teacher.active_classes_count}</dd>
          </div>
        </div>
      </div>
    </div>
  );
}

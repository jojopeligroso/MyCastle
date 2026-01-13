/**
 * Create Teacher Page - Form to create new teacher profile
 */

import { requireAuth } from '@/lib/auth/utils';

export default async function CreateTeacherPage() {
  await requireAuth();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Add New Teacher</h1>
        <p className="mt-2 text-gray-600">
          Create a teacher profile with employment details and qualifications
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="h-96 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center">
          <span className="text-gray-400">Teacher creation form - Coming soon</span>
        </div>
      </div>
    </div>
  );
}

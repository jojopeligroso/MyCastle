import { requireAuth } from '@/lib/auth/utils';
import { CreateStudentForm } from '@/components/admin/students/CreateStudentForm';
import Link from 'next/link';

export default async function CreateStudentPage() {
  await requireAuth();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header with back button */}
      <div className="mb-8">
        <Link
          href="/admin/students"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Students
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Create New Student</h1>
        <p className="mt-2 text-sm text-gray-600">
          Add a new student to the registry. You can assign their CEFR level manually or based on a
          diagnostic test result.
        </p>
      </div>

      {/* Form */}
      <CreateStudentForm />
    </div>
  );
}

// Make this page dynamic
export const dynamic = 'force-dynamic';

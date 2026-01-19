/**
 * Enroll Student Page - Form to enroll a student in a class
 */

import { requireAuth } from '@/lib/auth/utils';
import Link from 'next/link';
import EnrollStudentForm from '@/components/admin/enrollments/EnrollStudentForm';

export default async function EnrollStudentPage() {
  await requireAuth();

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <nav className="text-sm text-gray-500 mb-2">
          <Link href="/admin" className="hover:text-gray-700">
            Admin
          </Link>
          {' > '}
          <Link href="/admin/enrolments" className="hover:text-gray-700">
            Enrolments
          </Link>
          {' > '}
          <span className="text-gray-900">Enroll Student</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900">Enroll Student in Class</h1>
        <p className="mt-1 text-sm text-gray-500">
          Select a student and class to create a new enrollment
        </p>
      </div>

      {/* Form Card */}
      <div className="bg-white shadow rounded-lg p-6">
        <EnrollStudentForm />
      </div>
    </div>
  );
}

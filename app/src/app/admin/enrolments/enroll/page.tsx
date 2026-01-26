/**
 * Enroll Student Page - Form to enroll a student in a class
 * MCP Resource: admin://enrolments/enroll
 */

import { db } from '@/db';
import { users, classes } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import EnrollStudentForm from '@/components/admin/enrollments/EnrollStudentForm';

async function getActiveStudents(tenantId: string) {
  try {
    // Set RLS context
    await db.execute(sql.raw(`SET app.user_email = 'eoinmaleoin@gmail.com'`));
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    const students = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(
        and(
          eq(users.tenantId, tenantId),
          eq(users.primaryRole, 'student'),
          eq(users.status, 'active')
        )
      )
      .orderBy(users.name);

    return students;
  } catch (error) {
    console.error('Failed to fetch students:', error);
    return [];
  }
}

async function getActiveClasses(tenantId: string) {
  try {
    // Set RLS context
    await db.execute(sql.raw(`SET app.user_email = 'eoinmaleoin@gmail.com'`));
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    const classList = await db
      .select({
        id: classes.id,
        name: classes.name,
        code: classes.code,
        level: classes.level,
        capacity: classes.capacity,
        enrolledCount: classes.enrolledCount,
        startDate: classes.startDate,
        endDate: classes.endDate,
      })
      .from(classes)
      .where(and(eq(classes.tenantId, tenantId), eq(classes.status, 'active')))
      .orderBy(classes.name);

    // Convert dates to strings for client component
    return classList.map(cls => ({
      ...cls,
      startDate: cls.startDate || undefined,
      endDate: cls.endDate || undefined,
    }));
  } catch (error) {
    console.error('Failed to fetch classes:', error);
    return [];
  }
}

export default async function EnrollStudentPage() {
  await requireAuth();
  const tenantId = await getTenantId();

  if (!tenantId) {
    notFound();
  }

  const students = await getActiveStudents(tenantId);
  const classList = await getActiveClasses(tenantId);

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
          Add a student to a class to begin tracking attendance and progress
        </p>
      </div>

      {/* Info Box */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg
            className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Before enrolling a student:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Ensure the student has an active account in the system</li>
              <li>Verify the class has available capacity</li>
              <li>Check the class schedule matches the student&apos;s availability</li>
              <li>Students can be enrolled in multiple classes simultaneously</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white shadow rounded-lg p-6">
        <EnrollStudentForm students={students} classes={classList} />
      </div>
    </div>
  );
}

// Make this page dynamic to ensure fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

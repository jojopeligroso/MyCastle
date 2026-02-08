/**
 * Amend Enrollment Page - Form for enrollment amendments (extensions, reductions, level changes)
 */

import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { db } from '@/db';
import { enrollments, users, classes } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import AmendEnrollmentForm from '@/components/admin/enrollments/AmendEnrollmentForm';

async function getEnrollmentForAmendment(enrollmentId: string) {
  const tenantId = await getTenantId();
  if (!tenantId) return null;

  // Set RLS context
  await db.execute(sql.raw(`SET app.user_email = 'eoinmaleoin@gmail.com'`));
  await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

  const enrollmentData = await db
    .select({
      enrollmentId: enrollments.id,
      expectedEndDate: enrollments.expectedEndDate,
      enrollmentDate: enrollments.enrollmentDate,
      currentGrade: enrollments.currentGrade,
      studentId: users.id,
      studentName: users.name,
      classId: classes.id,
      className: classes.name,
      classLevel: classes.level,
    })
    .from(enrollments)
    .innerJoin(users, eq(enrollments.studentId, users.id))
    .innerJoin(classes, eq(enrollments.classId, classes.id))
    .where(and(eq(enrollments.id, enrollmentId), eq(enrollments.tenantId, tenantId)))
    .limit(1);

  if (enrollmentData.length === 0) return null;

  const data = enrollmentData[0];

  return {
    enrollmentId: data.enrollmentId,
    currentEndDate: data.expectedEndDate?.toString(),
    currentLevel: data.classLevel ?? undefined,
    studentName: data.studentName,
    className: data.className,
    startDate: data.enrollmentDate?.toString(),
  };
}

export default async function AmendEnrollmentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;

  const data = await getEnrollmentForAmendment(id);

  if (!data) {
    notFound();
  }

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
          <Link href={`/admin/enrolments/${id}`} className="hover:text-gray-700">
            {data.studentName}
          </Link>
          {' > '}
          <span className="text-gray-900">Amend Enrollment</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900">Amend Enrollment</h1>
        <p className="mt-1 text-sm text-gray-500">
          Extend, reduce, or change the level of this enrollment
        </p>
      </div>

      {/* Form Card */}
      <div className="bg-white shadow rounded-lg p-6">
        <AmendEnrollmentForm
          enrollmentId={data.enrollmentId}
          currentEndDate={data.currentEndDate}
          currentLevel={data.currentLevel}
          studentName={data.studentName}
          className={data.className}
          startDate={data.startDate}
        />
      </div>
    </div>
  );
}

/**
 * Transfer Student Page - Form for transferring a student to another class
 */

import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { db } from '@/db';
import { enrollments, users, classes } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import TransferStudentForm from '@/components/admin/enrollments/TransferStudentForm';

async function getEnrollmentForTransfer(enrollmentId: string) {
  const tenantId = await getTenantId();
  if (!tenantId) return null;

  // Set RLS context
  await db.execute(sql.raw(`SET app.user_email = 'eoinmaleoin@gmail.com'`));
  await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

  const enrollmentData = await db
    .select({
      enrollmentId: enrollments.id,
      studentId: users.id,
      studentName: users.name,
      classId: classes.id,
      className: classes.name,
      classCode: classes.code,
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
    studentId: data.studentId,
    studentName: data.studentName,
    currentClassId: data.classId,
    currentClassName: data.className,
    currentClassCode: data.classCode,
    currentClassLevel: data.classLevel,
  };
}

export default async function TransferStudentPage({ params }: { params: { id: string } }) {
  await requireAuth();

  const data = await getEnrollmentForTransfer(params.id);

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
          <Link href={`/admin/enrolments/${params.id}`} className="hover:text-gray-700">
            {data.studentName}
          </Link>
          {' > '}
          <span className="text-gray-900">Transfer</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900">
          Transfer {data.studentName} to Another Class
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Move this student from their current class to a different class
        </p>
      </div>

      {/* Form Card */}
      <div className="bg-white shadow rounded-lg p-6">
        <TransferStudentForm
          enrollmentId={data.enrollmentId}
          studentId={data.studentId}
          studentName={data.studentName}
          currentClassId={data.currentClassId}
          currentClassName={data.currentClassName}
          currentClassCode={data.currentClassCode}
          currentClassLevel={data.currentClassLevel}
        />
      </div>
    </div>
  );
}

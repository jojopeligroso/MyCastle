/**
 * Student Edit Page - Edit student profile details
 */

import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { db } from '@/db';
import { students, users } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { StudentEditPageForm } from './StudentEditPageForm';

interface StudentEditDetails {
  id: string;
  userId: string;
  studentId: string;
  name: string | null;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  studentNumber: string | null;
  isVisaStudent: boolean | null;
  visaType: string | null;
  visaExpiryDate: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelationship: string | null;
  medicalConditions: string | null;
  dietaryRequirements: string | null;
  status: string;
}

async function getStudentDetails(studentId: string): Promise<StudentEditDetails | null> {
  const tenantId = await getTenantId();
  if (!tenantId) return null;

  // Set RLS context
  await db.execute(sql.raw(`SET app.user_email = 'eoinmaleoin@gmail.com'`));
  await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

  const result = await db
    .select({
      id: users.id,
      userId: users.id,
      studentId: students.id,
      name: users.name,
      email: users.email,
      phone: sql<string | null>`${users}.phone`,
      dateOfBirth: sql<string | null>`${users}.date_of_birth::text`,
      nationality: sql<string | null>`${users}.nationality`,
      studentNumber: students.studentNumber,
      isVisaStudent: students.isVisaStudent,
      visaType: students.visaType,
      visaExpiryDate: students.visaExpiryDate,
      emergencyContactName: students.emergencyContactName,
      emergencyContactPhone: students.emergencyContactPhone,
      emergencyContactRelationship: students.emergencyContactRelationship,
      medicalConditions: students.medicalConditions,
      dietaryRequirements: students.dietaryRequirements,
      status: students.status,
    })
    .from(students)
    .innerJoin(users, eq(students.userId, users.id))
    .where(and(eq(students.id, studentId), eq(students.tenantId, tenantId)))
    .limit(1);

  if (result.length === 0) return null;

  return {
    ...result[0],
    visaExpiryDate: result[0].visaExpiryDate?.toString() || null,
  };
}

export default async function StudentEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;

  const student = await getStudentDetails(id);

  if (!student) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/admin/students/${id}`}
          className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block"
        >
          ← Back to Student Profile
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Edit Student</h1>
        <p className="text-sm text-gray-500 mt-1">Update details for {student.name}</p>
      </div>

      {/* Edit Form */}
      <div className="bg-white shadow rounded-lg p-6">
        <StudentEditPageForm student={student} studentId={id} />
      </div>
    </div>
  );
}

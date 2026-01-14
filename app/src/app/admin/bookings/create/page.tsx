/**
 * Create Booking Page - Create new student booking
 * Fresh Schema Implementation
 */

import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { db } from '@/db';
import { students, users, courses, accommodationTypes, agencies } from '@/db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { CreateBookingForm } from './CreateBookingForm';

interface Student {
  id: string;
  name: string;
  email: string;
  studentNumber: string | null;
}

interface Course {
  id: string;
  name: string;
  code: string | null;
  level: string | null;
  pricePerWeekEur: string | null;
}

interface AccommodationType {
  id: string;
  name: string;
  pricePerWeekEur: string | null;
}

interface Agency {
  id: string;
  name: string;
}

async function getFormData() {
  const tenantId = await getTenantId();
  if (!tenantId) {
    return { students: [], courses: [], accommodationTypes: [], agencies: [] };
  }

  // Set RLS context
  await db.execute(sql.raw(`SET app.user_email = 'eoinmaleoin@gmail.com'`));
  await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

  // Fetch students
  const studentsData = await db
    .select({
      id: students.id,
      name: users.name,
      email: users.email,
      studentNumber: students.studentNumber,
    })
    .from(students)
    .innerJoin(users, eq(students.userId, users.id))
    .where(
      and(
        eq(students.tenantId, tenantId),
        eq(students.status, 'active'),
        isNull(users.deletedAt)
      )
    )
    .orderBy(users.name);

  // Fetch courses
  const coursesData = await db
    .select({
      id: courses.id,
      name: courses.name,
      code: courses.code,
      level: courses.level,
      pricePerWeekEur: courses.pricePerWeekEur,
    })
    .from(courses)
    .where(and(eq(courses.tenantId, tenantId), eq(courses.status, 'active')))
    .orderBy(courses.name);

  // Fetch accommodation types
  const accommodationData = await db
    .select({
      id: accommodationTypes.id,
      name: accommodationTypes.name,
      pricePerWeekEur: accommodationTypes.pricePerWeekEur,
    })
    .from(accommodationTypes)
    .where(
      and(eq(accommodationTypes.tenantId, tenantId), eq(accommodationTypes.status, 'active'))
    )
    .orderBy(accommodationTypes.name);

  // Fetch agencies
  const agenciesData = await db
    .select({
      id: agencies.id,
      name: agencies.name,
    })
    .from(agencies)
    .where(and(eq(agencies.tenantId, tenantId), eq(agencies.status, 'active')))
    .orderBy(agencies.name);

  return {
    students: studentsData,
    courses: coursesData,
    accommodationTypes: accommodationData,
    agencies: agenciesData,
  };
}

export default async function CreateBookingPage() {
  await requireAuth();
  const tenantId = await getTenantId();

  if (!tenantId) {
    return <div>Error: No tenant ID available</div>;
  }

  const formData = await getFormData();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create Booking</h1>
        <p className="mt-2 text-gray-600">Create a new course booking for a student</p>
      </div>

      <CreateBookingForm
        students={formData.students}
        courses={formData.courses}
        accommodationTypes={formData.accommodationTypes}
        agencies={formData.agencies}
        tenantId={tenantId}
      />
    </div>
  );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

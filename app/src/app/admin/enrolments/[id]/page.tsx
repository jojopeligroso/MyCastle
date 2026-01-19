/**
 * Enrollment Detail Page - View enrollment information and amendment history
 */

import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { db } from '@/db';
import { enrollments, enrollmentAmendments, users, classes } from '@/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import EnrollmentDetailView from '@/components/admin/enrollments/EnrollmentDetailView';

async function getEnrollmentData(enrollmentId: string) {
  const tenantId = await getTenantId();
  if (!tenantId) return null;

  // Set RLS context
  await db.execute(sql.raw(`SET app.user_email = 'eoinmaleoin@gmail.com'`));
  await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

  // Fetch enrollment with student and class data
  const enrollmentData = await db
    .select({
      // Enrollment fields
      enrollmentId: enrollments.id,
      enrollmentDate: enrollments.enrollmentDate,
      expectedEndDate: enrollments.expectedEndDate,
      status: enrollments.status,
      attendanceRate: enrollments.attendanceRate,
      currentGrade: enrollments.currentGrade,
      // Student fields
      studentId: users.id,
      studentName: users.name,
      studentEmail: users.email,
      studentNumber: sql<string>`NULL`, // We'll need to join with students table if needed
      // Class fields
      classId: classes.id,
      className: classes.name,
      classCode: classes.code,
      classLevel: classes.level,
      teacherId: classes.teacherId,
    })
    .from(enrollments)
    .innerJoin(users, eq(enrollments.studentId, users.id))
    .innerJoin(classes, eq(enrollments.classId, classes.id))
    .where(and(eq(enrollments.id, enrollmentId), eq(enrollments.tenantId, tenantId)))
    .limit(1);

  if (enrollmentData.length === 0) return null;

  const data = enrollmentData[0];

  // Fetch teacher name
  let teacherName: string | undefined;
  if (data.teacherId) {
    const teacher = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, data.teacherId))
      .limit(1);
    teacherName = teacher[0]?.name;
  }

  // Fetch amendments
  const amendmentData = await db
    .select({
      id: enrollmentAmendments.id,
      amendmentType: enrollmentAmendments.amendmentType,
      amendmentDate: enrollmentAmendments.amendmentDate,
      previousValue: sql<string>`COALESCE(${enrollmentAmendments.previousEndDate}::text, '')`,
      newValue: sql<string>`COALESCE(${enrollmentAmendments.newEndDate}::text, '')`,
      reason: enrollmentAmendments.reason,
      status: enrollmentAmendments.status,
      metadata: enrollmentAmendments.metadata,
    })
    .from(enrollmentAmendments)
    .where(eq(enrollmentAmendments.enrollmentId, enrollmentId))
    .orderBy(desc(enrollmentAmendments.amendmentDate));

  return {
    enrollment: {
      id: data.enrollmentId,
      enrollmentDate: data.enrollmentDate?.toString() || new Date().toISOString(),
      expectedEndDate: data.expectedEndDate?.toString(),
      status: data.status,
      attendanceRate: data.attendanceRate?.toString(),
      currentGrade: data.currentGrade || undefined,
    },
    student: {
      id: data.studentId,
      name: data.studentName,
      email: data.studentEmail,
      studentNumber: data.studentNumber,
    },
    classInfo: {
      id: data.classId,
      name: data.className,
      code: data.classCode,
      level: data.classLevel,
      teacherName,
    },
    amendments: amendmentData.map(a => ({
      id: a.id,
      amendmentType: a.amendmentType,
      amendmentDate: a.amendmentDate?.toString() || new Date().toISOString(),
      previousValue: a.previousValue,
      newValue: a.newValue,
      reason: a.reason,
      status: a.status,
      metadata: (a.metadata as Record<string, unknown>) || {},
    })),
  };
}

export default async function EnrollmentDetailPage({ params }: { params: { id: string } }) {
  await requireAuth();

  const data = await getEnrollmentData(params.id);

  if (!data) {
    notFound();
  }

  return (
    <EnrollmentDetailView
      enrollment={data.enrollment}
      student={data.student}
      classInfo={data.classInfo}
      amendments={data.amendments}
    />
  );
}

/**
 * Edit Class Page - Update existing class details
 */

import { db } from '@/db';
import { classes, users } from '@/db/schema';
import { programmes } from '@/db/schema/programmes';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { EditClassForm } from '@/components/admin/EditClassForm';

async function getClass(classId: string, tenantId: string) {
  // Set RLS context
  await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));
  await db.execute(sql.raw(`SET app.user_role = 'admin'`));

  const result = await db
    .select({
      id: classes.id,
      name: classes.name,
      code: classes.code,
      level: classes.level,
      subject: classes.subject,
      capacity: classes.capacity,
      teacherId: classes.teacherId,
      programmeId: classes.programmeId,
      scheduleDescription: classes.scheduleDescription,
      startTime: classes.startTime,
      endTime: classes.endTime,
      breakDurationMinutes: classes.breakDurationMinutes,
      daysOfWeek: classes.daysOfWeek,
      startDate: classes.startDate,
      endDate: classes.endDate,
      showCapacityPublicly: classes.showCapacityPublicly,
      status: classes.status,
      enrolledCount: classes.enrolledCount,
    })
    .from(classes)
    .where(and(eq(classes.id, classId), eq(classes.tenantId, tenantId)))
    .limit(1);

  return result[0] || null;
}

async function getTeachers(tenantId: string) {
  const teachers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .where(
      and(
        eq(users.tenantId, tenantId),
        eq(users.primaryRole, 'teacher'),
        eq(users.status, 'active')
      )
    )
    .orderBy(users.name);

  return teachers;
}

async function getProgrammes(tenantId: string) {
  const programmesList = await db
    .select({
      id: programmes.id,
      name: programmes.name,
      code: programmes.code,
    })
    .from(programmes)
    .where(eq(programmes.tenant_id, sql`${tenantId}::uuid`))
    .orderBy(programmes.name);

  return programmesList;
}

export default async function EditClassPage(props: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const tenantId = await getTenantId();
  const params = await props.params;

  if (!tenantId) {
    notFound();
  }

  const classData = await getClass(params.id, tenantId);

  if (!classData) {
    notFound();
  }

  const teachers = await getTeachers(tenantId);
  const programmesList = await getProgrammes(tenantId);

  // Format dates for the form (convert Date objects to strings)
  const formattedClassData = {
    ...classData,
    startDate: classData.startDate?.toString() || '',
    endDate: classData.endDate?.toString() || null,
    daysOfWeek: (classData.daysOfWeek as string[]) || [],
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <Link
          href={`/admin/classes/${params.id}`}
          className="text-sm text-gray-600 hover:text-gray-900 mb-2 inline-block"
        >
          ← Back to Class Details
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Edit Class</h1>
        <p className="mt-2 text-gray-600">Update class details and settings</p>
      </div>

      <EditClassForm
        classData={formattedClassData}
        teachers={teachers}
        programmes={programmesList}
        enrolledCount={classData.enrolledCount}
      />
    </div>
  );
}

/**
 * Edit Class Page - Update existing class details
 */

import { db } from '@/db';
import { classes, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { EditClassForm } from '@/components/admin/EditClassForm';

async function getClass(classId: string, tenantId: string) {
  const result = await db
    .select({
      id: classes.id,
      name: classes.name,
      code: classes.code,
      level: classes.level,
      subject: classes.subject,
      capacity: classes.capacity,
      teacher_id: classes.teacher_id,
      schedule_description: classes.schedule_description,
      start_date: classes.start_date,
      end_date: classes.end_date,
      status: classes.status,
    })
    .from(classes)
    .where(and(eq(classes.id, classId), eq(classes.tenant_id, tenantId)))
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
      and(eq(users.tenant_id, tenantId), eq(users.role, 'teacher'), eq(users.status, 'active'))
    )
    .orderBy(users.name);

  return teachers;
}

export default async function EditClassPage({ params }: { params: { id: string } }) {
  await requireAuth();
  const tenantId = await getTenantId();

  if (!tenantId) {
    notFound();
  }

  const classData = await getClass(params.id, tenantId);

  if (!classData) {
    notFound();
  }

  const teachers = await getTeachers(tenantId);

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

      <EditClassForm classData={classData} teachers={teachers} />
    </div>
  );
}

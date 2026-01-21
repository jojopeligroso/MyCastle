/**
 * Create Class Page - Form to schedule a new class
 */

import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { db } from '@/db';
import { users } from '@/db/schema';
import { programmes } from '@/db/schema/programmes';
import { eq, and, sql } from 'drizzle-orm';
import { CreateClassForm } from '@/components/admin/CreateClassForm';

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

export default async function CreateClassPage() {
  await requireAuth();
  const tenantId = await getTenantId();

  if (!tenantId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Unable to load form. Please contact support.</p>
      </div>
    );
  }

  const teachers = await getTeachers(tenantId);
  const programmesList = await getProgrammes(tenantId);

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Schedule New Class</h1>
        <p className="mt-2 text-gray-600">Create a new class schedule</p>
      </div>

      <CreateClassForm teachers={teachers} programmes={programmesList} />
    </div>
  );
}

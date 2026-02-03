/**
 * Edit User Page - Update existing user details
 */

import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { EditUserForm } from '@/components/admin/EditUserForm';

async function getUser(userId: string, tenantId: string) {
  const result = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.primaryRole,
      status: users.status,
    })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
    .limit(1);

  return result[0] || null;
}

export default async function EditUserPage({ params }: { params: { id: string } }) {
  await requireAuth();
  const tenantId = await getTenantId();

  if (!tenantId) {
    notFound();
  }

  const userData = await getUser(params.id, tenantId);

  if (!userData) {
    notFound();
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <Link
          href={`/admin/users/${params.id}`}
          className="text-sm text-gray-600 hover:text-gray-900 mb-2 inline-block"
        >
          ← Back to User Details
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Edit User</h1>
        <p className="mt-2 text-gray-600">Update user details and permissions</p>
      </div>

      <EditUserForm userData={userData} />
    </div>
  );
}

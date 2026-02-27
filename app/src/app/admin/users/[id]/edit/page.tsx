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

import { sql } from 'drizzle-orm';

async function getUser(userId: string, tenantId: string) {
  const result = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      phone: sql<string | null>`${users}.phone`,
      dateOfBirth: sql<string | null>`${users}.date_of_birth::text`,
      nationality: sql<string | null>`${users}.nationality`,
    })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
    .limit(1);

  return result[0] || null;
}

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  const tenantId = await getTenantId();

  if (!tenantId) {
    notFound();
  }

  const userData = await getUser(id, tenantId);

  if (!userData) {
    notFound();
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <Link
          href={`/admin/users/${id}`}
          className="text-sm text-gray-600 hover:text-gray-900 mb-2 inline-block"
        >
          ← Back to User Details
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Edit User</h1>
        <p className="mt-2 text-gray-600">Update user details and permissions</p>
      </div>

      <EditUserForm
        userData={{
          ...userData,
          name: userData.name || '',
          status: userData.isActive ? 'active' : 'inactive',
          phone: userData.phone || null,
          dateOfBirth: userData.dateOfBirth || null,
          nationality: userData.nationality || null,
        }}
      />
    </div>
  );
}

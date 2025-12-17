/**
 * Create Invoice Page - Form to create a new invoice
 */

import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { CreateInvoiceForm } from '@/components/admin/CreateInvoiceForm';

async function getStudents(tenantId: string) {
  const students = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .where(eq(users.tenant_id, tenantId))
    .where(eq(users.role, 'student'))
    .where(eq(users.status, 'active'))
    .orderBy(users.name);

  return students;
}

export default async function CreateInvoicePage() {
  await requireAuth();
  const tenantId = await getTenantId();

  if (!tenantId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Unable to load form. Please contact support.</p>
      </div>
    );
  }

  const students = await getStudents(tenantId);

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create New Invoice</h1>
        <p className="mt-2 text-gray-600">Generate a new invoice for a student</p>
      </div>

      <CreateInvoiceForm students={students} />
    </div>
  );
}

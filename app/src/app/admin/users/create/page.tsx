/**
 * Create User Page - Form to add a new user
 */

import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { CreateUserForm } from '@/components/admin/CreateUserForm';

export default async function CreateUserPage() {
  await requireAuth();
  const tenantId = await getTenantId();

  if (!tenantId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Unable to load form. Please contact support.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Add New User</h1>
        <p className="mt-2 text-gray-600">Create a new student, teacher, or admin account</p>
      </div>

      <CreateUserForm />
    </div>
  );
}

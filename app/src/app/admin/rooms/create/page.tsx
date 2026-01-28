/**
 * Create Room Page
 * MCP Resource: admin://rooms/create
 * Ref: Task 1.8.2 - Create Room Form
 */

import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CreateRoomForm } from '@/components/admin/CreateRoomForm';

export default async function CreateRoomPage() {
  await requireAuth();
  const tenantId = await getTenantId();

  if (!tenantId) {
    notFound();
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
          <Link href="/admin" className="hover:text-gray-700">
            Dashboard
          </Link>
          <span>/</span>
          <Link href="/admin/rooms" className="hover:text-gray-700">
            Rooms
          </Link>
          <span>/</span>
          <span className="text-gray-900">Create</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Create New Room</h1>
        <p className="mt-2 text-gray-600">Add a new classroom or facility to the system</p>
      </div>

      {/* Form */}
      <CreateRoomForm />
    </div>
  );
}

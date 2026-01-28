/**
 * Room Allocations Page - View and manage room assignments
 * MCP Resource: admin://rooms/allocations
 * Ref: Task 1.8.3 - Room Allocation/Booking View
 */

import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { RoomAllocationView } from '@/components/admin/RoomAllocationView';

export default async function RoomAllocationsPage() {
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
          <span className="text-gray-900">Allocations</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Room Allocations</h1>
        <p className="mt-2 text-gray-600">View which class sessions are assigned to which rooms</p>
      </div>

      {/* Allocation View */}
      <RoomAllocationView />

      {/* Help Section */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-sm font-medium text-blue-900 mb-2">How Room Allocations Work</h3>
        <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
          <li>Room allocations link class sessions to specific rooms</li>
          <li>Each session can only be assigned to one room at a time</li>
          <li>Use the date picker to view allocations for different days</li>
          <li>Remove allocations by clicking "Remove" next to each session</li>
          <li>
            To create new allocations, use the{' '}
            <Link href="/admin/timetable" className="underline font-medium">
              timetable view
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}

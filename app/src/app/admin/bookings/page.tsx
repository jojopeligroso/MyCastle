/**
 * Bookings List Page - View and manage student bookings
 * MCP Resource: admin://bookings
 *
 * ⚠️ DATABASE SCHEMA MISSING
 * This page requires a 'bookings' table to be created.
 * See: spec/01-admin-mcp.md §1.2.6
 */

import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export default async function BookingsPage() {
  await requireAuth();
  const tenantId = await getTenantId();

  if (!tenantId) {
    notFound();
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
        <p className="mt-2 text-gray-600">Manage student course bookings</p>
      </div>

      {/* Database Schema Missing Warning */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-8">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-yellow-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Database Schema Missing</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                The <code className="bg-yellow-100 px-1 py-0.5 rounded">bookings</code> table
                needs to be created in the database schema.
              </p>
              <p className="mt-2">
                <strong>Required fields (per MCP spec):</strong>
              </p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>id (uuid, primary key)</li>
                <li>tenant_id (uuid, references tenants)</li>
                <li>student_id (uuid, references users) - The student making the booking</li>
                <li>programme_id (uuid, references programmes)</li>
                <li>start_date (date) - Course start date</li>
                <li>end_date (date) - Course end date</li>
                <li>weeks (integer) - Duration in weeks</li>
                <li>cohort_type (varchar) - e.g., "group", "individual", "intensive"</li>
                <li>visa_required (boolean) - Visa support needed</li>
                <li>accommodation_required (boolean) - Accommodation needed</li>
                <li>status (varchar) - e.g., "pending", "confirmed", "cancelled"</li>
                <li>created_at, updated_at (timestamp)</li>
              </ul>
              <p className="mt-3">
                <strong>Reference:</strong>{' '}
                <code className="bg-yellow-100 px-1 py-0.5 rounded">
                  spec/01-admin-mcp.md §1.2.6
                </code>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Placeholder Content */}
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No bookings</h3>
        <p className="mt-1 text-sm text-gray-500">
          Database schema needs to be created before bookings can be managed.
        </p>
        <div className="mt-6">
          <Link
            href="/admin"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Next Steps */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-sm font-medium text-blue-900">Next Steps</h3>
        <ol className="mt-2 text-sm text-blue-800 list-decimal list-inside space-y-1">
          <li>Create migration for <code>bookings</code> table</li>
          <li>Run migration: <code className="bg-blue-100 px-1 py-0.5 rounded">npm run db:migrate</code></li>
          <li>Add schema to <code>app/src/db/schema/bookings.ts</code></li>
          <li>Create CRUD pages (list, create, edit, view)</li>
          <li>Implement MCP tools: <code>create_booking</code>, <code>confirm_booking</code>, <code>cancel_booking</code></li>
        </ol>
      </div>
    </div>
  );
}

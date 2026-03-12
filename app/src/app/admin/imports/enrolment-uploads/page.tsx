/**
 * Screen 1: Imports List
 * Lists all import batches with status and counts
 * Ref: spec/IMPORTS_UI_SPEC.md Section 6
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { db } from '@/db';
import { uploadBatches } from '@/db/schema/imports';
import { users } from '@/db/schema/core';
import { requireAuth, getTenantId, setRLSContext } from '@/lib/auth/utils';
import { desc, eq } from 'drizzle-orm';
import ImportsList from './_components/ImportsList';
import { Plus } from 'lucide-react';

async function getImportBatches() {
  await requireAuth(['admin']);
  const tenantId = await getTenantId();

  if (!tenantId) {
    return [];
  }

  await setRLSContext(db);

  const batches = await db
    .select({
      id: uploadBatches.id,
      fileName: uploadBatches.fileName,
      status: uploadBatches.status,
      totalRows: uploadBatches.totalRows,
      validRows: uploadBatches.validRows,
      invalidRows: uploadBatches.invalidRows,
      ambiguousRows: uploadBatches.ambiguousRows,
      newRows: uploadBatches.newRows,
      updateRows: uploadBatches.updateRows,
      excludedRows: uploadBatches.excludedRows,
      reviewOutcome: uploadBatches.reviewOutcome,
      createdAt: uploadBatches.createdAt,
      appliedAt: uploadBatches.appliedAt,
      creatorName: users.name,
    })
    .from(uploadBatches)
    .leftJoin(users, eq(uploadBatches.createdBy, users.id))
    .where(eq(uploadBatches.tenantId, tenantId))
    .orderBy(desc(uploadBatches.createdAt))
    .limit(100);

  return batches;
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 rounded w-1/4"></div>
      <div className="h-64 bg-gray-200 rounded"></div>
    </div>
  );
}

async function ImportsContent() {
  const batches = await getImportBatches();
  return <ImportsList batches={batches} />;
}

export default function EnrolmentUploadsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Enrolment Uploads</h1>
          <p className="mt-1 text-sm text-gray-500">
            Import and manage enrolment data from Excel files
          </p>
        </div>
        <Link
          href="/admin/imports/enrolment-uploads/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Import
        </Link>
      </div>

      {/* Batches List */}
      <Suspense fallback={<LoadingSkeleton />}>
        <ImportsContent />
      </Suspense>
    </div>
  );
}

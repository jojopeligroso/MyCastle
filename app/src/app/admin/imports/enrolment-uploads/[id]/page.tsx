/**
 * Screen 2: Batch Summary
 * Shows batch details, counts, triage controls, and actions
 * Ref: spec/IMPORTS_UI_SPEC.md Section 7
 */

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { db } from '@/db';
import { uploadBatches } from '@/db/schema/imports';
import { users } from '@/db/schema/core';
import { requireAuth, getTenantId, setRLSContext } from '@/lib/auth/utils';
import { eq, and } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import BatchSummary from './_components/BatchSummary';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getBatchDetails(batchId: string) {
  await requireAuth(['admin']);
  const tenantId = await getTenantId();

  if (!tenantId) {
    return null;
  }

  await setRLSContext(db);

  const [batch] = await db
    .select({
      id: uploadBatches.id,
      tenantId: uploadBatches.tenantId,
      fileType: uploadBatches.fileType,
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
      reviewComment: uploadBatches.reviewComment,
      ignoredColumns: uploadBatches.ignoredColumns,
      parseError: uploadBatches.parseError,
      createdBy: uploadBatches.createdBy,
      createdAt: uploadBatches.createdAt,
      appliedBy: uploadBatches.appliedBy,
      appliedAt: uploadBatches.appliedAt,
      updatedAt: uploadBatches.updatedAt,
      creatorName: users.name,
      creatorEmail: users.email,
    })
    .from(uploadBatches)
    .leftJoin(users, eq(uploadBatches.createdBy, users.id))
    .where(and(eq(uploadBatches.id, batchId), eq(uploadBatches.tenantId, tenantId)))
    .limit(1);

  return batch;
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 bg-gray-200 rounded w-1/3"></div>
      <div className="grid grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded"></div>
        ))}
      </div>
      <div className="h-32 bg-gray-200 rounded"></div>
    </div>
  );
}

async function BatchContent({ batchId }: { batchId: string }) {
  const batch = await getBatchDetails(batchId);

  if (!batch) {
    notFound();
  }

  return <BatchSummary batch={batch} />;
}

export default async function BatchDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/admin/imports/enrolment-uploads"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Imports
      </Link>

      {/* Batch Content */}
      <Suspense fallback={<LoadingSkeleton />}>
        <BatchContent batchId={id} />
      </Suspense>
    </div>
  );
}

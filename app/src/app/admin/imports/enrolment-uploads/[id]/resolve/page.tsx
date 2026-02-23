/**
 * Screen 3: Row Resolution
 * Allows resolving invalid and ambiguous rows
 * Ref: spec/IMPORTS_UI_SPEC.md Section 8
 */

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { db } from '@/db';
import { uploadBatches, stgRows, proposedChanges } from '@/db/schema/imports';
import { requireAuth, getTenantId, setRLSContext } from '@/lib/auth/utils';
import { eq, and, asc } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import RowResolution from './_components/RowResolution';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getBatchWithRows(batchId: string) {
  await requireAuth(['admin']);
  const tenantId = await getTenantId();

  if (!tenantId) {
    return null;
  }

  await setRLSContext(db);

  // Get batch
  const [batch] = await db
    .select({
      id: uploadBatches.id,
      fileName: uploadBatches.fileName,
      status: uploadBatches.status,
      invalidRows: uploadBatches.invalidRows,
      ambiguousRows: uploadBatches.ambiguousRows,
      excludedRows: uploadBatches.excludedRows,
    })
    .from(uploadBatches)
    .where(and(eq(uploadBatches.id, batchId), eq(uploadBatches.tenantId, tenantId)))
    .limit(1);

  if (!batch) {
    return null;
  }

  // Get rows that need resolution
  const rows = await db
    .select({
      id: stgRows.id,
      rowNumber: stgRows.rowNumber,
      rowStatus: stgRows.rowStatus,
      rawData: stgRows.rawData,
      parsedData: stgRows.parsedData,
      validationErrors: stgRows.validationErrors,
      matchCandidates: stgRows.matchCandidates,
      resolvedAt: stgRows.resolvedAt,
      resolutionType: stgRows.resolutionType,
      linkedEnrollmentId: stgRows.linkedEnrollmentId,
      changeId: proposedChanges.id,
      action: proposedChanges.action,
      isExcluded: proposedChanges.isExcluded,
    })
    .from(stgRows)
    .leftJoin(proposedChanges, eq(stgRows.id, proposedChanges.stgRowId))
    .where(and(eq(stgRows.batchId, batchId), eq(stgRows.tenantId, tenantId)))
    .orderBy(asc(stgRows.rowNumber));

  return { batch, rows };
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 rounded w-1/3"></div>
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-200 rounded w-24"></div>
        ))}
      </div>
      <div className="h-96 bg-gray-200 rounded"></div>
    </div>
  );
}

async function ResolutionContent({ batchId }: { batchId: string }) {
  const data = await getBatchWithRows(batchId);

  if (!data) {
    notFound();
  }

  return <RowResolution batch={data.batch} rows={data.rows} />;
}

export default async function RowResolutionPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href={`/admin/imports/enrolment-uploads/${id}`}
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Batch Summary
      </Link>

      {/* Resolution Content */}
      <Suspense fallback={<LoadingSkeleton />}>
        <ResolutionContent batchId={id} />
      </Suspense>
    </div>
  );
}

'use client';

/**
 * BatchSummary Component
 * Displays batch details, stats, triage controls, and actions
 * Ref: spec/IMPORTS_UI_SPEC.md Section 7
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Loader2,
  Plus,
  RefreshCw,
  Ban,
  Info,
  Eye,
} from 'lucide-react';
import ConfirmChangesModal from './ConfirmChangesModal';

interface Batch {
  id: string;
  tenantId: string;
  fileType: string;
  fileName: string | null;
  status: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  ambiguousRows: number;
  newRows: number;
  updateRows: number;
  excludedRows: number;
  reviewOutcome: string | null;
  reviewComment: string | null;
  ignoredColumns: string[] | null;
  parseError: string | null;
  createdBy: string;
  createdAt: Date;
  appliedBy: string | null;
  appliedAt: Date | null;
  updatedAt: Date;
  creatorName: string | null;
  creatorEmail: string | null;
}

interface BatchSummaryProps {
  batch: Batch;
}

function StatCard({
  label,
  value,
  icon: Icon,
  color = 'gray',
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color?: 'gray' | 'green' | 'red' | 'yellow' | 'blue';
}) {
  const colorClasses = {
    gray: 'bg-gray-50 text-gray-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    blue: 'bg-blue-50 text-blue-600',
  };

  return (
    <div className={`rounded-lg p-4 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <Icon className="h-5 w-5" />
        <span className="text-2xl font-semibold">{value}</span>
      </div>
      <p className="mt-2 text-sm font-medium">{label}</p>
    </div>
  );
}

function getStatusBadge(status: string) {
  const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    RECEIVED: {
      color: 'bg-gray-100 text-gray-700',
      icon: <Clock className="w-4 h-4" />,
      label: 'Received',
    },
    PARSING: {
      color: 'bg-blue-100 text-blue-700',
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
      label: 'Processing',
    },
    PROPOSED_OK: {
      color: 'bg-blue-100 text-blue-700',
      icon: <CheckCircle className="w-4 h-4" />,
      label: 'Ready for Review',
    },
    PROPOSED_NEEDS_REVIEW: {
      color: 'bg-yellow-100 text-yellow-700',
      icon: <AlertTriangle className="w-4 h-4" />,
      label: 'Needs Attention',
    },
    READY_TO_APPLY: {
      color: 'bg-green-100 text-green-700',
      icon: <CheckCircle className="w-4 h-4" />,
      label: 'Ready to Apply',
    },
    APPLYING: {
      color: 'bg-blue-100 text-blue-700',
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
      label: 'Applying...',
    },
    APPLIED: {
      color: 'bg-green-100 text-green-700',
      icon: <CheckCircle className="w-4 h-4" />,
      label: 'Applied',
    },
    REJECTED: {
      color: 'bg-red-100 text-red-700',
      icon: <XCircle className="w-4 h-4" />,
      label: 'Rejected',
    },
    FAILED_VALIDATION: {
      color: 'bg-red-100 text-red-700',
      icon: <XCircle className="w-4 h-4" />,
      label: 'Validation Failed',
    },
    FAILED_SYSTEM: {
      color: 'bg-red-100 text-red-700',
      icon: <XCircle className="w-4 h-4" />,
      label: 'System Error',
    },
  };

  const config = statusConfig[status] || {
    color: 'bg-gray-100 text-gray-700',
    icon: null,
    label: status,
  };

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${config.color}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

export default function BatchSummary({ batch }: BatchSummaryProps) {
  const router = useRouter();
  const [reviewOutcome, setReviewOutcome] = useState<string>(batch.reviewOutcome || '');
  const [reviewComment, setReviewComment] = useState(batch.reviewComment || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const isTerminal = ['APPLIED', 'REJECTED', 'FAILED_VALIDATION', 'FAILED_SYSTEM'].includes(
    batch.status
  );
  const canTriage = ['PROPOSED_OK', 'PROPOSED_NEEDS_REVIEW'].includes(batch.status);
  const hasIssues = batch.invalidRows > 0 || batch.ambiguousRows > 0;

  const canApply =
    batch.status === 'READY_TO_APPLY' &&
    reviewOutcome === 'CONFIRM' &&
    batch.invalidRows === 0 &&
    batch.ambiguousRows === 0;

  const handleTriage = async (outcome: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/imports/batches/${batch.id}/triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewOutcome: outcome, reviewComment }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Triage failed');
      }

      setReviewOutcome(outcome);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Triage failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenConfirmModal = () => {
    setShowConfirmModal(true);
  };

  const handleCloseConfirmModal = () => {
    setShowConfirmModal(false);
  };

  const handleApply = async () => {
    setIsApplying(true);
    setError(null);

    try {
      const response = await fetch(`/api/imports/batches/${batch.id}/apply`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.errors?.join(', ') || result.error || 'Apply failed');
      }

      setShowConfirmModal(false);
      setSuccessMessage(
        `Changes applied successfully. ${result.insertedCount} created, ${result.updatedCount} updated.`
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Apply failed');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8 text-green-600" />
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {batch.fileName || 'Import Batch'}
              </h1>
              <p className="text-sm text-gray-500">
                Uploaded {format(new Date(batch.createdAt), 'PPp')}
                {batch.creatorName && ` by ${batch.creatorName}`}
              </p>
            </div>
          </div>
        </div>
        {getStatusBadge(batch.status)}
      </div>

      {/* Error Display */}
      {batch.parseError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Error</p>
              <p className="text-sm text-red-700">{batch.parseError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <p className="text-sm text-green-700">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Total Rows" value={batch.totalRows} icon={FileSpreadsheet} color="gray" />
        <StatCard label="Valid" value={batch.validRows} icon={CheckCircle} color="green" />
        <StatCard label="Invalid" value={batch.invalidRows} icon={XCircle} color="red" />
        <StatCard
          label="Ambiguous"
          value={batch.ambiguousRows}
          icon={AlertTriangle}
          color="yellow"
        />
        <StatCard label="New" value={batch.newRows} icon={Plus} color="blue" />
        <StatCard label="Updates" value={batch.updateRows} icon={RefreshCw} color="blue" />
      </div>

      {/* Ignored Columns Notice */}
      {batch.ignoredColumns && batch.ignoredColumns.length > 0 && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-gray-500 mt-0.5" />
            <div>
              <p className="font-medium text-gray-700">Ignored Columns</p>
              <p className="text-sm text-gray-600">{batch.ignoredColumns.join(', ')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Gating Callout */}
      {hasIssues && !isTerminal && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800">Action Required</p>
              <p className="text-sm text-yellow-700">
                This batch cannot be applied until all invalid and ambiguous rows are resolved or
                excluded.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Triage Controls */}
      {canTriage && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Review Decision</h2>

          <div className="space-y-4">
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="reviewOutcome"
                  value="CONFIRM"
                  checked={reviewOutcome === 'CONFIRM'}
                  onChange={e => setReviewOutcome(e.target.value)}
                  disabled={isSubmitting}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Confirm</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="reviewOutcome"
                  value="DENY"
                  checked={reviewOutcome === 'DENY'}
                  onChange={e => setReviewOutcome(e.target.value)}
                  disabled={isSubmitting}
                  className="h-4 w-4 text-red-600 focus:ring-red-500"
                />
                <span className="ml-2 text-sm text-gray-700">Deny</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="reviewOutcome"
                  value="NEEDS_REVIEW"
                  checked={reviewOutcome === 'NEEDS_REVIEW'}
                  onChange={e => setReviewOutcome(e.target.value)}
                  disabled={isSubmitting}
                  className="h-4 w-4 text-yellow-600 focus:ring-yellow-500"
                />
                <span className="ml-2 text-sm text-gray-700">Needs Review</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comment (optional)
              </label>
              <textarea
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                disabled={isSubmitting}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                placeholder="Add a note about this decision..."
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              onClick={() => handleTriage(reviewOutcome)}
              disabled={!reviewOutcome || isSubmitting}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Decision'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        {hasIssues && !isTerminal && (
          <button
            onClick={() => router.push(`/admin/imports/enrolment-uploads/${batch.id}/resolve`)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-yellow-600 border border-transparent rounded-md hover:bg-yellow-700"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Resolve Issues ({batch.invalidRows + batch.ambiguousRows})
          </button>
        )}

        {batch.status === 'READY_TO_APPLY' && (
          <button
            onClick={handleOpenConfirmModal}
            disabled={!canApply}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Eye className="h-4 w-4 mr-2" />
            Review & Apply Changes
          </button>
        )}

        {batch.status === 'APPLIED' && batch.appliedAt && (
          <div className="text-sm text-green-600">
            <CheckCircle className="h-4 w-4 inline mr-1" />
            Applied on {format(new Date(batch.appliedAt), 'PPp')}
          </div>
        )}

        {batch.status === 'REJECTED' && (
          <div className="text-sm text-red-600">
            <Ban className="h-4 w-4 inline mr-1" />
            This batch was rejected
          </div>
        )}
      </div>

      {/* Confirm Changes Modal */}
      <ConfirmChangesModal
        isOpen={showConfirmModal}
        batchId={batch.id}
        newCount={batch.newRows}
        updateCount={batch.updateRows}
        noopCount={batch.validRows - batch.newRows - batch.updateRows}
        onConfirm={handleApply}
        onCancel={handleCloseConfirmModal}
        isApplying={isApplying}
      />
    </div>
  );
}

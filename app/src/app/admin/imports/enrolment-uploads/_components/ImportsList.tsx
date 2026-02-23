'use client';

/**
 * ImportsList Component
 * Displays list of import batches with status badges
 * Ref: spec/IMPORTS_UI_SPEC.md Section 6
 */

import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { FileSpreadsheet, CheckCircle, XCircle, AlertTriangle, Clock, Loader2 } from 'lucide-react';

interface Batch {
  id: string;
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
  createdAt: Date;
  appliedAt: Date | null;
  creatorName: string | null;
}

interface ImportsListProps {
  batches: Batch[];
}

function getStatusBadge(status: string) {
  const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    RECEIVED: {
      color: 'bg-gray-100 text-gray-700',
      icon: <Clock className="w-3 h-3" />,
      label: 'Received',
    },
    PARSING: {
      color: 'bg-blue-100 text-blue-700',
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
      label: 'Processing',
    },
    PROPOSED_OK: {
      color: 'bg-blue-100 text-blue-700',
      icon: <CheckCircle className="w-3 h-3" />,
      label: 'Ready for Review',
    },
    PROPOSED_NEEDS_REVIEW: {
      color: 'bg-yellow-100 text-yellow-700',
      icon: <AlertTriangle className="w-3 h-3" />,
      label: 'Needs Attention',
    },
    READY_TO_APPLY: {
      color: 'bg-green-100 text-green-700',
      icon: <CheckCircle className="w-3 h-3" />,
      label: 'Ready to Apply',
    },
    APPLYING: {
      color: 'bg-blue-100 text-blue-700',
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
      label: 'Applying...',
    },
    APPLIED: {
      color: 'bg-green-100 text-green-700',
      icon: <CheckCircle className="w-3 h-3" />,
      label: 'Applied',
    },
    REJECTED: {
      color: 'bg-red-100 text-red-700',
      icon: <XCircle className="w-3 h-3" />,
      label: 'Rejected',
    },
    FAILED_VALIDATION: {
      color: 'bg-red-100 text-red-700',
      icon: <XCircle className="w-3 h-3" />,
      label: 'Validation Failed',
    },
    FAILED_SYSTEM: {
      color: 'bg-red-100 text-red-700',
      icon: <XCircle className="w-3 h-3" />,
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
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

function getOutcomeBadge(outcome: string | null) {
  if (!outcome) return null;

  const outcomeConfig: Record<string, { color: string; label: string }> = {
    CONFIRM: { color: 'bg-green-50 text-green-700 border-green-200', label: 'Confirmed' },
    DENY: { color: 'bg-red-50 text-red-700 border-red-200', label: 'Denied' },
    NEEDS_REVIEW: {
      color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      label: 'Needs Review',
    },
  };

  const config = outcomeConfig[outcome];
  if (!config) return null;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${config.color}`}
    >
      {config.label}
    </span>
  );
}

export default function ImportsList({ batches }: ImportsListProps) {
  const router = useRouter();

  if (batches.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">No imports yet</h3>
        <p className="mt-2 text-sm text-gray-500">
          Upload your first classes.xlsx file to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              File
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Rows
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Issues
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Outcome
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Uploaded
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {batches.map(batch => (
            <tr
              key={batch.id}
              onClick={() => router.push(`/admin/imports/enrolment-uploads/${batch.id}`)}
              className="hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <FileSpreadsheet className="h-5 w-5 text-green-600 mr-3" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {batch.fileName || 'Unnamed file'}
                    </div>
                    <div className="text-xs text-gray-500">{batch.id.slice(0, 8)}...</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(batch.status)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div className="space-y-1">
                  <div>{batch.totalRows} total</div>
                  {batch.newRows > 0 && (
                    <div className="text-xs text-green-600">+{batch.newRows} new</div>
                  )}
                  {batch.updateRows > 0 && (
                    <div className="text-xs text-blue-600">{batch.updateRows} updates</div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {batch.invalidRows > 0 || batch.ambiguousRows > 0 ? (
                  <div className="space-y-1">
                    {batch.invalidRows > 0 && (
                      <div className="text-red-600">{batch.invalidRows} invalid</div>
                    )}
                    {batch.ambiguousRows > 0 && (
                      <div className="text-yellow-600">{batch.ambiguousRows} ambiguous</div>
                    )}
                  </div>
                ) : (
                  <span className="text-green-600">None</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {getOutcomeBadge(batch.reviewOutcome)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div>{formatDistanceToNow(new Date(batch.createdAt), { addSuffix: true })}</div>
                {batch.creatorName && (
                  <div className="text-xs text-gray-400">by {batch.creatorName}</div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

'use client';

/**
 * RowResolution Component
 * List of rows with detail panel for resolution
 * Ref: spec/IMPORTS_UI_SPEC.md Section 8
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  XCircle,
  AlertTriangle,
  Ban,
  CheckCircle,
  Loader2,
  ChevronRight,
  Link as LinkIcon,
  Plus,
} from 'lucide-react';

interface Row {
  id: string;
  rowNumber: number;
  rowStatus: string;
  rawData: Record<string, unknown>;
  parsedData: Record<string, unknown> | null;
  validationErrors: Array<{ field: string; message: string }> | null;
  matchCandidates: Array<{
    enrollmentId: string;
    studentName: string | null;
    className: string;
    score: number;
  }> | null;
  resolvedAt: Date | null;
  resolutionType: string | null;
  linkedEnrollmentId: string | null;
  changeId: string | null;
  action: string | null;
  isExcluded: boolean | null;
}

interface Batch {
  id: string;
  fileName: string | null;
  status: string;
  invalidRows: number;
  ambiguousRows: number;
  excludedRows: number;
}

interface RowResolutionProps {
  batch: Batch;
  rows: Row[];
}

type FilterStatus = 'INVALID' | 'AMBIGUOUS' | 'EXCLUDED' | 'ALL';

function getStatusBadge(status: string) {
  const config: Record<string, { color: string; icon: React.ReactNode }> = {
    INVALID: { color: 'bg-red-100 text-red-700', icon: <XCircle className="w-3 h-3" /> },
    AMBIGUOUS: {
      color: 'bg-yellow-100 text-yellow-700',
      icon: <AlertTriangle className="w-3 h-3" />,
    },
    EXCLUDED: { color: 'bg-gray-100 text-gray-700', icon: <Ban className="w-3 h-3" /> },
    VALID: { color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
  };

  const { color, icon } = config[status] || config.VALID;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}
    >
      {icon}
      {status}
    </span>
  );
}

export default function RowResolution({ batch, rows }: RowResolutionProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterStatus>('ALL');
  const [selectedRow, setSelectedRow] = useState<Row | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Count by status
  const counts = {
    INVALID: rows.filter(r => r.rowStatus === 'INVALID').length,
    AMBIGUOUS: rows.filter(r => r.rowStatus === 'AMBIGUOUS').length,
    EXCLUDED: rows.filter(r => r.rowStatus === 'EXCLUDED').length,
    ALL: rows.length,
  };

  // Filter rows
  const filteredRows = filter === 'ALL' ? rows : rows.filter(r => r.rowStatus === filter);

  const handleExclude = async (rowId: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(`/api/imports/batches/${batch.id}/rows/${rowId}/exclude`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to exclude row');
      }

      setSelectedRow(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to exclude row');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResolve = async (
    rowId: string,
    resolutionType: 'linked' | 'new',
    enrollmentId?: string
  ) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(`/api/imports/batches/${batch.id}/rows/${rowId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutionType, enrollmentId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to resolve row');
      }

      setSelectedRow(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve row');
    } finally {
      setIsProcessing(false);
    }
  };

  const isReadOnly = !['PROPOSED_NEEDS_REVIEW', 'PROPOSED_OK'].includes(batch.status);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Row Resolution</h1>
        <p className="text-sm text-gray-500">{batch.fileName || 'Import Batch'}</p>
      </div>

      {/* All Resolved Banner */}
      {batch.invalidRows === 0 && batch.ambiguousRows === 0 && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-sm text-green-700">
              All blocking issues resolved. Return to Batch summary to apply.
            </p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['INVALID', 'AMBIGUOUS', 'EXCLUDED', 'ALL'] as FilterStatus[]).map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              filter === status
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
            <span className="ml-1 text-xs bg-gray-100 px-1.5 py-0.5 rounded-full">
              {counts[status]}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex gap-6">
        {/* Row List */}
        <div className="flex-1 bg-white border border-gray-200 rounded-lg overflow-hidden">
          {filteredRows.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No rows matching this filter</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Row
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Student
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Class
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRows.map(row => {
                  const parsed = row.parsedData as {
                    studentName?: string;
                    className?: string;
                  } | null;
                  const raw = row.rawData as { 'Student Name'?: string; 'Class Name'?: string };

                  return (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedRow(row)}
                      className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedRow?.id === row.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-sm text-gray-900">#{row.rowNumber}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {parsed?.studentName || raw['Student Name'] || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {parsed?.className || raw['Class Name'] || '-'}
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(row.rowStatus)}</td>
                      <td className="px-4 py-3">
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail Panel */}
        {selectedRow && (
          <div className="w-96 bg-white border border-gray-200 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Row #{selectedRow.rowNumber}</h3>
              {getStatusBadge(selectedRow.rowStatus)}
            </div>

            {/* Raw Values */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Raw Values</h4>
              <div className="text-sm space-y-1 bg-gray-50 p-3 rounded">
                {Object.entries(selectedRow.rawData).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-500">{key}:</span>
                    <span className="text-gray-900 font-mono text-xs">
                      {value !== null && value !== undefined ? String(value) : '(empty)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Validation Errors (for INVALID rows) */}
            {selectedRow.rowStatus === 'INVALID' && selectedRow.validationErrors && (
              <div>
                <h4 className="text-sm font-medium text-red-700 mb-2">Validation Errors</h4>
                <ul className="text-sm space-y-1">
                  {selectedRow.validationErrors.map((err, i) => (
                    <li key={i} className="flex items-start gap-2 text-red-600">
                      <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong>{err.field}:</strong> {err.message}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Match Candidates (for AMBIGUOUS rows) */}
            {selectedRow.rowStatus === 'AMBIGUOUS' && selectedRow.matchCandidates && (
              <div>
                <h4 className="text-sm font-medium text-yellow-700 mb-2">Match Candidates</h4>
                <div className="space-y-2">
                  {selectedRow.matchCandidates.map(candidate => (
                    <div
                      key={candidate.enrollmentId}
                      className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors"
                      onClick={() =>
                        !isReadOnly &&
                        !isProcessing &&
                        handleResolve(selectedRow.id, 'linked', candidate.enrollmentId)
                      }
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{candidate.studentName}</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          {candidate.score}% match
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{candidate.className}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Actions */}
            {!isReadOnly && (
              <div className="pt-4 border-t border-gray-200 space-y-2">
                {selectedRow.rowStatus === 'INVALID' && (
                  <button
                    onClick={() => handleExclude(selectedRow.id)}
                    disabled={isProcessing}
                    className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Ban className="h-4 w-4 mr-2" />
                    )}
                    Exclude Row
                  </button>
                )}

                {selectedRow.rowStatus === 'AMBIGUOUS' && (
                  <>
                    <p className="text-xs text-gray-500 text-center">
                      Click a candidate above to link, or:
                    </p>
                    <button
                      onClick={() => handleResolve(selectedRow.id, 'new')}
                      disabled={isProcessing}
                      className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Treat as New Enrolment
                    </button>
                  </>
                )}

                {selectedRow.rowStatus === 'EXCLUDED' && (
                  <p className="text-sm text-gray-500 text-center">
                    This row has been excluded from processing.
                  </p>
                )}
              </div>
            )}

            {isReadOnly && (
              <p className="text-sm text-gray-500 text-center pt-4">
                Resolution is not available in {batch.status} status.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

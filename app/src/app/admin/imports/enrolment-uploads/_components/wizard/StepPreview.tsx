'use client';

/**
 * StepPreview - Wizard Step 3
 * Clean table showing parsed data, column mapping status, row preview
 */

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Info,
  FileSpreadsheet,
} from 'lucide-react';

interface BatchDetails {
  id: string;
  fileName: string | null;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  ambiguousRows: number;
  newRows: number;
  updateRows: number;
  ignoredColumns: string[] | null;
}

interface PreviewRow {
  id: string;
  rowNumber: number;
  parsedData: Record<string, unknown>;
  rowStatus: string;
}

interface StepPreviewProps {
  batchId: string;
  onConfirm: () => void;
  onBack: () => void;
}

// Columns to display in preview
const PREVIEW_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'className', label: 'Class' },
  { key: 'courseStartDate', label: 'Start Date' },
  { key: 'courseEndDate', label: 'End Date' },
  { key: 'weeks', label: 'Weeks' },
  { key: 'courseName', label: 'Course' },
];

function formatValue(value: unknown, key: string): string {
  if (value === null || value === undefined || value === '') return '-';

  if (key.includes('Date') || key === 'startDate' || key === 'endDate') {
    try {
      return format(new Date(value as string), 'dd/MM/yyyy');
    } catch {
      return String(value);
    }
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return String(value);
}

export default function StepPreview({ batchId, onConfirm, onBack }: StepPreviewProps) {
  const [batch, setBatch] = useState<BatchDetails | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch batch details and first 20 rows in parallel
      const [batchRes, rowsRes] = await Promise.all([
        fetch(`/api/imports/batches/${batchId}`),
        fetch(`/api/imports/batches/${batchId}/rows?limit=20&offset=0`),
      ]);

      if (!batchRes.ok || !rowsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const batchData = await batchRes.json();
      const rowsData = await rowsRes.json();

      setBatch(batchData.batch);
      setRows(rowsData.rows || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return (
      <div className="p-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error || 'Failed to load batch'}</p>
        </div>
        <div className="mt-4">
          <button
            onClick={onBack}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Preview Data</h2>
          <p className="mt-1 text-sm text-gray-500">
            Review the parsed data before proceeding to the review stage
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <FileSpreadsheet className="h-4 w-4" />
          {batch.fileName}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-2xl font-semibold text-gray-900">{batch.totalRows}</p>
          <p className="text-sm text-gray-500">Total Rows</p>
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
          <p className="text-2xl font-semibold text-green-600">{batch.validRows}</p>
          <p className="text-sm text-green-600">Valid</p>
        </div>
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-2xl font-semibold text-blue-600">{batch.newRows}</p>
          <p className="text-sm text-blue-600">New Students</p>
        </div>
        <div className="p-4 bg-amber-50 rounded-lg">
          <p className="text-2xl font-semibold text-amber-600">{batch.updateRows}</p>
          <p className="text-sm text-amber-600">Updates</p>
        </div>
      </div>

      {/* Issues Warning */}
      {(batch.invalidRows > 0 || batch.ambiguousRows > 0) && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-700">
              <p className="font-medium">Issues detected</p>
              <p className="mt-1">
                {batch.invalidRows > 0 && `${batch.invalidRows} invalid rows`}
                {batch.invalidRows > 0 && batch.ambiguousRows > 0 && ', '}
                {batch.ambiguousRows > 0 && `${batch.ambiguousRows} ambiguous matches`}. These will
                need to be resolved in the next step.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ignored Columns */}
      {batch.ignoredColumns && batch.ignoredColumns.length > 0 && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-600">
              <p className="font-medium">Ignored columns</p>
              <p className="mt-1">{batch.ignoredColumns.join(', ')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Data Preview Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-700">Preview (first {rows.length} rows)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Row
                </th>
                {PREVIEW_COLUMNS.map(col => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {col.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.map(row => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500">{row.rowNumber}</td>
                  {PREVIEW_COLUMNS.map(col => (
                    <td key={col.key} className="px-4 py-3 text-sm text-gray-900">
                      {formatValue(row.parsedData[col.key], col.key)}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    {row.rowStatus === 'VALID' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                        <CheckCircle className="h-3 w-3" />
                        Valid
                      </span>
                    ) : row.rowStatus === 'AMBIGUOUS' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
                        <AlertTriangle className="h-3 w-3" />
                        Ambiguous
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                        <AlertTriangle className="h-3 w-3" />
                        Invalid
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {batch.totalRows > 20 && (
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 text-sm text-gray-500">
            Showing 20 of {batch.totalRows} rows
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t">
        <button
          onClick={onBack}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </button>
        <button
          onClick={onConfirm}
          className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors"
        >
          Continue to Review
          <ChevronRight className="h-4 w-4 ml-2" />
        </button>
      </div>
    </div>
  );
}

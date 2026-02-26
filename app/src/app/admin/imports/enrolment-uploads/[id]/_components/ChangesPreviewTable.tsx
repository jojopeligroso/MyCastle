'use client';

/**
 * ChangesPreviewTable Component
 * Reusable paginated table for displaying import inserts/updates with actual data
 */

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2, ArrowRight } from 'lucide-react';

interface ParsedData {
  studentName: string | null;
  className: string | null;
  startDate: string | null;
  endDate: string | null;
  course?: string | null;
  weeks?: number | null;
  isVisaStudent?: boolean | null;
  includeOnRegister?: boolean | null;
}

interface DiffField {
  old: string | number | boolean | null;
  new: string | number | boolean | null;
}

interface RowData {
  id: string;
  rowNumber: number;
  parsedData: ParsedData;
  action: 'INSERT' | 'UPDATE' | 'NOOP';
  diff?: Record<string, DiffField> | null;
}

interface ChangesPreviewTableProps {
  batchId: string;
  action: 'INSERT' | 'UPDATE';
  pageSize?: number;
}

export default function ChangesPreviewTable({
  batchId,
  action,
  pageSize = 25,
}: ChangesPreviewTableProps) {
  const [rows, setRows] = useState<RowData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchRows = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/imports/batches/${batchId}/rows?action=${action}&limit=${pageSize}&offset=${page * pageSize}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch rows');
        }

        const data = await response.json();
        setRows(data.rows);
        setTotal(data.pagination?.total || data.rows.length);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRows();
  }, [batchId, action, page, pageSize]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy');
    } catch {
      return dateStr;
    }
  };

  const formatDiffValue = (value: string | number | boolean | null): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
      return formatDate(value);
    }
    return String(value);
  };

  const totalPages = Math.ceil(total / pageSize);
  const startItem = page * pageSize + 1;
  const endItem = Math.min((page + 1) * pageSize, total);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No {action === 'INSERT' ? 'new records' : 'updates'} in this batch.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Row
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Class Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Start Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                End Date
              </th>
              {action === 'UPDATE' && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Changes
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.map(row => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {row.rowNumber}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {row.parsedData.studentName || '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {row.parsedData.className || '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(row.parsedData.startDate)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(row.parsedData.endDate)}
                </td>
                {action === 'UPDATE' && (
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {row.diff && Object.keys(row.diff).length > 0 ? (
                      <div className="space-y-1">
                        {Object.entries(row.diff).map(([field, change]) => (
                          <div key={field} className="flex items-center gap-2 text-xs">
                            <span className="font-medium text-gray-600">{field}:</span>
                            <span className="text-red-600 line-through">
                              {formatDiffValue(change.old)}
                            </span>
                            <ArrowRight className="h-3 w-3 text-gray-400" />
                            <span className="text-green-600">{formatDiffValue(change.new)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-gray-500">
            Showing {startItem}-{endItem} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-2 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-gray-700">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-2 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

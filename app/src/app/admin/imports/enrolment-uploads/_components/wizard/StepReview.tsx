'use client';

/**
 * StepReview - Wizard Step 4
 * Main work area with status tabs, editable fields, row actions, bulk actions
 * Includes "Mark as New Student" (force_new) functionality
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle,
  AlertTriangle,
  User,
  Mail,
  UserPlus,
  XCircle,
  CheckSquare,
  Square,
  Edit2,
  Save,
  X,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type RowAction = 'INSERT' | 'UPDATE' | 'NOOP' | 'INVALID';
type RowConfirmation = 'pending' | 'confirmed' | 'quarantined';
type TabFilter = 'all' | 'valid' | 'needs_review' | 'new' | 'updates';

interface DiffEntry {
  old: unknown;
  new: unknown;
}

interface RowData {
  id: string;
  rowNumber: number;
  rowStatus: string;
  confirmation: RowConfirmation;
  action: RowAction;
  parsedData: Record<string, unknown>;
  editedData?: Record<string, unknown>;
  diff?: Record<string, DiffEntry>;
  validationErrors?: Array<{ field: string; message: string }>;
  matchedEmail?: string | null;
  matchedUuid?: string | null;
  linkedEnrollmentId?: string | null;
  resolutionType?: string | null;
}

interface BatchDetails {
  status: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  ambiguousRows: number;
  newRows: number;
  updateRows: number;
  excludedRows: number;
  reviewOutcome: string | null;
}

interface StepReviewProps {
  batchId: string;
  onComplete: () => void;
  onBack: () => void;
}

const EDITABLE_IDENTITY_FIELDS = ['name', 'email', 'nationality', 'phone'];
const EDITABLE_ENROLLMENT_FIELDS = ['className', 'courseStartDate', 'courseEndDate', 'weeks'];

export default function StepReview({ batchId, onComplete, onBack }: StepReviewProps) {
  const router = useRouter();
  const [rows, setRows] = useState<RowData[]>([]);
  const [batch, setBatch] = useState<BatchDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, unknown>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isTriaging, setIsTriaging] = useState(false);
  const pageSize = 25;

  // Fetch batch and rows
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [batchRes, rowsRes] = await Promise.all([
        fetch(`/api/imports/batches/${batchId}`),
        fetch(`/api/imports/batches/${batchId}/rows?limit=${pageSize}&offset=${page * pageSize}`),
      ]);

      if (!batchRes.ok || !rowsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const batchData = await batchRes.json();
      const rowsData = await rowsRes.json();

      setBatch(batchData.batch);
      setRows(rowsData.rows || []);
      setTotal(rowsData.pagination?.total || rowsData.rows?.length || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [batchId, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter rows by tab
  const filteredRows = useMemo(() => {
    switch (activeTab) {
      case 'valid':
        return rows.filter(r => r.rowStatus === 'VALID' && !r.validationErrors?.length);
      case 'needs_review':
        return rows.filter(
          r =>
            r.rowStatus === 'INVALID' ||
            r.rowStatus === 'AMBIGUOUS' ||
            (r.validationErrors?.length ?? 0) > 0
        );
      case 'new':
        return rows.filter(r => r.action === 'INSERT');
      case 'updates':
        return rows.filter(r => r.action === 'UPDATE');
      default:
        return rows;
    }
  }, [rows, activeTab]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      all: rows.length,
      valid: rows.filter(r => r.rowStatus === 'VALID' && !r.validationErrors?.length).length,
      needs_review: rows.filter(
        r =>
          r.rowStatus === 'INVALID' ||
          r.rowStatus === 'AMBIGUOUS' ||
          (r.validationErrors?.length ?? 0) > 0
      ).length,
      new: rows.filter(r => r.action === 'INSERT').length,
      updates: rows.filter(r => r.action === 'UPDATE').length,
    };
  }, [rows]);

  // Check if ready to proceed
  const canProceed = useMemo(() => {
    if (!batch) return false;
    return batch.invalidRows === 0 && batch.ambiguousRows === 0;
  }, [batch]);

  // Handle row confirmation toggle
  const handleToggleConfirm = useCallback(
    async (rowId: string) => {
      const row = rows.find(r => r.id === rowId);
      if (!row) return;

      const newStatus: RowConfirmation =
        row.confirmation === 'confirmed' ? 'quarantined' : 'confirmed';

      try {
        const response = await fetch(`/api/imports/batches/${batchId}/rows/${rowId}/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });

        if (!response.ok) throw new Error('Failed to update');

        setRows(prev => prev.map(r => (r.id === rowId ? { ...r, confirmation: newStatus } : r)));
      } catch (err) {
        console.error('Toggle failed:', err);
      }
    },
    [rows, batchId]
  );

  // Handle "Mark as New Student" (force_new)
  const handleForceNew = useCallback(
    async (rowId: string) => {
      setIsSaving(true);
      try {
        const response = await fetch(`/api/imports/batches/${batchId}/rows/${rowId}/resolve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resolutionType: 'force_new' }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to mark as new');
        }

        // Refresh data
        await fetchData();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to mark as new student');
      } finally {
        setIsSaving(false);
      }
    },
    [batchId, fetchData]
  );

  // Handle exclude row
  const handleExclude = useCallback(
    async (rowId: string) => {
      try {
        const response = await fetch(`/api/imports/batches/${batchId}/rows/${rowId}/exclude`, {
          method: 'POST',
        });

        if (!response.ok) throw new Error('Failed to exclude');

        await fetchData();
      } catch (err) {
        console.error('Exclude failed:', err);
      }
    },
    [batchId, fetchData]
  );

  // Handle inline edit
  const startEditing = useCallback((row: RowData) => {
    setEditingRowId(row.id);
    setEditValues({
      name: row.editedData?.name ?? row.parsedData.name ?? '',
      email: row.editedData?.email ?? '',
      nationality: row.editedData?.nationality ?? row.parsedData.nationality ?? '',
      className: row.editedData?.className ?? row.parsedData.className ?? '',
      courseStartDate: row.editedData?.courseStartDate ?? row.parsedData.courseStartDate ?? '',
      courseEndDate: row.editedData?.courseEndDate ?? row.parsedData.courseEndDate ?? '',
      weeks: row.editedData?.weeks ?? row.parsedData.weeks ?? '',
    });
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingRowId(null);
    setEditValues({});
  }, []);

  const saveEditing = useCallback(async () => {
    if (!editingRowId) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/imports/batches/${batchId}/rows/${editingRowId}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editValues),
      });

      if (!response.ok) throw new Error('Failed to save');

      // Update local state
      setRows(prev =>
        prev.map(r =>
          r.id === editingRowId ? { ...r, editedData: { ...r.editedData, ...editValues } } : r
        )
      );
      setEditingRowId(null);
      setEditValues({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }, [editingRowId, editValues, batchId]);

  // Handle triage (confirm batch)
  const handleTriage = useCallback(async () => {
    setIsTriaging(true);
    try {
      const response = await fetch(`/api/imports/batches/${batchId}/triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewOutcome: 'CONFIRM', reviewComment: '' }),
      });

      if (!response.ok) throw new Error('Failed to triage');

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm');
    } finally {
      setIsTriaging(false);
    }
  }, [batchId, onComplete]);

  // Bulk confirm all
  const handleConfirmAll = useCallback(async () => {
    const rowIds = rows.filter(r => r.confirmation !== 'confirmed').map(r => r.id);

    try {
      await Promise.all(
        rowIds.map(rowId =>
          fetch(`/api/imports/batches/${batchId}/rows/${rowId}/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'confirmed' }),
          })
        )
      );

      setRows(prev => prev.map(r => ({ ...r, confirmation: 'confirmed' as const })));
    } catch (err) {
      console.error('Confirm all failed:', err);
    }
  }, [rows, batchId]);

  // Bulk quarantine invalid
  const handleQuarantineInvalid = useCallback(async () => {
    const invalidRows = rows.filter(
      r => r.rowStatus === 'INVALID' || (r.validationErrors?.length ?? 0) > 0
    );

    try {
      await Promise.all(
        invalidRows.map(row =>
          fetch(`/api/imports/batches/${batchId}/rows/${row.id}/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'quarantined' }),
          })
        )
      );

      await fetchData();
    } catch (err) {
      console.error('Quarantine invalid failed:', err);
    }
  }, [rows, batchId, fetchData]);

  if (isLoading) {
    return (
      <div className="p-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
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

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 pb-0">
        <h2 className="text-xl font-semibold text-gray-900">Review & Edit</h2>
        <p className="mt-1 text-sm text-gray-500">
          Review rows, resolve issues, and confirm changes before applying
        </p>
      </div>

      {/* Stats */}
      {batch && (
        <div className="px-6 grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="p-3 bg-gray-50 rounded-lg text-center">
            <p className="text-xl font-semibold text-gray-900">{batch.totalRows}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg text-center">
            <p className="text-xl font-semibold text-green-600">{batch.validRows}</p>
            <p className="text-xs text-green-600">Valid</p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg text-center">
            <p className="text-xl font-semibold text-red-600">{batch.invalidRows}</p>
            <p className="text-xs text-red-600">Invalid</p>
          </div>
          <div className="p-3 bg-yellow-50 rounded-lg text-center">
            <p className="text-xl font-semibold text-yellow-600">{batch.ambiguousRows}</p>
            <p className="text-xs text-yellow-600">Ambiguous</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg text-center">
            <p className="text-xl font-semibold text-blue-600">{batch.newRows}</p>
            <p className="text-xs text-blue-600">New</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg text-center">
            <p className="text-xl font-semibold text-amber-600">{batch.updateRows}</p>
            <p className="text-xs text-amber-600">Updates</p>
          </div>
        </div>
      )}

      {/* Gating Warning */}
      {!canProceed && (
        <div className="mx-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-700">
              <p className="font-medium">Action required</p>
              <p className="mt-1">
                Resolve or exclude all invalid and ambiguous rows before proceeding.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="px-6">
        <div className="flex gap-2 border-b border-gray-200">
          {[
            { id: 'all', label: 'All' },
            { id: 'valid', label: 'Valid' },
            { id: 'needs_review', label: 'Needs Review' },
            { id: 'new', label: 'New' },
            { id: 'updates', label: 'Updates' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabFilter)}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              {tab.label}
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100">
                {tabCounts[tab.id as TabFilter]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="px-6 flex items-center gap-3">
        <button
          onClick={handleConfirmAll}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100"
        >
          <CheckSquare className="w-4 h-4 mr-1.5" />
          Confirm All
        </button>
        <button
          onClick={handleQuarantineInvalid}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100"
        >
          <AlertTriangle className="w-4 h-4 mr-1.5" />
          Quarantine Invalid
        </button>
      </div>

      {/* Table */}
      <div className="px-6">
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Confirm
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Row
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Class
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Start Date
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Action
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Row Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRows.map(row => {
                  const isEditing = editingRowId === row.id;
                  const hasErrors = (row.validationErrors?.length ?? 0) > 0;
                  const isQuarantined = row.confirmation === 'quarantined';

                  return (
                    <tr
                      key={row.id}
                      className={cn('hover:bg-gray-50', isQuarantined && 'opacity-50 bg-gray-100')}
                    >
                      {/* Confirm checkbox */}
                      <td className="px-3 py-3">
                        <button
                          onClick={() => handleToggleConfirm(row.id)}
                          className="p-1 rounded hover:bg-gray-100"
                        >
                          {row.confirmation === 'confirmed' ? (
                            <CheckSquare className="w-5 h-5 text-green-600" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      </td>

                      {/* Row number */}
                      <td className="px-3 py-3 text-sm text-gray-500">{row.rowNumber}</td>

                      {/* Name (editable) */}
                      <td className="px-3 py-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={String(editValues.name || '')}
                            onChange={e => setEditValues(v => ({ ...v, name: e.target.value }))}
                            className="w-full px-2 py-1 text-sm border rounded"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">
                              {String(
                                row.editedData?.name ??
                                  row.parsedData.name ??
                                  row.parsedData.studentName ??
                                  '-'
                              )}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Class */}
                      <td className="px-3 py-3 text-sm text-gray-900">
                        {isEditing ? (
                          <input
                            type="text"
                            value={String(editValues.className || '')}
                            onChange={e =>
                              setEditValues(v => ({ ...v, className: e.target.value }))
                            }
                            className="w-full px-2 py-1 text-sm border rounded"
                          />
                        ) : (
                          String(row.editedData?.className ?? row.parsedData.className ?? '-')
                        )}
                      </td>

                      {/* Start Date */}
                      <td className="px-3 py-3 text-sm text-gray-900">
                        {isEditing ? (
                          <input
                            type="date"
                            value={String(editValues.courseStartDate || '')}
                            onChange={e =>
                              setEditValues(v => ({ ...v, courseStartDate: e.target.value }))
                            }
                            className="px-2 py-1 text-sm border rounded"
                          />
                        ) : (
                          (() => {
                            const date =
                              row.editedData?.courseStartDate ??
                              row.parsedData.courseStartDate ??
                              row.parsedData.startDate;
                            if (!date) return '-';
                            try {
                              return format(new Date(date as string), 'dd/MM/yyyy');
                            } catch {
                              return String(date);
                            }
                          })()
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3">
                        {hasErrors || row.rowStatus === 'INVALID' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                            <XCircle className="w-3 h-3" />
                            Invalid
                          </span>
                        ) : row.rowStatus === 'AMBIGUOUS' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
                            <AlertTriangle className="w-3 h-3" />
                            Ambiguous
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                            <CheckCircle className="w-3 h-3" />
                            Valid
                          </span>
                        )}
                      </td>

                      {/* Action badge */}
                      <td className="px-3 py-3">
                        {row.action === 'INSERT' ? (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                            NEW
                          </span>
                        ) : row.action === 'UPDATE' ? (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                            UPDATE
                          </span>
                        ) : row.action === 'NOOP' ? (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                            NO CHANGE
                          </span>
                        ) : null}
                      </td>

                      {/* Row Actions */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={saveEditing}
                                disabled={isSaving}
                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                                title="Save"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditing(row)}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {(row.rowStatus === 'AMBIGUOUS' || row.action === 'UPDATE') && (
                                <button
                                  onClick={() => handleForceNew(row.id)}
                                  disabled={isSaving}
                                  className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                                  title="Create as New Student"
                                >
                                  <UserPlus className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleExclude(row.id)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                title="Exclude"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t">
              <p className="text-sm text-gray-500">
                Page {page + 1} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-2 rounded border hover:bg-gray-100 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-2 rounded border hover:bg-gray-100 disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-6 pt-0 flex justify-between border-t">
        <button
          onClick={onBack}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </button>
        <button
          onClick={handleTriage}
          disabled={!canProceed || isTriaging}
          className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isTriaging ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Confirming...
            </>
          ) : (
            <>
              Confirm & Continue
              <ChevronRight className="h-4 w-4 ml-2" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

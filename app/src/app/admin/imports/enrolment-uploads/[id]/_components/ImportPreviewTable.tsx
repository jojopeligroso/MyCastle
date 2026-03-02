'use client';

/**
 * ImportPreviewTable Component
 * Editable preview table with checkboxes for confirm/quarantine
 * Shows all changes with color coding: green=new, amber=changed, grey=unchanged
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckSquare,
  Square,
  MinusSquare,
  AlertTriangle,
  ArrowRight,
  User,
  Mail,
  Hash,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import EditableCell, { FieldType } from './EditableCell';

// ============================================
// Types
// ============================================

type RowAction = 'INSERT' | 'UPDATE' | 'NOOP' | 'INVALID';
type RowConfirmation = 'pending' | 'confirmed' | 'quarantined';

interface DiffEntry {
  old: unknown;
  new: unknown;
}

interface PreviewRowData {
  id: string;
  rowNumber: number;
  rowStatus: string;
  confirmation: RowConfirmation;
  action: RowAction;
  parsedData: Record<string, unknown>;
  editedData?: Record<string, unknown>;
  diff?: Record<string, DiffEntry>;
  validationErrors?: Array<{ field: string; message: string }>;
  // Identity fields from joined user
  matchedEmail?: string | null;
  matchedUuid?: string | null;
}

interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  editable: boolean;
}

interface ImportPreviewTableProps {
  batchId: string;
  pageSize?: number;
  /** Callback when row selections change */
  onSelectionChange?: (confirmedCount: number, quarantinedCount: number) => void;
}

// ============================================
// Field Configuration
// ============================================

// Identity fields are displayed separately in fixed columns
const _IDENTITY_FIELDS: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'string', editable: false },
];

const PREVIEW_FIELDS: FieldConfig[] = [
  { name: 'courseName', label: 'Course', type: 'string', editable: true },
  { name: 'className', label: 'Class', type: 'string', editable: true },
  { name: 'courseStartDate', label: 'Start Date', type: 'date', editable: true },
  { name: 'courseEndDate', label: 'End Date', type: 'date', editable: true },
  { name: 'weeks', label: 'Weeks', type: 'number', editable: true },
  { name: 'isVisaStudent', label: 'Visa', type: 'boolean', editable: true },
  { name: 'totalBookingEur', label: 'Total', type: 'currency', editable: true },
];

// ============================================
// Helper Functions
// ============================================

function formatValue(value: unknown, type: FieldType): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  switch (type) {
    case 'date':
      try {
        return format(new Date(value as string), 'dd/MM/yyyy');
      } catch {
        return String(value);
      }
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'currency':
      return `€${Number(value).toFixed(2)}`;
    default:
      return String(value);
  }
}

function getActionBadge(action: RowAction, hasErrors: boolean) {
  if (hasErrors) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
        <AlertTriangle className="w-3 h-3" />
        ISSUE
      </span>
    );
  }

  switch (action) {
    case 'INSERT':
      return (
        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
          NEW
        </span>
      );
    case 'UPDATE':
      return (
        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
          UPDATE
        </span>
      );
    case 'NOOP':
      return (
        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
          NO CHANGE
        </span>
      );
    default:
      return null;
  }
}

// ============================================
// Row Component
// ============================================

interface PreviewRowProps {
  row: PreviewRowData;
  batchId: string;
  isSelected: boolean;
  onToggle: (rowId: string) => void;
  onCellEdit: (rowId: string, fieldName: string, newValue: unknown) => void;
}

function PreviewRow({ row, batchId, isSelected, onToggle, onCellEdit }: PreviewRowProps) {
  const hasErrors = (row.validationErrors?.length ?? 0) > 0 || row.rowStatus === 'INVALID';
  const isQuarantined = row.confirmation === 'quarantined';

  // Get effective value (editedData takes precedence over parsedData)
  const getValue = (fieldName: string): unknown => {
    if (row.editedData && row.editedData[fieldName] !== undefined) {
      return row.editedData[fieldName];
    }
    return row.parsedData[fieldName];
  };

  // Check if field has a diff
  const getDiff = (fieldName: string): DiffEntry | null => {
    if (!row.diff) return null;
    return row.diff[fieldName] || null;
  };

  // Determine cell styling based on action and diff
  const getCellStyle = (fieldName: string): string => {
    const diff = getDiff(fieldName);
    const hasEdit = row.editedData && row.editedData[fieldName] !== undefined;

    if (hasEdit) {
      return 'bg-blue-50';
    }

    if (row.action === 'INSERT') {
      return 'bg-green-50';
    }

    if (row.action === 'UPDATE' && diff) {
      return 'bg-amber-50';
    }

    return 'bg-gray-50';
  };

  return (
    <tr
      className={cn(
        'hover:bg-gray-50 transition-colors',
        isQuarantined && 'opacity-50 bg-gray-100'
      )}
    >
      {/* Checkbox */}
      <td className="px-3 py-2 whitespace-nowrap">
        <button
          onClick={() => onToggle(row.id)}
          className="p-1 rounded hover:bg-gray-100"
          title={isSelected ? 'Quarantine this row' : 'Confirm this row'}
        >
          {isSelected ? (
            <CheckSquare className="w-5 h-5 text-green-600" />
          ) : (
            <Square className="w-5 h-5 text-gray-400" />
          )}
        </button>
      </td>

      {/* Row Number */}
      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">{row.rowNumber}</td>

      {/* Identity: Name */}
      <td className="px-3 py-2 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-gray-400" />
          <span className="font-medium text-gray-900">
            {String(getValue('name') || getValue('studentName') || '-')}
          </span>
        </div>
      </td>

      {/* Identity: Email */}
      <td className="px-3 py-2 whitespace-nowrap">
        {row.matchedEmail ? (
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 truncate max-w-[150px]">{row.matchedEmail}</span>
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>

      {/* Identity: UUID */}
      <td className="px-3 py-2 whitespace-nowrap">
        {row.matchedUuid ? (
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500 font-mono truncate max-w-[80px]">
              {row.matchedUuid.slice(0, 8)}
            </span>
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>

      {/* Action Badge */}
      <td className="px-3 py-2 whitespace-nowrap">{getActionBadge(row.action, hasErrors)}</td>

      {/* Changes Column */}
      <td className="px-4 py-2">
        {hasErrors ? (
          <div className="space-y-1">
            {row.validationErrors?.map((err, i) => (
              <div key={i} className="text-xs text-red-600">
                {err.field}: {err.message}
              </div>
            ))}
          </div>
        ) : row.action === 'INSERT' ? (
          <div className="space-y-1">
            {PREVIEW_FIELDS.map(field => {
              const value = getValue(field.name);
              if (value === null || value === undefined) return null;
              return (
                <div key={field.name} className="flex items-center gap-2 text-xs">
                  <span className="font-medium text-gray-500 min-w-[70px]">{field.label}:</span>
                  <span className={cn('px-1 rounded', getCellStyle(field.name))}>
                    {field.editable ? (
                      <EditableCell
                        rowId={row.id}
                        batchId={batchId}
                        fieldName={field.name}
                        fieldType={field.type}
                        value={value}
                        originalValue={row.parsedData[field.name]}
                        isEditable={true}
                        onSave={(name, val) => onCellEdit(row.id, name, val)}
                      />
                    ) : (
                      formatValue(value, field.type)
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        ) : row.action === 'UPDATE' && row.diff ? (
          <div className="space-y-1">
            {Object.entries(row.diff).map(([fieldName, diff]) => {
              const fieldConfig = PREVIEW_FIELDS.find(f => f.name === fieldName);
              const fieldType = fieldConfig?.type || 'string';
              const fieldLabel = fieldConfig?.label || fieldName;

              return (
                <div key={fieldName} className="flex items-center gap-2 text-xs">
                  <span className="font-medium text-gray-500 min-w-[70px]">{fieldLabel}:</span>
                  <span className="text-red-600 line-through bg-red-50 px-1 rounded">
                    {formatValue(diff.old, fieldType)}
                  </span>
                  <ArrowRight className="w-3 h-3 text-gray-400" />
                  <span className={cn('px-1 rounded', getCellStyle(fieldName))}>
                    {fieldConfig?.editable ? (
                      <EditableCell
                        rowId={row.id}
                        batchId={batchId}
                        fieldName={fieldName}
                        fieldType={fieldType}
                        value={getValue(fieldName) ?? diff.new}
                        originalValue={diff.new}
                        isEditable={true}
                        onSave={(name, val) => onCellEdit(row.id, name, val)}
                      />
                    ) : (
                      formatValue(diff.new, fieldType)
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <span className="text-xs text-gray-400 italic">No changes</span>
        )}
      </td>
    </tr>
  );
}

// ============================================
// Main Component
// ============================================

export default function ImportPreviewTable({
  batchId,
  pageSize = 25,
  onSelectionChange,
}: ImportPreviewTableProps) {
  const [rows, setRows] = useState<PreviewRowData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  // Track confirmed rows
  const confirmedRows = useMemo(() => {
    return new Set(rows.filter(r => r.confirmation === 'confirmed').map(r => r.id));
  }, [rows]);

  const quarantinedRows = useMemo(() => {
    return new Set(rows.filter(r => r.confirmation === 'quarantined').map(r => r.id));
  }, [rows]);

  // Fetch rows
  const fetchRows = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/imports/batches/${batchId}/rows?limit=${pageSize}&offset=${page * pageSize}`
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
  }, [batchId, page, pageSize]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  // Notify parent of selection changes
  useEffect(() => {
    onSelectionChange?.(confirmedRows.size, quarantinedRows.size);
  }, [confirmedRows.size, quarantinedRows.size, onSelectionChange]);

  // Toggle row confirmation
  const handleToggle = async (rowId: string) => {
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

      if (!response.ok) {
        throw new Error('Failed to update row status');
      }

      // Update local state
      setRows(prev => prev.map(r => (r.id === rowId ? { ...r, confirmation: newStatus } : r)));
    } catch (err) {
      console.error('Failed to toggle row:', err);
    }
  };

  // Handle cell edit
  const handleCellEdit = (rowId: string, fieldName: string, newValue: unknown) => {
    setRows(prev =>
      prev.map(r => {
        if (r.id !== rowId) return r;
        return {
          ...r,
          editedData: { ...r.editedData, [fieldName]: newValue },
        };
      })
    );
  };

  // Bulk actions
  const handleConfirmAll = async () => {
    try {
      const rowIds = rows.filter(r => r.confirmation !== 'confirmed').map(r => r.id);

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
      console.error('Failed to confirm all:', err);
    }
  };

  const handleQuarantineInvalid = async () => {
    try {
      const invalidRows = rows.filter(
        r => r.rowStatus === 'INVALID' || (r.validationErrors?.length ?? 0) > 0
      );

      await Promise.all(
        invalidRows.map(row =>
          fetch(`/api/imports/batches/${batchId}/rows/${row.id}/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'quarantined' }),
          })
        )
      );

      setRows(prev =>
        prev.map(r => {
          if (r.rowStatus === 'INVALID' || (r.validationErrors?.length ?? 0) > 0) {
            return { ...r, confirmation: 'quarantined' as const };
          }
          return r;
        })
      );
    } catch (err) {
      console.error('Failed to quarantine invalid:', err);
    }
  };

  // Pagination
  const totalPages = Math.ceil(total / pageSize);
  const startItem = page * pageSize + 1;
  const endItem = Math.min((page + 1) * pageSize, total);

  // All selected check
  const allSelected = rows.length > 0 && rows.every(r => r.confirmation === 'confirmed');
  const someSelected = rows.some(r => r.confirmation === 'confirmed');

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
    return <div className="text-center py-12 text-gray-500">No rows in this batch.</div>;
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs bg-gray-50 p-3 rounded-lg border">
        <span className="font-medium text-gray-700">Color Key:</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
          <span>New value (INSERT)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-amber-50 border border-amber-200 rounded"></div>
          <span>Changed value (UPDATE)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-blue-50 border border-blue-200 rounded"></div>
          <span>Edited by admin</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-gray-50 border border-gray-200 rounded"></div>
          <span>Unchanged</span>
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="flex items-center gap-3">
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
        <div className="flex-1"></div>
        <span className="text-sm text-gray-500">
          {confirmedRows.size} confirmed, {quarantinedRows.size} quarantined
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left">
                <button
                  onClick={() => (allSelected ? null : handleConfirmAll())}
                  className="p-0.5 rounded hover:bg-gray-100"
                  title="Toggle all"
                >
                  {allSelected ? (
                    <CheckSquare className="w-5 h-5 text-green-600" />
                  ) : someSelected ? (
                    <MinusSquare className="w-5 h-5 text-gray-400" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Row
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                UUID
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Changes
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.map(row => (
              <PreviewRow
                key={row.id}
                row={row}
                batchId={batchId}
                isSelected={row.confirmation === 'confirmed'}
                onToggle={handleToggle}
                onCellEdit={handleCellEdit}
              />
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

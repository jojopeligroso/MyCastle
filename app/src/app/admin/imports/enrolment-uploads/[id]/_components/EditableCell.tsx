'use client';

/**
 * EditableCell Component
 * Inline cell editing with auto-save on blur
 * Supports different input types based on field type
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FieldType = 'string' | 'number' | 'date' | 'boolean' | 'currency';

interface EditableCellProps {
  /** Row ID for API calls */
  rowId: string;
  /** Batch ID for API calls */
  batchId: string;
  /** Field name (camelCase) */
  fieldName: string;
  /** Field type for input rendering */
  fieldType: FieldType;
  /** Current value (from parsedData or editedData) */
  value: unknown;
  /** Original value (before any edits) */
  originalValue?: unknown;
  /** Whether the field is editable */
  isEditable: boolean;
  /** Callback when value is saved */
  onSave?: (fieldName: string, newValue: unknown) => void;
}

/**
 * Format a value for display
 */
function formatDisplayValue(value: unknown, fieldType: FieldType): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  switch (fieldType) {
    case 'date':
      try {
        const date = new Date(value as string);
        return format(date, 'dd/MM/yyyy');
      } catch {
        return String(value);
      }
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'currency':
      return `€${Number(value).toFixed(2)}`;
    case 'number':
      return String(value);
    default:
      return String(value);
  }
}

/**
 * Format a value for input
 */
function formatInputValue(value: unknown, fieldType: FieldType): string {
  if (value === null || value === undefined) {
    return '';
  }

  switch (fieldType) {
    case 'date':
      try {
        const date = new Date(value as string);
        return format(date, 'yyyy-MM-dd');
      } catch {
        return '';
      }
    case 'currency':
    case 'number':
      return String(value);
    default:
      return String(value);
  }
}

/**
 * Parse input value back to stored format
 */
function parseInputValue(inputValue: string, fieldType: FieldType): unknown {
  if (inputValue === '' || inputValue === null) {
    return null;
  }

  switch (fieldType) {
    case 'date':
      return inputValue; // Keep as ISO string
    case 'number':
      const num = parseInt(inputValue, 10);
      return isNaN(num) ? null : num;
    case 'currency':
      const dec = parseFloat(inputValue);
      return isNaN(dec) ? null : Math.round(dec * 100) / 100;
    case 'boolean':
      return (
        inputValue.toLowerCase() === 'true' ||
        inputValue === '1' ||
        inputValue.toLowerCase() === 'yes'
      );
    default:
      return inputValue;
  }
}

export default function EditableCell({
  rowId,
  batchId,
  fieldName,
  fieldType,
  value,
  originalValue,
  isEditable,
  onSave,
}: EditableCellProps) {
  const [localValue, setLocalValue] = useState<string>(formatInputValue(value, fieldType));
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Track if value has been edited from original
  const hasBeenEdited = originalValue !== undefined && value !== originalValue;
  const hasLocalChanges = localValue !== formatInputValue(value, fieldType);

  // Update local value when prop changes
  useEffect(() => {
    setLocalValue(formatInputValue(value, fieldType));
  }, [value, fieldType]);

  const handleSave = useCallback(async () => {
    if (!hasLocalChanges) return;

    const newValue = parseInputValue(localValue, fieldType);

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/imports/batches/${batchId}/rows/${rowId}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [fieldName]: newValue }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save');
      }

      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);

      onSave?.(fieldName, newValue);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      // Reset to previous value
      setLocalValue(formatInputValue(value, fieldType));
    } finally {
      setIsSaving(false);
    }
  }, [batchId, rowId, fieldName, fieldType, localValue, value, hasLocalChanges, onSave]);

  // Non-editable display
  if (!isEditable) {
    return <span className="text-gray-900">{formatDisplayValue(value, fieldType)}</span>;
  }

  // Get input type based on field type
  const getInputType = () => {
    switch (fieldType) {
      case 'date':
        return 'date';
      case 'number':
      case 'currency':
        return 'number';
      default:
        return 'text';
    }
  };

  // Editable input
  return (
    <div className="relative">
      <input
        ref={inputRef}
        type={getInputType()}
        value={localValue}
        onChange={e => setLocalValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            inputRef.current?.blur();
          }
          if (e.key === 'Escape') {
            setLocalValue(formatInputValue(value, fieldType));
            inputRef.current?.blur();
          }
        }}
        disabled={isSaving}
        step={fieldType === 'currency' ? '0.01' : undefined}
        className={cn(
          'w-full px-2 py-1 text-sm rounded border transition-all',
          'focus:outline-none focus:ring-2 focus:ring-blue-300',
          isSaving && 'opacity-50 cursor-wait',
          hasLocalChanges && 'bg-blue-50 ring-2 ring-blue-300 border-blue-300',
          hasBeenEdited && !hasLocalChanges && 'bg-blue-50 border-blue-200',
          !hasBeenEdited && !hasLocalChanges && 'bg-white border-gray-200',
          error && 'border-red-300 ring-red-300'
        )}
      />

      {/* Saving indicator */}
      {isSaving && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
        </div>
      )}

      {/* Saved indicator */}
      {justSaved && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <Check className="h-3 w-3 text-green-500" />
        </div>
      )}

      {/* Error tooltip */}
      {error && (
        <div className="absolute left-0 top-full mt-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded shadow-sm z-10">
          {error}
        </div>
      )}
    </div>
  );
}

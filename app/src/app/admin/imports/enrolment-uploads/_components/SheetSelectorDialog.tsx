'use client';

/**
 * SheetSelectorDialog Component
 * Modal dialog for selecting which sheet to import from a multi-sheet Excel file
 */

import { useState } from 'react';
import { FileSpreadsheet, X, Loader2, ChevronRight } from 'lucide-react';

interface SheetInfo {
  name: string;
  rowCount: number;
}

interface SheetSelectorDialogProps {
  isOpen: boolean;
  fileName: string;
  sheets: SheetInfo[];
  onSelect: (sheetName: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function SheetSelectorDialog({
  isOpen,
  fileName,
  sheets,
  onSelect,
  onCancel,
  isLoading = false,
}: SheetSelectorDialogProps) {
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelect = () => {
    if (selectedSheet) {
      onSelect(selectedSheet);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onCancel}
        />

        {/* Dialog */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-6 w-6 text-green-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Select Worksheet</h3>
                <p className="text-sm text-gray-500">{fileName}</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="text-gray-400 hover:text-gray-500 disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Info Banner */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700">
              This file contains {sheets.length} worksheets. Please select the one you want to
              import.
            </p>
          </div>

          {/* Sheet List */}
          <div className="mb-4 space-y-2 max-h-64 overflow-y-auto">
            {sheets.map(sheet => (
              <button
                key={sheet.name}
                onClick={() => setSelectedSheet(sheet.name)}
                disabled={isLoading}
                className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors text-left ${
                  selectedSheet === sheet.name
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                } disabled:opacity-50`}
              >
                <div>
                  <p className="font-medium text-gray-900">{sheet.name}</p>
                  <p className="text-sm text-gray-500">
                    {sheet.rowCount} {sheet.rowCount === 1 ? 'row' : 'rows'}
                  </p>
                </div>
                {selectedSheet === sheet.name && <ChevronRight className="h-5 w-5 text-blue-500" />}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSelect}
              disabled={!selectedSheet || isLoading}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                'Import Selected Sheet'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

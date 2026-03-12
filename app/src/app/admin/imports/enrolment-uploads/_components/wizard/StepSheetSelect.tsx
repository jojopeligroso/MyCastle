'use client';

/**
 * StepSheetSelect - Wizard Step 2
 * Display all worksheets from multi-sheet file and allow selection
 */

import { useState, useCallback } from 'react';
import { FileSpreadsheet, ChevronRight, ChevronLeft, Loader2, Table } from 'lucide-react';
import type { SheetInfo } from '../ImportWizard';

interface StepSheetSelectProps {
  file: File | null;
  sheets: SheetInfo[];
  onSheetSelected: (sheetName: string, batchId: string) => void;
  onError: (error: string | null) => void;
  onBack: () => void;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

export default function StepSheetSelect({
  file,
  sheets,
  onSheetSelected,
  onError,
  onBack,
  isLoading,
  setLoading,
}: StepSheetSelectProps) {
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);

  // Detect likely weekly sheets (contain dates or day names)
  const isLikelyWeeklySheet = useCallback((name: string): boolean => {
    const weeklyPatterns =
      /(\d{1,2}[\/\-]\d{1,2}|\bmon\b|\btue\b|\bwed\b|\bthu\b|\bfri\b|\bweek\b)/i;
    return weeklyPatterns.test(name);
  }, []);

  const handleSelect = useCallback(async () => {
    if (!selectedSheet || !file) return;

    setLoading(true);
    onError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sheetName', selectedSheet);

      const response = await fetch('/api/imports/batches', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      onSheetSelected(selectedSheet, result.batchId);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  }, [selectedSheet, file, setLoading, onError, onSheetSelected]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Select Worksheet</h2>
        <p className="mt-1 text-sm text-gray-500">
          This file contains {sheets.length} worksheets. Select the one to import.
        </p>
      </div>

      {/* Info Banner */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-700">
            <p>
              Sheets with date patterns are highlighted as likely weekly sheets. Select the sheet
              containing your enrolment data.
            </p>
          </div>
        </div>
      </div>

      {/* Sheet Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
        {sheets.map(sheet => {
          const isWeekly = isLikelyWeeklySheet(sheet.name);
          const isSelected = selectedSheet === sheet.name;

          return (
            <button
              key={sheet.name}
              onClick={() => setSelectedSheet(sheet.name)}
              disabled={isLoading}
              className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all text-left ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : isWeekly
                    ? 'border-green-200 bg-green-50 hover:border-green-300'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              } disabled:opacity-50`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    isSelected ? 'bg-blue-100' : isWeekly ? 'bg-green-100' : 'bg-gray-100'
                  }`}
                >
                  <Table
                    className={`h-5 w-5 ${
                      isSelected ? 'text-blue-600' : isWeekly ? 'text-green-600' : 'text-gray-500'
                    }`}
                  />
                </div>
                <div>
                  <p
                    className={`font-medium ${
                      isSelected ? 'text-blue-900' : isWeekly ? 'text-green-900' : 'text-gray-900'
                    }`}
                  >
                    {sheet.name}
                  </p>
                  <p
                    className={`text-sm ${
                      isSelected ? 'text-blue-600' : isWeekly ? 'text-green-600' : 'text-gray-500'
                    }`}
                  >
                    {sheet.rowCount} {sheet.rowCount === 1 ? 'row' : 'rows'}
                  </p>
                </div>
              </div>
              {isSelected && <ChevronRight className="h-5 w-5 text-blue-500" />}
              {isWeekly && !isSelected && (
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                  Likely data
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t">
        <button
          onClick={onBack}
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </button>
        <button
          onClick={handleSelect}
          disabled={!selectedSheet || isLoading}
          className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              Import Selected Sheet
              <ChevronRight className="h-4 w-4 ml-2" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

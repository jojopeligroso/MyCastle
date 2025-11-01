/**
 * Data Preview Component
 * Shows preview of sheet data with column types before transformation
 */

import { ArrowLeft, Sparkles } from "lucide-react";
import type { PreviewResponse } from "../types";

interface DataPreviewProps {
  preview: PreviewResponse;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  onBack: () => void;
}

export const DataPreview = ({ preview, onAnalyze, isAnalyzing, onBack }: DataPreviewProps) => {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Data Preview</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Showing {preview.rows.length} of {preview.total_rows} rows
            {preview.has_more && " (limited for preview)"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <button
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Analyze Schema
              </>
            )}
          </button>
        </div>
      </div>

      {/* Column Types Summary */}
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-center gap-6 text-sm">
          <span className="font-semibold text-blue-800 dark:text-blue-200">Detected Types:</span>
          {Object.entries(
            Object.values(preview.column_types).reduce(
              (acc, type) => {
                acc[type] = (acc[type] || 0) + 1;
                return acc;
              },
              {} as Record<string, number>,
            ),
          ).map(([type, count]) => (
            <span key={type} className="text-blue-700 dark:text-blue-300">
              {count} {type}
            </span>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                {preview.columns.map((col, idx) => (
                  <th
                    key={idx}
                    className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700"
                  >
                    <div>
                      <div className="truncate max-w-xs">{col}</div>
                      <div className="text-xs font-normal text-gray-500 dark:text-gray-400 mt-1">
                        {preview.column_types[col]}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="px-4 py-3 text-gray-800 dark:text-gray-200">
                      <div className="truncate max-w-xs">{cell !== "" ? String(cell) : "-"}</div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

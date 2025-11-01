/**
 * Sheet Selector Component
 * Allows selection of which sheet to transform from the uploaded XLSX file
 */

import { FileSpreadsheet, Calendar } from "lucide-react";
import type { SheetInfo } from "../types";

interface SheetSelectorProps {
  sheets: SheetInfo[];
  onSheetSelected: (sheetName: string) => void;
}

export const SheetSelector = ({ sheets, onSheetSelected }: SheetSelectorProps) => {
  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Select Sheet to Transform</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sheets.map((sheet) => (
          <button
            key={sheet.name}
            onClick={() => onSheetSelected(sheet.name)}
            className="
              p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg
              hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20
              transition-all text-left group
            "
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                <FileSpreadsheet className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-800 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  {sheet.name}
                </h3>

                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <span>{sheet.row_count} rows</span>
                  <span>•</span>
                  <span>{sheet.column_count} columns</span>
                </div>

                {sheet.date_from_name && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-blue-600 dark:text-blue-400">
                    <Calendar className="w-3 h-3" />
                    {new Date(sheet.date_from_name).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

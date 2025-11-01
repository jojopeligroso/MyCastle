/**
 * Column Mapping Editor Component
 * Allows users to edit column mappings and table name before transformation
 */

import { ArrowLeft, ArrowRight, Database } from "lucide-react";
import type { ColumnMapping } from "../types";

interface ColumnMappingEditorProps {
  mappings: ColumnMapping[];
  tableName: string;
  onMappingsChange: (mappings: ColumnMapping[]) => void;
  onTableNameChange: (name: string) => void;
  onExecute: () => void;
  onBack: () => void;
}

export const ColumnMappingEditor = ({
  mappings,
  tableName,
  onMappingsChange,
  onTableNameChange,
  onExecute,
  onBack,
}: ColumnMappingEditorProps) => {
  const handleMappingChange = (index: number, field: keyof ColumnMapping, value: string) => {
    const updated = [...mappings];
    updated[index] = { ...updated[index], [field]: value };
    onMappingsChange(updated);
  };

  const removeMapping = (index: number) => {
    const updated = mappings.filter((_, i) => i !== index);
    onMappingsChange(updated);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Column Mapping</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Review and edit column mappings for Supabase table
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
            onClick={onExecute}
            disabled={!tableName || mappings.length === 0}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table Name Input */}
      <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          <Database className="w-4 h-4 inline mr-2" />
          Supabase Table Name
        </label>
        <input
          type="text"
          value={tableName}
          onChange={(e) => onTableNameChange(e.target.value)}
          placeholder="e.g., my_data_table"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Note: Table must exist in your Supabase database. Create it first if needed.
        </p>
      </div>

      {/* Column Mappings Table */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                XLSX Column
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                →
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                Supabase Column
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                Data Type
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {mappings.map((mapping, idx) => (
              <tr
                key={idx}
                className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <td className="px-4 py-3 text-gray-800 dark:text-gray-200 font-medium">
                  {mapping.xlsxColumn}
                </td>
                <td className="px-4 py-3 text-gray-400">→</td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={mapping.supabaseColumn}
                    onChange={(e) => handleMappingChange(idx, "supabaseColumn", e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="px-4 py-3">
                  <select
                    value={mapping.dataType}
                    onChange={(e) => handleMappingChange(idx, "dataType", e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="text">text</option>
                    <option value="numeric">numeric</option>
                    <option value="integer">integer</option>
                    <option value="boolean">boolean</option>
                    <option value="date">date</option>
                    <option value="timestamp">timestamp</option>
                    <option value="json">json</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => removeMapping(idx)}
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {mappings.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No column mappings defined. Go back and analyze the schema.
        </div>
      )}
    </div>
  );
};

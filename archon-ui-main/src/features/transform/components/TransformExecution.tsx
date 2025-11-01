/**
 * Transform Execution Component
 * Final confirmation before executing the transformation
 */

import { ArrowLeft, Play, AlertTriangle } from "lucide-react";

interface TransformExecutionProps {
  tableName: string;
  mappingCount: number;
  onExecute: () => void;
  isExecuting: boolean;
  onBack: () => void;
}

export const TransformExecution = ({
  tableName,
  mappingCount,
  onExecute,
  isExecuting,
  onBack,
}: TransformExecutionProps) => {
  return (
    <div className="max-w-2xl mx-auto mt-8">
      <div className="border-2 border-yellow-300 dark:border-yellow-700 rounded-lg p-6 bg-yellow-50 dark:bg-yellow-900/20">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-yellow-200 dark:bg-yellow-800 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-yellow-800 dark:text-yellow-200" />
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
              Ready to Execute Transformation
            </h3>

            <div className="space-y-2 text-sm text-yellow-800 dark:text-yellow-200 mb-4">
              <p>• Target Table: <strong>{tableName}</strong></p>
              <p>• Column Mappings: <strong>{mappingCount} columns</strong></p>
              <p>• This will insert data into your Supabase database</p>
            </div>

            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded text-xs text-yellow-700 dark:text-yellow-300">
              <strong>Important:</strong> Ensure the target table exists in your Supabase database with matching column
              names and compatible data types. This operation cannot be undone.
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={onBack}
                disabled={isExecuting}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <button
                onClick={onExecute}
                disabled={isExecuting}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 font-semibold"
              >
                {isExecuting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Execute Transformation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

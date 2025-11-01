/**
 * Main Transform View Component
 * Handles XLSX file upload and transformation workflow
 */

import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { useToast } from "@/features/shared/hooks/useToast";
import {
  useUploadXLSX,
  useSheetPreview,
  useAnalyzeSchema,
  useExecuteTransform,
  useCleanupUpload,
} from "../hooks/useTransformQueries";
import type { UploadResponse, ColumnMapping } from "../types";
import { FileUploadZone } from "./FileUploadZone";
import { SheetSelector } from "./SheetSelector";
import { DataPreview } from "./DataPreview";
import { ColumnMappingEditor } from "./ColumnMappingEditor";
import { TransformExecution } from "./TransformExecution";

type TransformStep = "upload" | "select-sheet" | "preview" | "mapping" | "execute" | "complete";

export const TransformView = () => {
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState<TransformStep>("upload");
  const [uploadData, setUploadData] = useState<UploadResponse | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [tableName, setTableName] = useState("");

  // Mutations
  const uploadMutation = useUploadXLSX();
  const analyzeMutation = useAnalyzeSchema();
  const executeMutation = useExecuteTransform();
  const cleanupMutation = useCleanupUpload();

  // Query for sheet preview
  const {
    data: previewData,
    isLoading: isPreviewLoading,
    error: previewError,
  } = useSheetPreview(uploadData?.upload_id, selectedSheet || undefined);

  // Handle file upload
  const handleFileSelected = async (file: File) => {
    try {
      const result = await uploadMutation.mutateAsync(file);
      setUploadData(result);
      setCurrentStep("select-sheet");
      showToast(`Uploaded ${file.name} successfully`, "success");

      // Auto-select most recent sheet if available
      if (result.most_recent_sheet) {
        setSelectedSheet(result.most_recent_sheet);
        setCurrentStep("preview");
      }
    } catch (error) {
      showToast(`Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    }
  };

  // Handle sheet selection
  const handleSheetSelected = (sheetName: string) => {
    setSelectedSheet(sheetName);
    setCurrentStep("preview");
  };

  // Handle schema analysis and move to mapping
  const handleAnalyzeSchema = async () => {
    if (!uploadData || !selectedSheet) return;

    try {
      const result = await analyzeMutation.mutateAsync({
        uploadId: uploadData.upload_id,
        sheetName: selectedSheet,
      });

      // Convert suggested mapping to ColumnMapping array
      const mappings: ColumnMapping[] = result.suggested_schema.map((col) => ({
        xlsxColumn: col.source_column,
        supabaseColumn: col.column_name,
        dataType: col.data_type,
      }));

      setColumnMappings(mappings);
      setTableName(selectedSheet.toLowerCase().replace(/\s+/g, "_"));
      setCurrentStep("mapping");
      showToast("Schema analyzed successfully", "success");
    } catch (error) {
      showToast(
        `Schema analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        "error",
      );
    }
  };

  // Handle transformation execution
  const handleExecuteTransform = async () => {
    if (!uploadData || !selectedSheet || !tableName) return;

    const mapping: Record<string, string> = {};
    columnMappings.forEach((m) => {
      mapping[m.xlsxColumn] = m.supabaseColumn;
    });

    try {
      const result = await executeMutation.mutateAsync({
        uploadId: uploadData.upload_id,
        sheetName: selectedSheet,
        tableName,
        columnMapping: mapping,
      });

      if (result.success) {
        showToast(`Successfully transformed ${result.inserted_count} rows`, "success");
        setCurrentStep("complete");
      } else {
        showToast(`Transformation completed with ${result.failed_count} errors`, "warning");
      }
    } catch (error) {
      showToast(
        `Transformation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        "error",
      );
    }
  };

  // Handle cleanup and reset
  const handleReset = async () => {
    if (uploadData) {
      await cleanupMutation.mutateAsync(uploadData.upload_id);
    }
    setUploadData(null);
    setSelectedSheet(null);
    setColumnMappings([]);
    setTableName("");
    setCurrentStep("upload");
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <FileSpreadsheet className="w-7 h-7 text-blue-500 filter drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
            XLSX Transform
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Upload and transform XLSX files to Supabase tables
          </p>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm">
          <StepIndicator step={1} label="Upload" active={currentStep === "upload"} completed={uploadData !== null} />
          <div className="h-px flex-1 bg-gray-300 dark:bg-gray-700" />
          <StepIndicator
            step={2}
            label="Select Sheet"
            active={currentStep === "select-sheet"}
            completed={selectedSheet !== null}
          />
          <div className="h-px flex-1 bg-gray-300 dark:bg-gray-700" />
          <StepIndicator
            step={3}
            label="Preview"
            active={currentStep === "preview"}
            completed={previewData !== undefined}
          />
          <div className="h-px flex-1 bg-gray-300 dark:bg-gray-700" />
          <StepIndicator
            step={4}
            label="Map Columns"
            active={currentStep === "mapping"}
            completed={columnMappings.length > 0}
          />
          <div className="h-px flex-1 bg-gray-300 dark:bg-gray-700" />
          <StepIndicator step={5} label="Execute" active={currentStep === "execute"} completed={currentStep === "complete"} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {currentStep === "upload" && (
          <FileUploadZone onFileSelected={handleFileSelected} isUploading={uploadMutation.isPending} />
        )}

        {currentStep === "select-sheet" && uploadData && (
          <SheetSelector sheets={uploadData.sheets} onSheetSelected={handleSheetSelected} />
        )}

        {currentStep === "preview" && previewData && (
          <DataPreview
            preview={previewData}
            onAnalyze={handleAnalyzeSchema}
            isAnalyzing={analyzeMutation.isPending}
            onBack={() => setCurrentStep("select-sheet")}
          />
        )}

        {currentStep === "mapping" && (
          <ColumnMappingEditor
            mappings={columnMappings}
            tableName={tableName}
            onMappingsChange={setColumnMappings}
            onTableNameChange={setTableName}
            onExecute={() => setCurrentStep("execute")}
            onBack={() => setCurrentStep("preview")}
          />
        )}

        {currentStep === "execute" && (
          <TransformExecution
            tableName={tableName}
            mappingCount={columnMappings.length}
            onExecute={handleExecuteTransform}
            isExecuting={executeMutation.isPending}
            onBack={() => setCurrentStep("mapping")}
          />
        )}

        {currentStep === "complete" && executeMutation.data && (
          <div className="max-w-2xl mx-auto mt-8">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-4">
                Transformation Complete!
              </h3>
              <div className="space-y-2 text-sm text-green-700 dark:text-green-300">
                <p>• Table: {executeMutation.data.table_name}</p>
                <p>• Rows processed: {executeMutation.data.total_rows}</p>
                <p>• Successfully inserted: {executeMutation.data.inserted_count}</p>
                {executeMutation.data.failed_count > 0 && (
                  <p className="text-red-600 dark:text-red-400">
                    • Failed: {executeMutation.data.failed_count}
                  </p>
                )}
              </div>
              <button
                onClick={handleReset}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Transform Another File
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Step Indicator Component
function StepIndicator({
  step,
  label,
  active,
  completed,
}: {
  step: number;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
          completed
            ? "bg-green-500 text-white"
            : active
              ? "bg-blue-500 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-gray-500"
        }`}
      >
        {step}
      </div>
      <span
        className={`text-sm font-medium ${
          active ? "text-blue-600 dark:text-blue-400" : completed ? "text-green-600 dark:text-green-400" : "text-gray-500"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

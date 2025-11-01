/**
 * Transform service for XLSX transformation API calls
 */

import { callAPIWithETag } from "@/features/shared/api/apiClient";
import { API_BASE_URL } from "@/config/api";
import type {
  UploadResponse,
  PreviewResponse,
  SchemaAnalysisResponse,
  TransformExecutionResponse,
} from "../types";

export const transformService = {
  /**
   * Upload an XLSX file for transformation
   * Uses fetch directly for FormData (per apiClient guidance)
   */
  async uploadXLSX(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE_URL}/transform/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Upload failed with status ${response.status}`);
    }

    return response.json();
  },

  /**
   * Get preview data from a specific sheet
   */
  async getPreview(uploadId: string, sheetName: string): Promise<PreviewResponse> {
    return callAPIWithETag<PreviewResponse>("/api/transform/preview", {
      method: "POST",
      body: JSON.stringify({
        upload_id: uploadId,
        sheet_name: sheetName,
      }),
    });
  },

  /**
   * Analyze schema and get suggested mappings
   */
  async analyzeSchema(uploadId: string, sheetName: string): Promise<SchemaAnalysisResponse> {
    return callAPIWithETag<SchemaAnalysisResponse>("/api/transform/analyze-schema", {
      method: "POST",
      body: JSON.stringify({
        upload_id: uploadId,
        sheet_name: sheetName,
      }),
    });
  },

  /**
   * Execute transformation from XLSX to Supabase table
   */
  async executeTransform(
    uploadId: string,
    sheetName: string,
    tableName: string,
    columnMapping: Record<string, string>,
  ): Promise<TransformExecutionResponse> {
    return callAPIWithETag<TransformExecutionResponse>("/api/transform/execute", {
      method: "POST",
      body: JSON.stringify({
        upload_id: uploadId,
        sheet_name: sheetName,
        table_name: tableName,
        column_mapping: columnMapping,
      }),
    });
  },

  /**
   * Clean up temporary upload files
   */
  async cleanup(uploadId: string): Promise<{ success: boolean; upload_id: string }> {
    return callAPIWithETag<{ success: boolean; upload_id: string }>(`/api/transform/cleanup/${uploadId}`, {
      method: "DELETE",
    });
  },
};

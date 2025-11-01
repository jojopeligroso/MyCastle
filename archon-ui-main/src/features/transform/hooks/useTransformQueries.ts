/**
 * Transform feature TanStack Query hooks
 */

import { useMutation, useQuery } from "@tanstack/react-query";
import { DISABLED_QUERY_KEY, STALE_TIMES } from "@/features/shared/config/queryPatterns";
import { transformService } from "../services/transformService";

// Query key factory for transform feature
export const transformKeys = {
  all: ["transform"] as const,
  upload: (uploadId: string) => [...transformKeys.all, "upload", uploadId] as const,
  preview: (uploadId: string, sheetName: string) =>
    [...transformKeys.all, "preview", uploadId, sheetName] as const,
  schema: (uploadId: string, sheetName: string) =>
    [...transformKeys.all, "schema", uploadId, sheetName] as const,
};

/**
 * Hook for uploading XLSX file
 */
export function useUploadXLSX() {
  return useMutation({
    mutationFn: (file: File) => transformService.uploadXLSX(file),
  });
}

/**
 * Hook for getting sheet preview
 */
export function useSheetPreview(uploadId: string | undefined, sheetName: string | undefined) {
  return useQuery({
    queryKey: uploadId && sheetName ? transformKeys.preview(uploadId, sheetName) : DISABLED_QUERY_KEY,
    queryFn: () => {
      if (!uploadId || !sheetName) {
        return Promise.reject("Upload ID and sheet name are required");
      }
      return transformService.getPreview(uploadId, sheetName);
    },
    enabled: !!uploadId && !!sheetName,
    staleTime: STALE_TIMES.static, // Don't refetch preview data
  });
}

/**
 * Hook for analyzing schema
 */
export function useAnalyzeSchema() {
  return useMutation({
    mutationFn: ({ uploadId, sheetName }: { uploadId: string; sheetName: string }) =>
      transformService.analyzeSchema(uploadId, sheetName),
  });
}

/**
 * Hook for executing transformation
 */
export function useExecuteTransform() {
  return useMutation({
    mutationFn: ({
      uploadId,
      sheetName,
      tableName,
      columnMapping,
    }: {
      uploadId: string;
      sheetName: string;
      tableName: string;
      columnMapping: Record<string, string>;
    }) => transformService.executeTransform(uploadId, sheetName, tableName, columnMapping),
  });
}

/**
 * Hook for cleaning up upload
 */
export function useCleanupUpload() {
  return useMutation({
    mutationFn: (uploadId: string) => transformService.cleanup(uploadId),
  });
}

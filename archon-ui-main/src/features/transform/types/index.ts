/**
 * Transform feature types
 */

export interface UploadResponse {
  upload_id: string;
  filename: string;
  file_size: number;
  sheet_count: number;
  sheets: SheetInfo[];
  most_recent_sheet: string | null;
  created_at: string;
}

export interface SheetInfo {
  name: string;
  row_count: number;
  column_count: number;
  has_data: boolean;
  date_from_name?: string;
}

export interface PreviewResponse {
  sheet_name: string;
  columns: string[];
  column_types: Record<string, string>;
  row_count: number;
  rows: any[][];
  total_rows: number;
  has_more: boolean;
}

export interface SchemaAnalysisResponse {
  suggested_mapping: Record<string, string>;
  suggested_schema: SuggestedColumn[];
  column_count: number;
  row_count: number;
}

export interface SuggestedColumn {
  column_name: string;
  data_type: string;
  source_column: string;
}

export interface TransformExecutionResponse {
  success: boolean;
  table_name: string;
  total_rows: number;
  inserted_count: number;
  failed_count: number;
  errors: Array<{ row?: number; batch?: string; error: string }>;
  has_more_errors: boolean;
}

export interface ColumnMapping {
  xlsxColumn: string;
  supabaseColumn: string;
  dataType: string;
}

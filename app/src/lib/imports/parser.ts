/**
 * Import File Parser
 * Handles XLSX parsing with validation
 * Ref: spec/IMPORTS_UI_SPEC.md
 */

import * as XLSX from 'xlsx';

/**
 * Whitelisted columns from classes.xlsx
 * Per IMPORTS_UI_SPEC.md - only these columns are processed
 */
export const WHITELISTED_COLUMNS = [
  'Student Name',
  'Start Date',
  'Class Name',
  'End Date',
  'XXX Register Flag',
] as const;

export type WhitelistedColumn = (typeof WHITELISTED_COLUMNS)[number];

/**
 * Required columns that must be present
 */
export const REQUIRED_COLUMNS: WhitelistedColumn[] = ['Student Name', 'Start Date', 'Class Name'];

/**
 * Parsed row from the file
 */
export interface ParsedRow {
  rowNumber: number;
  rawData: Record<string, unknown>;
  parsedData: {
    studentName: string | null;
    startDate: Date | null;
    className: string | null;
    endDate: Date | null;
    registerFlag: string | null;
  };
  validationErrors: Array<{ field: string; message: string }>;
  isValid: boolean;
}

/**
 * Parse result from file processing
 */
export interface ParseResult {
  success: boolean;
  rows: ParsedRow[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
  ignoredColumns: string[];
  error?: string;
}

/**
 * Normalize column header for matching
 * - Lowercase
 * - Trim whitespace
 * - Remove special characters
 */
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '');
}

/**
 * Map normalized headers to whitelisted columns
 */
function mapHeader(header: string): WhitelistedColumn | null {
  const normalized = normalizeHeader(header);

  const mappings: Record<string, WhitelistedColumn> = {
    'student name': 'Student Name',
    studentname: 'Student Name',
    name: 'Student Name',
    'start date': 'Start Date',
    startdate: 'Start Date',
    start: 'Start Date',
    'class name': 'Class Name',
    classname: 'Class Name',
    class: 'Class Name',
    'end date': 'End Date',
    enddate: 'End Date',
    end: 'End Date',
    'xxx register flag': 'XXX Register Flag',
    'register flag': 'XXX Register Flag',
    registerflag: 'XXX Register Flag',
    flag: 'XXX Register Flag',
  };

  return mappings[normalized] ?? null;
}

/**
 * Parse Excel date serial number to JS Date
 * Excel dates are stored as number of days since 1899-12-30
 */
function parseExcelDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  // If it's already a Date
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  // If it's a number (Excel serial date)
  if (typeof value === 'number') {
    // Excel date serial: days since 1899-12-30
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    return isNaN(date.getTime()) ? null : date;
  }

  // If it's a string, try to parse it
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;

    // Try common date formats
    // DD/MM/YYYY (European format - common in Ireland)
    const euMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (euMatch) {
      const [, day, month, year] = euMatch;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return isNaN(date.getTime()) ? null : date;
    }

    // YYYY-MM-DD (ISO format)
    const isoMatch = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return isNaN(date.getTime()) ? null : date;
    }

    // Try native Date parsing as fallback
    const date = new Date(trimmed);
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
}

/**
 * Parse string value, trimming whitespace
 */
function parseString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const str = String(value).trim();
  return str === '' ? null : str;
}

/**
 * Validate a parsed row
 */
function validateRow(
  parsedData: ParsedRow['parsedData']
): Array<{ field: string; message: string }> {
  const errors: Array<{ field: string; message: string }> = [];

  // Required field: Student Name
  if (!parsedData.studentName) {
    errors.push({ field: 'Student Name', message: 'Student Name is required' });
  }

  // Required field: Start Date
  if (!parsedData.startDate) {
    errors.push({ field: 'Start Date', message: 'Start Date is required' });
  }

  // Required field: Class Name
  if (!parsedData.className) {
    errors.push({ field: 'Class Name', message: 'Class Name is required' });
  }

  // If End Date is provided, it must be after Start Date
  if (parsedData.startDate && parsedData.endDate) {
    if (parsedData.endDate < parsedData.startDate) {
      errors.push({ field: 'End Date', message: 'End Date must be after Start Date' });
    }
  }

  return errors;
}

/**
 * Parse classes.xlsx file
 * @param fileBuffer - ArrayBuffer of the uploaded file
 * @returns ParseResult with rows and metadata
 */
export async function parseClassesFile(fileBuffer: ArrayBuffer): Promise<ParseResult> {
  try {
    // Read workbook
    const workbook = XLSX.read(fileBuffer, { type: 'array', cellDates: true });

    // Validate single worksheet
    if (workbook.SheetNames.length !== 1) {
      return {
        success: false,
        rows: [],
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        ignoredColumns: [],
        error: `File must contain exactly 1 worksheet, found ${workbook.SheetNames.length}`,
      };
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert to JSON with headers
    const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
      raw: false,
      dateNF: 'yyyy-mm-dd',
    });

    if (rawRows.length === 0) {
      return {
        success: false,
        rows: [],
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        ignoredColumns: [],
        error: 'File is empty or has no data rows',
      };
    }

    // Extract headers from first row
    const fileHeaders = Object.keys(rawRows[0]);

    // Map headers to whitelisted columns
    const headerMapping: Record<string, WhitelistedColumn | null> = {};
    const ignoredColumns: string[] = [];
    const mappedColumns = new Set<WhitelistedColumn>();

    for (const header of fileHeaders) {
      const mapped = mapHeader(header);
      headerMapping[header] = mapped;
      if (mapped) {
        mappedColumns.add(mapped);
      } else {
        ignoredColumns.push(header);
      }
    }

    // Check required columns are present
    const missingRequired = REQUIRED_COLUMNS.filter(col => !mappedColumns.has(col));
    if (missingRequired.length > 0) {
      return {
        success: false,
        rows: [],
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        ignoredColumns,
        error: `Missing required column(s): ${missingRequired.join(', ')}`,
      };
    }

    // Parse each row
    const parsedRows: ParsedRow[] = [];
    let validCount = 0;
    let invalidCount = 0;

    for (let i = 0; i < rawRows.length; i++) {
      const rawRow = rawRows[i];
      const rowNumber = i + 2; // +2 because: 0-indexed + header row

      // Extract values using header mapping
      const extractValue = (targetColumn: WhitelistedColumn): unknown => {
        for (const [header, mapped] of Object.entries(headerMapping)) {
          if (mapped === targetColumn) {
            return rawRow[header];
          }
        }
        return null;
      };

      // Parse values
      const parsedData: ParsedRow['parsedData'] = {
        studentName: parseString(extractValue('Student Name')),
        startDate: parseExcelDate(extractValue('Start Date')),
        className: parseString(extractValue('Class Name')),
        endDate: parseExcelDate(extractValue('End Date')),
        registerFlag: parseString(extractValue('XXX Register Flag')),
      };

      // Validate
      const validationErrors = validateRow(parsedData);
      const isValid = validationErrors.length === 0;

      if (isValid) {
        validCount++;
      } else {
        invalidCount++;
      }

      parsedRows.push({
        rowNumber,
        rawData: rawRow,
        parsedData,
        validationErrors,
        isValid,
      });
    }

    return {
      success: true,
      rows: parsedRows,
      totalRows: parsedRows.length,
      validRows: validCount,
      invalidRows: invalidCount,
      ignoredColumns,
    };
  } catch (error) {
    return {
      success: false,
      rows: [],
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      ignoredColumns: [],
      error: error instanceof Error ? error.message : 'Failed to parse file',
    };
  }
}

/**
 * Validate file before parsing (quick checks)
 */
export function validateFileType(
  fileName: string,
  fileSize: number
): { valid: boolean; error?: string } {
  // Check extension
  const ext = fileName.toLowerCase().split('.').pop();
  if (ext !== 'xlsx' && ext !== 'xls') {
    return { valid: false, error: 'File must be an Excel file (.xlsx or .xls)' };
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (fileSize > maxSize) {
    return { valid: false, error: 'File size must be less than 10MB' };
  }

  return { valid: true };
}

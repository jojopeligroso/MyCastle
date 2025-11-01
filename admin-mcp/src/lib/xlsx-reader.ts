/**
 * XLSX Reader Utility
 * Parses Excel files and extracts data with header mapping
 */

import * as XLSX from 'xlsx';

export interface ParsedXLSXData {
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
  sheetName: string;
}

export interface XLSXReaderOptions {
  /**
   * Sheet to read (default: first sheet)
   */
  sheetIndex?: number;

  /**
   * Skip empty rows
   */
  skipEmptyRows?: boolean;

  /**
   * Trim whitespace from cell values
   */
  trimValues?: boolean;

  /**
   * Maximum rows to read (for validation/preview)
   */
  maxRows?: number;
}

/**
 * Parse XLSX file from buffer
 */
export function parseXLSXBuffer(
  buffer: Buffer,
  options: XLSXReaderOptions = {}
): ParsedXLSXData {
  const {
    sheetIndex = 0,
    skipEmptyRows = true,
    trimValues = true,
    maxRows,
  } = options;

  // Read workbook from buffer
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  // Get sheet
  const sheetNames = workbook.SheetNames;
  if (sheetNames.length === 0) {
    throw new Error('No sheets found in Excel file');
  }

  const sheetName = sheetNames[sheetIndex];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON with header row
  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    header: 1, // Use first row as header
    defval: null, // Default value for empty cells
    blankrows: !skipEmptyRows,
  }) as any[][];

  if (jsonData.length === 0) {
    throw new Error('Excel file is empty');
  }

  // Extract headers (first row)
  const headerRow = jsonData[0];
  if (!headerRow || headerRow.length === 0) {
    throw new Error('No headers found in Excel file');
  }

  // Convert headers to strings and trim
  const headers = headerRow.map((h) => {
    const header = String(h || '');
    return trimValues ? header.trim() : header;
  });

  // Validate headers
  const emptyHeaders = headers.filter((h) => !h);
  if (emptyHeaders.length > 0) {
    throw new Error('Excel file contains empty column headers');
  }

  // Check for duplicate headers
  const headerSet = new Set(headers);
  if (headerSet.size !== headers.length) {
    throw new Error('Excel file contains duplicate column headers');
  }

  // Extract data rows (skip header row)
  const dataRows = jsonData.slice(1);

  // Apply maxRows limit if specified
  const limitedRows = maxRows ? dataRows.slice(0, maxRows) : dataRows;

  // Convert rows to objects using headers
  const rows = limitedRows
    .map((row, index) => {
      // Skip empty rows if option is set
      if (skipEmptyRows && (!row || row.every((cell) => cell == null || cell === ''))) {
        return null;
      }

      const rowObj: Record<string, any> = {};

      headers.forEach((header, colIndex) => {
        let value = row[colIndex];

        // Trim string values if option is set
        if (trimValues && typeof value === 'string') {
          value = value.trim();
        }

        // Convert empty strings to null
        if (value === '') {
          value = null;
        }

        rowObj[header] = value;
      });

      return rowObj;
    })
    .filter((row) => row !== null) as Record<string, any>[];

  return {
    headers,
    rows,
    totalRows: rows.length,
    sheetName,
  };
}

/**
 * Parse XLSX file from file path
 */
export function parseXLSXFile(
  filePath: string,
  options: XLSXReaderOptions = {}
): ParsedXLSXData {
  const workbook = XLSX.readFile(filePath);

  const {
    sheetIndex = 0,
    skipEmptyRows = true,
    trimValues = true,
    maxRows,
  } = options;

  // Get sheet
  const sheetNames = workbook.SheetNames;
  if (sheetNames.length === 0) {
    throw new Error('No sheets found in Excel file');
  }

  const sheetName = sheetNames[sheetIndex];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON with header row
  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: null,
    blankrows: !skipEmptyRows,
  }) as any[][];

  if (jsonData.length === 0) {
    throw new Error('Excel file is empty');
  }

  // Extract headers
  const headerRow = jsonData[0];
  if (!headerRow || headerRow.length === 0) {
    throw new Error('No headers found in Excel file');
  }

  const headers = headerRow.map((h) => {
    const header = String(h || '');
    return trimValues ? header.trim() : header;
  });

  // Validate headers
  const emptyHeaders = headers.filter((h) => !h);
  if (emptyHeaders.length > 0) {
    throw new Error('Excel file contains empty column headers');
  }

  const headerSet = new Set(headers);
  if (headerSet.size !== headers.length) {
    throw new Error('Excel file contains duplicate column headers');
  }

  // Extract data rows
  const dataRows = jsonData.slice(1);
  const limitedRows = maxRows ? dataRows.slice(0, maxRows) : dataRows;

  const rows = limitedRows
    .map((row) => {
      if (skipEmptyRows && (!row || row.every((cell) => cell == null || cell === ''))) {
        return null;
      }

      const rowObj: Record<string, any> = {};

      headers.forEach((header, colIndex) => {
        let value = row[colIndex];

        if (trimValues && typeof value === 'string') {
          value = value.trim();
        }

        if (value === '') {
          value = null;
        }

        rowObj[header] = value;
      });

      return rowObj;
    })
    .filter((row) => row !== null) as Record<string, any>[];

  return {
    headers,
    rows,
    totalRows: rows.length,
    sheetName,
  };
}

/**
 * Validate column mapping between XLSX headers and database columns
 */
export function validateColumnMapping(
  xlsxHeaders: string[],
  requiredColumns: string[],
  optionalColumns: string[] = []
): {
  valid: boolean;
  missingRequired: string[];
  unmapped: string[];
  mapping: Record<string, string>;
} {
  const allValidColumns = [...requiredColumns, ...optionalColumns];

  // Create case-insensitive mapping
  const mapping: Record<string, string> = {};
  const mappedDbColumns = new Set<string>();

  xlsxHeaders.forEach((xlsxHeader) => {
    const normalizedXlsx = xlsxHeader.toLowerCase().replace(/[_\s-]/g, '');

    // Try to find matching database column
    const dbColumn = allValidColumns.find((col) => {
      const normalizedDb = col.toLowerCase().replace(/[_\s-]/g, '');
      return normalizedDb === normalizedXlsx;
    });

    if (dbColumn) {
      mapping[xlsxHeader] = dbColumn;
      mappedDbColumns.add(dbColumn);
    }
  });

  // Check for missing required columns
  const missingRequired = requiredColumns.filter((col) => !mappedDbColumns.has(col));

  // Check for unmapped XLSX headers
  const unmapped = xlsxHeaders.filter((header) => !mapping[header]);

  return {
    valid: missingRequired.length === 0,
    missingRequired,
    unmapped,
    mapping,
  };
}

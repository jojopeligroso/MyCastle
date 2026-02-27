/**
 * Import File Parser
 * Handles XLSX parsing with validation for comprehensive Excel imports
 * Supports all 27 columns from enrollment Excel files
 * Ref: spec/IMPORTS_UI_SPEC.md
 */

import * as XLSX from 'xlsx';

/**
 * All supported columns from Excel enrollment files
 * Maps to users, students, bookings, courses, classes, agencies, accommodation_types
 */
export const WHITELISTED_COLUMNS = [
  // Student identity (users table)
  'Name',
  'DOB',
  'Nationality',
  // Visa (students table)
  'Visa',
  'Visa Type',
  // Course/Class
  'Course',
  'Level/Class',
  'Weeks',
  'Start Date',
  'End Date',
  'Placement Test Score',
  // Accommodation
  'Accom Type',
  'Accommodation Start Date',
  'Accommodation End Date',
  // Financial (bookings table)
  'Sale Date',
  'Source',
  'Deposit Paid',
  'Paid',
  'Course Fee Due',
  'Accomodation', // Note: typo preserved from Excel
  'Transfer',
  'Exam Fee',
  'Registration Fee',
  'Learner Protection',
  'Medical Insurance',
  'Total Booking',
  'Total Booking Due',
  // Legacy columns for backwards compatibility
  'Student Name',
  'Class Name',
  'Include On Register',
] as const;

export type WhitelistedColumn = (typeof WHITELISTED_COLUMNS)[number];

/**
 * Required columns that must be present (key columns for matching)
 * Only 'Name' and 'Start Date' are required per the plan
 */
export const REQUIRED_COLUMNS: WhitelistedColumn[] = ['Name', 'Start Date'];

/**
 * Parsed row from the file with explicit fields tracking
 */
export interface ParsedRow {
  rowNumber: number;
  rawData: Record<string, unknown>;
  parsedData: {
    // Student identity (users table)
    name: string | null;
    dateOfBirth: Date | null;
    nationality: string | null;
    // Visa (students table)
    isVisaStudent: boolean | null;
    visaType: string | null;
    // Course/Class
    courseName: string | null;
    className: string | null;
    weeks: number | null;
    courseStartDate: Date | null;
    courseEndDate: Date | null;
    placementTestScore: string | null;
    // Accommodation
    accommodationType: string | null;
    accommodationStartDate: Date | null;
    accommodationEndDate: Date | null;
    // Financial (bookings table)
    saleDate: Date | null;
    agencyName: string | null;
    depositPaidEur: number | null;
    totalPaidEur: number | null;
    courseFeeEur: number | null;
    accommodationFeeEur: number | null;
    transferFeeEur: number | null;
    examFeeEur: number | null;
    registrationFeeEur: number | null;
    learnerProtectionFeeEur: number | null;
    medicalInsuranceFeeEur: number | null;
    totalBookingEur: number | null;
    totalDueEur: number | null;
    // Legacy fields for backwards compatibility
    studentName: string | null; // alias for name
    startDate: Date | null; // alias for courseStartDate
    endDate: Date | null; // alias for courseEndDate
    course: string | null; // alias for courseName
    includeOnRegister: boolean | null;
  };
  /** Fields that have actual values (not empty) - used to preserve existing data on update */
  explicitFields: Set<string>;
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
 * Sheet metadata for multi-sheet files
 */
export interface SheetInfo {
  name: string;
  rowCount: number;
}

/**
 * Result when file has multiple sheets and needs selection
 */
export interface MultiSheetResult {
  multiSheet: true;
  sheets: SheetInfo[];
}

/**
 * Combined result type for parseClassesFile
 */
export type ParseFileResult = ParseResult | MultiSheetResult;

/**
 * Type guard to check if result is multi-sheet
 */
export function isMultiSheetResult(result: ParseFileResult): result is MultiSheetResult {
  return 'multiSheet' in result && result.multiSheet === true;
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
 * Column mapping configuration
 * Maps normalized header names to internal field names and target tables
 */
export interface ColumnMapping {
  index: number;
  field: string;
  table: string;
}

/**
 * Map normalized headers to whitelisted columns
 * Returns the internal field name for storage
 */
function mapHeader(header: string): WhitelistedColumn | null {
  const normalized = normalizeHeader(header);

  const mappings: Record<string, WhitelistedColumn> = {
    // Student Name/Identity variations
    name: 'Name',
    'student name': 'Name',
    studentname: 'Name',
    student: 'Name',
    // DOB variations
    dob: 'DOB',
    'date of birth': 'DOB',
    dateofbirth: 'DOB',
    birthday: 'DOB',
    birthdate: 'DOB',
    // Nationality
    nationality: 'Nationality',
    country: 'Nationality',
    // Visa variations
    visa: 'Visa',
    'visa student': 'Visa',
    visastudent: 'Visa',
    'is visa': 'Visa',
    isvisa: 'Visa',
    // Visa Type
    'visa type': 'Visa Type',
    visatype: 'Visa Type',
    // Course variations
    course: 'Course',
    programme: 'Course',
    program: 'Course',
    'course name': 'Course',
    coursename: 'Course',
    // Level/Class variations
    levelclass: 'Level/Class',
    'level class': 'Level/Class',
    'class name': 'Level/Class',
    classname: 'Level/Class',
    class: 'Level/Class',
    level: 'Level/Class',
    // Weeks variations
    weeks: 'Weeks',
    week: 'Weeks',
    'booked weeks': 'Weeks',
    bookedweeks: 'Weeks',
    duration: 'Weeks',
    // Start Date variations (course start)
    'start date': 'Start Date',
    startdate: 'Start Date',
    start: 'Start Date',
    'course start': 'Start Date',
    'course start date': 'Start Date',
    // End Date variations (course end)
    'end date': 'End Date',
    enddate: 'End Date',
    end: 'End Date',
    'course end': 'End Date',
    'course end date': 'End Date',
    // Placement test
    'placement test score': 'Placement Test Score',
    'placement test': 'Placement Test Score',
    placementtest: 'Placement Test Score',
    'placement score': 'Placement Test Score',
    // Accommodation Type
    'accom type': 'Accom Type',
    'accommodation type': 'Accom Type',
    accomtype: 'Accom Type',
    accommodationtype: 'Accom Type',
    accommodation: 'Accom Type',
    // Sale Date
    'sale date': 'Sale Date',
    saledate: 'Sale Date',
    'booking date': 'Sale Date',
    // Source/Agency
    source: 'Source',
    agency: 'Source',
    'sales source': 'Source',
    // Financial fields
    'deposit paid': 'Deposit Paid',
    depositpaid: 'Deposit Paid',
    deposit: 'Deposit Paid',
    paid: 'Paid',
    'total paid': 'Paid',
    totalpaid: 'Paid',
    'course fee due': 'Course Fee Due',
    coursefeedue: 'Course Fee Due',
    'course fee': 'Course Fee Due',
    accomodation: 'Accomodation', // typo preserved from Excel
    'accommodation fee': 'Accomodation',
    'accom fee': 'Accomodation',
    transfer: 'Transfer',
    'transfer fee': 'Transfer',
    'exam fee': 'Exam Fee',
    examfee: 'Exam Fee',
    exam: 'Exam Fee',
    'registration fee': 'Registration Fee',
    registrationfee: 'Registration Fee',
    registration: 'Registration Fee',
    'learner protection': 'Learner Protection',
    learnerprotection: 'Learner Protection',
    'learner protection fee': 'Learner Protection',
    'medical insurance': 'Medical Insurance',
    medicalinsurance: 'Medical Insurance',
    insurance: 'Medical Insurance',
    'total booking': 'Total Booking',
    totalbooking: 'Total Booking',
    total: 'Total Booking',
    'total booking due': 'Total Booking Due',
    totalbookingdue: 'Total Booking Due',
    'amount due': 'Total Booking Due',
    // Legacy mappings for backwards compatibility
    // Note: 'student name' and 'studentname' already map to 'Name' above
    // 'class name' already maps to 'Level/Class' above
    'include on register': 'Include On Register',
    includeonregister: 'Include On Register',
    'on register': 'Include On Register',
    onregister: 'Include On Register',
    register: 'Include On Register',
    'xxx register flag': 'Include On Register',
    'register flag': 'Include On Register',
    registerflag: 'Include On Register',
    xxx: 'Include On Register',
    'xxx counter': 'Include On Register',
    xxxcounter: 'Include On Register',
  };

  return mappings[normalized] ?? null;
}

/**
 * Map headers with position-based detection for duplicate column names
 * Handles "Start date"/"End date" appearing twice (course + accommodation)
 */
function mapHeadersWithPosition(
  headers: string[]
): Map<number, { column: WhitelistedColumn; field: string }> {
  const mappings = new Map<number, { column: WhitelistedColumn; field: string }>();
  let afterAccomType = false;

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    const normalized = normalizeHeader(header);

    // Check for Accom Type - marks the start of accommodation date columns
    if (
      normalized === 'accom type' ||
      normalized === 'accommodation type' ||
      normalized === 'accomtype'
    ) {
      afterAccomType = true;
      mappings.set(i, { column: 'Accom Type', field: 'accommodationType' });
      continue;
    }

    // Handle duplicate date columns based on position
    if (
      afterAccomType &&
      (normalized === 'start date' || normalized === 'startdate' || normalized === 'start')
    ) {
      mappings.set(i, { column: 'Accommodation Start Date', field: 'accommodationStartDate' });
      continue;
    }

    if (
      afterAccomType &&
      (normalized === 'end date' || normalized === 'enddate' || normalized === 'end')
    ) {
      mappings.set(i, { column: 'Accommodation End Date', field: 'accommodationEndDate' });
      afterAccomType = false; // Reset after second date column
      continue;
    }

    // Standard mapping
    const mapped = mapHeader(header);
    if (mapped) {
      const field = getFieldName(mapped);
      mappings.set(i, { column: mapped, field });
    }
  }

  return mappings;
}

/**
 * Get the internal field name for a whitelisted column
 */
function getFieldName(column: WhitelistedColumn): string {
  const fieldMap: Record<WhitelistedColumn, string> = {
    Name: 'name',
    DOB: 'dateOfBirth',
    Nationality: 'nationality',
    Visa: 'isVisaStudent',
    'Visa Type': 'visaType',
    Course: 'courseName',
    'Level/Class': 'className',
    Weeks: 'weeks',
    'Start Date': 'courseStartDate',
    'End Date': 'courseEndDate',
    'Placement Test Score': 'placementTestScore',
    'Accom Type': 'accommodationType',
    'Accommodation Start Date': 'accommodationStartDate',
    'Accommodation End Date': 'accommodationEndDate',
    'Sale Date': 'saleDate',
    Source: 'agencyName',
    'Deposit Paid': 'depositPaidEur',
    Paid: 'totalPaidEur',
    'Course Fee Due': 'courseFeeEur',
    Accomodation: 'accommodationFeeEur',
    Transfer: 'transferFeeEur',
    'Exam Fee': 'examFeeEur',
    'Registration Fee': 'registrationFeeEur',
    'Learner Protection': 'learnerProtectionFeeEur',
    'Medical Insurance': 'medicalInsuranceFeeEur',
    'Total Booking': 'totalBookingEur',
    'Total Booking Due': 'totalDueEur',
    // Legacy fields
    'Student Name': 'studentName',
    'Class Name': 'className',
    'Include On Register': 'includeOnRegister',
  };
  return fieldMap[column] || column.toLowerCase().replace(/\s+/g, '');
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
 * Parse number value (for weeks)
 */
function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const num = Number(value);
  return isNaN(num) ? null : Math.round(num);
}

/**
 * Parse boolean value (for visa, include on register)
 * Accepts: true/false, yes/no, 1/0, y/n, x (for checkbox marked)
 */
function parseBoolean(value: unknown): boolean | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  // If it's already a boolean
  if (typeof value === 'boolean') {
    return value;
  }

  // If it's a number
  if (typeof value === 'number') {
    return value !== 0;
  }

  // If it's a string
  if (typeof value === 'string') {
    const str = value.toLowerCase().trim();
    if (['true', 'yes', 'y', '1', 'x', 'on'].includes(str)) {
      return true;
    }
    if (['false', 'no', 'n', '0', 'off', ''].includes(str)) {
      return false;
    }
  }

  return null;
}

/**
 * Parse decimal/currency value (for fees)
 * Handles €, EUR prefix/suffix, comma as thousands separator
 */
function parseDecimal(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  // If it's already a number
  if (typeof value === 'number') {
    return isNaN(value) ? null : Math.round(value * 100) / 100;
  }

  // If it's a string, clean it
  if (typeof value === 'string') {
    // Remove currency symbols, EUR, spaces
    let cleaned = value.replace(/[€£$]/g, '').replace(/EUR/gi, '').replace(/\s/g, '').trim();

    // Handle European format (comma as decimal, period as thousands)
    // If we see both comma and period, determine which is the decimal
    if (cleaned.includes(',') && cleaned.includes('.')) {
      // Period comes before comma = European format (1.234,56)
      if (cleaned.lastIndexOf('.') < cleaned.lastIndexOf(',')) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
        // Comma comes before period = US format (1,234.56)
        cleaned = cleaned.replace(/,/g, '');
      }
    } else if (cleaned.includes(',')) {
      // Only comma - could be decimal or thousands
      // If 3 digits after comma, it's thousands separator
      const parts = cleaned.split(',');
      if (parts.length === 2 && parts[1].length === 3) {
        cleaned = cleaned.replace(',', '');
      } else {
        // Treat as decimal
        cleaned = cleaned.replace(',', '.');
      }
    }

    const num = parseFloat(cleaned);
    return isNaN(num) ? null : Math.round(num * 100) / 100;
  }

  return null;
}

/**
 * Validate a parsed row
 * Only Name and Start Date are required per the plan
 */
function validateRow(
  parsedData: ParsedRow['parsedData']
): Array<{ field: string; message: string }> {
  const errors: Array<{ field: string; message: string }> = [];

  // Required field: Name (check both new and legacy fields)
  const hasName = parsedData.name || parsedData.studentName;
  if (!hasName) {
    errors.push({ field: 'Name', message: 'Name is required' });
  }

  // Required field: Start Date (check both new and legacy fields)
  const hasStartDate = parsedData.courseStartDate || parsedData.startDate;
  if (!hasStartDate) {
    errors.push({ field: 'Start Date', message: 'Start Date is required' });
  }

  // Validate course dates if both provided
  const startDate = parsedData.courseStartDate || parsedData.startDate;
  const endDate = parsedData.courseEndDate || parsedData.endDate;
  if (startDate && endDate) {
    if (endDate < startDate) {
      errors.push({ field: 'End Date', message: 'End Date must be after Start Date' });
    }
  }

  // Validate accommodation dates if both provided
  if (parsedData.accommodationStartDate && parsedData.accommodationEndDate) {
    if (parsedData.accommodationEndDate < parsedData.accommodationStartDate) {
      errors.push({
        field: 'Accommodation End Date',
        message: 'Accommodation End Date must be after Start Date',
      });
    }
  }

  return errors;
}

/**
 * Parse classes.xlsx file
 * @param fileBuffer - ArrayBuffer of the uploaded file
 * @param sheetName - Optional sheet name to parse (required for multi-sheet files)
 * @returns ParseResult with rows and metadata, or MultiSheetResult if selection needed
 */
export async function parseClassesFile(
  fileBuffer: ArrayBuffer,
  sheetName?: string
): Promise<ParseFileResult> {
  try {
    // Read workbook
    const workbook = XLSX.read(fileBuffer, { type: 'array', cellDates: true });

    // Handle multi-sheet files
    if (workbook.SheetNames.length > 1) {
      // If no sheet specified, return sheet list for selection
      if (!sheetName) {
        const sheets: SheetInfo[] = workbook.SheetNames.map(name => {
          const sheet = workbook.Sheets[name];
          const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
          const rowCount = range.e.r; // Number of data rows (excluding header)
          return { name, rowCount };
        });
        return { multiSheet: true, sheets };
      }

      // Validate specified sheet exists
      if (!workbook.SheetNames.includes(sheetName)) {
        return {
          success: false,
          rows: [],
          totalRows: 0,
          validRows: 0,
          invalidRows: 0,
          ignoredColumns: [],
          error: `Sheet "${sheetName}" not found in file`,
        };
      }
    }

    // Use specified sheet or first sheet for single-sheet files
    const targetSheetName = sheetName || workbook.SheetNames[0];
    const sheet = workbook.Sheets[targetSheetName];

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

    // Map headers with position-based detection for duplicate columns
    const positionMapping = mapHeadersWithPosition(fileHeaders);
    const ignoredColumns: string[] = [];
    const mappedColumns = new Set<WhitelistedColumn>();

    // Build header mapping and track ignored columns
    const headerMapping: Record<string, { column: WhitelistedColumn; field: string } | null> = {};
    fileHeaders.forEach((header, index) => {
      const mapping = positionMapping.get(index);
      headerMapping[header] = mapping || null;
      if (mapping) {
        mappedColumns.add(mapping.column);
      } else {
        ignoredColumns.push(header);
      }
    });

    // Check required columns are present (with fallbacks for legacy column names)
    const hasName = mappedColumns.has('Name') || mappedColumns.has('Student Name');
    const hasStartDate = mappedColumns.has('Start Date');

    if (!hasName || !hasStartDate) {
      const missing: string[] = [];
      if (!hasName) missing.push('Name');
      if (!hasStartDate) missing.push('Start Date');
      return {
        success: false,
        rows: [],
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        ignoredColumns,
        error: `Missing required column(s): ${missing.join(', ')}`,
      };
    }

    // Parse each row
    const parsedRows: ParsedRow[] = [];
    let validCount = 0;
    let invalidCount = 0;

    for (let i = 0; i < rawRows.length; i++) {
      const rawRow = rawRows[i];
      const rowNumber = i + 2; // +2 because: 0-indexed + header row
      const explicitFields = new Set<string>();

      // Helper to extract and track explicit values
      const extractValue = (targetColumn: WhitelistedColumn): unknown => {
        for (const [header, mapping] of Object.entries(headerMapping)) {
          if (mapping?.column === targetColumn) {
            return rawRow[header];
          }
        }
        return null;
      };

      // Helper to parse and track explicit fields
      const parseAndTrack = <T>(
        field: string,
        value: unknown,
        parser: (v: unknown) => T | null
      ): T | null => {
        const parsed = parser(value);
        if (
          parsed !== null &&
          parsed !== undefined &&
          (typeof parsed !== 'string' || parsed !== '')
        ) {
          explicitFields.add(field);
        }
        return parsed;
      };

      // Parse all values
      const parsedData: ParsedRow['parsedData'] = {
        // Student identity
        name: parseAndTrack(
          'name',
          extractValue('Name') || extractValue('Student Name'),
          parseString
        ),
        dateOfBirth: parseAndTrack('dateOfBirth', extractValue('DOB'), parseExcelDate),
        nationality: parseAndTrack('nationality', extractValue('Nationality'), parseString),
        // Visa
        isVisaStudent: parseAndTrack('isVisaStudent', extractValue('Visa'), parseBoolean),
        visaType: parseAndTrack('visaType', extractValue('Visa Type'), parseString),
        // Course/Class
        courseName: parseAndTrack('courseName', extractValue('Course'), parseString),
        className: parseAndTrack(
          'className',
          extractValue('Level/Class') || extractValue('Class Name'),
          parseString
        ),
        weeks: parseAndTrack('weeks', extractValue('Weeks'), parseNumber),
        courseStartDate: parseAndTrack(
          'courseStartDate',
          extractValue('Start Date'),
          parseExcelDate
        ),
        courseEndDate: parseAndTrack('courseEndDate', extractValue('End Date'), parseExcelDate),
        placementTestScore: parseAndTrack(
          'placementTestScore',
          extractValue('Placement Test Score'),
          parseString
        ),
        // Accommodation
        accommodationType: parseAndTrack(
          'accommodationType',
          extractValue('Accom Type'),
          parseString
        ),
        accommodationStartDate: parseAndTrack(
          'accommodationStartDate',
          extractValue('Accommodation Start Date'),
          parseExcelDate
        ),
        accommodationEndDate: parseAndTrack(
          'accommodationEndDate',
          extractValue('Accommodation End Date'),
          parseExcelDate
        ),
        // Financial
        saleDate: parseAndTrack('saleDate', extractValue('Sale Date'), parseExcelDate),
        agencyName: parseAndTrack('agencyName', extractValue('Source'), parseString),
        depositPaidEur: parseAndTrack('depositPaidEur', extractValue('Deposit Paid'), parseDecimal),
        totalPaidEur: parseAndTrack('totalPaidEur', extractValue('Paid'), parseDecimal),
        courseFeeEur: parseAndTrack('courseFeeEur', extractValue('Course Fee Due'), parseDecimal),
        accommodationFeeEur: parseAndTrack(
          'accommodationFeeEur',
          extractValue('Accomodation'),
          parseDecimal
        ),
        transferFeeEur: parseAndTrack('transferFeeEur', extractValue('Transfer'), parseDecimal),
        examFeeEur: parseAndTrack('examFeeEur', extractValue('Exam Fee'), parseDecimal),
        registrationFeeEur: parseAndTrack(
          'registrationFeeEur',
          extractValue('Registration Fee'),
          parseDecimal
        ),
        learnerProtectionFeeEur: parseAndTrack(
          'learnerProtectionFeeEur',
          extractValue('Learner Protection'),
          parseDecimal
        ),
        medicalInsuranceFeeEur: parseAndTrack(
          'medicalInsuranceFeeEur',
          extractValue('Medical Insurance'),
          parseDecimal
        ),
        totalBookingEur: parseAndTrack(
          'totalBookingEur',
          extractValue('Total Booking'),
          parseDecimal
        ),
        totalDueEur: parseAndTrack('totalDueEur', extractValue('Total Booking Due'), parseDecimal),
        // Legacy compatibility aliases
        studentName: null,
        startDate: null,
        endDate: null,
        course: null,
        includeOnRegister: parseAndTrack(
          'includeOnRegister',
          extractValue('Include On Register'),
          parseBoolean
        ),
      };

      // Set legacy aliases
      parsedData.studentName = parsedData.name;
      parsedData.startDate = parsedData.courseStartDate;
      parsedData.endDate = parsedData.courseEndDate;
      parsedData.course = parsedData.courseName;

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
        explicitFields,
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

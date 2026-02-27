/**
 * Parser Unit Tests
 * Tests XLSX parsing, column mapping, and validation
 * Ref: spec/IMPORTS_UI_SPEC.md Section 3
 */

import {
  parseClassesFile,
  validateFileType,
  WHITELISTED_COLUMNS,
  REQUIRED_COLUMNS,
  isMultiSheetResult,
  type ParseResult,
  type ParseFileResult,
} from '../parser';
import * as XLSX from 'xlsx';

// Helper to assert ParseResult type
function assertParseResult(result: ParseFileResult): asserts result is ParseResult {
  if (isMultiSheetResult(result)) {
    throw new Error('Expected ParseResult but got MultiSheetResult');
  }
}

// Helper to create a mock XLSX file buffer
function createMockXLSX(data: Record<string, unknown>[], sheetCount: number = 1): ArrayBuffer {
  const workbook = XLSX.utils.book_new();

  for (let i = 0; i < sheetCount; i++) {
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, `Sheet${i + 1}`);
  }

  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  return buffer;
}

describe('Parser', () => {
  describe('validateFileType', () => {
    it('should accept .xlsx files', () => {
      const result = validateFileType('classes.xlsx', 1000);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept .xls files', () => {
      const result = validateFileType('classes.xls', 1000);
      expect(result.valid).toBe(true);
    });

    it('should reject .csv files', () => {
      const result = validateFileType('classes.csv', 1000);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Excel file');
    });

    it('should reject .pdf files', () => {
      const result = validateFileType('document.pdf', 1000);
      expect(result.valid).toBe(false);
    });

    it('should reject files over 10MB', () => {
      const tenMB = 10 * 1024 * 1024;
      const result = validateFileType('large.xlsx', tenMB + 1);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('10MB');
    });

    it('should accept files under 10MB', () => {
      const result = validateFileType('small.xlsx', 5 * 1024 * 1024);
      expect(result.valid).toBe(true);
    });

    it('should be case-insensitive for extensions', () => {
      expect(validateFileType('file.XLSX', 1000).valid).toBe(true);
      expect(validateFileType('file.XLS', 1000).valid).toBe(true);
    });
  });

  describe('parseClassesFile', () => {
    describe('worksheet validation', () => {
      it('should accept workbook with exactly 1 worksheet', async () => {
        const data = [{ Name: 'John Doe', 'Start Date': '2026-01-01', 'Class Name': 'English A1' }];
        const buffer = createMockXLSX(data, 1);

        const result = await parseClassesFile(buffer);
        assertParseResult(result);
        expect(result.success).toBe(true);
        expect(result.totalRows).toBe(1);
      });

      it('should handle corrupted/invalid file gracefully', async () => {
        // XLSX library throws on empty workbook, so we test with invalid buffer
        const invalidBuffer = new ArrayBuffer(100);
        const result = await parseClassesFile(invalidBuffer);
        assertParseResult(result);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should return multi-sheet result for workbooks with multiple worksheets', async () => {
        const data = [{ Name: 'John', 'Start Date': '2026-01-01', 'Class Name': 'A1' }];
        const buffer = createMockXLSX(data, 3);

        const result = await parseClassesFile(buffer);
        expect(isMultiSheetResult(result)).toBe(true);
        if (isMultiSheetResult(result)) {
          expect(result.sheets).toHaveLength(3);
          expect(result.sheets[0].name).toBe('Sheet1');
          expect(result.sheets[1].name).toBe('Sheet2');
          expect(result.sheets[2].name).toBe('Sheet3');
        }
      });

      it('should parse specified sheet from multi-sheet workbook', async () => {
        const data = [{ Name: 'John', 'Start Date': '2026-01-01', 'Class Name': 'A1' }];
        const buffer = createMockXLSX(data, 3);

        const result = await parseClassesFile(buffer, 'Sheet2');
        assertParseResult(result);
        expect(result.success).toBe(true);
        expect(result.totalRows).toBe(1);
      });

      it('should error when specified sheet does not exist', async () => {
        const data = [{ Name: 'John', 'Start Date': '2026-01-01', 'Class Name': 'A1' }];
        const buffer = createMockXLSX(data, 2);

        const result = await parseClassesFile(buffer, 'NonExistentSheet');
        assertParseResult(result);
        expect(result.success).toBe(false);
        expect(result.error).toContain('NonExistentSheet');
        expect(result.error).toContain('not found');
      });
    });

    describe('column whitelist', () => {
      it('should parse whitelisted columns', async () => {
        const data = [
          {
            Name: 'Jane Doe',
            'Start Date': '2026-02-01',
            'Class Name': 'Business English',
            'End Date': '2026-06-01',
            'Include On Register': 'Y',
          },
        ];
        const buffer = createMockXLSX(data);

        const result = await parseClassesFile(buffer);
        assertParseResult(result);
        expect(result.success).toBe(true);
        expect(result.rows[0].parsedData.studentName).toBe('Jane Doe');
        expect(result.rows[0].parsedData.className).toBe('Business English');
        expect(result.rows[0].parsedData.includeOnRegister).toBe(true);
      });

      it('should ignore non-whitelisted columns', async () => {
        const data = [
          {
            Name: 'Test',
            'Start Date': '2026-01-01',
            'Class Name': 'Test Class',
            'Random Column': 'ignored',
            'Another One': 'also ignored',
          },
        ];
        const buffer = createMockXLSX(data);

        const result = await parseClassesFile(buffer);
        assertParseResult(result);
        expect(result.success).toBe(true);
        expect(result.ignoredColumns).toContain('Random Column');
        expect(result.ignoredColumns).toContain('Another One');
      });

      it('should handle case-insensitive header matching', async () => {
        const data = [
          {
            'student name': 'Lower Case',
            'START DATE': '2026-01-01',
            'Class NAME': 'Mixed Case',
          },
        ];
        const buffer = createMockXLSX(data);

        const result = await parseClassesFile(buffer);
        assertParseResult(result);
        expect(result.success).toBe(true);
        expect(result.rows[0].parsedData.studentName).toBe('Lower Case');
        expect(result.rows[0].parsedData.className).toBe('Mixed Case');
      });
    });

    describe('required columns validation', () => {
      it('should fail when Name is missing', async () => {
        const data = [
          {
            'Start Date': '2026-01-01',
            'Class Name': 'Test Class',
          },
        ];
        const buffer = createMockXLSX(data);

        const result = await parseClassesFile(buffer);
        assertParseResult(result);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Name');
      });

      it('should fail when Start Date is missing', async () => {
        const data = [
          {
            Name: 'Test Student',
            'Class Name': 'Test Class',
          },
        ];
        const buffer = createMockXLSX(data);

        const result = await parseClassesFile(buffer);
        assertParseResult(result);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Start Date');
      });

      it('should succeed when only Name and Start Date are present (Class Name is now optional)', async () => {
        const data = [
          {
            Name: 'Test Student',
            'Start Date': '2026-01-01',
          },
        ];
        const buffer = createMockXLSX(data);

        const result = await parseClassesFile(buffer);
        assertParseResult(result);
        // Per the plan, only Name and Start Date are required
        expect(result.success).toBe(true);
      });
    });

    describe('row validation', () => {
      it('should mark row as invalid when Name is empty', async () => {
        const data = [{ Name: '', 'Start Date': '2026-01-01', 'Class Name': 'Test' }];
        const buffer = createMockXLSX(data);

        const result = await parseClassesFile(buffer);
        assertParseResult(result);
        expect(result.success).toBe(true);
        expect(result.rows[0].isValid).toBe(false);
        expect(result.rows[0].validationErrors).toContainEqual(
          expect.objectContaining({ field: 'Name' })
        );
      });

      it('should mark row as invalid when Start Date is empty', async () => {
        const data = [{ Name: 'Test', 'Start Date': '', 'Class Name': 'Test Class' }];
        const buffer = createMockXLSX(data);

        const result = await parseClassesFile(buffer);
        assertParseResult(result);
        expect(result.success).toBe(true);
        expect(result.rows[0].isValid).toBe(false);
        expect(result.rows[0].validationErrors).toContainEqual(
          expect.objectContaining({ field: 'Start Date' })
        );
      });

      it('should mark row as invalid when End Date is before Start Date', async () => {
        const data = [
          {
            Name: 'Test',
            'Start Date': '2026-06-01',
            'Class Name': 'Test',
            'End Date': '2026-01-01',
          },
        ];
        const buffer = createMockXLSX(data);

        const result = await parseClassesFile(buffer);
        assertParseResult(result);
        expect(result.success).toBe(true);
        expect(result.rows[0].isValid).toBe(false);
        expect(result.rows[0].validationErrors).toContainEqual(
          expect.objectContaining({ field: 'End Date' })
        );
      });

      it('should accept valid row with Name and Start Date (minimum required fields)', async () => {
        const data = [
          {
            Name: 'Valid Student',
            'Start Date': '2026-01-01',
          },
        ];
        const buffer = createMockXLSX(data);

        const result = await parseClassesFile(buffer);
        assertParseResult(result);
        expect(result.success).toBe(true);
        expect(result.rows[0].isValid).toBe(true);
        expect(result.rows[0].validationErrors).toHaveLength(0);
      });
    });

    describe('date parsing', () => {
      it('should parse ISO date format (YYYY-MM-DD)', async () => {
        const data = [{ Name: 'Test', 'Start Date': '2026-03-15', 'Class Name': 'Test' }];
        const buffer = createMockXLSX(data);

        const result = await parseClassesFile(buffer);
        assertParseResult(result);
        expect(result.success).toBe(true);
        expect(result.rows[0].parsedData.startDate).toBeInstanceOf(Date);
        expect(result.rows[0].parsedData.startDate?.getFullYear()).toBe(2026);
        expect(result.rows[0].parsedData.startDate?.getMonth()).toBe(2); // March is 2 (0-indexed)
        expect(result.rows[0].parsedData.startDate?.getDate()).toBe(15);
      });

      it('should parse European date format (DD/MM/YYYY)', async () => {
        const data = [{ Name: 'Test', 'Start Date': '15/03/2026', 'Class Name': 'Test' }];
        const buffer = createMockXLSX(data);

        const result = await parseClassesFile(buffer);
        assertParseResult(result);
        expect(result.success).toBe(true);
        expect(result.rows[0].parsedData.startDate).toBeInstanceOf(Date);
        expect(result.rows[0].parsedData.startDate?.getDate()).toBe(15);
        expect(result.rows[0].parsedData.startDate?.getMonth()).toBe(2);
      });

      it('should handle null/empty dates for optional End Date', async () => {
        const data = [
          {
            Name: 'Test',
            'Start Date': '2026-01-01',
            'Class Name': 'Test',
            'End Date': '',
          },
        ];
        const buffer = createMockXLSX(data);

        const result = await parseClassesFile(buffer);
        assertParseResult(result);
        expect(result.success).toBe(true);
        expect(result.rows[0].isValid).toBe(true);
        expect(result.rows[0].parsedData.endDate).toBeNull();
      });
    });

    describe('row counting', () => {
      it('should count total, valid, and invalid rows correctly', async () => {
        const data = [
          { Name: 'Valid 1', 'Start Date': '2026-01-01', 'Class Name': 'Class 1' },
          { Name: '', 'Start Date': '2026-01-01', 'Class Name': 'Class 2' }, // Invalid
          { Name: 'Valid 2', 'Start Date': '2026-02-01', 'Class Name': 'Class 3' },
          { Name: 'Invalid Date', 'Start Date': '', 'Class Name': 'Class 4' }, // Invalid
          { Name: 'Valid 3', 'Start Date': '2026-03-01', 'Class Name': 'Class 5' },
        ];
        const buffer = createMockXLSX(data);

        const result = await parseClassesFile(buffer);
        assertParseResult(result);
        expect(result.success).toBe(true);
        expect(result.totalRows).toBe(5);
        expect(result.validRows).toBe(3);
        expect(result.invalidRows).toBe(2);
      });

      it('should assign correct row numbers (1-indexed, excluding header)', async () => {
        const data = [
          { Name: 'Row 1', 'Start Date': '2026-01-01', 'Class Name': 'Class' },
          { Name: 'Row 2', 'Start Date': '2026-01-01', 'Class Name': 'Class' },
          { Name: 'Row 3', 'Start Date': '2026-01-01', 'Class Name': 'Class' },
        ];
        const buffer = createMockXLSX(data);

        const result = await parseClassesFile(buffer);
        assertParseResult(result);
        expect(result.rows[0].rowNumber).toBe(2); // Row 2 in Excel (header is row 1)
        expect(result.rows[1].rowNumber).toBe(3);
        expect(result.rows[2].rowNumber).toBe(4);
      });
    });

    describe('empty file handling', () => {
      it('should fail on empty file (no data rows)', async () => {
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet([
          ['Student Name', 'Start Date', 'Class Name'], // Header only
        ]);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
        const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });

        const result = await parseClassesFile(buffer);
        assertParseResult(result);
        expect(result.success).toBe(false);
        expect(result.error).toContain('empty');
      });
    });
  });

  describe('constants', () => {
    it('should have correct whitelisted columns (expanded for comprehensive import)', () => {
      // Core fields
      expect(WHITELISTED_COLUMNS).toContain('Name');
      expect(WHITELISTED_COLUMNS).toContain('Start Date');
      expect(WHITELISTED_COLUMNS).toContain('Level/Class');
      expect(WHITELISTED_COLUMNS).toContain('End Date');
      expect(WHITELISTED_COLUMNS).toContain('Course');
      expect(WHITELISTED_COLUMNS).toContain('Weeks');
      expect(WHITELISTED_COLUMNS).toContain('Visa');
      // New fields per plan
      expect(WHITELISTED_COLUMNS).toContain('DOB');
      expect(WHITELISTED_COLUMNS).toContain('Nationality');
      expect(WHITELISTED_COLUMNS).toContain('Visa Type');
      expect(WHITELISTED_COLUMNS).toContain('Sale Date');
      expect(WHITELISTED_COLUMNS).toContain('Source');
      expect(WHITELISTED_COLUMNS).toContain('Deposit Paid');
      expect(WHITELISTED_COLUMNS).toContain('Course Fee Due');
      expect(WHITELISTED_COLUMNS).toContain('Total Booking');
      expect(WHITELISTED_COLUMNS).toContain('Accom Type');
      // Should have 30 columns total
      expect(WHITELISTED_COLUMNS).toHaveLength(30);
    });

    it('should have correct required columns (Name and Start Date only)', () => {
      expect(REQUIRED_COLUMNS).toContain('Name');
      expect(REQUIRED_COLUMNS).toContain('Start Date');
      // Class Name is no longer required per the plan
      expect(REQUIRED_COLUMNS).toHaveLength(2);
    });
  });
});

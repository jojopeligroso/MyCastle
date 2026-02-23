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
} from '../parser';
import * as XLSX from 'xlsx';

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
        const data = [
          { 'Student Name': 'John Doe', 'Start Date': '2026-01-01', 'Class Name': 'English A1' },
        ];
        const buffer = createMockXLSX(data, 1);

        const result = await parseClassesFile(buffer);
        expect(result.success).toBe(true);
        expect(result.totalRows).toBe(1);
      });

      it('should handle corrupted/invalid file gracefully', async () => {
        // XLSX library throws on empty workbook, so we test with invalid buffer
        const invalidBuffer = new ArrayBuffer(100);
        const result = await parseClassesFile(invalidBuffer);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should reject workbook with multiple worksheets', async () => {
        const data = [{ 'Student Name': 'John', 'Start Date': '2026-01-01', 'Class Name': 'A1' }];
        const buffer = createMockXLSX(data, 3);

        const result = await parseClassesFile(buffer);
        expect(result.success).toBe(false);
        expect(result.error).toContain('exactly 1 worksheet');
        expect(result.error).toContain('found 3');
      });
    });

    describe('column whitelist', () => {
      it('should parse whitelisted columns', async () => {
        const data = [
          {
            'Student Name': 'Jane Doe',
            'Start Date': '2026-02-01',
            'Class Name': 'Business English',
            'End Date': '2026-06-01',
            'XXX Register Flag': 'Y',
          },
        ];
        const buffer = createMockXLSX(data);

        const result = await parseClassesFile(buffer);
        expect(result.success).toBe(true);
        expect(result.rows[0].parsedData.studentName).toBe('Jane Doe');
        expect(result.rows[0].parsedData.className).toBe('Business English');
        expect(result.rows[0].parsedData.registerFlag).toBe('Y');
      });

      it('should ignore non-whitelisted columns', async () => {
        const data = [
          {
            'Student Name': 'Test',
            'Start Date': '2026-01-01',
            'Class Name': 'Test Class',
            'Random Column': 'ignored',
            'Another One': 'also ignored',
          },
        ];
        const buffer = createMockXLSX(data);

        const result = await parseClassesFile(buffer);
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
        expect(result.success).toBe(true);
        expect(result.rows[0].parsedData.studentName).toBe('Lower Case');
        expect(result.rows[0].parsedData.className).toBe('Mixed Case');
      });
    });

    describe('required columns validation', () => {
      it('should fail when Student Name is missing', async () => {
        const data = [
          {
            'Start Date': '2026-01-01',
            'Class Name': 'Test Class',
          },
        ];
        const buffer = createMockXLSX(data);

        const result = await parseClassesFile(buffer);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Student Name');
      });

      it('should fail when Start Date is missing', async () => {
        const data = [
          {
            'Student Name': 'Test Student',
            'Class Name': 'Test Class',
          },
        ];
        const buffer = createMockXLSX(data);

        const result = await parseClassesFile(buffer);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Start Date');
      });

      it('should fail when Class Name is missing', async () => {
        const data = [
          {
            'Student Name': 'Test Student',
            'Start Date': '2026-01-01',
          },
        ];
        const buffer = createMockXLSX(data);

        const result = await parseClassesFile(buffer);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Class Name');
      });
    });

    describe('row validation', () => {
      it('should mark row as invalid when Student Name is empty', async () => {
        const data = [{ 'Student Name': '', 'Start Date': '2026-01-01', 'Class Name': 'Test' }];
        const buffer = createMockXLSX(data);

        const result = await parseClassesFile(buffer);
        expect(result.success).toBe(true);
        expect(result.rows[0].isValid).toBe(false);
        expect(result.rows[0].validationErrors).toContainEqual(
          expect.objectContaining({ field: 'Student Name' })
        );
      });

      it('should mark row as invalid when Start Date is empty', async () => {
        const data = [{ 'Student Name': 'Test', 'Start Date': '', 'Class Name': 'Test Class' }];
        const buffer = createMockXLSX(data);

        const result = await parseClassesFile(buffer);
        expect(result.success).toBe(true);
        expect(result.rows[0].isValid).toBe(false);
        expect(result.rows[0].validationErrors).toContainEqual(
          expect.objectContaining({ field: 'Start Date' })
        );
      });

      it('should mark row as invalid when End Date is before Start Date', async () => {
        const data = [
          {
            'Student Name': 'Test',
            'Start Date': '2026-06-01',
            'Class Name': 'Test',
            'End Date': '2026-01-01',
          },
        ];
        const buffer = createMockXLSX(data);

        const result = await parseClassesFile(buffer);
        expect(result.success).toBe(true);
        expect(result.rows[0].isValid).toBe(false);
        expect(result.rows[0].validationErrors).toContainEqual(
          expect.objectContaining({ field: 'End Date' })
        );
      });

      it('should accept valid row with all required fields', async () => {
        const data = [
          {
            'Student Name': 'Valid Student',
            'Start Date': '2026-01-01',
            'Class Name': 'Valid Class',
          },
        ];
        const buffer = createMockXLSX(data);

        const result = await parseClassesFile(buffer);
        expect(result.success).toBe(true);
        expect(result.rows[0].isValid).toBe(true);
        expect(result.rows[0].validationErrors).toHaveLength(0);
      });
    });

    describe('date parsing', () => {
      it('should parse ISO date format (YYYY-MM-DD)', async () => {
        const data = [{ 'Student Name': 'Test', 'Start Date': '2026-03-15', 'Class Name': 'Test' }];
        const buffer = createMockXLSX(data);

        const result = await parseClassesFile(buffer);
        expect(result.success).toBe(true);
        expect(result.rows[0].parsedData.startDate).toBeInstanceOf(Date);
        expect(result.rows[0].parsedData.startDate?.getFullYear()).toBe(2026);
        expect(result.rows[0].parsedData.startDate?.getMonth()).toBe(2); // March is 2 (0-indexed)
        expect(result.rows[0].parsedData.startDate?.getDate()).toBe(15);
      });

      it('should parse European date format (DD/MM/YYYY)', async () => {
        const data = [{ 'Student Name': 'Test', 'Start Date': '15/03/2026', 'Class Name': 'Test' }];
        const buffer = createMockXLSX(data);

        const result = await parseClassesFile(buffer);
        expect(result.success).toBe(true);
        expect(result.rows[0].parsedData.startDate).toBeInstanceOf(Date);
        expect(result.rows[0].parsedData.startDate?.getDate()).toBe(15);
        expect(result.rows[0].parsedData.startDate?.getMonth()).toBe(2);
      });

      it('should handle null/empty dates for optional End Date', async () => {
        const data = [
          {
            'Student Name': 'Test',
            'Start Date': '2026-01-01',
            'Class Name': 'Test',
            'End Date': '',
          },
        ];
        const buffer = createMockXLSX(data);

        const result = await parseClassesFile(buffer);
        expect(result.success).toBe(true);
        expect(result.rows[0].isValid).toBe(true);
        expect(result.rows[0].parsedData.endDate).toBeNull();
      });
    });

    describe('row counting', () => {
      it('should count total, valid, and invalid rows correctly', async () => {
        const data = [
          { 'Student Name': 'Valid 1', 'Start Date': '2026-01-01', 'Class Name': 'Class 1' },
          { 'Student Name': '', 'Start Date': '2026-01-01', 'Class Name': 'Class 2' }, // Invalid
          { 'Student Name': 'Valid 2', 'Start Date': '2026-02-01', 'Class Name': 'Class 3' },
          { 'Student Name': 'Invalid Date', 'Start Date': '', 'Class Name': 'Class 4' }, // Invalid
          { 'Student Name': 'Valid 3', 'Start Date': '2026-03-01', 'Class Name': 'Class 5' },
        ];
        const buffer = createMockXLSX(data);

        const result = await parseClassesFile(buffer);
        expect(result.success).toBe(true);
        expect(result.totalRows).toBe(5);
        expect(result.validRows).toBe(3);
        expect(result.invalidRows).toBe(2);
      });

      it('should assign correct row numbers (1-indexed, excluding header)', async () => {
        const data = [
          { 'Student Name': 'Row 1', 'Start Date': '2026-01-01', 'Class Name': 'Class' },
          { 'Student Name': 'Row 2', 'Start Date': '2026-01-01', 'Class Name': 'Class' },
          { 'Student Name': 'Row 3', 'Start Date': '2026-01-01', 'Class Name': 'Class' },
        ];
        const buffer = createMockXLSX(data);

        const result = await parseClassesFile(buffer);
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
        expect(result.success).toBe(false);
        expect(result.error).toContain('empty');
      });
    });
  });

  describe('constants', () => {
    it('should have correct whitelisted columns', () => {
      expect(WHITELISTED_COLUMNS).toContain('Student Name');
      expect(WHITELISTED_COLUMNS).toContain('Start Date');
      expect(WHITELISTED_COLUMNS).toContain('Class Name');
      expect(WHITELISTED_COLUMNS).toContain('End Date');
      expect(WHITELISTED_COLUMNS).toContain('XXX Register Flag');
      expect(WHITELISTED_COLUMNS).toHaveLength(5);
    });

    it('should have correct required columns', () => {
      expect(REQUIRED_COLUMNS).toContain('Student Name');
      expect(REQUIRED_COLUMNS).toContain('Start Date');
      expect(REQUIRED_COLUMNS).toContain('Class Name');
      expect(REQUIRED_COLUMNS).toHaveLength(3);
    });
  });
});

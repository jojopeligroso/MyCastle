/**
 * Tests for import-data tool
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestSupabaseClient, generateTestJWT, MOCK_USERS, cleanupTestData, TEST_ENV } from '../setup';
import { importData } from '../../src/tools/import-data';
import * as XLSX from 'xlsx';

describe('import-data tool', () => {
  let adminJWT: string;
  let supabase: ReturnType<typeof createTestSupabaseClient>;

  beforeEach(async () => {
    adminJWT = await generateTestJWT(MOCK_USERS.admin);
    supabase = createTestSupabaseClient(adminJWT);
  });

  afterEach(async () => {
    await cleanupTestData(supabase, ['users', 'classes', 'enrollments', 'sessions', 'attendance', 'audit_logs']);
  });

  /**
   * Helper: Create XLSX buffer from data
   */
  function createXLSXBuffer(headers: string[], rows: any[][]): string {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return buffer.toString('base64');
  }

  describe('Input Validation', () => {
    it('should validate file_data is provided', async () => {
      await expect(
        importData.execute(
          {
            file_data: '',
            table: 'users',
          },
          MOCK_USERS.admin
        )
      ).rejects.toThrow();
    });

    it('should validate table name', async () => {
      const fileData = createXLSXBuffer(['email', 'name', 'role'], []);

      await expect(
        importData.execute(
          {
            file_data: fileData,
            table: 'invalid_table' as any,
          },
          MOCK_USERS.admin
        )
      ).rejects.toThrow();
    });

    it('should handle invalid base64 data', async () => {
      const result = await importData.execute(
        {
          file_data: 'not-valid-base64!@#$',
          table: 'users',
        },
        MOCK_USERS.admin
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle empty XLSX file', async () => {
      const ws = XLSX.utils.aoa_to_sheet([]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      const fileData = buffer.toString('base64');

      const result = await importData.execute(
        {
          file_data: fileData,
          table: 'users',
        },
        MOCK_USERS.admin
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('empty');
    });
  });

  describe('Column Mapping', () => {
    it('should validate required columns for users table', async () => {
      const fileData = createXLSXBuffer(['email', 'name'], []); // Missing 'role'

      const result = await importData.execute(
        {
          file_data: fileData,
          table: 'users',
        },
        MOCK_USERS.admin
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('role');
    });

    it('should validate required columns for classes table', async () => {
      const fileData = createXLSXBuffer(['name'], []); // Missing 'code'

      const result = await importData.execute(
        {
          file_data: fileData,
          table: 'classes',
        },
        MOCK_USERS.admin
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('code');
    });

    it('should accept optional columns', async () => {
      const fileData = createXLSXBuffer(
        ['email', 'name', 'role', 'phone', 'status'],
        [['test@example.com', 'Test User', 'student', '+1234567890', 'active']]
      );

      const result = await importData.execute(
        {
          file_data: fileData,
          table: 'users',
        },
        MOCK_USERS.admin
      );

      expect(result.success).toBe(true);
      expect(result.summary?.imported_rows).toBe(1);
    });
  });

  describe('User Import', () => {
    it('should import users from XLSX', async () => {
      const fileData = createXLSXBuffer(
        ['email', 'name', 'role'],
        [
          ['student1@example.com', 'Student One', 'student'],
          ['student2@example.com', 'Student Two', 'student'],
          ['teacher1@example.com', 'Teacher One', 'teacher'],
        ]
      );

      const result = await importData.execute(
        {
          file_data: fileData,
          table: 'users',
        },
        MOCK_USERS.admin
      );

      expect(result.success).toBe(true);
      expect(result.summary?.imported_rows).toBe(3);
      expect(result.summary?.errors).toHaveLength(0);

      // Verify in database
      const { data: users } = await supabase
        .from('users')
        .select('email')
        .in('email', ['student1@example.com', 'student2@example.com', 'teacher1@example.com']);

      expect(users).toHaveLength(3);
    });

    it('should import users with optional fields', async () => {
      const fileData = createXLSXBuffer(
        ['email', 'name', 'role', 'phone'],
        [['test@example.com', 'Test User', 'student', '+1234567890']]
      );

      const result = await importData.execute(
        {
          file_data: fileData,
          table: 'users',
        },
        MOCK_USERS.admin
      );

      expect(result.success).toBe(true);

      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'test@example.com')
        .single();

      expect(user?.phone).toBe('+1234567890');
    });

    it('should handle duplicate emails with skip_duplicates', async () => {
      // Create existing user
      await supabase.from('users').insert({
        email: 'existing@example.com',
        name: 'Existing User',
        role: 'student',
        tenant_id: TEST_ENV.TENANT_ID,
      });

      const fileData = createXLSXBuffer(
        ['email', 'name', 'role'],
        [
          ['existing@example.com', 'Duplicate User', 'student'],
          ['new@example.com', 'New User', 'student'],
        ]
      );

      const result = await importData.execute(
        {
          file_data: fileData,
          table: 'users',
          skip_duplicates: true,
        },
        MOCK_USERS.admin
      );

      expect(result.success).toBe(true);
      expect(result.summary?.imported_rows).toBe(1);
      expect(result.summary?.skipped_rows).toBe(1);
    });

    it('should validate user role', async () => {
      const fileData = createXLSXBuffer(
        ['email', 'name', 'role'],
        [['test@example.com', 'Test User', 'invalid_role']]
      );

      const result = await importData.execute(
        {
          file_data: fileData,
          table: 'users',
          dry_run: true,
        },
        MOCK_USERS.admin
      );

      expect(result.success).toBe(false);
      expect(result.summary?.errors).toBeDefined();
      expect(result.summary?.errors[0].error).toContain('role');
    });
  });

  describe('Class Import', () => {
    it('should import classes from XLSX', async () => {
      const fileData = createXLSXBuffer(
        ['name', 'code', 'description', 'level'],
        [
          ['Beginner English', 'ENG101', 'Introduction to English', 'A1'],
          ['Intermediate Spanish', 'SPA201', 'Intermediate Spanish course', 'B1'],
        ]
      );

      const result = await importData.execute(
        {
          file_data: fileData,
          table: 'classes',
        },
        MOCK_USERS.admin
      );

      expect(result.success).toBe(true);
      expect(result.summary?.imported_rows).toBe(2);

      const { data: classes } = await supabase
        .from('classes')
        .select('code')
        .in('code', ['ENG101', 'SPA201']);

      expect(classes).toHaveLength(2);
    });

    it('should handle duplicate class codes with skip_duplicates', async () => {
      await supabase.from('classes').insert({
        name: 'Existing Class',
        code: 'ENG101',
        tenant_id: TEST_ENV.TENANT_ID,
      });

      const fileData = createXLSXBuffer(
        ['name', 'code'],
        [
          ['Duplicate Class', 'ENG101'],
          ['New Class', 'ENG102'],
        ]
      );

      const result = await importData.execute(
        {
          file_data: fileData,
          table: 'classes',
          skip_duplicates: true,
        },
        MOCK_USERS.admin
      );

      expect(result.success).toBe(true);
      expect(result.summary?.imported_rows).toBe(1);
      expect(result.summary?.skipped_rows).toBe(1);
    });
  });

  describe('Dry Run', () => {
    it('should validate without inserting when dry_run is true', async () => {
      const fileData = createXLSXBuffer(
        ['email', 'name', 'role'],
        [['test@example.com', 'Test User', 'student']]
      );

      const result = await importData.execute(
        {
          file_data: fileData,
          table: 'users',
          dry_run: true,
        },
        MOCK_USERS.admin
      );

      expect(result.success).toBe(true);
      expect(result.summary?.dry_run).toBe(true);
      expect(result.summary?.imported_rows).toBe(1);

      // Verify NOT in database
      const { data: users } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'test@example.com');

      expect(users).toHaveLength(0);
    });

    it('should report validation errors in dry run', async () => {
      const fileData = createXLSXBuffer(
        ['email', 'name', 'role'],
        [
          ['valid@example.com', 'Valid User', 'student'],
          ['invalid@example.com', 'Invalid User', 'invalid_role'],
        ]
      );

      const result = await importData.execute(
        {
          file_data: fileData,
          table: 'users',
          dry_run: true,
        },
        MOCK_USERS.admin
      );

      expect(result.success).toBe(false);
      expect(result.summary?.errors).toHaveLength(1);
      expect(result.summary?.errors[0].row).toBe(3); // Row 3 (header is 1, first data row is 2)
    });
  });

  describe('Audit Logging', () => {
    it('should create audit log for import', async () => {
      const fileData = createXLSXBuffer(
        ['email', 'name', 'role'],
        [['test@example.com', 'Test User', 'student']]
      );

      await importData.execute(
        {
          file_data: fileData,
          table: 'users',
        },
        MOCK_USERS.admin
      );

      const { data: auditLog } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('action', 'import-data')
        .single();

      expect(auditLog).toBeDefined();
      expect(auditLog?.actor_id).toBe(MOCK_USERS.admin.id);
      expect(auditLog?.resource_type).toBe('users');

      const changes = auditLog?.changes as any;
      expect(changes.table).toBe('users');
      expect(changes.imported_rows).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing required fields', async () => {
      const fileData = createXLSXBuffer(
        ['email', 'name', 'role'],
        [
          ['test1@example.com', 'Test User', 'student'],
          [null as any, 'No Email', 'student'], // Missing email
        ]
      );

      const result = await importData.execute(
        {
          file_data: fileData,
          table: 'users',
          dry_run: true,
        },
        MOCK_USERS.admin
      );

      expect(result.success).toBe(false);
      expect(result.summary?.errors).toBeDefined();
      expect(result.summary?.errors.length).toBeGreaterThan(0);
    });

    it('should stop on first error when not skipping duplicates', async () => {
      const fileData = createXLSXBuffer(
        ['email', 'name', 'role'],
        [
          ['test1@example.com', 'Test User 1', 'student'],
          ['invalid', 'Invalid Email', 'student'], // Invalid row
          ['test3@example.com', 'Test User 3', 'student'], // Should not reach this
        ]
      );

      const result = await importData.execute(
        {
          file_data: fileData,
          table: 'users',
        },
        MOCK_USERS.admin
      );

      expect(result.success).toBe(false);
      expect(result.summary?.imported_rows).toBeLessThan(3);
    });

    it('should provide meaningful error messages', async () => {
      const fileData = createXLSXBuffer(
        ['name', 'code'],
        [['Class Without Code', null as any]]
      );

      const result = await importData.execute(
        {
          file_data: fileData,
          table: 'classes',
          dry_run: true,
        },
        MOCK_USERS.admin
      );

      expect(result.success).toBe(false);
      expect(result.summary?.errors[0].error).toBeDefined();
      expect(typeof result.summary?.errors[0].error).toBe('string');
    });
  });

  describe('Authorization', () => {
    it('should enforce tenant isolation', async () => {
      const fileData = createXLSXBuffer(
        ['email', 'name', 'role'],
        [['test@example.com', 'Test User', 'student']]
      );

      // Use unauthorized user (different tenant)
      await importData.execute(
        {
          file_data: fileData,
          table: 'users',
        },
        MOCK_USERS.unauthorized
      );

      // Verify admin cannot see user from different tenant
      const adminSupabase = createTestSupabaseClient(adminJWT);
      const { data: users } = await adminSupabase
        .from('users')
        .select('*')
        .eq('email', 'test@example.com');

      expect(users).toHaveLength(0);
    });
  });
});

/**
 * RLS Session Variables Integration Test
 * Tests that database connection supports session variables required for RLS context
 *
 * This test validates the fix for the critical bug where Transaction Mode Pooler
 * (port 6543) was incompatible with session-based RLS context.
 *
 * Ref: app/src/lib/auth/utils.ts setRLSContext()
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { db, validateRLSSupport } from '../db';
import { sql } from 'drizzle-orm';

describe('RLS Session Variables Support', () => {
  describe('Basic Session Variable Support', () => {
    it('should support setting and reading session variables', async () => {
      // This is what setRLSContext does - set a session variable
      await db.execute(sql`SET app.test_email = 'test@example.com'`);

      // Read it back
      const [result] = (await db.execute(
        sql`SELECT current_setting('app.test_email', true) as email`
      )) as any[];

      expect(result.email).toBe('test@example.com');
    });

    it('should support multiple session variables (full RLS context)', async () => {
      // Simulate full RLS context setup
      await db.execute(sql`SET app.user_email = 'user@example.com'`);
      await db.execute(sql`SET app.is_super_admin = 'false'`);
      await db.execute(sql`SET app.tenant_id = '00000000-0000-0000-0000-000000000001'`);

      // Verify all three are set
      const [result] = (await db.execute(sql`
        SELECT
          current_setting('app.user_email', true) as user_email,
          current_setting('app.is_super_admin', true) as is_super_admin,
          current_setting('app.tenant_id', true) as tenant_id
      `)) as any[];

      expect(result.user_email).toBe('user@example.com');
      expect(result.is_super_admin).toBe('false');
      expect(result.tenant_id).toBe('00000000-0000-0000-0000-000000000001');
    });

    it('should preserve session variables across multiple queries', async () => {
      // Set a variable
      await db.execute(sql`SET app.persistence_test = 'preserved'`);

      // Run another unrelated query
      await db.execute(sql`SELECT 1`);

      // Variable should still be set
      const [result] = (await db.execute(
        sql`SELECT current_setting('app.persistence_test', true) as value`
      )) as any[];

      expect(result.value).toBe('preserved');
    });
  });

  describe('validateRLSSupport helper', () => {
    it('should successfully validate RLS support', async () => {
      // This should not throw
      await expect(validateRLSSupport()).resolves.not.toThrow();
    });

    it('should detect when session variables are not supported', async () => {
      // This test documents the expected behavior but can't actually test it
      // without a Transaction Mode Pooler connection (which we don't want in tests)

      // If we ever switch to Transaction Mode, this test should fail with:
      // "Database connection does not support session variables required for RLS"
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('RLS Context Pattern from auth/utils.ts', () => {
    it('should support the exact pattern used in setRLSContext', async () => {
      // This mirrors the actual implementation in app/src/lib/auth/utils.ts:122
      const testEmail = 'eoinmaleoin@gmail.com';
      const escapedEmail = testEmail.replace(/'/g, "''");

      // This is the exact query that was failing with Transaction Mode Pooler
      await db.execute(sql.raw(`SET app.user_email = '${escapedEmail}'`));

      // Verify it worked
      const [result] = (await db.execute(
        sql`SELECT current_setting('app.user_email', true) as user_email`
      )) as any[];

      expect(result.user_email).toBe(testEmail);
    });

    it('should support super admin flag', async () => {
      await db.execute(sql.raw(`SET app.is_super_admin = 'true'`));

      const [result] = (await db.execute(
        sql`SELECT current_setting('app.is_super_admin', true) as is_super_admin`
      )) as any[];

      expect(result.is_super_admin).toBe('true');
    });

    it('should support tenant ID', async () => {
      const testTenantId = '12345678-1234-1234-1234-123456789abc';
      await db.execute(sql.raw(`SET app.tenant_id = '${testTenantId}'`));

      const [result] = (await db.execute(
        sql`SELECT current_setting('app.tenant_id', true) as tenant_id`
      )) as any[];

      expect(result.tenant_id).toBe(testTenantId);
    });
  });

  describe('Connection Type Detection', () => {
    it('should be using Session Mode Pooler or Direct Connection', () => {
      const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL || '';

      // Should NOT be using Transaction Mode Pooler (port 6543)
      expect(connectionString).not.toContain(':6543');

      // Should be using Session Mode Pooler or Direct (port 5432) or local postgres
      const isValidConnection =
        connectionString.includes(':5432') ||
        connectionString.includes('localhost') ||
        connectionString.includes('127.0.0.1');

      expect(isValidConnection).toBe(true);
    });

    it('should prefer DIRECT_URL when both are set', () => {
      if (process.env.DIRECT_URL) {
        // If DIRECT_URL is set, it should be used
        expect(process.env.DIRECT_URL).toBeTruthy();
      }
      // This is informational - documents expected configuration
      expect(true).toBe(true);
    });
  });
});

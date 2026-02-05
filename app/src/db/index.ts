/**
 * Database Client
 * Drizzle ORM connection to PostgreSQL/Supabase
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

// Load environment variables from .env.local if not already loaded
if (!process.env.DIRECT_URL && !process.env.DATABASE_URL) {
  config({ path: resolve(__dirname, '../../.env.local') });
}

// Use DIRECT_URL for session variable support (RLS context)
// Falls back to DATABASE_URL if DIRECT_URL is not set
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DIRECT_URL or DATABASE_URL environment variable must be set');
}

// Environment validation: Warn if using Transaction Mode Pooler (incompatible with RLS)
if (connectionString.includes(':6543')) {
  console.error(
    '\n⚠️  CRITICAL WARNING: Database connection uses port 6543 (Transaction Mode Pooler)'
  );
  console.error('   Transaction Mode Pooler does NOT support session variables required for RLS.');
  console.error('   Navigation will fail with "Failed query: SET app.user_email" errors.');
  console.error('\n   Solution: Use Session Mode Pooler (port 5432) via DIRECT_URL');
  console.error('   Example: postgresql://user:pass@host.supabase.com:5432/postgres\n');
}

// Validate connection is using DIRECT_URL (recommended for RLS)
if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  console.warn('\n⚠️  WARNING: Using DATABASE_URL without DIRECT_URL set.');
  console.warn('   For RLS session variable support, set DIRECT_URL with Session Mode Pooler.');
  console.warn('   See .env.local.example for configuration details.\n');
}

// Create PostgreSQL client
const queryClient = postgres(connectionString);

// Create Drizzle instance
export const db = drizzle(queryClient, { schema });

/**
 * Validate RLS Support
 * Tests that the database connection supports session variables required for RLS.
 * Should be called during application startup.
 */
export async function validateRLSSupport(): Promise<void> {
  try {
    // Test setting a session variable
    await db.execute(sql`SET app.validation_test = 'rls_check'`);

    // Test reading it back
    const [result] = (await db.execute(
      sql`SELECT current_setting('app.validation_test', true) as test_value`
    )) as any[];

    if (result.test_value !== 'rls_check') {
      throw new Error('Session variable was not preserved');
    }

    console.log('✅ Database connection supports RLS session variables');
  } catch (error) {
    console.error(
      '\n❌ CRITICAL: Database connection does NOT support session variables required for RLS'
    );
    console.error('   Error:', error instanceof Error ? error.message : String(error));
    console.error('\n   This will cause navigation failures across the entire application.');
    console.error('   Fix: Use DIRECT_URL with Session Mode Pooler (port 5432)');
    console.error('   Current connection:', connectionString.replace(/:[^:@]+@/, ':****@'), '\n');

    throw new Error(
      'Database connection does not support session variables required for RLS. ' +
        'Use DIRECT_URL with Session Mode Pooler (port 5432), not Transaction Mode Pooler (port 6543).'
    );
  }
}

// Export schema for use in other files
export { schema };

// Type exports
export type Database = typeof db;

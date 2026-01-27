/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Run Migration Script
 * Executes a SQL migration file against the database
 */

import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';
import postgres from 'postgres';

// Load environment variables
config({ path: join(__dirname, '../.env.local') });

async function runMigration() {
  try {
    // Get database URL from environment
    const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

    if (!directUrl) {
      throw new Error('DATABASE_URL or DIRECT_URL environment variable not set');
    }

    console.log('Connecting to database...');
    const sql = postgres(directUrl, {
      max: 1,
      onnotice: () => {}, // Suppress notices
    });

    // Read migration file
    const migrationPath = join(__dirname, '../migrations/FRESH_0011_attendance_minutes.sql');
    console.log(`Reading migration: ${migrationPath}`);

    const migrationSql = readFileSync(migrationPath, 'utf-8');

    console.log('Executing migration...');
    console.log('---');

    // Execute the migration
    await sql.unsafe(migrationSql);

    console.log('---');
    console.log('✅ Migration FRESH_0011 completed successfully!');

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:');
    console.error(error);
    process.exit(1);
  }
}

runMigration();

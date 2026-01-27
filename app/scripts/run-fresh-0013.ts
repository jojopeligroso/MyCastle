/**
 * Run FRESH_0013 migration: attendance_corrections table
 * Task 1.4.3 - Attendance Correction Flow
 */

import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';
import postgres from 'postgres';

config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment');
  process.exit(1);
}

async function runMigration() {
  const sql = postgres(DATABASE_URL, { max: 1 });

  try {
    console.log('📋 Running FRESH_0013: attendance_corrections table...\n');

    const migrationPath = join(__dirname, '../migrations/FRESH_0013_attendance_corrections.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    await sql.unsafe(migrationSQL);

    console.log('✅ Migration FRESH_0013 completed successfully\n');

    // Verify table creation
    console.log('🔍 Verifying table...');
    const result = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'attendance_corrections'
      ORDER BY ordinal_position
    `;

    console.log(`✅ Found ${result.length} columns in attendance_corrections:`);
    result.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });

    // Verify indexes
    const indexes = await sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'attendance_corrections'
    `;
    console.log(`\n✅ Found ${indexes.length} indexes`);

    // Verify RLS policies
    const policies = await sql`
      SELECT policyname
      FROM pg_policies
      WHERE tablename = 'attendance_corrections'
    `;
    console.log(`✅ Found ${policies.length} RLS policies\n`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();

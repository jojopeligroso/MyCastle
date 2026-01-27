/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Run New Migrations (FRESH_0004 through FRESH_0009)
 * Executes only the new academic, system, curriculum, and programme migrations
 */

import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import postgres from 'postgres';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment');
  process.exit(1);
}

const MIGRATIONS = [
  'FRESH_0004_academic_tables.sql',
  'FRESH_0005_system_tables.sql',
  'FRESH_0006_curriculum_tables.sql',
  'FRESH_0007_programmes.sql',
  'FRESH_0008_rls_additional.sql',
  'FRESH_0009_views_enhanced.sql',
];

async function runMigrations() {
  console.log('\n🚀 Running New Migrations (FRESH_0004 - FRESH_0009)\n');
  console.log('='.repeat(80));

  const sql = postgres(DATABASE_URL, { max: 1 });

  try {
    for (const migration of MIGRATIONS) {
      console.log(`\n📍 Running ${migration}`);
      console.log('-'.repeat(80));

      const migrationPath = resolve(__dirname, '../migrations', migration);
      const migrationSQL = readFileSync(migrationPath, 'utf-8');

      await sql.unsafe(migrationSQL);
      console.log(`✅ ${migration} completed successfully`);
    }

    // Verify new tables
    console.log('\n📍 Verification');
    console.log('-'.repeat(80));

    const tables = await sql`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;
    console.log(`✓ Total tables: ${tables.length}`);

    // Check for new tables
    const newTables = [
      'classes',
      'enrollments',
      'class_sessions',
      'attendance',
      'audit_logs',
      'cefr_descriptors',
      'programmes',
      'programme_courses',
    ];

    for (const table of newTables) {
      const exists = tables.find((t: unknown) => t.tablename === table);
      if (exists) {
        console.log(`✓ ${table} - created`);
      } else {
        console.log(`✗ ${table} - MISSING`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('🎉 ALL MIGRATIONS COMPLETE!');
    console.log('='.repeat(80));
    console.log('\nNext steps:');
    console.log('  1. npm run db:generate (regenerate TypeScript types)');
    console.log('  2. npx tsc --noEmit (verify no type errors)');
    console.log('  3. npm run seed:academic (seed test data)');
    console.log('  4. npm run dev (test admin pages)\n');

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    await sql.end();
    process.exit(1);
  }
}

runMigrations();

/**
 * Check if FRESH_0033 Migration has been run
 */

import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function checkMigrationStatus() {
  console.log('\n📊 Checking FRESH_0033 Migration Status...\n');

  try {
    // Query information_schema to check if tables exist
    const query = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'document_types',
          'student_documents',
          'emergency_contacts',
          'notification_rules',
          'letter_templates',
          'generated_letters'
        )
      ORDER BY table_name;
    `;

    const result: any[] = await db.execute(sql.raw(query));

    if (result.length === 0) {
      console.log('❌ MIGRATION NOT RUN\n');
      console.log('No migration tables found in database.\n');
      console.log('Action Required:');
      console.log('  1. Open Supabase SQL Editor');
      console.log('  2. Copy contents of: app/migrations/FRESH_0033_student_documents_system.sql');
      console.log('  3. Paste and execute\n');
      process.exit(1);
    } else if (result.length === 6) {
      console.log('✅ MIGRATION IS RUNNING!\n');
      console.log('All 6 tables confirmed:');
      result.forEach((row: any) => console.log('  ✅', row.table_name));
      console.log('\n✅ Backend API is ready to use!');
      console.log('\nNext steps:');
      console.log('  1. Set up Supabase Storage bucket (see FRESH_0033_supabase_storage_setup.md)');
      console.log('  2. Run emergency contact migration (FRESH_0033_migrate_emergency_contacts.sql)');
      console.log('  3. Seed document types (npx tsx scripts/seed-document-types.ts)');
      console.log('  4. Regenerate types (npm run db:generate)\n');
      process.exit(0);
    } else {
      console.log('⚠️  PARTIAL MIGRATION\n');
      console.log('Found', result.length, 'of 6 expected tables:');
      result.forEach((row: any) => console.log('  ✅', row.table_name));
      console.log('\nSome tables are missing. Migration may have failed partway through.');
      console.log('Re-run the migration SQL in Supabase SQL Editor.\n');
      process.exit(1);
    }
  } catch (error: any) {
    console.log('❌ ERROR checking migration status:\n');
    console.log(error.message);
    console.log('\nPossible causes:');
    console.log('  - Database connection issue');
    console.log('  - .env.local not configured correctly');
    console.log('  - Network/VPN blocking Supabase connection\n');
    process.exit(1);
  }
}

checkMigrationStatus();

/**
 * Execute FRESH_0033 Student Documents System Migration
 */

import { db } from '../src/db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  console.log('🔄 Running FRESH_0033 Student Documents System Migration...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/FRESH_0033_student_documents_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration file loaded:', migrationPath);
    console.log('📏 Size:', (migrationSQL.length / 1024).toFixed(2), 'KB\n');

    // Execute the migration
    console.log('⚙️  Executing migration...\n');
    await db.execute(sql.raw(migrationSQL));

    console.log('✅ Migration completed successfully!\n');

    // Verify tables were created
    const result = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('document_types', 'student_documents', 'emergency_contacts',
                          'notification_rules', 'letter_templates', 'generated_letters')
      ORDER BY table_name
    `);

    console.log('📊 Verification - Tables created:');
    result.forEach((row: any) => console.log('  ✅', row.table_name));

    if (result.length === 6) {
      console.log('\n🎉 All 6 tables created successfully!');
    } else {
      console.log('\n⚠️  Warning: Expected 6 tables, found', result.length);
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

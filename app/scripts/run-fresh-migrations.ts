/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Run Fresh Migrations Directly
 * Executes nuclear reset + fresh schema + seed data
 */

import { execSync } from 'child_process';
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

async function runMigrations() {
  console.log('\n🚀 Starting Fresh Database Migration\n');
  console.log('='.repeat(80));

  const sql = postgres(DATABASE_URL!, { max: 1 });

  try {
    // Step 1: Nuclear Reset
    console.log('\n📍 STEP 1: Nuclear Schema Reset');
    console.log('-'.repeat(80));
    console.log('Dropping public schema and recreating...');

    await sql`DROP SCHEMA IF EXISTS public CASCADE`;
    console.log('✓ Dropped public schema');

    await sql`CREATE SCHEMA public`;
    console.log('✓ Created public schema');

    await sql`GRANT ALL ON SCHEMA public TO postgres`;
    await sql`GRANT ALL ON SCHEMA public TO public`;
    console.log('✓ Granted permissions');

    console.log('✅ Nuclear reset complete\n');

    // Step 2: Run FRESH_0001 (Schema)
    console.log('\n📍 STEP 2: Creating Fresh Schema');
    console.log('-'.repeat(80));

    const schemaPath = resolve(__dirname, '../migrations/FRESH_0001_core_schema.sql');
    const schemaSQL = readFileSync(schemaPath, 'utf-8');

    // Remove the DROP commands from the beginning (not needed after nuclear reset)
    const cleanSchemaSQL = schemaSQL.replace(/DROP TABLE IF EXISTS.*?CASCADE;/gs, '');
    const cleanSchemaSQL2 = cleanSchemaSQL.replace(/DROP TYPE IF EXISTS.*?CASCADE;/gs, '');

    console.log('Executing schema creation...');
    await sql.unsafe(cleanSchemaSQL2);

    console.log('✅ Schema created successfully\n');

    // Step 3: Seed Data (via TypeScript)
    console.log('\n📍 STEP 3: Seeding Data');
    console.log('-'.repeat(80));

    // Close this connection and run seed script
    await sql.end();

    // Import and run seed function
    execSync('npx tsx scripts/seed-fresh-data.ts', {
      cwd: resolve(__dirname, '..'),
      stdio: 'inherit',
    });

    // Reconnect for verification
    const sql2 = postgres(DATABASE_URL!, { max: 1 });

    console.log('\n✅ Seed data inserted successfully\n');

    // Step 4: Verify
    console.log('\n📍 STEP 4: Verification');
    console.log('-'.repeat(80));

    const tables = await sql2`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;
    console.log(`✓ ${tables.length} tables created`);

    const tenants = await sql2`SELECT COUNT(*) as count FROM tenants`;
    console.log(`✓ ${tenants[0].count} tenant(s)`);

    const users = await sql2`SELECT COUNT(*) as count FROM users`;
    console.log(`✓ ${users[0].count} user(s)`);

    const userRoles = await sql2`SELECT COUNT(*) as count FROM user_roles WHERE revoked_at IS NULL`;
    console.log(`✓ ${userRoles[0].count} active role assignment(s)`);

    const courses = await sql2`SELECT COUNT(*) as count FROM courses`;
    console.log(`✓ ${courses[0].count} course(s)`);

    const bookings = await sql2`SELECT COUNT(*) as count FROM bookings`;
    console.log(`✓ ${bookings[0].count} booking(s)`);

    const payments = await sql2`SELECT COUNT(*) as count FROM payments`;
    console.log(`✓ ${payments[0].count} payment(s)`);

    console.log('\n' + '='.repeat(80));
    console.log('🎉 MIGRATION COMPLETE!');
    console.log('='.repeat(80));
    console.log('\nTest User:');
    console.log('  Email: eoinmaleoin@gmail.com');
    console.log('  Roles: admin + teacher + student');
    console.log('\nNext steps:');
    console.log('  1. npm run verify:schema (optional - detailed verification)');
    console.log('  2. Update Drizzle schema definitions');
    console.log('  3. npm run dev\n');

    await sql2.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();

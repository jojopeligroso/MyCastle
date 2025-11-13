/**
 * Database Connection Test Script
 * Usage: npx tsx scripts/test-db-connection.ts
 */
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

async function testConnection() {
  console.log('🔍 Testing database connection...\n');

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ ERROR: DATABASE_URL not found in environment variables');
    console.log('\n📝 Please configure your .env.local file with:');
    console.log('   DATABASE_URL=postgresql://user:password@host:port/database\n');
    process.exit(1);
  }

  try {
    // Create connection
    console.log('📡 Connecting to database...');
    const client = postgres(databaseUrl);
    const db = drizzle(client);

    // Test basic query
    console.log('✅ Connection established!');
    console.log('\n🔍 Running test query...');

    const result = await db.execute(sql`SELECT current_database(), current_user, version()`);

    console.log('\n✅ Database connection successful!');
    console.log('\n📊 Connection Details:');
    const row = result[0] as { current_database: string; current_user: string; version: string };
    console.log(`   Database: ${row.current_database}`);
    console.log(`   User: ${row.current_user}`);
    console.log(`   Version: ${row.version.split(' ')[0]} ${row.version.split(' ')[1]}`);

    // Check if tables exist
    console.log('\n🔍 Checking tables...');
    const tables = await db.execute(sql`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    if (tables.length > 0) {
      console.log(`✅ Found ${tables.length} tables:`);
      tables.forEach((table) => {
        const typedTable = table as { tablename: string };
        console.log(`   - ${typedTable.tablename}`);
      });
    } else {
      console.log('⚠️  No tables found. Run migrations with: npm run db:push');
    }

    // Test RLS is enabled
    console.log('\n🔒 Checking RLS status...');
    const rlsTables = await db.execute(sql`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public' AND rowsecurity = true
    `);

    if (rlsTables.length > 0) {
      console.log(`✅ RLS enabled on ${rlsTables.length} tables:`);
      rlsTables.forEach((table) => {
        const typedTable = table as { tablename: string };
        console.log(`   - ${typedTable.tablename}`);
      });
    } else {
      console.log('⚠️  No tables have RLS enabled yet (expected for new setup)');
    }

    await client.end();
    console.log('\n✅ All checks passed!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error('\nError details:');
    console.error(error);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Check your DATABASE_URL is correct');
    console.log('   2. Ensure database server is running');
    console.log('   3. Verify network access (firewall/security groups)');
    console.log('   4. Confirm database credentials are valid\n');
    process.exit(1);
  }
}

testConnection();

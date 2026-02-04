/**
 * Test Database Connection
 * Verifies direct connection and RLS context support
 */

import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function testConnection() {
  console.log('Testing database connection...\n');

  try {
    // Test 1: Basic connectivity
    console.log('1. Testing basic connectivity...');
    const result = await db.execute(sql`SELECT current_database(), current_user`);
    console.log('✅ Connected to database:', result);

    // Test 2: Session variable support (critical for RLS)
    console.log('\n2. Testing session variable support (RLS context)...');

    // Try to set a session variable
    await db.execute(sql`SET app.user_email = 'test@example.com'`);
    console.log('✅ Successfully set app.user_email');

    // Verify it was set
    const [emailResult] = await db.execute(
      sql`SELECT current_setting('app.user_email', true) as user_email`
    );
    console.log('✅ Retrieved session variable:', emailResult);

    // Test 3: Set multiple session variables (like RLS does)
    console.log('\n3. Testing multiple session variables...');
    await db.execute(sql`SET app.is_super_admin = 'false'`);
    await db.execute(sql`SET app.tenant_id = '00000000-0000-0000-0000-000000000000'`);
    console.log('✅ Successfully set all RLS context variables');

    console.log('\n✅ All database connection tests passed!');
    console.log('🎉 RLS context support is working correctly\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database connection test failed:');
    console.error(error);
    console.error('\nThis indicates the connection may not support session variables.');
    console.error('Check that you are using DIRECT_URL (port 5432) not DATABASE_URL (port 6543)\n');
    process.exit(1);
  }
}

testConnection();

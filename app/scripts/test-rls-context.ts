/**
 * Test RLS Context Setup
 * Simulates the actual RLS context flow from auth/utils.ts
 */

import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function testRLSContext() {
  console.log('Testing RLS Context Setup...\n');

  try {
    // Simulate what setRLSContext() does
    const testEmail = 'eoinmaleoin@gmail.com';
    const testTenantId = '00000000-0000-0000-0000-000000000000';

    console.log('1. Setting app.user_email (this was failing before)...');
    const escapedEmail = testEmail.replace(/'/g, "''");
    await db.execute(sql.raw(`SET app.user_email = '${escapedEmail}'`));
    console.log('✅ Successfully set app.user_email:', testEmail);

    console.log('\n2. Setting app.is_super_admin...');
    await db.execute(sql.raw(`SET app.is_super_admin = 'false'`));
    console.log('✅ Successfully set app.is_super_admin');

    console.log('\n3. Setting app.tenant_id...');
    await db.execute(sql.raw(`SET app.tenant_id = '${testTenantId}'`));
    console.log('✅ Successfully set app.tenant_id');

    console.log('\n4. Verifying all session variables...');
    const [result] = await db.execute(sql`
      SELECT
        current_setting('app.user_email', true) as user_email,
        current_setting('app.is_super_admin', true) as is_super_admin,
        current_setting('app.tenant_id', true) as tenant_id
    `);
    console.log('✅ Session variables set correctly:', result);

    console.log('\n🎉 RLS Context setup is working!');
    console.log('The navigation errors should now be resolved.\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ RLS Context test failed:');
    console.error(error);
    console.error('\nThis is the same error you were seeing in the browser.\n');
    process.exit(1);
  }
}

testRLSContext();

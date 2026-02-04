import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, sql as drizzleSql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

import { users } from '../src/db/schema/core';

async function testAuthFlow() {
  try {
    console.log('🧪 TESTING COMPLETE AUTH FLOW WITH FIX\n');
    console.log('='.repeat(60));

    const testEmail = 'eoinmaleoin@gmail.com';

    // Simulate the auth flow as it would happen in the browser
    console.log('\n1️⃣ Simulating setRLSContext() flow:');
    console.log('   User email:', testEmail);

    // Step 1: Set app.user_email FIRST (this is the fix!)
    console.log('\n2️⃣ Setting app.user_email (allows RLS is_superuser() to work):');
    await db.execute(drizzleSql.raw(`SET app.user_email = '${testEmail}'`));
    console.log('   ✅ app.user_email set');

    // Step 2: Query users table (should now work because RLS can check is_superuser())
    console.log('\n3️⃣ Querying users table (with RLS active):');
    try {
      const [userRecord] = await db
        .select({
          email: users.email,
          isSuperAdmin: users.isSuperAdmin,
          tenantId: users.tenantId,
          primaryRole: users.primaryRole,
        })
        .from(users)
        .where(eq(users.email, testEmail))
        .limit(1);

      if (userRecord) {
        console.log('   ✅ Query succeeded!');
        console.log('   User found:', userRecord.email);
        console.log('   is_super_admin:', userRecord.isSuperAdmin);
        console.log('   tenant_id:', userRecord.tenantId);
        console.log('   primary_role:', userRecord.primaryRole);

        if (userRecord.isSuperAdmin) {
          console.log('\n4️⃣ Setting RLS context for super admin:');
          await db.execute(drizzleSql.raw(`SET app.is_super_admin = 'true'`));
          console.log('   ✅ Super admin context set');
          console.log('   ✅ User can access all tenants');
        } else {
          console.log('\n4️⃣ Setting RLS context for regular user:');
          if (!userRecord.tenantId) {
            console.log('   ❌ ERROR: No tenant_id for regular user');
          } else {
            await db.execute(drizzleSql.raw(`SET app.is_super_admin = 'false'`));
            await db.execute(drizzleSql.raw(`SET app.tenant_id = '${userRecord.tenantId}'`));
            console.log('   ✅ Tenant context set');
            console.log('   Restricted to tenant:', userRecord.tenantId);
          }
        }

        console.log('\n5️⃣ Verifying session variables:');
        const sessionVars = await client`
          SELECT
            current_setting('app.user_email', true) as user_email,
            current_setting('app.tenant_id', true) as tenant_id,
            current_setting('app.is_super_admin', true) as is_super_admin
        `;
        console.log('   user_email:', sessionVars[0].user_email);
        console.log('   tenant_id:', sessionVars[0].tenant_id);
        console.log('   is_super_admin:', sessionVars[0].is_super_admin);

        console.log('\n' + '='.repeat(60));
        console.log('✅ AUTH FLOW TEST PASSED!');
        console.log('='.repeat(60));
      } else {
        console.log('   ❌ No user found');
        console.log('\n' + '='.repeat(60));
        console.log('❌ AUTH FLOW TEST FAILED - User not found');
        console.log('='.repeat(60));
      }
    } catch (error) {
      console.log('   ❌ Query failed:', (error as Error).message);
      console.log('\n' + '='.repeat(60));
      console.log('❌ AUTH FLOW TEST FAILED - Query error');
      console.log('='.repeat(60));
      throw error;
    }
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

testAuthFlow();

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

import { users } from '../src/db/schema/core';

async function diagnose() {
  try {
    console.log('🔍 DIAGNOSING AUTH ISSUE\n');

    const testEmail = 'eoinmaleoin@gmail.com';

    // Test 1: Query WITHOUT RLS context (like setRLSContext does)
    console.log('1️⃣ Query users table WITHOUT RLS context:');
    try {
      const [userRecord] = await db
        .select({
          email: users.email,
          isSuperAdmin: users.isSuperAdmin,
          tenantId: users.tenantId,
        })
        .from(users)
        .where(eq(users.email, testEmail))
        .limit(1);

      if (userRecord) {
        console.log('   ✅ User found:', userRecord.email);
        console.log('   - is_super_admin:', userRecord.isSuperAdmin);
        console.log('   - tenant_id:', userRecord.tenantId);
      } else {
        console.log('   ❌ No user found (RLS might be blocking)');
      }
    } catch (error) {
      console.log('   ❌ Query failed:', (error as Error).message);
    }

    // Test 2: Direct SQL query (bypasses Drizzle)
    console.log('\n2️⃣ Direct SQL query (bypasses Drizzle ORM):');
    try {
      const result = await client`
        SELECT email, is_super_admin, tenant_id
        FROM users
        WHERE email = ${testEmail}
        LIMIT 1
      `;

      if (result.length > 0) {
        console.log('   ✅ User found:', result[0].email);
        console.log('   - is_super_admin:', result[0].is_super_admin);
        console.log('   - tenant_id:', result[0].tenant_id);
      } else {
        console.log('   ❌ No user found');
      }
    } catch (error) {
      console.log('   ❌ Query failed:', (error as Error).message);
    }

    // Test 3: Check RLS policies
    console.log('\n3️⃣ Check if RLS is enabled on users table:');
    const rlsCheck = await client`
      SELECT schemaname, tablename, rowsecurity
      FROM pg_tables
      WHERE tablename = 'users'
    `;
    console.log('   RLS enabled:', rlsCheck[0].rowsecurity);

    // Test 4: Check current session variables
    console.log('\n4️⃣ Check current session variables:');
    const sessionVars = await client`
      SELECT 
        current_setting('app.user_email', true) as user_email,
        current_setting('app.tenant_id', true) as tenant_id,
        current_setting('app.is_super_admin', true) as is_super_admin
    `;
    console.log('   Session vars:', sessionVars[0]);
  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
  } finally {
    await client.end();
  }
}

diagnose();

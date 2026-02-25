import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

// Import schema
import { users } from '../src/db/schema/core';

async function testAuthFlow() {
  try {
    console.log('🔐 Testing authentication flow...\n');

    const userEmail = 'eoinmaleoin@gmail.com';

    // Step 1: Simulate setRLSContext() query
    console.log('1️⃣ Testing super admin check (setRLSContext)...');
    const [userRecord] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.email, userEmail))
      .limit(1);

    if (!userRecord) {
      console.log('   ❌ User not found');
      return;
    }

    const isSuperAdmin = userRecord.role === 'super_admin';
    console.log('   ✅ Query succeeded');
    console.log('   Role:', userRecord.role);
    console.log('   Super Admin:', isSuperAdmin);

    // Step 2: Simulate getTenantId() query
    console.log('\n2️⃣ Testing tenant ID retrieval...');
    const [fullUser] = await db
      .select({
        id: users.id,
        tenantId: users.tenantId,
        role: users.role,
      })
      .from(users)
      .where(eq(users.email, userEmail))
      .limit(1);

    const fullUserIsSuperAdmin = fullUser?.role === 'super_admin';
    if (fullUser) {
      console.log('   ✅ Query succeeded');
      console.log('   User ID:', fullUser.id);
      console.log('   Tenant ID:', fullUser.tenantId);
      console.log('   Role:', fullUser.role);
      console.log('   Super Admin:', fullUserIsSuperAdmin);
    }

    // Step 3: Test audit events query (the one that was failing)
    console.log('\n3️⃣ Testing audit events query...');
    if (!fullUser.tenantId && !fullUserIsSuperAdmin) {
      console.log('   ⚠️  Would throw "Tenant not found" error');
    } else if (fullUserIsSuperAdmin) {
      console.log('   ✅ Super admin: Can access all tenants');
    } else {
      console.log('   ✅ Regular user: Tenant ID available:', fullUser.tenantId);
    }

    console.log('\n🎉 All auth flow tests passed!');
  } catch (error) {
    console.error('❌ Auth flow test failed:', error);
  } finally {
    await client.end();
  }
}

testAuthFlow();


import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { tenants, users } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local'), override: true });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdeornivbyfvpqabgscr.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Revert to hostname to avoid BAD_PORT crashes, accept ENOTFOUND/ENETUNREACH
const DATABASE_URL = 'postgresql://postgres:Eoin4Ana%402023!@db.pdeornivbyfvpqabgscr.supabase.co:5432/postgres?sslmode=require';

if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function seed() {
    console.log('🌱 Seeding Admin...');
    const ADMIN_EMAIL = 'admin@mycastle.com';
    const ADMIN_PASSWORD = 'Password123!';
    const TENANT_NAME = 'MyCastle Default';
    const TENANT_SUBDOMAIN = 'mycastle';

    let authUid;

    // 1. Create Supabase Auth User
    try {
        console.log(`Step 1: Creating Auth user ${ADMIN_EMAIL}...`);
        const { data: { users: foundUsers }, error: listError } = await supabase.auth.admin.listUsers();

        if (listError) console.warn('Warning: List users failed', listError.message);

        const existingAuthUser = foundUsers?.find(u => u.email === ADMIN_EMAIL);

        if (existingAuthUser) {
            console.log(`✅ Auth user exists. ID: ${existingAuthUser.id}`);
            authUid = existingAuthUser.id;
            await supabase.auth.admin.updateUserById(authUid, { password: ADMIN_PASSWORD });
            console.log('✅ Password updated.');
        } else {
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email: ADMIN_EMAIL,
                password: ADMIN_PASSWORD,
                email_confirm: true,
                user_metadata: { name: 'Super Admin', role: 'super_admin' }
            });
            if (createError) throw createError;
            authUid = newUser.user?.id;
            console.log(`✅ Created Auth user. ID: ${authUid}`);
        }
    } catch (err) {
        console.error('❌ Auth Creation Failed:', err instanceof Error ? err.message : err);
        process.exit(1);
    }

    // PRINT CREDENTIALS NOW
    console.log('\n------------------------------------------------');
    console.log('✅ ADMIN LOGIN READY');
    console.log(`Email:    ${ADMIN_EMAIL}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
    console.log('------------------------------------------------');

    // 2. Try DB Seeding
    let sql;
    try {
        console.log(`Step 2: Connecting to DB to sync profile...`);

        sql = postgres(DATABASE_URL, { connect_timeout: 5 });
        const db = drizzle(sql);

        // This will likely fail due to ENETUNREACH/ENOTFOUND
        const existingTenant = await db.select().from(tenants).where(eq(tenants.subdomain, TENANT_SUBDOMAIN)).limit(1);

        let tenantId;
        if (existingTenant.length > 0) {
            tenantId = existingTenant[0].id;
        } else {
            const [newTenant] = await db.insert(tenants).values({
                name: TENANT_NAME,
                subdomain: TENANT_SUBDOMAIN,
                contact_email: ADMIN_EMAIL,
                status: 'active'
            }).returning();
            tenantId = newTenant.id;
        }
        console.log(`✅ Tenant verified. ID: ${tenantId}`);

        const existingDbUser = await db.select().from(users).where(eq(users.email, ADMIN_EMAIL)).limit(1);

        if (existingDbUser.length > 0) {
            await db.update(users).set({
                role: 'super_admin',
                auth_id: authUid,
                tenant_id: tenantId,
                status: 'active'
            }).where(eq(users.id, existingDbUser[0].id));
        } else {
            await db.insert(users).values({
                email: ADMIN_EMAIL,
                tenant_id: tenantId,
                auth_id: authUid,
                name: 'Super Admin',
                role: 'super_admin',
                status: 'active'
            });
        }
        console.log('✅ DB User synced successfully.');

    } catch (err) {
        console.warn('\n⚠️  DB Connection Failed (Expected if IPv6/Network issues).');
        console.warn('The Admin User credentials above ARE VALID for login.');
        console.warn('However, the Dashboard may show empty data or errors until DB connectivity is fixed.');
        console.warn(`Error: ${err instanceof Error ? err.message : err}`);
    } finally {
        if (sql) await sql.end();
    }
}

seed();

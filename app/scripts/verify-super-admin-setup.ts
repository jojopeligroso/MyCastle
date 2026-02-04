import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const sql = postgres(process.env.DATABASE_URL!);

async function verify() {
  try {
    console.log('🔍 Verifying super admin setup...\n');

    // Check column exists
    const columnCheck = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'is_super_admin'
    `;

    console.log('✅ Column exists in schema:');
    console.log('   Name:', columnCheck[0].column_name);
    console.log('   Type:', columnCheck[0].data_type);
    console.log('   Nullable:', columnCheck[0].is_nullable);
    console.log('   Default:', columnCheck[0].column_default);

    // Check index exists
    const indexCheck = await sql`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'users' AND indexname = 'idx_users_is_super_admin'
    `;

    console.log('\n✅ Index exists:');
    console.log('   Name:', indexCheck[0].indexname);

    // Check all super admin users
    const superAdmins = await sql`
      SELECT id, email, primary_role, is_super_admin, tenant_id
      FROM users
      WHERE is_super_admin = true
    `;

    console.log('\n✅ Super admin users:');
    superAdmins.forEach(user => {
      console.log(`   - ${user.email} (role: ${user.primary_role}, tenant: ${user.tenant_id})`);
    });

    // Check regular users count
    const regularUsers = await sql`
      SELECT COUNT(*) as count
      FROM users
      WHERE is_super_admin = false
    `;

    console.log(`\n📊 Regular users: ${regularUsers[0].count}`);
    console.log('📊 Super admins:', superAdmins.length);
  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await sql.end();
  }
}

verify();

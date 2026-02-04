import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const connectionString = process.env.DATABASE_URL!;

if (!connectionString) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

const sql = postgres(connectionString);

async function runMigration() {
  try {
    console.log('🔌 Connecting to Supabase...\n');

    // Read migration file
    const migrationPath = path.resolve(__dirname, '../migrations/add_is_super_admin.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration file loaded from:', migrationPath);
    console.log('Running migration...\n');

    // Execute migration
    await sql.unsafe(migrationSQL);

    console.log('✅ Migration executed successfully!\n');

    // Verify
    console.log('🔍 Verifying migration...');
    const result = await sql`
      SELECT email, is_super_admin, primary_role, tenant_id
      FROM users
      WHERE email = 'eoinmaleoin@gmail.com'
    `;

    if (result.length > 0) {
      console.log('\n✅ Verification successful:');
      console.log('   Email:', result[0].email);
      console.log('   Super Admin:', result[0].is_super_admin);
      console.log('   Role:', result[0].primary_role);
      console.log('   Tenant ID:', result[0].tenant_id);
    } else {
      console.log('\n⚠️  User not found in database');
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();

import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const sql = postgres(process.env.DATABASE_URL!);

async function fix() {
  try {
    console.log('🔧 Fixing is_super_admin column constraints...\n');

    // First, set all NULL values to false
    await sql`
      UPDATE users
      SET is_super_admin = false
      WHERE is_super_admin IS NULL
    `;

    // Add NOT NULL constraint
    await sql`
      ALTER TABLE users
      ALTER COLUMN is_super_admin SET NOT NULL
    `;

    // Set default
    await sql`
      ALTER TABLE users
      ALTER COLUMN is_super_admin SET DEFAULT false
    `;

    console.log('✅ Column constraints fixed\n');

    // Verify
    const columnCheck = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'is_super_admin'
    `;

    console.log('✅ Updated column definition:');
    console.log('   Nullable:', columnCheck[0].is_nullable);
    console.log('   Default:', columnCheck[0].column_default);
  } catch (error) {
    console.error('❌ Fix failed:', error);
  } finally {
    await sql.end();
  }
}

fix();

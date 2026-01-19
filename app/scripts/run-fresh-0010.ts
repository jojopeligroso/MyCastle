import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import postgres from 'postgres';

config({ path: resolve(__dirname, '../.env.local') });
const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

(async () => {
  try {
    console.log('Running FRESH_0010_rls_context_function.sql...');
    const migrationSQL = readFileSync(resolve(__dirname, '../migrations/FRESH_0010_rls_context_function.sql'), 'utf-8');
    await sql.unsafe(migrationSQL);
    console.log('✅ FRESH_0010 completed successfully');
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await sql.end();
    process.exit(1);
  }
})();

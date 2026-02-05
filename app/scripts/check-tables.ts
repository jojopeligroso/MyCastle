/* eslint-disable @typescript-eslint/no-explicit-any */
import { config } from 'dotenv';
import { resolve } from 'path';
import postgres from 'postgres';

config({ path: resolve(__dirname, '../.env.local') });

const sql = postgres(process.env.DATABASE_URL!);

(async () => {
  try {
    const tables = await sql`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;

    console.log('\n📋 Available tables in database:\n');
    tables.forEach((t: any) => console.log(`  - ${t.tablename}`));
    console.log('');

    await sql.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();

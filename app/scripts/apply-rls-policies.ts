/* eslint-disable @typescript-eslint/no-explicit-any */
import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import postgres from 'postgres';

config({ path: resolve(__dirname, '../.env.local') });

const DATABASE_URL = process.env.DATABASE_URL!;
const sql = postgres(DATABASE_URL, { max: 1 });

async function applyRLS() {
  console.log('\n🔒 Applying RLS policies...\n');

  try {
    const rlsSQL = readFileSync(
      resolve(__dirname, '../migrations/FRESH_0002_rls_policies.sql'),
      'utf-8'
    );

    await sql.unsafe(rlsSQL);

    console.log('✅ RLS policies applied successfully!\n');

    // Verify policies
    const policies = await sql`
      SELECT tablename, COUNT(*) as policy_count
      FROM pg_policies
      WHERE schemaname = 'public'
      GROUP BY tablename
      ORDER BY tablename
    `;

    console.log('📊 Policy counts per table:');
    policies.forEach((p: unknown) => {
      console.log(`   - ${p.tablename}: ${p.policy_count} policies`);
    });

    // Check superuser function exists
    const functions = await sql`
      SELECT proname FROM pg_proc
      WHERE proname IN ('is_superuser', 'get_user_role', 'is_admin', 'is_teacher_or_admin')
      ORDER BY proname
    `;

    console.log('\n✅ Helper functions created:');
    functions.forEach((f: unknown) => {
      console.log(`   - ${f.proname}()`);
    });

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to apply RLS policies:', error);
    await sql.end();
    process.exit(1);
  }
}

applyRLS();

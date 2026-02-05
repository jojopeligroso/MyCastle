/* eslint-disable @typescript-eslint/no-explicit-any */
import { config } from 'dotenv';
import { resolve } from 'path';
import postgres from 'postgres';

config({ path: resolve(__dirname, '../.env.local') });

const DATABASE_URL = process.env.DATABASE_URL!;
const sql = postgres(DATABASE_URL);

async function checkRLS() {
  console.log('\n🔒 RLS Policy Analysis\n');

  try {
    // Check RLS is enabled on all tables
    const rlsEnabled = await sql`
      SELECT schemaname, tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;

    console.log('📋 RLS Status:');
    rlsEnabled.forEach((t: any) => {
      const status = t.rowsecurity ? '✅ Enabled' : '❌ Disabled';
      console.log(`   ${status} - ${t.tablename}`);
    });

    // Check all policies
    const policies = await sql`
      SELECT
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, cmd, policyname
    `;

    console.log(`\n📜 Current Policies: ${policies.length} total\n`);

    const grouped = policies.reduce((acc: any, p: any) => {
      if (!acc[p.tablename]) acc[p.tablename] = [];
      acc[p.tablename].push(p);
      return acc;
    }, {});

    Object.entries(grouped).forEach(([table, pols]: [string, any]) => {
      console.log(`\n🗂️  ${table}:`);
      pols.forEach((p: any) => {
        console.log(`   - ${p.policyname}`);
        console.log(`     Command: ${p.cmd}`);
        console.log(`     Roles: ${p.roles.join(', ')}`);
        console.log(`     USING: ${p.qual || 'N/A'}`);
        if (p.with_check) console.log(`     WITH CHECK: ${p.with_check}`);
      });
    });

    // Identify missing policies
    const tables = rlsEnabled.map((t: any) => t.tablename);
    const commands = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];

    console.log('\n⚠️  Missing Policies:\n');
    tables.forEach((table: any) => {
      const tablePolicies = grouped[table] || [];
      const existingCmds = tablePolicies.map((p: any) => p.cmd);

      commands.forEach(cmd => {
        if (!existingCmds.includes(cmd)) {
          console.log(`   ❌ ${table}: ${cmd} policy missing`);
        }
      });
    });

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await sql.end();
    process.exit(1);
  }
}

checkRLS();

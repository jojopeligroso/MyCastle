import { config } from 'dotenv';
import { resolve } from 'path';
import postgres from 'postgres';

config({ path: resolve(__dirname, '../.env.local') });
const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

(async () => {
  const tables = await sql`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `;

  console.log(`\n📊 Database Tables (${tables.length} total):\n`);

  const newTables = ['classes', 'enrollments', 'enrollment_amendments', 'class_sessions', 'attendance', 'assignments', 'submissions', 'grades', 'audit_logs', 'invoices', 'conversations', 'exports', 'cefr_descriptors', 'lesson_plans', 'materials', 'lesson_plan_materials', 'programmes', 'programme_courses'];

  newTables.forEach((table: string) => {
    const exists = tables.find((t: any) => t.tablename === table);
    console.log(exists ? `✓ ${table}` : `✗ ${table} - MISSING`);
  });

  await sql.end();
})();

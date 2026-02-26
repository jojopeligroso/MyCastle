/**
 * Seed ESL Classes and Teachers
 * Creates 25 ESL classes with their assigned teachers as per school requirements
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import postgres from 'postgres';

config({ path: resolve(__dirname, '../.env.local') });

const DATABASE_URL = process.env.DATABASE_URL!;
const sql = postgres(DATABASE_URL);

// Constants
const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const ADMIN_USER_ID = '00000000-0000-0000-0000-000000000010';

// Teacher definitions
const TEACHERS = [
  { name: 'Rebecca Mcnaughton', email: 'rebecca.mcnaughton@mycastle.ie' },
  { name: 'Romano Cafolla', email: 'romano.cafolla@mycastle.ie' },
  { name: 'Niall Coughlan', email: 'niall.coughlan@mycastle.ie' },
  { name: 'Seamus Walsh', email: 'seamus.walsh@mycastle.ie' },
  { name: 'Sean King', email: 'sean.king@mycastle.ie' },
  { name: 'Nicole Keane Flood', email: 'nicole.keaneflood@mycastle.ie' },
  { name: "Stephen O'Flynn", email: 'stephen.oflynn@mycastle.ie' },
  { name: 'Andrew Copeland', email: 'andrew.copeland@mycastle.ie' },
  { name: 'Declan Conroy', email: 'declan.conroy@mycastle.ie' },
  { name: 'Gian Castro', email: 'gian.castro@mycastle.ie' },
  { name: 'Eoin Malone', email: 'eoin.malone@mycastle.ie' },
];

// Class definitions: [CEFR Level, Class Name, Teacher Name (null if unassigned)]
const CLASSES: [string | null, string, string | null][] = [
  // Morning classes
  ['A1', 'Elm', 'Rebecca Mcnaughton'],
  ['A2', 'Pre Int', 'Romano Cafolla'],
  ['A2', 'Pre Int 2', 'Niall Coughlan'],
  ['A2', 'Pre Int 3', 'Seamus Walsh'],
  ['B1', 'Int', 'Sean King'],
  ['B1', 'Int 2', 'Nicole Keane Flood'],
  ['B1', 'Int 3', "Stephen O'Flynn"],
  ['B2', 'Up Int', 'Andrew Copeland'],
  ['B2', 'Up Int 2', 'Declan Conroy'],
  ['B2', 'Up Int 3', 'Gian Castro'],
  ['C1', 'Adv', 'Eoin Malone'],
  ['B1-B2', 'FCE', null],
  [null, 'Jail', null],
  // Afternoon classes
  ['A1', 'Aft Elm', 'Rebecca Mcnaughton'],
  ['A2', 'Aft Pre Int', 'Romano Cafolla'],
  ['A2', 'Aft Pre Int 2', 'Niall Coughlan'],
  ['A2', 'Aft Pre Int 3', null],
  ['B1', 'Aft Int', 'Sean King'],
  ['B1', 'Aft Int 2', "Stephen O'Flynn"],
  ['B1', 'Aft Int 3', null],
  ['B2', 'Aft Up Int', 'Andrew Copeland'],
  ['B2', 'Aft Up Int 2', 'Declan Conroy'],
  ['B2', 'Aft Up Int 3', null],
  ['C1', 'Aft Adv', 'Seamus Walsh'],
  ['A2-C1+', 'Conv', 'Seamus Walsh'],
  ['B1-C1+', 'IELTS', null],
];

async function seed() {
  console.log('\n🌱 Seeding ESL classes and teachers...\n');

  try {
    // Set RLS context
    console.log('Setting RLS context...');
    await sql`SELECT set_user_context(
      ${ADMIN_USER_ID}::uuid,
      ${TENANT_ID}::uuid,
      'admin'
    )`;
    console.log('✓ RLS context set');

    // 1. Create Teachers
    console.log('\nCreating teachers...');
    const teacherIds: Map<string, string> = new Map();

    for (const teacher of TEACHERS) {
      // Check if teacher already exists by email
      const existing = await sql`
        SELECT id FROM users
        WHERE email = ${teacher.email}
          AND tenant_id = ${TENANT_ID}::uuid
        LIMIT 1
      `;

      let teacherId: string;

      if (existing.length > 0) {
        teacherId = existing[0].id;
        console.log(`  - ${teacher.name} (exists)`);
      } else {
        // Create new teacher
        const result = await sql`
          INSERT INTO users (tenant_id, email, email_verified, name, primary_role, status)
          VALUES (
            ${TENANT_ID}::uuid,
            ${teacher.email},
            true,
            ${teacher.name},
            'teacher',
            'active'
          )
          RETURNING id
        `;
        teacherId = result[0].id;
        console.log(`  + ${teacher.name} (created)`);

        // Grant teacher role
        await sql`
          INSERT INTO user_roles (user_id, tenant_id, role)
          VALUES (${teacherId}::uuid, ${TENANT_ID}::uuid, 'teacher')
          ON CONFLICT (user_id, tenant_id, role) WHERE revoked_at IS NULL DO NOTHING
        `;
      }

      teacherIds.set(teacher.name, teacherId);
    }
    console.log(`✓ ${TEACHERS.length} teachers processed`);

    // 2. Create Classes
    console.log('\nCreating classes...');
    let created = 0;
    let updated = 0;

    for (const [cefrLevel, className, teacherName] of CLASSES) {
      const teacherId = teacherName ? teacherIds.get(teacherName) : null;

      // Determine if morning or afternoon based on name
      const isAfternoon = className.startsWith('Aft ');
      const startTime = isAfternoon ? '13:30:00' : '09:00:00';
      const endTime = isAfternoon ? '17:00:00' : '12:30:00';

      // Check if class exists
      const existing = await sql`
        SELECT id FROM classes
        WHERE name = ${className}
          AND tenant_id = ${TENANT_ID}::uuid
        LIMIT 1
      `;

      // Handle null values for postgres template
      const levelValue = cefrLevel ?? null;
      const teacherIdValue = teacherId ?? null;

      if (existing.length > 0) {
        // Update existing class
        if (teacherIdValue) {
          await sql`
            UPDATE classes
            SET teacher_id = ${teacherIdValue}::uuid,
                level = ${levelValue},
                status = 'active',
                start_time = ${startTime}::time,
                end_time = ${endTime}::time,
                updated_at = NOW()
            WHERE id = ${existing[0].id}::uuid
          `;
        } else {
          await sql`
            UPDATE classes
            SET teacher_id = NULL,
                level = ${levelValue},
                status = 'active',
                start_time = ${startTime}::time,
                end_time = ${endTime}::time,
                updated_at = NOW()
            WHERE id = ${existing[0].id}::uuid
          `;
        }
        console.log(`  ~ ${className} (updated)`);
        updated++;
      } else {
        // Create new class
        const code = className.replace(/\s+/g, '-').toUpperCase();
        const scheduleDesc = isAfternoon ? 'Mon-Fri 13:30-17:00' : 'Mon-Fri 09:00-12:30';

        if (teacherIdValue) {
          await sql`
            INSERT INTO classes (
              tenant_id, name, code, level, subject,
              capacity, enrolled_count, teacher_id,
              schedule_description, start_time, end_time,
              days_of_week, start_date, status
            )
            VALUES (
              ${TENANT_ID}::uuid,
              ${className},
              ${code},
              ${levelValue},
              'General English',
              25,
              0,
              ${teacherIdValue}::uuid,
              ${scheduleDesc},
              ${startTime}::time,
              ${endTime}::time,
              '["Monday","Tuesday","Wednesday","Thursday","Friday"]'::jsonb,
              CURRENT_DATE,
              'active'
            )
          `;
        } else {
          await sql`
            INSERT INTO classes (
              tenant_id, name, code, level, subject,
              capacity, enrolled_count, teacher_id,
              schedule_description, start_time, end_time,
              days_of_week, start_date, status
            )
            VALUES (
              ${TENANT_ID}::uuid,
              ${className},
              ${code},
              ${levelValue},
              'General English',
              25,
              0,
              NULL,
              ${scheduleDesc},
              ${startTime}::time,
              ${endTime}::time,
              '["Monday","Tuesday","Wednesday","Thursday","Friday"]'::jsonb,
              CURRENT_DATE,
              'active'
            )
          `;
        }
        console.log(`  + ${className} (created)`);
        created++;
      }
    }

    console.log(`\n✓ Classes: ${created} created, ${updated} updated`);

    // 3. Summary
    console.log('\n✅ ESL classes seed completed successfully!\n');

    // Verify by listing all classes
    const allClasses = await sql`
      SELECT c.name, c.level, u.name as teacher
      FROM classes c
      LEFT JOIN users u ON c.teacher_id = u.id
      WHERE c.tenant_id = ${TENANT_ID}::uuid
        AND c.status = 'active'
      ORDER BY
        CASE WHEN c.name LIKE 'Aft %' THEN 1 ELSE 0 END,
        c.level NULLS LAST,
        c.name
    `;

    console.log('Current active classes:');
    console.log('─────────────────────────────────────────────────────');
    console.log('Level    | Class Name       | Teacher');
    console.log('─────────────────────────────────────────────────────');
    for (const c of allClasses) {
      const level = (c.level || '—').padEnd(8);
      const name = c.name.padEnd(16);
      const teacher = c.teacher || '(unassigned)';
      console.log(`${level} | ${name} | ${teacher}`);
    }
    console.log('─────────────────────────────────────────────────────');
    console.log(`Total: ${allClasses.length} classes\n`);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

seed().catch(console.error);

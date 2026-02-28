/**
 * Seed 10 Students for Afternoon Classes
 * Creates 10 students and enrolls them in various afternoon classes
 * Run with: npx tsx scripts/seed-afternoon-students.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import postgres from 'postgres';

config({ path: resolve(__dirname, '../.env.local') });

const DATABASE_URL = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL or DIRECT_URL must be set in .env.local');
}

const sql = postgres(DATABASE_URL);

// Constants
const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const ADMIN_USER_ID = '00000000-0000-0000-0000-000000000010';

// Student definitions for afternoon classes
const AFTERNOON_STUDENTS = [
  {
    name: 'Marco Rossi',
    email: 'marco.rossi@example.com',
    phone: '+39 333 123 4567',
    nationality: 'Italian',
    dateOfBirth: '1999-04-15',
    currentLevel: 'A1',
    className: 'Aft Elm',
    visaType: 'Student Visa',
    visaExpiry: '2025-12-31',
  },
  {
    name: 'Lucia Santos',
    email: 'lucia.santos@example.com',
    phone: '+351 91 234 5678',
    nationality: 'Portuguese',
    dateOfBirth: '2000-08-22',
    currentLevel: 'A2',
    className: 'Aft Pre Int',
    visaType: 'Student Visa',
    visaExpiry: '2025-09-30',
  },
  {
    name: 'Hans Mueller',
    email: 'hans.mueller@example.com',
    phone: '+49 151 234 5678',
    nationality: 'German',
    dateOfBirth: '1998-11-10',
    currentLevel: 'A2',
    className: 'Aft Pre Int 2',
  },
  {
    name: 'Gabriela Hernandez',
    email: 'gabriela.hernandez@example.com',
    phone: '+34 666 123 456',
    nationality: 'Spanish',
    dateOfBirth: '2001-03-05',
    currentLevel: 'A2',
    className: 'Aft Pre Int 3',
    visaType: 'Student Visa',
    visaExpiry: '2026-06-15',
  },
  {
    name: 'Pierre Dubois',
    email: 'pierre.dubois@example.com',
    phone: '+33 6 77 88 99 00',
    nationality: 'French',
    dateOfBirth: '1997-07-18',
    currentLevel: 'B1',
    className: 'Aft Int',
    visaType: 'Student Visa',
    visaExpiry: '2025-11-20',
  },
  {
    name: 'Anna Kowalski',
    email: 'anna.kowalski@example.com',
    phone: '+48 500 123 456',
    nationality: 'Polish',
    dateOfBirth: '2000-01-28',
    currentLevel: 'B1',
    className: 'Aft Int 2',
  },
  {
    name: 'Miguel Silva',
    email: 'miguel.silva@example.com',
    phone: '+55 11 91234 5678',
    nationality: 'Brazilian',
    dateOfBirth: '1999-09-12',
    currentLevel: 'B1',
    className: 'Aft Int 3',
    visaType: 'Tier 4 Student Visa',
    visaExpiry: '2026-01-31',
  },
  {
    name: 'Katarina Novak',
    email: 'katarina.novak@example.com',
    phone: '+421 905 123 456',
    nationality: 'Slovak',
    dateOfBirth: '1998-06-30',
    currentLevel: 'B2',
    className: 'Aft Up Int',
  },
  {
    name: 'Dimitri Popov',
    email: 'dimitri.popov@example.com',
    phone: '+7 916 123 4567',
    nationality: 'Russian',
    dateOfBirth: '1996-12-14',
    currentLevel: 'B2',
    className: 'Aft Up Int 2',
    visaType: 'Student Visa',
    visaExpiry: '2025-10-15',
  },
  {
    name: 'Elena Ivanova',
    email: 'elena.ivanova@example.com',
    phone: '+359 88 123 4567',
    nationality: 'Bulgarian',
    dateOfBirth: '1995-05-20',
    currentLevel: 'C1',
    className: 'Aft Adv',
  },
];

async function seedAfternoonStudents() {
  console.log('\n🌱 Seeding 10 afternoon students...\n');

  try {
    // Set RLS context
    console.log('Setting RLS context...');
    await sql`SELECT set_user_context(
      ${ADMIN_USER_ID}::uuid,
      ${TENANT_ID}::uuid,
      'admin'
    )`;
    console.log('✓ RLS context set\n');

    let createdCount = 0;
    let skippedCount = 0;
    let enrolledCount = 0;

    for (const student of AFTERNOON_STUDENTS) {
      // Check if student already exists
      const existing = await sql`
        SELECT id FROM users
        WHERE email = ${student.email}
          AND tenant_id = ${TENANT_ID}::uuid
        LIMIT 1
      `;

      let userId: string;

      if (existing.length > 0) {
        userId = existing[0].id;
        console.log(`⊘ ${student.name} already exists`);
        skippedCount++;
      } else {
        // Create new student user
        const result = await sql`
          INSERT INTO users (
            tenant_id, email, email_verified, name, primary_role,
            status, metadata
          )
          VALUES (
            ${TENANT_ID}::uuid,
            ${student.email},
            true,
            ${student.name},
            'student',
            'active',
            ${JSON.stringify({
              phone: student.phone,
              nationality: student.nationality,
              date_of_birth: student.dateOfBirth,
              enrollment_date: new Date().toISOString().split('T')[0],
            })}::jsonb
          )
          RETURNING id
        `;
        userId = result[0].id;
        console.log(`✓ Created user: ${student.name}`);

        // Grant student role
        await sql`
          INSERT INTO user_roles (user_id, tenant_id, role)
          VALUES (${userId}::uuid, ${TENANT_ID}::uuid, 'student')
          ON CONFLICT (user_id, tenant_id, role) WHERE revoked_at IS NULL DO NOTHING
        `;

        // Create student record
        await sql`
          INSERT INTO students (
            id, tenant_id, user_id, student_number,
            current_level, initial_level, level_status,
            visa_type, visa_expiry, status
          )
          VALUES (
            ${userId}::uuid,
            ${TENANT_ID}::uuid,
            ${userId}::uuid,
            'STU' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'),
            ${student.currentLevel},
            ${student.currentLevel},
            'confirmed',
            ${student.visaType || null},
            ${student.visaExpiry || null},
            'active'
          )
        `;

        createdCount++;
      }

      // Find the class
      const classResult = await sql`
        SELECT id FROM classes
        WHERE name = ${student.className}
          AND tenant_id = ${TENANT_ID}::uuid
          AND status = 'active'
        LIMIT 1
      `;

      if (classResult.length === 0) {
        console.log(`  ⚠️  Class "${student.className}" not found - skipping enrollment`);
        continue;
      }

      const classId = classResult[0].id;

      // Check if already enrolled
      const enrollmentExists = await sql`
        SELECT id FROM enrollments
        WHERE student_id = ${userId}::uuid
          AND class_id = ${classId}::uuid
          AND tenant_id = ${TENANT_ID}::uuid
        LIMIT 1
      `;

      if (enrollmentExists.length === 0) {
        // Create enrollment
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 3); // 3-month course

        await sql`
          INSERT INTO enrollments (
            tenant_id, student_id, class_id,
            enrollment_date, start_date, end_date,
            status
          )
          VALUES (
            ${TENANT_ID}::uuid,
            ${userId}::uuid,
            ${classId}::uuid,
            CURRENT_DATE,
            ${startDate.toISOString().split('T')[0]},
            ${endDate.toISOString().split('T')[0]},
            'active'
          )
        `;

        // Update class enrolled_count
        await sql`
          UPDATE classes
          SET enrolled_count = enrolled_count + 1
          WHERE id = ${classId}::uuid
        `;

        console.log(`  → Enrolled in ${student.className} (${student.currentLevel})`);
        enrolledCount++;
      } else {
        console.log(`  → Already enrolled in ${student.className}`);
      }
    }

    console.log(`\n🎉 Seeding complete!`);
    console.log(`   Created: ${createdCount} students`);
    console.log(`   Skipped: ${skippedCount} students (already exist)`);
    console.log(`   Enrolled: ${enrolledCount} new enrollments`);

    // Show summary of afternoon classes
    console.log('\n📊 Afternoon Classes Summary:');
    const afternoonClasses = await sql`
      SELECT c.name, c.level, c.enrolled_count, c.capacity
      FROM classes c
      WHERE c.tenant_id = ${TENANT_ID}::uuid
        AND c.name LIKE 'Aft %'
        AND c.status = 'active'
      ORDER BY c.level NULLS LAST, c.name
    `;

    console.log('─────────────────────────────────────────────────────');
    console.log('Level | Class Name       | Enrolled | Capacity');
    console.log('─────────────────────────────────────────────────────');
    for (const c of afternoonClasses) {
      const level = (c.level || '—').padEnd(5);
      const name = c.name.padEnd(16);
      const enrolled = c.enrolled_count.toString().padStart(8);
      const capacity = c.capacity.toString().padStart(8);
      console.log(`${level} | ${name} | ${enrolled} | ${capacity}`);
    }
    console.log('─────────────────────────────────────────────────────\n');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Run if executed directly
seedAfternoonStudents().catch(console.error);

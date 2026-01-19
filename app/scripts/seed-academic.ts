/**
 * Seed Academic Tables with Test Data
 * Seeds: classes, enrollments, class_sessions, attendance, assignments
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import postgres from 'postgres';

config({ path: resolve(__dirname, '../.env.local') });

const DATABASE_URL = process.env.DATABASE_URL!;
const sql = postgres(DATABASE_URL);

// Constants from seed-fresh-data.ts
const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const ADMIN_USER_ID = '00000000-0000-0000-0000-000000000010';

// New IDs for this seed
const TEACHER1_ID = '10000000-0000-0000-0000-000000000001';
const TEACHER2_ID = '10000000-0000-0000-0000-000000000002';

const CLASS1_ID = '20000000-0000-0000-0000-000000000001';
const CLASS2_ID = '20000000-0000-0000-0000-000000000002';
const CLASS3_ID = '20000000-0000-0000-0000-000000000003';

async function seed() {
  console.log('\n🌱 Seeding academic tables...\n');

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
    await sql`
      INSERT INTO users (id, tenant_id, email, email_verified, name, phone, primary_role, status)
      VALUES
        (
          ${TEACHER1_ID}::uuid,
          ${TENANT_ID}::uuid,
          'sarah.murphy@mycastle.ie',
          true,
          'Sarah Murphy',
          '+353 87 234 5678',
          'teacher',
          'active'
        ),
        (
          ${TEACHER2_ID}::uuid,
          ${TENANT_ID}::uuid,
          'john.oconnor@mycastle.ie',
          true,
          'John O''Connor',
          '+353 87 345 6789',
          'teacher',
          'active'
        )
      ON CONFLICT (id) DO NOTHING
    `;
    console.log('✓ 2 teachers created');

    // Grant teacher roles
    await sql`
      INSERT INTO user_roles (user_id, tenant_id, role)
      VALUES
        (${TEACHER1_ID}::uuid, ${TENANT_ID}::uuid, 'teacher'),
        (${TEACHER2_ID}::uuid, ${TENANT_ID}::uuid, 'teacher')
      ON CONFLICT (user_id, tenant_id, role) WHERE revoked_at IS NULL DO NOTHING
    `;

    // 2. Create Classes
    console.log('\nCreating classes...');
    await sql`
      INSERT INTO classes (
        id, tenant_id, name, code, description, level, subject,
        capacity, enrolled_count, teacher_id, schedule_description,
        start_date, end_date, status
      )
      VALUES
        (
          ${CLASS1_ID}::uuid,
          ${TENANT_ID}::uuid,
          'General English A1 - Morning',
          'GE-A1-M',
          'Beginner level English - Morning class',
          'A1',
          'General English',
          15,
          0,
          ${TEACHER1_ID}::uuid,
          'Mon-Fri 09:00-12:00',
          CURRENT_DATE - INTERVAL '2 weeks',
          CURRENT_DATE + INTERVAL '10 weeks',
          'active'
        ),
        (
          ${CLASS2_ID}::uuid,
          ${TENANT_ID}::uuid,
          'General English B1 - Afternoon',
          'GE-B1-A',
          'Intermediate level English - Afternoon class',
          'B1',
          'General English',
          20,
          0,
          ${TEACHER1_ID}::uuid,
          'Mon-Fri 13:00-16:00',
          CURRENT_DATE - INTERVAL '1 week',
          CURRENT_DATE + INTERVAL '11 weeks',
          'active'
        ),
        (
          ${CLASS3_ID}::uuid,
          ${TENANT_ID}::uuid,
          'IELTS Preparation B2',
          'IELTS-B2',
          'IELTS exam preparation for intermediate students',
          'B2',
          'IELTS',
          12,
          0,
          ${TEACHER2_ID}::uuid,
          'Mon-Fri 10:00-13:00',
          CURRENT_DATE - INTERVAL '3 days',
          CURRENT_DATE + INTERVAL '12 weeks',
          'active'
        )
      ON CONFLICT (id) DO NOTHING
    `;
    console.log('✓ 3 classes created');

    // 3. Get existing students and enroll them
    console.log('\nFetching students...');
    const students = await sql`
      SELECT u.id, s.id as student_record_id
      FROM users u
      JOIN students s ON s.user_id = u.id
      WHERE u.tenant_id = ${TENANT_ID}::uuid
        AND u.primary_role = 'student'
        AND u.status = 'active'
      LIMIT 10
    `;
    console.log(`✓ Found ${students.length} students`);

    if (students.length > 0) {
      console.log('\nCreating enrollments...');

      // Enroll first 5 students in CLASS1
      for (let i = 0; i < Math.min(5, students.length); i++) {
        await sql`
          INSERT INTO enrollments (
            tenant_id, student_id, class_id,
            enrollment_date, expected_end_date, booked_weeks,
            status, attendance_rate
          )
          VALUES (
            ${TENANT_ID}::uuid,
            ${students[i].id},
            ${CLASS1_ID}::uuid,
            CURRENT_DATE - INTERVAL '2 weeks',
            CURRENT_DATE + INTERVAL '10 weeks',
            12,
            'active',
            0.00
          )
          ON CONFLICT (student_id, class_id) DO NOTHING
        `;
      }
      console.log(`✓ Enrolled ${Math.min(5, students.length)} students in GE-A1-M`);

      // Enroll next 6 students in CLASS2
      for (let i = 0; i < Math.min(6, students.length); i++) {
        await sql`
          INSERT INTO enrollments (
            tenant_id, student_id, class_id,
            enrollment_date, expected_end_date, booked_weeks,
            status, attendance_rate
          )
          VALUES (
            ${TENANT_ID}::uuid,
            ${students[i].id},
            ${CLASS2_ID}::uuid,
            CURRENT_DATE - INTERVAL '1 week',
            CURRENT_DATE + INTERVAL '11 weeks',
            12,
            'active',
            0.00
          )
          ON CONFLICT (student_id, class_id) DO NOTHING
        `;
      }
      console.log(`✓ Enrolled ${Math.min(6, students.length)} students in GE-B1-A`);

      // Enroll 3 students in CLASS3
      for (let i = 0; i < Math.min(3, students.length); i++) {
        await sql`
          INSERT INTO enrollments (
            tenant_id, student_id, class_id,
            enrollment_date, expected_end_date, booked_weeks,
            status, attendance_rate
          )
          VALUES (
            ${TENANT_ID}::uuid,
            ${students[i].id},
            ${CLASS3_ID}::uuid,
            CURRENT_DATE - INTERVAL '3 days',
            CURRENT_DATE + INTERVAL '12 weeks',
            12,
            'active',
            0.00
          )
          ON CONFLICT (student_id, class_id) DO NOTHING
        `;
      }
      console.log(`✓ Enrolled ${Math.min(3, students.length)} students in IELTS-B2`);
    } else {
      console.log('⚠️  No students found - run seed-students.ts first');
    }

    // 4. Create class sessions for the past week (simplified)
    console.log('\nCreating class sessions...');

    // Create sessions for past 5 weekdays only (to keep it simple)
    const sessionData = [];
    for (let i = 5; i >= 1; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayOfWeek = date.getDay();

      // Skip weekends
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      sessionData.push({
        tenant_id: TENANT_ID,
        class_id: CLASS1_ID,
        session_date: date.toISOString().split('T')[0],
        start_time: '09:00:00',
        end_time: '12:00:00',
        topic: `Lesson ${i}`,
        status: 'completed',
      });

      sessionData.push({
        tenant_id: TENANT_ID,
        class_id: CLASS2_ID,
        session_date: date.toISOString().split('T')[0],
        start_time: '13:00:00',
        end_time: '16:00:00',
        topic: `Unit ${i}`,
        status: 'completed',
      });
    }

    // Batch insert
    if (sessionData.length > 0) {
      await sql`
        INSERT INTO class_sessions ${sql(sessionData)}
        ON CONFLICT DO NOTHING
      `;
    }
    console.log(`✓ Created ${sessionData.length} class sessions`);

    // 5. Create attendance records for completed sessions
    console.log('\nCreating attendance records...');

    const completedSessions = await sql`
      SELECT id, class_id, session_date
      FROM class_sessions
      WHERE tenant_id = ${TENANT_ID}::uuid
        AND status = 'completed'
        AND session_date <= CURRENT_DATE
    `;

    console.log(`✓ Found ${completedSessions.length} completed sessions`);

    for (const session of completedSessions) {
      const enrolledStudents = await sql`
        SELECT student_id
        FROM enrollments
        WHERE class_id = ${session.class_id}
          AND status = 'active'
      `;

      for (const enrollment of enrolledStudents) {
        // Randomly assign attendance status (80% present, 10% absent, 5% late, 5% excused)
        const rand = Math.random();
        let status = 'present';
        if (rand > 0.95) status = 'excused';
        else if (rand > 0.90) status = 'late';
        else if (rand > 0.80) status = 'absent';

        await sql`
          INSERT INTO attendance (
            tenant_id, class_session_id, student_id,
            status, recorded_by, recorded_at
          )
          VALUES (
            ${TENANT_ID}::uuid,
            ${session.id},
            ${enrollment.student_id},
            ${status},
            ${TEACHER1_ID}::uuid,
            ${session.session_date}::timestamp + INTERVAL '12 hours'
          )
          ON CONFLICT (class_session_id, student_id) DO NOTHING
        `;
      }
    }
    console.log('✓ Attendance records created');

    // 6. Create some assignments
    console.log('\nCreating assignments...');
    await sql`
      INSERT INTO assignments (
        tenant_id, class_id, title, description, type,
        assigned_date, due_date, max_score, status
      )
      VALUES
        (
          ${TENANT_ID}::uuid,
          ${CLASS1_ID}::uuid,
          'Vocabulary Quiz - Unit 1',
          'Quiz covering vocabulary from Unit 1: Greetings and Introductions',
          'quiz',
          CURRENT_DATE - INTERVAL '10 days',
          CURRENT_DATE - INTERVAL '3 days',
          100,
          'closed'
        ),
        (
          ${TENANT_ID}::uuid,
          ${CLASS1_ID}::uuid,
          'Writing Exercise - My Daily Routine',
          'Write a short paragraph (50-100 words) about your daily routine',
          'homework',
          CURRENT_DATE - INTERVAL '5 days',
          CURRENT_DATE + INTERVAL '2 days',
          50,
          'active'
        ),
        (
          ${TENANT_ID}::uuid,
          ${CLASS2_ID}::uuid,
          'Grammar Test - Present Perfect',
          'Test on present perfect tense usage',
          'exam',
          CURRENT_DATE - INTERVAL '3 days',
          CURRENT_DATE + INTERVAL '4 days',
          100,
          'active'
        ),
        (
          ${TENANT_ID}::uuid,
          ${CLASS3_ID}::uuid,
          'IELTS Practice Essay',
          'Write a Task 2 essay on the topic: Technology and Education',
          'project',
          CURRENT_DATE - INTERVAL '2 days',
          CURRENT_DATE + INTERVAL '7 days',
          100,
          'active'
        )
      ON CONFLICT DO NOTHING
    `;
    console.log('✓ 4 assignments created');

    console.log('\n✅ Academic seed completed successfully!\n');
    console.log('Summary:');
    console.log('- 2 teachers created');
    console.log('- 3 classes created');
    console.log(`- ${students.length} students enrolled`);
    console.log(`- ${completedSessions.length} sessions with attendance`);
    console.log('- 4 assignments created\n');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

seed().catch(console.error);

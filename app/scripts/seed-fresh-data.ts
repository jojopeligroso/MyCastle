/**
 * Seed Fresh Database with Test Data
 * TypeScript approach - more reliable than complex SQL
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import postgres from 'postgres';

config({ path: resolve(__dirname, '../.env.local') });

const DATABASE_URL = process.env.DATABASE_URL!;
const sql = postgres(DATABASE_URL);

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const USER_ID = '00000000-0000-0000-0000-000000000010';
const AGENCY_ID = '00000000-0000-0000-0000-000000000002';

async function seed() {
  console.log('\n🌱 Seeding fresh database...\n');

  try {
    // 1. Tenant
    console.log('Creating tenant...');
    await sql`
      INSERT INTO tenants (id, name, subdomain, contact_email, status)
      VALUES (
        ${TENANT_ID}::uuid,
        'MyCastle Default',
        'mycastle',
        'admin@mycastle.ie',
        'active'
      )
    `;
    console.log('✓ Tenant created');

    // 2. Agency
    console.log('Creating Direct agency...');
    await sql`
      INSERT INTO agencies (id, tenant_id, name, status)
      VALUES (
        ${AGENCY_ID}::uuid,
        ${TENANT_ID}::uuid,
        'Direct',
        'active'
      )
    `;
    console.log('✓ Agency created');

    // 3. Courses
    console.log('Creating courses...');
    await sql`
      INSERT INTO courses (tenant_id, name, code, description, level, hours_per_week, price_per_week_eur, status)
      VALUES
        (${TENANT_ID}::uuid, 'General English A1', 'GE-A1', 'Beginner level English course', 'A1', 20, 180.00, 'active'),
        (${TENANT_ID}::uuid, 'General English A2', 'GE-A2', 'Elementary level English course', 'A2', 20, 180.00, 'active'),
        (${TENANT_ID}::uuid, 'General English B1', 'GE-B1', 'Intermediate level English course', 'B1', 20, 180.00, 'active'),
        (${TENANT_ID}::uuid, 'General English B2', 'GE-B2', 'Upper-intermediate level English course', 'B2', 20, 180.00, 'active'),
        (${TENANT_ID}::uuid, 'General English C1', 'GE-C1', 'Advanced level English course', 'C1', 20, 200.00, 'active'),
        (${TENANT_ID}::uuid, 'IELTS Preparation', 'IELTS-PREP', 'IELTS exam preparation course', 'B2', 20, 220.00, 'active')
    `;
    console.log('✓ 6 courses created');

    // 4. Accommodation Types
    console.log('Creating accommodation types...');
    await sql`
      INSERT INTO accommodation_types (tenant_id, name, description, price_per_week_eur, deposit_eur, status)
      VALUES
        (${TENANT_ID}::uuid, 'Host Family', 'Live with a local Irish family in their home', 200.00, 200.00, 'active'),
        (${TENANT_ID}::uuid, 'Residence', 'Shared apartment in student residence', 250.00, 300.00, 'active'),
        (${TENANT_ID}::uuid, 'Student House', 'Shared house with other students', 220.00, 300.00, 'active'),
        (${TENANT_ID}::uuid, 'Studio Apartment', 'Private studio apartment', 350.00, 500.00, 'active')
    `;
    console.log('✓ 4 accommodation types created');

    // 5. Test User (eoinmaleoin@gmail.com)
    console.log('Creating test user (eoinmaleoin@gmail.com)...');
    await sql`
      INSERT INTO users (id, tenant_id, email, email_verified, name, phone, date_of_birth, nationality, primary_role, status)
      VALUES (
        ${USER_ID}::uuid,
        ${TENANT_ID}::uuid,
        'eoinmaleoin@gmail.com',
        true,
        'Eoin Malone',
        '+353 87 123 4567',
        '1990-01-15',
        'Irish',
        'admin',
        'active'
      )
    `;
    console.log('✓ User created');

    // 6. Grant 3 roles to test user
    console.log('Granting admin + teacher + student roles...');
    await sql`
      INSERT INTO user_roles (user_id, tenant_id, role)
      VALUES
        (${USER_ID}::uuid, ${TENANT_ID}::uuid, 'admin'),
        (${USER_ID}::uuid, ${TENANT_ID}::uuid, 'teacher'),
        (${USER_ID}::uuid, ${TENANT_ID}::uuid, 'student')
    `;
    console.log('✓ 3 roles granted');

    // 7. Create student record for test user
    console.log('Creating student record...');
    await sql`
      INSERT INTO students (user_id, tenant_id, student_number, is_visa_student, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, status)
      VALUES (
        ${USER_ID}::uuid,
        ${TENANT_ID}::uuid,
        'STU-2026-001',
        false,
        'Ana Malone',
        '+353 87 765 4321',
        'Spouse',
        'active'
      )
    `;
    console.log('✓ Student record created');

    // 8. Create sample booking
    console.log('Creating sample booking...');
    const course = await sql`SELECT id FROM courses WHERE code = 'GE-B1' LIMIT 1`;
    const accom = await sql`SELECT id FROM accommodation_types WHERE name = 'Host Family' LIMIT 1`;

    const booking = await sql`
      INSERT INTO bookings (
        booking_number, tenant_id, sale_date, student_id, booked_by_user_id, agency_id,
        course_id, weeks, course_start_date, course_end_date, assigned_level,
        accommodation_type_id, accommodation_start_date, accommodation_end_date,
        course_fee_eur, accommodation_fee_eur, transfer_fee_eur, exam_fee_eur,
        registration_fee_eur, learner_protection_fee_eur, medical_insurance_fee_eur,
        total_booking_eur, deposit_paid_eur, status, notes
      )
      VALUES (
        'BK-2026-001', ${TENANT_ID}::uuid, '2026-01-10',
        (SELECT id FROM students WHERE user_id = ${USER_ID}::uuid),
        ${USER_ID}::uuid, ${AGENCY_ID}::uuid, ${course[0].id},
        12, '2026-02-03', '2026-04-28', 'B1',
        ${accom[0].id}, '2026-02-02', '2026-04-29',
        2160.00, 2400.00, 75.00, 120.00, 50.00, 150.00, 100.00,
        5055.00, 1000.00, 'confirmed', 'Test booking for prototype demo'
      )
      RETURNING id
    `;
    console.log('✓ Booking created');

    // 9. Create payment
    console.log('Creating sample payment...');
    await sql`
      INSERT INTO payments (tenant_id, booking_id, payment_date, amount_eur, payment_method, reference_number, received_by, notes)
      VALUES (
        ${TENANT_ID}::uuid, ${booking[0].id}, '2026-01-10', 1000.00,
        'Bank Transfer', 'TXN-20260110-001', ${USER_ID}::uuid, 'Deposit payment via bank transfer'
      )
    `;
    console.log('✓ Payment created');

    console.log('\n✅ Seeding complete!');
    console.log('\nTest User:');
    console.log('  Email: eoinmaleoin@gmail.com');
    console.log('  Roles: admin + teacher + student');
    console.log('  Booking: BK-2026-001 (€5,055 total, €1,000 paid)\n');

    await sql.end();
    process.exit(0);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    await sql.end();
    process.exit(1);
  }
}

seed();

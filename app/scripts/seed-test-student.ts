import { config } from 'dotenv';
import { resolve } from 'path';
import postgres from 'postgres';

config({ path: resolve(__dirname, '../.env.local') });

const DATABASE_URL = process.env.DATABASE_URL!;
const sql = postgres(DATABASE_URL);

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

async function seedTestStudent() {
  console.log('\n🌱 Seeding test student: Dessie Garcia\n');

  try {
    // 1. Create user record
    const userResult = await sql`
      INSERT INTO users (
        tenant_id,
        email,
        email_verified,
        name,
        phone,
        date_of_birth,
        nationality,
        primary_role,
        status
      )
      VALUES (
        ${TENANT_ID}::uuid,
        'dessie.garcia@example.com',
        true,
        'Dessie Garcia',
        '+34 612 345 678',
        '1998-05-15',
        'Spanish',
        'student',
        'active'
      )
      RETURNING id
    `;

    const userId = userResult[0].id;
    console.log(`✅ Created user: ${userId}`);

    // 2. Grant student role
    await sql`
      INSERT INTO user_roles (user_id, tenant_id, role)
      VALUES (${userId}::uuid, ${TENANT_ID}::uuid, 'student')
    `;
    console.log('✅ Granted student role');

    // 3. Create student record with visa details
    await sql`
      INSERT INTO students (
        user_id,
        tenant_id,
        student_number,
        is_visa_student,
        visa_type,
        visa_expiry_date,
        emergency_contact_name,
        emergency_contact_phone,
        emergency_contact_relationship,
        medical_conditions,
        dietary_requirements,
        status
      )
      VALUES (
        ${userId}::uuid,
        ${TENANT_ID}::uuid,
        'STU-2026-002',
        true,
        'First Time',
        '2026-12-31',
        'Maria Garcia',
        '+34 691 234 567',
        'Mother',
        'None',
        'Vegetarian',
        'active'
      )
    `;
    console.log('✅ Created student record');

    console.log('\n📊 Dessie Garcia details:');
    console.log('   Email: dessie.garcia@example.com');
    console.log('   Student #: STU-2026-002');
    console.log('   Nationality: Spanish');
    console.log('   Visa: First Time (expires 2026-12-31)');
    console.log('   Emergency Contact: Maria Garcia (Mother)');
    console.log('   Dietary: Vegetarian');

    console.log('\n✅ Test student seeded successfully!');
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to seed test student:', error);
    await sql.end();
    process.exit(1);
  }
}

seedTestStudent();

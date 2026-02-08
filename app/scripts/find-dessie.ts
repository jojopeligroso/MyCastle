/**
 * Quick script to find Dessie Garcia's student ID
 */

import { db } from '../src/db';
import { students, users } from '../src/db/schema/core';
import { eq, sql } from 'drizzle-orm';

async function findDessie() {
  try {
    // Set RLS context
    await db.execute(sql.raw(`SET app.user_email = 'eoinmaleoin@gmail.com'`));
    await db.execute(sql.raw(`SET app.tenant_id = '00000000-0000-0000-0000-000000000001'`));

    const result = await db
      .select({
        studentId: students.id,
        userId: users.id,
        name: users.name,
        email: users.email,
        studentNumber: students.studentNumber,
      })
      .from(students)
      .innerJoin(users, eq(students.userId, users.id))
      .where(eq(students.studentNumber, 'STU-2026-002'));

    console.log('Dessie Garcia Student Data:');
    console.log(JSON.stringify(result, null, 2));

    if (result.length > 0) {
      console.log('\n✅ Student ID:', result[0].studentId);
      console.log('📝 Student Number:', result[0].studentNumber);
      console.log('👤 Name:', result[0].name);
      console.log('\n🔗 Detail Page URL:');
      console.log(`http://localhost:3000/admin/students/${result[0].studentId}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

findDessie();

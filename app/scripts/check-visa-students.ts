import { db } from '../src/db';
import { students, users } from '../src/db/schema/core';
import { eq, and, sql } from 'drizzle-orm';

async function checkVisaData() {
  try {
    // Set RLS context
    await db.execute(sql.raw(`SET app.user_email = 'eoinmaleoin@gmail.com'`));
    await db.execute(sql.raw(`SET app.tenant_id = 'f0ec2f89-77a7-4394-b1f3-2c0b5e7e8c5e'`));

    const result = await db
      .select({
        studentNumber: students.studentNumber,
        name: users.name,
        isVisaStudent: students.isVisaStudent,
        visaType: students.visaType,
        visaExpiryDate: students.visaExpiryDate,
      })
      .from(students)
      .leftJoin(users, eq(students.userId, users.id))
      .where(eq(students.isVisaStudent, true));

    console.log('\n=== VISA STUDENTS ===');
    console.log('Total found:', result.length);
    console.log('\nDetails:');
    result.forEach(s => {
      console.log(`- ${s.name} (${s.studentNumber})`);
      console.log(`  Visa Type: ${s.visaType}`);
      console.log(`  Expiry: ${s.visaExpiryDate}`);

      if (s.visaExpiryDate) {
        const today = new Date();
        const expiry = new Date(s.visaExpiryDate);
        const diffTime = expiry.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        console.log(`  Days until expiry: ${diffDays}`);
      }
      console.log('');
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkVisaData();

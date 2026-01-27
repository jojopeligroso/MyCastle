/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Verify Dessie Garcia's bookings and payments
 */

import { db } from '../src/db';
import { students, users, bookings, courses, payments } from '../src/db/schema';
import { eq, sql, desc } from 'drizzle-orm';

async function verifyDessieData() {
  try {
    const studentId = 'faac0379-ec15-44bf-9d4b-e8da34af204f';

    // Set RLS context
    await db.execute(sql.raw(`SET app.user_email = 'eoinmaleoin@gmail.com'`));
    await db.execute(sql.raw(`SET app.tenant_id = '00000000-0000-0000-0000-000000000001'`));

    // Get student details
    const studentResult = await db
      .select({
        name: users.name,
        email: users.email,
        phone: users.phone,
        studentNumber: students.studentNumber,
        isVisaStudent: students.isVisaStudent,
        visaType: students.visaType,
        visaExpiryDate: students.visaExpiryDate,
        emergencyContactName: students.emergencyContactName,
        emergencyContactPhone: students.emergencyContactPhone,
      })
      .from(students)
      .innerJoin(users, eq(students.userId, users.id))
      .where(eq(students.id, studentId))
      .limit(1);

    console.log('📋 STUDENT DETAILS:');
    console.log(JSON.stringify(studentResult[0], null, 2));

    // Get bookings
    const bookingResult = await db
      .select({
        bookingNumber: bookings.bookingNumber,
        courseName: courses.name,
        courseStartDate: bookings.courseStartDate,
        courseEndDate: bookings.courseEndDate,
        totalBookingEur: bookings.totalBookingEur,
        totalPaidEur: bookings.totalPaidEur,
        status: bookings.status,
      })
      .from(bookings)
      .innerJoin(courses, eq(bookings.courseId, courses.id))
      .where(eq(bookings.studentId, studentId))
      .orderBy(desc(bookings.courseStartDate));

    console.log('\n💼 BOOKINGS:');
    console.log(JSON.stringify(bookingResult, null, 2));

    // Get payments
    const paymentResult = await db
      .select({
        paymentDate: payments.paymentDate,
        amountEur: payments.amountEur,
        paymentMethod: payments.paymentMethod,
        bookingNumber: bookings.bookingNumber,
      })
      .from(payments)
      .innerJoin(bookings, eq(payments.bookingId, bookings.id))
      .where(eq(bookings.studentId, studentId))
      .orderBy(desc(payments.paymentDate));

    console.log('\n💰 PAYMENTS:');
    console.log(JSON.stringify(paymentResult, null, 2));

    // Calculate totals
    const totalPaid = paymentResult.reduce((sum, p) => sum + parseFloat(p.amountEur || '0'), 0);
    const totalBooking = bookingResult.reduce(
      (sum, b) => sum + parseFloat(b.totalBookingEur || '0'),
      0
    );
    const outstanding = totalBooking - totalPaid;

    console.log('\n📊 FINANCIAL SUMMARY:');
    console.log(`Total Bookings: €${totalBooking.toFixed(2)}`);
    console.log(`Total Paid: €${totalPaid.toFixed(2)}`);
    console.log(`Outstanding: €${outstanding.toFixed(2)}`);

    console.log('\n✅ Expected on detail page:');
    console.log(`- Student: ${studentResult[0]?.name}`);
    console.log(`- Bookings: ${bookingResult.length} booking(s)`);
    console.log(`- Payments: ${paymentResult.length} payment(s)`);
    console.log(`- Visa Student: ${studentResult[0]?.isVisaStudent ? 'Yes' : 'No'}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

verifyDessieData();

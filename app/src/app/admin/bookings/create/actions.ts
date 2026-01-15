'use server';

import { db } from '@/db';
import { bookings, payments } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

interface CreateBookingData {
  tenantId: string;
  studentId: string;
  courseId: string;
  agencyId: string;
  accommodationTypeId: string | null;
  weeks: number;
  courseStartDate: string;
  courseEndDate: string;
  courseFeeEur: string;
  accommodationFeeEur: string;
  registrationFeeEur: string;
  learnerProtectionFeeEur: string;
  medicalInsuranceFeeEur: string;
  totalBookingEur: string;
  depositPaidEur: string;
}

export async function createBooking(data: CreateBookingData) {
  try {
    // Set RLS context
    await db.execute(sql.raw(`SET app.user_email = 'eoinmaleoin@gmail.com'`));
    await db.execute(sql.raw(`SET app.tenant_id = '${data.tenantId}'`));

    // Generate booking number (BK-YYYY-XXX)
    const year = new Date().getFullYear();
    const bookingNumber = `BK-${year}-${String(Date.now()).slice(-6)}`;

    // Insert booking (with total_paid_eur = 0 initially)
    const result = await db
      .insert(bookings)
      .values({
        tenantId: data.tenantId,
        bookingNumber,
        saleDate: new Date().toISOString().split('T')[0], // Today's date
        studentId: data.studentId,
        courseId: data.courseId,
        agencyId: data.agencyId,
        accommodationTypeId: data.accommodationTypeId,
        weeks: data.weeks,
        courseStartDate: data.courseStartDate,
        courseEndDate: data.courseEndDate,
        courseFeeEur: data.courseFeeEur,
        accommodationFeeEur: data.accommodationFeeEur,
        transferFeeEur: '0',
        examFeeEur: '0',
        registrationFeeEur: data.registrationFeeEur,
        learnerProtectionFeeEur: data.learnerProtectionFeeEur,
        medicalInsuranceFeeEur: data.medicalInsuranceFeeEur,
        totalBookingEur: data.totalBookingEur,
        depositPaidEur: data.depositPaidEur,
        totalPaidEur: '0', // Will be updated by trigger when payment is inserted
        status: 'pending',
      })
      .returning({ id: bookings.id });

    const bookingId = result[0].id;

    // If deposit was paid, create a payment record
    // The database trigger will automatically update bookings.total_paid_eur
    if (parseFloat(data.depositPaidEur) > 0) {
      await db.insert(payments).values({
        tenantId: data.tenantId,
        bookingId,
        paymentDate: new Date().toISOString().split('T')[0],
        amountEur: data.depositPaidEur,
        paymentMethod: 'Bank Transfer',
        referenceNumber: `DEPOSIT-${bookingNumber}`,
      });
    }

    // Revalidate bookings page
    revalidatePath('/admin/bookings');

    return { success: true };
  } catch (error) {
    console.error('Failed to create booking:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create booking',
    };
  }
}

'use server';

import { db } from '@/db';
import { payments } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { getTenantId } from '@/lib/auth/utils';
import { revalidatePath } from 'next/cache';

interface AddPaymentData {
  bookingId: string;
  amount: string;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber: string | null;
}

export async function addPayment(data: AddPaymentData) {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) {
      return { success: false, error: 'No tenant ID available' };
    }

    // Set RLS context
    await db.execute(sql.raw(`SET app.user_email = 'eoinmaleoin@gmail.com'`));
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Insert payment
    // Note: The database trigger will automatically update bookings.total_paid_eur
    await db.insert(payments).values({
      tenantId,
      bookingId: data.bookingId,
      paymentDate: data.paymentDate,
      amountEur: data.amount,
      paymentMethod: data.paymentMethod,
      referenceNumber: data.referenceNumber,
    });

    // Revalidate the booking page
    revalidatePath(`/admin/bookings/${data.bookingId}`);
    revalidatePath('/admin/bookings');

    return { success: true };
  } catch (error) {
    console.error('Failed to add payment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add payment',
    };
  }
}

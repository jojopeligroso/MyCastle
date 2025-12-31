import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { payments, invoices, users } from '@/db/schema';
import { eq, and, isNull, sql, desc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/utils';
import { z } from 'zod';

const createPaymentSchema = z.object({
  invoice_id: z.string().uuid('Valid invoice ID is required'),
  amount: z.number(),
  payment_method: z.string(),
  payment_date: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    await requireAuth(['admin']);

    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('invoice_id');
    const studentId = searchParams.get('student_id');

    let query = db
      .select({
        payment: payments,
        invoice: {
          id: invoices.id,
          invoice_number: invoices.invoice_number,
        },
        student: {
          id: users.id,
          name: users.name,
        },
      })
      .from(payments)
      .leftJoin(invoices, eq(payments.invoice_id, invoices.id))
      .leftJoin(users, eq(invoices.student_id, users.id))
      .where(isNull(payments.deleted_at))
      .$dynamic();

    if (invoiceId) {
      query = query.where(eq(payments.invoice_id, invoiceId));
    }

    if (studentId) {
      query = query.where(eq(invoices.student_id, studentId));
    }

    const results = await query.orderBy(desc(payments.payment_date));

    return NextResponse.json({ payments: results });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(['admin']);
    const body = await request.json();

    const validationResult = createPaymentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Verify invoice exists
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, data.invoice_id))
      .limit(1);

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Validate payment amount
    if (Math.abs(data.amount) > Math.abs(invoice.amount_due) && data.amount > 0) {
      return NextResponse.json(
        { error: 'Payment amount exceeds outstanding balance' },
        { status: 400 }
      );
    }

    // Create payment
    const [newPayment] = await db
      .insert(payments)
      .values({
        invoice_id: data.invoice_id,
        amount: data.amount,
        payment_method: data.payment_method,
        payment_date: data.payment_date ? new Date(data.payment_date) : new Date(),
        reference: data.reference || null,
        notes: data.notes || null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    // Update invoice amounts
    const newAmountPaid = invoice.amount_paid + data.amount;
    const newAmountDue = invoice.amount - newAmountPaid;
    const newStatus = newAmountDue <= 0 ? 'paid' : newAmountDue < invoice.amount ? 'partial' : 'pending';

    await db
      .update(invoices)
      .set({
        amount_paid: newAmountPaid,
        amount_due: newAmountDue,
        status: newStatus,
        updated_at: new Date(),
      })
      .where(eq(invoices.id, data.invoice_id));

    return NextResponse.json(newPayment, { status: 201 });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}

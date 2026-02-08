import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema/core';
import { invoices, payments as systemPayments } from '@/db/schema/system';
import { eq, desc } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
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
        payment: systemPayments,
        invoice: {
          id: invoices.id,
          invoice_number: invoices.invoice_number,
        },
        student: {
          id: users.id,
          name: users.name,
        },
      })
      .from(systemPayments)
      .leftJoin(invoices, eq(systemPayments.invoice_id, invoices.id))
      .leftJoin(users, eq(invoices.student_id, users.id))
      .$dynamic();

    if (invoiceId) {
      query = query.where(eq(systemPayments.invoice_id, invoiceId));
    }

    if (studentId) {
      query = query.where(eq(invoices.student_id, studentId));
    }

    const results = await query.orderBy(desc(systemPayments.payment_date));

    return NextResponse.json({ payments: results });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(['admin']);
    const tenantId = await getTenantId();
    const body = await request.json();

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    const validationResult = createPaymentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, data.invoice_id))
      .limit(1);

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (Math.abs(data.amount) > Math.abs(Number(invoice.amount)) && data.amount > 0) {
      return NextResponse.json(
        { error: 'Payment amount exceeds outstanding balance' },
        { status: 400 }
      );
    }

    const [newPayment] = await db
      .insert(systemPayments)
      .values({
        tenant_id: tenantId,
        invoice_id: data.invoice_id,
        student_id: invoice.student_id,
        amount: data.amount.toString(),
        currency: invoice.currency,
        payment_method: data.payment_method,
        payment_date: data.payment_date ? new Date(data.payment_date) : new Date(),
        transaction_id: data.reference || null,
        notes: data.notes || null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    return NextResponse.json(newPayment, { status: 201 });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { invoicePayments, invoices, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { z } from 'zod';

const createPaymentSchema = z.object({
  invoice_id: z.string().uuid('Valid invoice ID is required'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3).default('USD'),
  payment_method: z.string(),
  payment_date: z.string().optional(),
  transaction_id: z.string().optional(),
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
        payment: invoicePayments,
        invoice: {
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
        },
        student: {
          id: users.id,
          name: users.name,
        },
      })
      .from(invoicePayments)
      .leftJoin(invoices, eq(invoicePayments.invoiceId, invoices.id))
      .leftJoin(users, eq(invoicePayments.studentId, users.id))
      .$dynamic();

    if (invoiceId) {
      query = query.where(eq(invoicePayments.invoiceId, invoiceId));
    }

    if (studentId) {
      query = query.where(eq(invoicePayments.studentId, studentId));
    }

    const results = await query.orderBy(desc(invoicePayments.paymentDate));

    return NextResponse.json({ payments: results });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(['admin']);
    const tenantId = await getTenantId();
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

    // Use invoice's tenantId if current user doesn't have one (super admin case)
    const effectiveTenantId = tenantId || invoice.tenantId;

    if (!effectiveTenantId) {
      return NextResponse.json({ error: 'No tenant context available' }, { status: 400 });
    }

    // Create payment
    const [newPayment] = await db
      .insert(invoicePayments)
      .values({
        tenantId: effectiveTenantId,
        invoiceId: data.invoice_id,
        studentId: invoice.studentId,
        amount: String(data.amount),
        currency: data.currency || 'USD',
        paymentMethod: data.payment_method,
        paymentDate: data.payment_date || new Date().toISOString().split('T')[0],
        transactionId: data.transaction_id || null,
        notes: data.notes || null,
        recordedBy: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Calculate total payments for this invoice and update status
    const allPayments = await db
      .select({ amount: invoicePayments.amount })
      .from(invoicePayments)
      .where(eq(invoicePayments.invoiceId, data.invoice_id));

    const totalPaid = allPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const invoiceAmount = parseFloat(invoice.amount);

    let newStatus = invoice.status;
    if (totalPaid >= invoiceAmount) {
      newStatus = 'paid';
    } else if (totalPaid > 0) {
      newStatus = 'partial';
    }

    if (newStatus !== invoice.status) {
      await db
        .update(invoices)
        .set({
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, data.invoice_id));
    }

    return NextResponse.json(newPayment, { status: 201 });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }
}

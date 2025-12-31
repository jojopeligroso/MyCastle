import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { invoices, payments } from '@/db/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(['admin']);
    const invoiceId = params.id;

    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), isNull(invoices.deleted_at)))
      .limit(1);

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Fetch payment history
    const paymentHistory = await db
      .select()
      .from(payments)
      .where(and(eq(payments.invoice_id, invoiceId), isNull(payments.deleted_at)))
      .orderBy(desc(payments.payment_date));

    return NextResponse.json({ ...invoice, payments: paymentHistory });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(['admin']);
    const invoiceId = params.id;

    // Soft delete invoice
    const [deletedInvoice] = await db
      .update(invoices)
      .set({
        deleted_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(invoices.id, invoiceId))
      .returning();

    if (!deletedInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json(
      { error: 'Failed to delete invoice' },
      { status: 500 }
    );
  }
}

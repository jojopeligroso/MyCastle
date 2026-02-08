import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { invoices, payments as systemPayments } from '@/db/schema/system';
import { eq, desc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/utils';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(['admin']);
    const { id: invoiceId } = await params;

    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const paymentHistory = await db
      .select()
      .from(systemPayments)
      .where(eq(systemPayments.invoice_id, invoiceId))
      .orderBy(desc(systemPayments.payment_date));

    return NextResponse.json({ ...invoice, payments: paymentHistory });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(['admin']);
    const { id: invoiceId } = await params;

    const [deletedInvoice] = await db
      .delete(invoices)
      .where(eq(invoices.id, invoiceId))
      .returning();

    if (!deletedInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 });
  }
}

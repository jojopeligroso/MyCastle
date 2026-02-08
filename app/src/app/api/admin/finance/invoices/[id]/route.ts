import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { invoices, invoicePayments } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/utils';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(['admin']);
    const { id: invoiceId } = await params;

    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Fetch payment history for this invoice
    const paymentHistory = await db
      .select()
      .from(invoicePayments)
      .where(eq(invoicePayments.invoiceId, invoiceId))
      .orderBy(desc(invoicePayments.paymentDate));

    return NextResponse.json({ ...invoice, payments: paymentHistory });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(['admin']);
    const { id: invoiceId } = await params;
    const body = await request.json();

    // Verify invoice exists
    const [existingInvoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    if (!existingInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (body.status !== undefined) {
      updateData.status = body.status;
    }
    if (body.due_date !== undefined) {
      updateData.dueDate = body.due_date;
    }
    if (body.description !== undefined) {
      updateData.description = body.description;
    }

    const [updatedInvoice] = await db
      .update(invoices)
      .set(updateData)
      .where(eq(invoices.id, invoiceId))
      .returning();

    return NextResponse.json(updatedInvoice);
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(['admin']);
    const { id: invoiceId } = await params;

    // Cancel invoice by updating status (no soft delete column in schema)
    const [cancelledInvoice] = await db
      .update(invoices)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoiceId))
      .returning();

    if (!cancelledInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 });
  }
}

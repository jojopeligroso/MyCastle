import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { invoices, users } from '@/db/schema';
import { eq, and, isNull, sql, desc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/utils';
import { z } from 'zod';

const createInvoiceSchema = z.object({
  student_id: z.string().uuid('Valid student ID is required'),
  amount: z.number().positive('Amount must be positive'),
  due_date: z.string(),
  description: z.string().optional(),
  line_items: z.array(z.object({
    description: z.string(),
    quantity: z.number().positive(),
    unit_price: z.number(),
    amount: z.number(),
  })).optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    await requireAuth(['admin']);

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');
    const status = searchParams.get('status');

    let query = db
      .select({
        invoice: invoices,
        student: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(invoices)
      .leftJoin(users, eq(invoices.student_id, users.id))
      .where(isNull(invoices.deleted_at))
      .$dynamic();

    if (studentId) {
      query = query.where(eq(invoices.student_id, studentId));
    }

    if (status) {
      query = query.where(eq(invoices.status, status));
    }

    const results = await query.orderBy(desc(invoices.created_at));

    return NextResponse.json({ invoices: results });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(['admin']);
    const body = await request.json();

    const validationResult = createInvoiceSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Verify student exists
    const [student] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, data.student_id), eq(users.role, 'student')))
      .limit(1);

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Generate invoice number
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(invoices);

    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

    // Create invoice
    const [newInvoice] = await db
      .insert(invoices)
      .values({
        student_id: data.student_id,
        invoice_number: invoiceNumber,
        amount: data.amount,
        amount_paid: 0,
        amount_due: data.amount,
        due_date: new Date(data.due_date),
        description: data.description || null,
        line_items: data.line_items || null,
        notes: data.notes || null,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    return NextResponse.json(newInvoice, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}

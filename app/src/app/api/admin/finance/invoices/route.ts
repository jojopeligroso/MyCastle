import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema/core';
import { invoices } from '@/db/schema/system';
import { eq, and, sql, desc } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { z } from 'zod';

const createInvoiceSchema = z.object({
  student_id: z.string().uuid('Valid student ID is required'),
  amount: z.number().positive('Amount must be positive'),
  due_date: z.string(),
  description: z.string().optional(),
  line_items: z
    .array(
      z.object({
        description: z.string(),
        quantity: z.number().positive(),
        unit_price: z.number(),
        amount: z.number(),
      })
    )
    .optional(),
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
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
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

    const validationResult = createInvoiceSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    const [student] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, data.student_id), eq(users.primaryRole, 'student')))
      .limit(1);

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(invoices);

    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

    const [newInvoice] = await db
      .insert(invoices)
      .values({
        tenant_id: tenantId,
        student_id: data.student_id,
        invoice_number: invoiceNumber,
        amount: data.amount.toString(),
        currency: 'USD',
        issue_date: new Date(),
        due_date: new Date(data.due_date),
        description: data.description || null,
        line_items: data.line_items || null,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    return NextResponse.json(newInvoice, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
  }
}

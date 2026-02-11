import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { invoices, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { z } from 'zod';

const createInvoiceSchema = z.object({
  student_id: z.string().uuid('Valid student ID is required'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3).default('USD'),
  due_date: z.string(),
  issue_date: z.string().optional(),
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
      .leftJoin(users, eq(invoices.studentId, users.id))
      .$dynamic();

    if (studentId) {
      query = query.where(eq(invoices.studentId, studentId));
    }

    if (status) {
      query = query.where(eq(invoices.status, status));
    }

    const results = await query.orderBy(desc(invoices.createdAt));

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

    const validationResult = createInvoiceSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Verify student exists
    const [student] = await db.select().from(users).where(eq(users.id, data.student_id)).limit(1);

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Generate invoice number
    const [countResult] = await db
      .select({
        count: db.$count(invoices),
      })
      .from(invoices);

    const count = countResult?.count ?? 0;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

    // Use student's tenantId if current user doesn't have one (super admin case)
    const effectiveTenantId = tenantId || student.tenantId;

    if (!effectiveTenantId) {
      return NextResponse.json({ error: 'No tenant context available' }, { status: 400 });
    }

    // Create invoice
    const [newInvoice] = await db
      .insert(invoices)
      .values({
        tenantId: effectiveTenantId,
        studentId: data.student_id,
        invoiceNumber: invoiceNumber,
        amount: String(data.amount),
        currency: data.currency || 'USD',
        dueDate: data.due_date,
        issueDate: data.issue_date || new Date().toISOString().split('T')[0],
        description: data.description || null,
        lineItems: data.line_items || null,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(newInvoice, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
  }
}

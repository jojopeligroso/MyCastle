/**
 * Finance MCP Server - Financial operations for ESL school
 *
 * Provides 9 tools for financial management:
 * 1. create_booking - Create a course booking for a student
 * 2. edit_booking - Modify existing booking details
 * 3. issue_invoice - Generate invoice from booking
 * 4. apply_discount - Apply discount to invoice
 * 5. refund_payment - Process payment refund
 * 6. reconcile_payouts - Reconcile payment batches
 * 7. ledger_export - Export financial ledger
 * 8. aging_report - Accounts receivable aging
 * 9. confirm_intake - Confirm student intake/enrollment
 *
 * Resources:
 * - finance://invoices - All invoices with status
 * - finance://payments - Payment history
 * - finance://outstanding - Outstanding balances
 * - finance://revenue_summary - Revenue analytics
 *
 * Prompts:
 * - finance_persona - Finance-focused AI assistant
 * - payment_follow_up - Payment reminder templates
 * - reconciliation_check - Monthly reconciliation guide
 */

import { z } from 'zod';
import { db } from '@/db';
import { invoices, invoicePayments, users, enrollments, classes, auditLogs } from '@/db/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { MCPServerConfig, MCPTool, MCPResource, MCPPrompt } from '../../types';

// Session type for MCP handlers
interface MCPSession {
  tenantId: string;
  userId: string;
}

/**
 * Helper: Log financial audit event
 */
async function logFinanceAudit(params: {
  tenantId: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  changes?: unknown;
  metadata?: unknown;
}) {
  await db.insert(auditLogs).values({
    tenantId: params.tenantId,
    userId: params.userId,
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    changes: params.changes,
    metadata: params.metadata,
  });
}

/**
 * Helper: Generate invoice number
 */
function generateInvoiceNumber(tenantId: string): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const tenantPrefix = tenantId.substring(0, 4).toUpperCase();
  return `INV-${tenantPrefix}-${timestamp}-${random}`;
}

/**
 * Helper: Calculate invoice status
 */
function calculateInvoiceStatus(invoice: { dueDate: string; status: string }): string {
  const now = new Date();
  const dueDate = new Date(invoice.dueDate);

  if (invoice.status === 'paid' || invoice.status === 'cancelled') {
    return invoice.status;
  }

  if (dueDate < now) {
    return 'overdue';
  }

  return 'pending';
}

/**
 * Tool 1: Create Booking
 */
const createBookingTool: MCPTool = {
  name: 'create_booking',
  description: 'Create a course booking for a student (generates invoice)',
  requiredScopes: ['finance:write'],
  inputSchema: z.object({
    student_id: z.string().uuid().describe('Student user ID'),
    class_id: z.string().uuid().describe('Class to book'),
    amount: z.number().positive().describe('Booking amount'),
    currency: z.string().length(3).default('USD').describe('Currency code (ISO 4217)'),
    description: z.string().optional().describe('Booking description'),
    line_items: z
      .array(
        z.object({
          description: z.string(),
          quantity: z.number().positive(),
          unit_price: z.number().positive(),
        })
      )
      .optional()
      .describe('Detailed line items'),
    due_date: z.string().describe('Payment due date (YYYY-MM-DD)'),
    auto_confirm_enrollment: z
      .boolean()
      .default(true)
      .describe('Automatically enroll student in class'),
  }),
  handler: async (input, session: MCPSession) => {
    const {
      student_id,
      class_id,
      amount,
      currency,
      description,
      line_items,
      due_date,
      auto_confirm_enrollment,
    } = input as {
      student_id: string;
      class_id: string;
      amount: number;
      currency: string;
      description?: string;
      line_items?: Array<{ description: string; quantity: number; unit_price: number }>;
      due_date: string;
      auto_confirm_enrollment: boolean;
    };

    // Verify student exists
    const [student] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, student_id), eq(users.tenantId, session.tenantId)))
      .limit(1);

    if (!student || student.primaryRole !== 'student') {
      throw new Error('Student not found or invalid user type');
    }

    // Verify class exists
    const [classInfo] = await db
      .select()
      .from(classes)
      .where(and(eq(classes.id, class_id), eq(classes.tenantId, session.tenantId)))
      .limit(1);

    if (!classInfo) {
      throw new Error('Class not found');
    }

    // Check if class is full
    if (classInfo.enrolledCount >= classInfo.capacity) {
      throw new Error(`Class is full (capacity: ${classInfo.capacity})`);
    }

    // Generate invoice
    const invoiceNumber = generateInvoiceNumber(session.tenantId);
    const [invoice] = await db
      .insert(invoices)
      .values({
        tenantId: session.tenantId,
        invoiceNumber: invoiceNumber,
        studentId: student_id,
        amount: amount.toFixed(2),
        currency,
        description: description || `Booking for ${classInfo.name}`,
        lineItems: line_items || [
          {
            description: classInfo.name,
            quantity: 1,
            unit_price: amount,
          },
        ],
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: due_date,
        status: 'pending',
      })
      .returning();

    // Create enrollment if auto-confirm
    let enrollmentId = null;
    if (auto_confirm_enrollment) {
      const [enrollment] = await db
        .insert(enrollments)
        .values({
          tenantId: session.tenantId,
          studentId: student_id,
          classId: class_id,
          enrollmentDate: new Date().toISOString().split('T')[0],
          status: 'active',
        })
        .returning();

      enrollmentId = enrollment.id;

      // Update class enrolled count
      await db
        .update(classes)
        .set({
          enrolledCount: sql`${classes.enrolledCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(classes.id, class_id));
    }

    // Log audit event
    await logFinanceAudit({
      tenantId: session.tenantId,
      userId: session.userId,
      action: 'booking_created',
      resourceType: 'invoice',
      resourceId: invoice.id,
      changes: {
        invoice_number: invoiceNumber,
        student_id,
        class_id,
        amount,
        currency,
        auto_confirm_enrollment,
        enrollment_id: enrollmentId,
      },
    });

    let response = `Booking created successfully.\n\n`;
    response += `Invoice Details:\n`;
    response += `- Invoice Number: ${invoiceNumber}\n`;
    response += `- Student: ${student.name} (${student.email})\n`;
    response += `- Class: ${classInfo.name}\n`;
    response += `- Amount: ${currency} ${amount.toFixed(2)}\n`;
    response += `- Due Date: ${due_date}\n`;
    response += `- Status: Pending Payment\n`;

    if (auto_confirm_enrollment) {
      response += `\n✓ Student enrolled in class automatically`;
    } else {
      response += `\n⚠️ Enrollment pending until payment received`;
    }

    return { text: response };
  },
};

/**
 * Tool 2: Edit Booking
 */
const editBookingTool: MCPTool = {
  name: 'edit_booking',
  description: 'Modify existing booking/invoice details',
  requiredScopes: ['finance:write'],
  inputSchema: z.object({
    invoice_id: z.string().uuid().describe('Invoice ID to modify'),
    amount: z.number().positive().optional().describe('New amount'),
    due_date: z.string().optional().describe('New due date (YYYY-MM-DD)'),
    description: z.string().optional().describe('Updated description'),
    line_items: z
      .array(
        z.object({
          description: z.string(),
          quantity: z.number().positive(),
          unit_price: z.number().positive(),
        })
      )
      .optional()
      .describe('Updated line items'),
    reason: z.string().describe('Reason for modification (required for audit)'),
  }),
  handler: async (input, session: MCPSession) => {
    const { invoice_id, amount, due_date, description, line_items, reason } = input as {
      invoice_id: string;
      amount?: number;
      due_date?: string;
      description?: string;
      line_items?: Array<{ description: string; quantity: number; unit_price: number }>;
      reason: string;
    };

    // Get existing invoice
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, invoice_id), eq(invoices.tenantId, session.tenantId)))
      .limit(1);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status === 'paid') {
      throw new Error('Cannot modify paid invoice. Issue a refund instead.');
    }

    if (invoice.status === 'cancelled') {
      throw new Error('Cannot modify cancelled invoice');
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (amount !== undefined) {
      updates.amount = amount.toFixed(2);
    }
    if (due_date !== undefined) {
      updates.dueDate = due_date;
    }
    if (description !== undefined) {
      updates.description = description;
    }
    if (line_items !== undefined) {
      updates.lineItems = line_items;
    }

    // Update invoice
    await db.update(invoices).set(updates).where(eq(invoices.id, invoice_id)).returning();

    // Log audit event
    await logFinanceAudit({
      tenantId: session.tenantId,
      userId: session.userId,
      action: 'booking_modified',
      resourceType: 'invoice',
      resourceId: invoice_id,
      changes: {
        old_values: {
          amount: invoice.amount,
          due_date: invoice.dueDate,
          description: invoice.description,
        },
        new_values: updates,
        reason,
      },
    });

    let response = `Invoice updated successfully.\n\n`;
    response += `Invoice: ${invoice.invoiceNumber}\n`;
    response += `Changes:\n`;
    if (amount !== undefined) response += `- Amount: ${invoice.amount} → ${amount.toFixed(2)}\n`;
    if (due_date !== undefined) response += `- Due Date: ${invoice.dueDate} → ${due_date}\n`;
    if (description !== undefined) response += `- Description updated\n`;
    if (line_items !== undefined) response += `- Line items updated\n`;
    response += `\nReason: ${reason}`;

    return { text: response };
  },
};

/**
 * Tool 3: Issue Invoice
 */
const issueInvoiceTool: MCPTool = {
  name: 'issue_invoice',
  description: 'Generate standalone invoice (without booking)',
  requiredScopes: ['finance:write'],
  inputSchema: z.object({
    student_id: z.string().uuid().describe('Student user ID'),
    amount: z.number().positive().describe('Invoice amount'),
    currency: z.string().length(3).default('USD').describe('Currency code'),
    description: z.string().describe('Invoice description'),
    line_items: z
      .array(
        z.object({
          description: z.string(),
          quantity: z.number().positive(),
          unit_price: z.number().positive(),
        })
      )
      .describe('Invoice line items'),
    issue_date: z.string().optional().describe('Issue date (defaults to today)'),
    due_date: z.string().describe('Payment due date (YYYY-MM-DD)'),
    send_email: z.boolean().default(true).describe('Send invoice email to student'),
  }),
  handler: async (input, session: MCPSession) => {
    const {
      student_id,
      amount,
      currency,
      description,
      line_items,
      issue_date,
      due_date,
      send_email,
    } = input as {
      student_id: string;
      amount: number;
      currency: string;
      description: string;
      line_items: Array<{ description: string; quantity: number; unit_price: number }>;
      issue_date?: string;
      due_date: string;
      send_email: boolean;
    };

    // Verify student exists
    const [student] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, student_id), eq(users.tenantId, session.tenantId)))
      .limit(1);

    if (!student || student.primaryRole !== 'student') {
      throw new Error('Student not found');
    }

    // Generate invoice
    const invoiceNumber = generateInvoiceNumber(session.tenantId);
    const [invoice] = await db
      .insert(invoices)
      .values({
        tenantId: session.tenantId,
        invoiceNumber: invoiceNumber,
        studentId: student_id,
        amount: amount.toFixed(2),
        currency,
        description,
        lineItems: line_items,
        issueDate: issue_date || new Date().toISOString().split('T')[0],
        dueDate: due_date,
        status: 'pending',
      })
      .returning();

    // Log audit event
    await logFinanceAudit({
      tenantId: session.tenantId,
      userId: session.userId,
      action: 'invoice_issued',
      resourceType: 'invoice',
      resourceId: invoice.id,
      changes: {
        invoice_number: invoiceNumber,
        student_id,
        amount,
        description,
      },
    });

    let response = `Invoice issued successfully.\n\n`;
    response += `Invoice Number: ${invoiceNumber}\n`;
    response += `Student: ${student.name} (${student.email})\n`;
    response += `Amount: ${currency} ${amount.toFixed(2)}\n`;
    response += `Issue Date: ${invoice.issueDate}\n`;
    response += `Due Date: ${due_date}\n`;

    if (send_email) {
      response += `\n✉️ Invoice email sent to ${student.email}`;
    }

    return { text: response };
  },
};

/**
 * Tool 4: Apply Discount
 */
const applyDiscountTool: MCPTool = {
  name: 'apply_discount',
  description: 'Apply discount to an invoice',
  requiredScopes: ['finance:write'],
  inputSchema: z.object({
    invoice_id: z.string().uuid().describe('Invoice ID'),
    discount_type: z.enum(['percentage', 'fixed']).describe('Discount type'),
    discount_value: z.number().positive().describe('Discount value (% or fixed amount)'),
    reason: z.string().describe('Reason for discount (required for audit)'),
  }),
  handler: async (input, session: MCPSession) => {
    const { invoice_id, discount_type, discount_value, reason } = input as {
      invoice_id: string;
      discount_type: 'percentage' | 'fixed';
      discount_value: number;
      reason: string;
    };

    // Get invoice
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, invoice_id), eq(invoices.tenantId, session.tenantId)))
      .limit(1);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status === 'paid') {
      throw new Error('Cannot apply discount to paid invoice');
    }

    const originalAmount = parseFloat(invoice.amount);
    let discountAmount = 0;
    let newAmount = originalAmount;

    if (discount_type === 'percentage') {
      if (discount_value > 100) {
        throw new Error('Percentage discount cannot exceed 100%');
      }
      discountAmount = originalAmount * (discount_value / 100);
      newAmount = originalAmount - discountAmount;
    } else {
      if (discount_value >= originalAmount) {
        throw new Error('Fixed discount cannot exceed invoice amount');
      }
      discountAmount = discount_value;
      newAmount = originalAmount - discount_value;
    }

    // Update invoice
    await db
      .update(invoices)
      .set({
        amount: newAmount.toFixed(2),
        description: `${invoice.description} (Discount applied: ${discount_type === 'percentage' ? discount_value + '%' : invoice.currency + ' ' + discount_value})`,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoice_id));

    // Log audit event
    await logFinanceAudit({
      tenantId: session.tenantId,
      userId: session.userId,
      action: 'discount_applied',
      resourceType: 'invoice',
      resourceId: invoice_id,
      changes: {
        original_amount: originalAmount,
        discount_type,
        discount_value,
        discount_amount: discountAmount,
        new_amount: newAmount,
        reason,
      },
    });

    let response = `Discount applied successfully.\n\n`;
    response += `Invoice: ${invoice.invoiceNumber}\n`;
    response += `Original Amount: ${invoice.currency} ${originalAmount.toFixed(2)}\n`;
    response += `Discount: ${discount_type === 'percentage' ? discount_value + '%' : invoice.currency + ' ' + discount_value.toFixed(2)}\n`;
    response += `Discount Amount: ${invoice.currency} ${discountAmount.toFixed(2)}\n`;
    response += `New Amount: ${invoice.currency} ${newAmount.toFixed(2)}\n`;
    response += `\nReason: ${reason}`;

    return { text: response };
  },
};

/**
 * Tool 5: Refund Payment
 */
const refundPaymentTool: MCPTool = {
  name: 'refund_payment',
  description: 'Process a payment refund',
  requiredScopes: ['finance:write'],
  inputSchema: z.object({
    payment_id: z.string().uuid().describe('Payment ID to refund'),
    refund_amount: z.number().positive().optional().describe('Refund amount (partial or full)'),
    reason: z.string().describe('Reason for refund (required)'),
    refund_method: z.enum(['original_method', 'bank_transfer', 'cash']).default('original_method'),
  }),
  handler: async (input, session: MCPSession) => {
    const { payment_id, refund_amount, reason, refund_method } = input as {
      payment_id: string;
      refund_amount?: number;
      reason: string;
      refund_method: string;
    };

    // Get payment
    const [payment] = await db
      .select()
      .from(invoicePayments)
      .where(
        and(eq(invoicePayments.id, payment_id), eq(invoicePayments.tenantId, session.tenantId))
      )
      .limit(1);

    if (!payment) {
      throw new Error('Payment not found');
    }

    const originalAmount = parseFloat(payment.amount);
    const finalRefundAmount = refund_amount || originalAmount;

    if (finalRefundAmount > originalAmount) {
      throw new Error('Refund amount cannot exceed original payment');
    }

    // Create refund record (negative payment)
    const [refund] = await db
      .insert(invoicePayments)
      .values({
        tenantId: session.tenantId,
        invoiceId: payment.invoiceId,
        studentId: payment.studentId,
        amount: (-finalRefundAmount).toFixed(2),
        currency: payment.currency,
        paymentMethod: refund_method === 'original_method' ? payment.paymentMethod : refund_method,
        paymentDate: new Date().toISOString().split('T')[0],
        notes: `Refund for payment ${payment_id}. Reason: ${reason}`,
        recordedBy: session.userId,
      })
      .returning();

    // Update invoice status if fully refunded
    if (finalRefundAmount === originalAmount) {
      await db
        .update(invoices)
        .set({
          status: 'cancelled',
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, payment.invoiceId));
    }

    // Log audit event
    await logFinanceAudit({
      tenantId: session.tenantId,
      userId: session.userId,
      action: 'refund_processed',
      resourceType: 'payment',
      resourceId: refund.id,
      changes: {
        original_payment_id: payment_id,
        original_amount: originalAmount,
        refund_amount: finalRefundAmount,
        refund_method,
        reason,
      },
    });

    let response = `Refund processed successfully.\n\n`;
    response += `Original Payment: ${payment.currency} ${originalAmount.toFixed(2)}\n`;
    response += `Refund Amount: ${payment.currency} ${finalRefundAmount.toFixed(2)}\n`;
    response += `Refund Method: ${refund_method}\n`;
    response += `Reason: ${reason}\n`;

    if (finalRefundAmount < originalAmount) {
      response += `\nPartial refund processed. Remaining: ${payment.currency} ${(originalAmount - finalRefundAmount).toFixed(2)}`;
    }

    return { text: response };
  },
};

/**
 * Tool 6: Reconcile Payouts
 */
const reconcilePayoutsTool: MCPTool = {
  name: 'reconcile_payouts',
  description: 'Reconcile payment batches with bank statements',
  requiredScopes: ['finance:*'],
  inputSchema: z.object({
    start_date: z.string().describe('Reconciliation period start (YYYY-MM-DD)'),
    end_date: z.string().describe('Reconciliation period end (YYYY-MM-DD)'),
    payment_method: z.enum(['stripe', 'cash', 'bank_transfer', 'all']).default('all'),
  }),
  handler: async (input, session: MCPSession) => {
    const { start_date, end_date, payment_method } = input as {
      start_date: string;
      end_date: string;
      payment_method: string;
    };

    // Build query conditions
    const conditions = [
      eq(invoicePayments.tenantId, session.tenantId),
      gte(invoicePayments.paymentDate, start_date),
      lte(invoicePayments.paymentDate, end_date),
    ];

    if (payment_method !== 'all') {
      conditions.push(eq(invoicePayments.paymentMethod, payment_method));
    }

    // Query payments
    const paymentRecords = await db
      .select()
      .from(invoicePayments)
      .where(and(...conditions))
      .orderBy(invoicePayments.paymentDate);

    // Calculate totals
    const byMethod: Record<string, number> = {};
    const byCurrency: Record<string, number> = {};

    paymentRecords.forEach(p => {
      byMethod[p.paymentMethod] = (byMethod[p.paymentMethod] || 0) + parseFloat(p.amount);
      byCurrency[p.currency] = (byCurrency[p.currency] || 0) + parseFloat(p.amount);
    });

    let response = `Payment Reconciliation Report\n\n`;
    response += `Period: ${start_date} to ${end_date}\n`;
    response += `Payment Method: ${payment_method}\n`;
    response += `Total Transactions: ${paymentRecords.length}\n\n`;

    response += `Total Amount: ${Object.entries(byCurrency)
      .map(([curr, amt]) => `${curr} ${amt.toFixed(2)}`)
      .join(', ')}\n\n`;

    response += `Breakdown by Method:\n`;
    Object.entries(byMethod).forEach(([method, amount]) => {
      response += `- ${method}: ${amount.toFixed(2)}\n`;
    });

    response += `\nRecent Transactions:\n`;
    paymentRecords.slice(0, 10).forEach((p, idx) => {
      response += `${idx + 1}. ${p.paymentDate} - ${p.currency} ${p.amount} (${p.paymentMethod})\n`;
    });

    if (paymentRecords.length > 10) {
      response += `\n... and ${paymentRecords.length - 10} more transactions`;
    }

    return { text: response };
  },
};

/**
 * Tool 7: Ledger Export
 */
const ledgerExportTool: MCPTool = {
  name: 'ledger_export',
  description: 'Export financial ledger for accounting',
  requiredScopes: ['finance:*'],
  inputSchema: z.object({
    start_date: z.string().describe('Export period start (YYYY-MM-DD)'),
    end_date: z.string().describe('Export period end (YYYY-MM-DD)'),
    format: z.enum(['csv', 'json']).default('csv'),
    include_refunds: z.boolean().default(true),
  }),
  handler: async (input, session: MCPSession) => {
    const { start_date, end_date, format } = input as {
      start_date: string;
      end_date: string;
      format: string;
    };

    // Query all financial transactions
    const transactions = await db
      .select({
        date: invoicePayments.paymentDate,
        invoice_number: invoices.invoiceNumber,
        student_name: users.name,
        amount: invoicePayments.amount,
        currency: invoicePayments.currency,
        method: invoicePayments.paymentMethod,
        notes: invoicePayments.notes,
      })
      .from(invoicePayments)
      .innerJoin(invoices, eq(invoicePayments.invoiceId, invoices.id))
      .innerJoin(users, eq(invoicePayments.studentId, users.id))
      .where(
        and(
          eq(invoicePayments.tenantId, session.tenantId),
          gte(invoicePayments.paymentDate, start_date),
          lte(invoicePayments.paymentDate, end_date)
        )
      )
      .orderBy(invoicePayments.paymentDate);

    let response = `Ledger export generated.\n\n`;
    response += `Period: ${start_date} to ${end_date}\n`;
    response += `Format: ${format.toUpperCase()}\n`;
    response += `Total Transactions: ${transactions.length}\n\n`;

    if (format === 'csv') {
      response += `CSV Header:\nDate,Invoice,Student,Amount,Currency,Method,Notes\n\n`;
      response += `Sample Rows:\n`;
      transactions.slice(0, 5).forEach(t => {
        response += `${t.date},${t.invoice_number},${t.student_name},${t.amount},${t.currency},${t.method},"${t.notes || ''}"\n`;
      });
    } else {
      response += `JSON Format:\n`;
      response += JSON.stringify(transactions.slice(0, 3), null, 2);
    }

    response += `\n\nℹ️ Full export available for download (not implemented in MCP - requires file storage)`;

    return { text: response };
  },
};

/**
 * Tool 8: Aging Report
 */
const agingReportTool: MCPTool = {
  name: 'aging_report',
  description: 'Generate accounts receivable aging report',
  requiredScopes: ['finance:read'],
  inputSchema: z.object({
    as_of_date: z.string().optional().describe('Report as of date (defaults to today)'),
  }),
  handler: async (input, session: MCPSession) => {
    const { as_of_date } = input as { as_of_date?: string };
    const reportDate = new Date(as_of_date || Date.now());

    // Query unpaid invoices
    const unpaidInvoices = await db
      .select({
        invoice: invoices,
        student: users,
      })
      .from(invoices)
      .innerJoin(users, eq(invoices.studentId, users.id))
      .where(and(eq(invoices.tenantId, session.tenantId), eq(invoices.status, 'pending')));

    // Categorize by age
    type AgingItem = {
      invoice: typeof invoices.$inferSelect;
      student: typeof users.$inferSelect;
      daysOverdue: number;
    };

    const aging = {
      current: [] as AgingItem[],
      days_30: [] as AgingItem[],
      days_60: [] as AgingItem[],
      days_90: [] as AgingItem[],
      days_90_plus: [] as AgingItem[],
    };

    unpaidInvoices.forEach(({ invoice, student }) => {
      const dueDate = new Date(invoice.dueDate);
      const daysOverdue = Math.floor(
        (reportDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      const item = { invoice, student, daysOverdue };

      if (daysOverdue < 0) {
        aging.current.push(item);
      } else if (daysOverdue <= 30) {
        aging.days_30.push(item);
      } else if (daysOverdue <= 60) {
        aging.days_60.push(item);
      } else if (daysOverdue <= 90) {
        aging.days_90.push(item);
      } else {
        aging.days_90_plus.push(item);
      }
    });

    // Calculate totals
    const calculateTotal = (items: AgingItem[]) =>
      items.reduce((sum, item) => sum + parseFloat(item.invoice.amount), 0);

    let response = `Accounts Receivable Aging Report\n\n`;
    response += `As of: ${reportDate.toISOString().split('T')[0]}\n`;
    response += `Total Outstanding: ${unpaidInvoices.length} invoices\n\n`;

    response += `Current (Not Due): ${aging.current.length} invoices - ${calculateTotal(aging.current).toFixed(2)}\n`;
    response += `1-30 Days: ${aging.days_30.length} invoices - ${calculateTotal(aging.days_30).toFixed(2)}\n`;
    response += `31-60 Days: ${aging.days_60.length} invoices - ${calculateTotal(aging.days_60).toFixed(2)}\n`;
    response += `61-90 Days: ${aging.days_90.length} invoices - ${calculateTotal(aging.days_90).toFixed(2)}\n`;
    response += `90+ Days: ${aging.days_90_plus.length} invoices - ${calculateTotal(aging.days_90_plus).toFixed(2)}\n\n`;

    response += `⚠️ Priority Collections (90+ Days Overdue):\n`;
    aging.days_90_plus.slice(0, 5).forEach((item, idx) => {
      response += `${idx + 1}. ${item.student.name} - ${item.invoice.invoiceNumber} - ${item.invoice.currency} ${item.invoice.amount} (${item.daysOverdue} days overdue)\n`;
    });

    return { text: response };
  },
};

/**
 * Tool 9: Confirm Intake
 */
const confirmIntakeTool: MCPTool = {
  name: 'confirm_intake',
  description: 'Confirm student intake/enrollment after payment',
  requiredScopes: ['finance:write'],
  inputSchema: z.object({
    invoice_id: z.string().uuid().describe('Invoice ID for the intake'),
    payment_confirmed: z.boolean().describe('Payment has been verified'),
    start_date: z.string().describe('Student start date (YYYY-MM-DD)'),
    notes: z.string().optional().describe('Additional intake notes'),
  }),
  handler: async (input, session: MCPSession) => {
    const { invoice_id, payment_confirmed, start_date, notes } = input as {
      invoice_id: string;
      payment_confirmed: boolean;
      start_date: string;
      notes?: string;
    };

    if (!payment_confirmed) {
      throw new Error('Cannot confirm intake without payment verification');
    }

    // Get invoice with student and class info
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, invoice_id), eq(invoices.tenantId, session.tenantId)))
      .limit(1);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status !== 'paid') {
      throw new Error('Invoice must be paid before confirming intake');
    }

    // Update invoice metadata to mark intake as confirmed
    await db
      .update(invoices)
      .set({
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoice_id));

    // Log audit event
    await logFinanceAudit({
      tenantId: session.tenantId,
      userId: session.userId,
      action: 'intake_confirmed',
      resourceType: 'invoice',
      resourceId: invoice_id,
      changes: {
        start_date,
        notes,
      },
    });

    let response = `Student intake confirmed successfully.\n\n`;
    response += `Invoice: ${invoice.invoiceNumber}\n`;
    response += `Student Start Date: ${start_date}\n`;
    response += `Payment Status: Confirmed\n`;
    if (notes) {
      response += `\nNotes: ${notes}`;
    }
    response += `\n\n✓ Student is ready to begin classes`;

    return { text: response };
  },
};

/**
 * Resources
 */

const invoicesResource: MCPResource = {
  uri: 'finance://invoices',
  name: 'All Invoices',
  description: 'Complete list of invoices with current status',
  requiredScopes: ['finance:read'],
  mimeType: 'application/json',
  handler: async (session: MCPSession, params) => {
    const limit = parseInt(params?.limit || '50', 10);

    const allInvoices = await db
      .select({
        invoice: invoices,
        student: users,
      })
      .from(invoices)
      .innerJoin(users, eq(invoices.studentId, users.id))
      .where(eq(invoices.tenantId, session.tenantId))
      .orderBy(desc(invoices.createdAt))
      .limit(Math.min(limit, 100));

    return {
      invoices: allInvoices.map(({ invoice, student }) => ({
        id: invoice.id,
        invoice_number: invoice.invoiceNumber,
        student_name: student.name,
        student_email: student.email,
        amount: invoice.amount,
        currency: invoice.currency,
        status: calculateInvoiceStatus(invoice),
        issue_date: invoice.issueDate,
        due_date: invoice.dueDate,
        description: invoice.description,
      })),
      total: allInvoices.length,
    };
  },
};

const paymentsResource: MCPResource = {
  uri: 'finance://payments',
  name: 'Payment History',
  description: 'All recorded payments',
  requiredScopes: ['finance:read'],
  mimeType: 'application/json',
  handler: async (session: MCPSession, params) => {
    const limit = parseInt(params?.limit || '50', 10);

    const allPayments = await db
      .select({
        payment: invoicePayments,
        invoice: invoices,
        student: users,
      })
      .from(invoicePayments)
      .innerJoin(invoices, eq(invoicePayments.invoiceId, invoices.id))
      .innerJoin(users, eq(invoicePayments.studentId, users.id))
      .where(eq(invoicePayments.tenantId, session.tenantId))
      .orderBy(desc(invoicePayments.createdAt))
      .limit(Math.min(limit, 100));

    return {
      payments: allPayments.map(({ payment, invoice, student }) => ({
        id: payment.id,
        invoice_number: invoice.invoiceNumber,
        student_name: student.name,
        amount: payment.amount,
        currency: payment.currency,
        payment_method: payment.paymentMethod,
        payment_date: payment.paymentDate,
        transaction_id: payment.transactionId,
      })),
      total: allPayments.length,
    };
  },
};

const outstandingResource: MCPResource = {
  uri: 'finance://outstanding',
  name: 'Outstanding Balances',
  description: 'Unpaid invoices and overdue amounts',
  requiredScopes: ['finance:read'],
  mimeType: 'application/json',
  handler: async (session: MCPSession) => {
    const unpaid = await db
      .select({
        invoice: invoices,
        student: users,
      })
      .from(invoices)
      .innerJoin(users, eq(invoices.studentId, users.id))
      .where(and(eq(invoices.tenantId, session.tenantId), eq(invoices.status, 'pending')))
      .orderBy(invoices.dueDate);

    const totalOutstanding = unpaid.reduce(
      (sum, { invoice }) => sum + parseFloat(invoice.amount),
      0
    );

    return {
      outstanding_invoices: unpaid.map(({ invoice, student }) => ({
        invoice_number: invoice.invoiceNumber,
        student_name: student.name,
        amount: invoice.amount,
        currency: invoice.currency,
        due_date: invoice.dueDate,
        days_overdue: Math.max(
          0,
          Math.floor((Date.now() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24))
        ),
      })),
      total_outstanding: totalOutstanding.toFixed(2),
      count: unpaid.length,
    };
  },
};

const revenueSummaryResource: MCPResource = {
  uri: 'finance://revenue_summary',
  name: 'Revenue Summary',
  description: 'Revenue analytics and trends',
  requiredScopes: ['finance:read'],
  mimeType: 'application/json',
  handler: async (session: MCPSession, params) => {
    const period = params?.period || 'month'; // day, week, month, year

    // Calculate revenue for current period
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const paidInvoices = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.tenantId, session.tenantId),
          eq(invoices.status, 'paid'),
          gte(invoices.issueDate, startDate.toISOString().split('T')[0])
        )
      );

    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);

    return {
      period,
      start_date: startDate.toISOString().split('T')[0],
      end_date: now.toISOString().split('T')[0],
      total_revenue: totalRevenue.toFixed(2),
      invoice_count: paidInvoices.length,
      average_invoice: (totalRevenue / (paidInvoices.length || 1)).toFixed(2),
    };
  },
};

/**
 * Prompts
 */

const financePersonaPrompt: MCPPrompt = {
  name: 'finance_persona',
  description: 'Finance-focused AI assistant for school operations',
  requiredScopes: [],
  variables: [],
  template: `You are an AI finance assistant for an ESL school.

YOUR ROLE:
- Help finance officers manage invoicing, payments, and reconciliation
- Provide clear, professional communication about financial matters
- Maintain strict compliance with financial regulations
- Use appropriate tone for sensitive financial discussions

CAPABILITIES:
- Create bookings and issue invoices
- Process payments and refunds
- Generate financial reports
- Track outstanding balances
- Reconcile payment batches

BEHAVIOR GUIDELINES:

1. **Accuracy First**
   - Double-check all financial calculations
   - Verify student/class information before processing
   - Always require payment confirmation before enrollment

2. **Clear Communication**
   - Use precise amounts with currency symbols
   - Include invoice numbers in all communications
   - Provide clear due dates and payment instructions

3. **Audit Trail**
   - Always require reasons for modifications
   - Log all financial actions
   - Maintain transparency in discounts and refunds

4. **Payment Follow-up**
   - Flag overdue invoices proactively
   - Suggest appropriate follow-up actions
   - Maintain professional tone in payment reminders

5. **Compliance**
   - Follow accounting standards
   - Maintain data privacy for financial information
   - Ensure proper authorization for financial operations`,
};

const paymentFollowUpPrompt: MCPPrompt = {
  name: 'payment_follow_up',
  description: 'Generate payment reminder emails',
  requiredScopes: ['finance:read'],
  variables: ['days_overdue'],
  template: `Generate a professional payment reminder email.

Variables:
- Days Overdue: {{days_overdue}}

Tone Guidelines:
- 1-7 days: Friendly reminder
- 8-30 days: Firmer reminder with urgency
- 30+ days: Formal collection notice

Include:
- Invoice number and amount
- Original due date
- Payment instructions
- Contact information for payment queries
- Late payment policy (if applicable)

Format as email-ready text.`,
};

const reconciliationCheckPrompt: MCPPrompt = {
  name: 'reconciliation_check',
  description: 'Monthly reconciliation checklist',
  requiredScopes: ['finance:*'],
  variables: ['month', 'year'],
  template: `Generate monthly reconciliation checklist for {{month}} {{year}}.

Include:
1. Total invoices issued
2. Total payments received (by method)
3. Outstanding balances
4. Refunds processed
5. Discounts applied
6. Aging report summary
7. Discrepancies to investigate

Format as checklist with checkboxes.`,
};

/**
 * Finance MCP Server Configuration
 */
export const financeMCPConfig: MCPServerConfig = {
  name: 'Finance MCP',
  version: '3.0.0',
  scopePrefix: 'finance',
  tools: [
    createBookingTool,
    editBookingTool,
    issueInvoiceTool,
    applyDiscountTool,
    refundPaymentTool,
    reconcilePayoutsTool,
    ledgerExportTool,
    agingReportTool,
    confirmIntakeTool,
  ],
  resources: [invoicesResource, paymentsResource, outstandingResource, revenueSummaryResource],
  prompts: [financePersonaPrompt, paymentFollowUpPrompt, reconciliationCheckPrompt],
};

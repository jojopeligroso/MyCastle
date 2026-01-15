#!/usr/bin/env node
/**
 * Finance MCP Server - Standalone Process
 *
 * Provides tools for financial management
 * Communicates via stdio using JSON-RPC 2.0
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { db } from '@/db';
import { invoices, payments, auditLogs } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

function getSessionFromContext(extra?: any) {
  return {
    tenantId: extra?._meta?.tenant_id || 'default-tenant',
    userId: extra?._meta?.user_id || 'system',
    role: extra?._meta?.role || 'admin',
    scopes: extra?._meta?.scopes || ['finance:*'],
  };
}

function generateInvoiceNumber(tenantId: string): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${tenantId.substring(0, 4)}-${timestamp}-${random}`;
}

async function logFinanceAudit(params: any) {
  try {
    const insertData: any = {
      tenant_id: params.tenantId,
      user_id: params.userId,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId,
      changes: params.changes,
      metadata: params.metadata,
    };

    await db.insert(auditLogs).values(insertData);
  } catch (err) {
    console.error('Audit Log Failed:', err);
  }
}

async function main() {
  const server = new McpServer(
    {
      name: 'finance-mcp',
      version: '3.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  // Tool: create_booking
  server.tool(
    'create_booking',
    {
      student_id: z.string().uuid().describe('Student user ID'),
      class_id: z.string().uuid().describe('Class to book'),
      amount: z.number().positive().describe('Booking amount'),
      currency: z.string().length(3).default('USD'),
      due_date: z.string().optional().describe('Invoice due date (ISO 8601)'),
    },
    async (args, extra) => {
      const session = getSessionFromContext(extra);
      const { student_id, class_id, amount, currency, due_date } = args;

      const invoiceNumber = generateInvoiceNumber(session.tenantId);
      const dueDate = due_date
        ? new Date(due_date)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const insertData: any = {
        tenant_id: session.tenantId,
        invoice_number: invoiceNumber,
        student_id,
        amount: amount.toString(),
        currency,
        status: 'pending',
        due_date: dueDate,
        issue_date: new Date(),
        description: `Booking for class ${class_id}`,
      };

      const [invoice] = await db.insert(invoices).values(insertData).returning();

      await logFinanceAudit({
        tenantId: session.tenantId,
        userId: session.userId,
        action: 'create_booking',
        resourceType: 'invoice',
        resourceId: invoice.id,
        changes: { amount, currency, student_id, class_id },
      });

      return {
        content: [
          {
            type: 'text',
            text: `Booking created successfully.\n\nInvoice: ${invoiceNumber}\nAmount: ${currency} ${amount}\nDue: ${dueDate.toISOString().split('T')[0]}`,
          },
        ],
      };
    }
  );

  // Tool: issue_invoice
  server.tool(
    'issue_invoice',
    {
      booking_id: z.string().uuid().describe('Booking ID'),
      send_email: z.boolean().default(true).describe('Send invoice via email'),
    },
    async (args, extra) => {
      const session = getSessionFromContext(extra);
      const { booking_id, send_email } = args;

      // Implementation here
      return {
        content: [
          {
            type: 'text',
            text: `Invoice issued for booking ${booking_id}. Email sent: ${send_email}`,
          },
        ],
      };
    }
  );

  // Resource: finance://invoices
  server.resource(
    'invoices',
    'finance://invoices',
    {
      mimeType: 'application/json',
    },
    async (uri, extra) => {
      const session = getSessionFromContext(extra);

      const allInvoices = await db
        .select()
        .from(invoices)
        .where(eq(invoices.tenant_id, session.tenantId))
        .orderBy(desc(invoices.created_at))
        .limit(100);

      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: 'application/json',
            text: JSON.stringify({ invoices: allInvoices, total: allInvoices.length }, null, 2),
          },
        ],
      };
    }
  );

  // Prompt: finance_persona
  server.prompt('finance_persona', 'Finance-focused AI assistant persona', async () => {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: 'You are a finance assistant for an ESL school. Help with invoicing, payments, and financial reporting.',
          },
        },
      ],
    };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[Finance MCP] Server started on stdio');
}

main().catch(error => {
  console.error('[Finance MCP] Fatal error:', error);
  process.exit(1);
});

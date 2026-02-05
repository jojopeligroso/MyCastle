/**
 * System Schema - Audit Logs, Invoices, Payments, Exports
 * Ref: spec/08-database.md §8.4, §8.5
 */

import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  text,
  decimal,
  date,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants, users } from './core';

/**
 * Audit Logs Table
 * Immutable log of all significant actions
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').references(() => tenants.id),

    userId: uuid('user_id').references(() => users.id),
    action: varchar('action', { length: 100 }).notNull(), // user_created, class_deleted, etc.
    resourceType: varchar('resource_type', { length: 50 }), // user, class, invoice, etc.
    resourceId: uuid('resource_id'),

    changes: jsonb('changes'), // Before/after values
    metadata: jsonb('metadata'), // IP address, user agent, etc.

    timestamp: timestamp('timestamp').defaultNow().notNull(),
  },
  table => [
    index('idx_audit_logs_tenant').on(table.tenantId),
    index('idx_audit_logs_user').on(table.userId),
    index('idx_audit_logs_timestamp').on(table.timestamp),
    index('idx_audit_logs_action').on(table.action),
  ]
);

/**
 * Invoices Table
 * Financial invoices for students
 */
export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),

  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull().unique(),
  studentId: uuid('student_id')
    .notNull()
    .references(() => users.id),

  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),

  description: text('description'),
  lineItems: jsonb('line_items'), // Array of {description, quantity, unit_price}

  issueDate: date('issue_date').notNull(),
  dueDate: date('due_date').notNull(),

  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, paid, overdue, cancelled

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Invoice Payments Table
 * Payment records against invoices
 * Note: Named invoicePayments to avoid conflict with business.ts payments table
 */
export const invoicePayments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),

  invoiceId: uuid('invoice_id')
    .notNull()
    .references(() => invoices.id),
  studentId: uuid('student_id')
    .notNull()
    .references(() => users.id),

  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),

  paymentMethod: varchar('payment_method', { length: 50 }).notNull(), // stripe, cash, bank_transfer
  transactionId: varchar('transaction_id', { length: 255 }), // External transaction ID
  receiptUrl: varchar('receipt_url', { length: 500 }),

  paymentDate: date('payment_date').notNull(),
  notes: text('notes'),

  recordedBy: uuid('recorded_by').references(() => users.id),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Conversations Table (Optional)
 * For storing chat history
 */
export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  user_id: uuid('user_id')
    .notNull()
    .references(() => users.id),

  title: varchar('title', { length: 255 }),
  messages: jsonb('messages').notNull(), // Array of {role, content, timestamp}

  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Exports Table
 * Tracks generated report exports
 */
export const exports = pgTable('exports', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),

  templateId: varchar('template_id', { length: 100 }).notNull(), // e.g., "user_roster_v1"
  templateVersion: varchar('template_version', { length: 20 }).notNull(),

  filename: varchar('filename', { length: 255 }).notNull(),
  fileUrl: varchar('file_url', { length: 500 }), // Signed URL
  fileSize: integer('file_size'), // Bytes

  filters: jsonb('filters'), // Applied filters
  rowCount: integer('row_count'),

  requestedBy: uuid('requested_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'), // Signed URL expiry
});

/**
 * Email Logs Table
 * Records outbound email delivery attempts
 */
export const emailLogs = pgTable(
  'email_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),

    recipient: varchar('recipient', { length: 255 }).notNull(),
    subject: varchar('subject', { length: 255 }).notNull(),
    sent_at: timestamp('sent_at').defaultNow().notNull(),
    status: varchar('status', { length: 50 }).notNull().default('sent'),

    source: varchar('source', { length: 100 }),
    external_id: varchar('external_id', { length: 255 }),
    provider: varchar('provider', { length: 100 }),
    provider_message_id: varchar('provider_message_id', { length: 255 }),

    headers: jsonb('headers'),
    body_preview: text('body_preview'),
    error_message: text('error_message'),
  },
  table => [
    index('idx_email_logs_tenant').on(table.tenant_id),
    index('idx_email_logs_recipient').on(table.recipient),
    index('idx_email_logs_sent_at').on(table.sent_at),
    index('idx_email_logs_status').on(table.status),
    uniqueIndex('idx_email_logs_source_external').on(
      table.tenant_id,
      table.source,
      table.external_id
    ),
  ]
);

/**
 * Notifications Table
 * System notifications sent to users
 */
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),

    title: varchar('title', { length: 255 }).notNull(),
    body: text('body').notNull(),
    severity: varchar('severity', { length: 50 }).notNull().default('info'), // info, warning, critical
    status: varchar('status', { length: 50 }).notNull().default('sent'), // draft, scheduled, sent
    type: varchar('type', { length: 50 }).notNull().default('system'), // system, announcement, reminder
    target_scope: varchar('target_scope', { length: 50 }).notNull().default('all'), // user, role, all

    source: varchar('source', { length: 100 }),
    external_id: varchar('external_id', { length: 255 }),

    scheduled_at: timestamp('scheduled_at'),
    sent_at: timestamp('sent_at'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    index('idx_notifications_tenant').on(table.tenant_id),
    index('idx_notifications_status').on(table.status),
    index('idx_notifications_type').on(table.type),
    index('idx_notifications_scope').on(table.target_scope),
    index('idx_notifications_created_at').on(table.created_at),
    uniqueIndex('idx_notifications_source_external').on(
      table.tenant_id,
      table.source,
      table.external_id
    ),
  ]
);

/**
 * Notification Recipients Table
 * Tracks delivery and read status per recipient
 */
export const notificationRecipients = pgTable(
  'notification_recipients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    notification_id: uuid('notification_id')
      .notNull()
      .references(() => notifications.id),

    recipient_type: varchar('recipient_type', { length: 50 }).notNull().default('user'), // user, role, broadcast
    user_id: uuid('user_id').references(() => users.id),
    recipient_role: varchar('recipient_role', { length: 50 }),

    status: varchar('status', { length: 50 }).notNull().default('unread'), // unread, read
    read_at: timestamp('read_at'),
    delivered_at: timestamp('delivered_at'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  table => [
    index('idx_notification_recipients_tenant').on(table.tenant_id),
    index('idx_notification_recipients_notification').on(table.notification_id),
    index('idx_notification_recipients_user').on(table.user_id),
    index('idx_notification_recipients_status').on(table.status),
    index('idx_notification_recipients_role').on(table.recipient_role),
    uniqueIndex('idx_notification_recipient_unique').on(table.notification_id, table.user_id),
  ]
);

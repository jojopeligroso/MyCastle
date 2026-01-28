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
    tenant_id: uuid('tenant_id').references(() => tenants.id),

    user_id: uuid('user_id').references(() => users.id),
    action: varchar('action', { length: 100 }).notNull(), // user_created, class_deleted, etc.
    resource_type: varchar('resource_type', { length: 50 }), // user, class, invoice, etc.
    resource_id: uuid('resource_id'),

    changes: jsonb('changes'), // Before/after values
    metadata: jsonb('metadata'), // IP address, user agent, etc.

    timestamp: timestamp('timestamp').defaultNow().notNull(),
  },
  table => [
    index('idx_audit_logs_tenant').on(table.tenant_id),
    index('idx_audit_logs_user').on(table.user_id),
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
  tenant_id: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),

  invoice_number: varchar('invoice_number', { length: 50 }).notNull().unique(),
  student_id: uuid('student_id')
    .notNull()
    .references(() => users.id),

  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),

  description: text('description'),
  line_items: jsonb('line_items'), // Array of {description, quantity, unit_price}

  issue_date: date('issue_date').notNull(),
  due_date: date('due_date').notNull(),

  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, paid, overdue, cancelled

  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Payments Table
 * Payment records against invoices
 */
export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),

  invoice_id: uuid('invoice_id')
    .notNull()
    .references(() => invoices.id),
  student_id: uuid('student_id')
    .notNull()
    .references(() => users.id),

  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),

  payment_method: varchar('payment_method', { length: 50 }).notNull(), // stripe, cash, bank_transfer
  transaction_id: varchar('transaction_id', { length: 255 }), // External transaction ID
  receipt_url: varchar('receipt_url', { length: 500 }),

  payment_date: date('payment_date').notNull(),
  notes: text('notes'),

  recorded_by: uuid('recorded_by').references(() => users.id),

  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
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
  tenant_id: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),

  template_id: varchar('template_id', { length: 100 }).notNull(), // e.g., "user_roster_v1"
  template_version: varchar('template_version', { length: 20 }).notNull(),

  filename: varchar('filename', { length: 255 }).notNull(),
  file_url: varchar('file_url', { length: 500 }), // Signed URL
  file_size: integer('file_size'), // Bytes

  filters: jsonb('filters'), // Applied filters
  row_count: integer('row_count'),

  requested_by: uuid('requested_by')
    .notNull()
    .references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  expires_at: timestamp('expires_at'), // Signed URL expiry
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

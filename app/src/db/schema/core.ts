/**
 * Core Schema - Tenants and Users
 * Ref: spec/08-database.md §8.3.1, §8.3.2
 */

import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/**
 * Tenants Table
 * Represents a school or organization using the platform
 */
export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    subdomain: varchar('subdomain', { length: 63 }).notNull().unique(),
    contact_email: varchar('contact_email', { length: 255 }).notNull(),
    status: varchar('status', { length: 50 }).notNull().default('active'), // active, suspended, archived
    settings: jsonb('settings').default({}), // Tenant-specific config
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    index('idx_tenants_subdomain').on(table.subdomain),
    index('idx_tenants_status').on(table.status),
  ],
);

/**
 * Users Table
 * All user accounts (admins, teachers, students)
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),

    // Auth fields (synced with Supabase Auth)
    auth_id: uuid('auth_id').unique(), // Supabase Auth user ID
    email: varchar('email', { length: 255 }).notNull(),
    email_verified: boolean('email_verified').default(false),

    // Profile
    name: varchar('name', { length: 255 }).notNull(),
    role: varchar('role', { length: 50 }).notNull(), // admin, teacher, student
    avatar_url: varchar('avatar_url', { length: 500 }),
    phone: varchar('phone', { length: 50 }),

    // Status
    status: varchar('status', { length: 50 }).notNull().default('active'), // active, suspended, archived
    last_login: timestamp('last_login'),

    // Metadata
    metadata: jsonb('metadata').default({}), // Custom fields per role
    preferences: jsonb('preferences').default({}), // User preferences

    // Timestamps
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    deleted_at: timestamp('deleted_at'), // Soft delete
  },
  table => [
    // Unique email per tenant (excluding soft-deleted users)
    uniqueIndex('idx_users_tenant_email').on(table.tenant_id, table.email),
    index('idx_users_tenant_role').on(table.tenant_id, table.role),
    index('idx_users_auth_id').on(table.auth_id),
    index('idx_users_status').on(table.status),
  ],
);

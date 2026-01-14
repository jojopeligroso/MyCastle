/**
 * Core Schema: Tenants, Users, User Roles, Students
 * Aligned with FRESH_0001 database schema
 * Date: 2026-01-13
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
  date,
} from 'drizzle-orm/pg-core';

/**
 * Tenants Table
 * Multi-tenancy support for school branches
 */
export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    subdomain: varchar('subdomain', { length: 63 }).unique(),
    contactEmail: varchar('contact_email', { length: 255 }),
    status: varchar('status', { length: 50 }).notNull().default('active'),
    settings: jsonb('settings').default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    index('idx_tenants_subdomain').on(table.subdomain),
    index('idx_tenants_status').on(table.status),
  ],
);

/**
 * Users Table
 * Base table for all people (students, teachers, admins)
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    authId: uuid('auth_id').unique(),
    email: varchar('email', { length: 255 }).notNull(),
    emailVerified: boolean('email_verified').default(false),
    name: varchar('name', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 50 }),
    dateOfBirth: date('date_of_birth'),
    nationality: varchar('nationality', { length: 100 }),
    avatarUrl: varchar('avatar_url', { length: 500 }),
    primaryRole: varchar('primary_role', { length: 50 }).notNull().default('student'),
    status: varchar('status', { length: 50 }).notNull().default('active'),
    lastLogin: timestamp('last_login'),
    metadata: jsonb('metadata').default({}),
    preferences: jsonb('preferences').default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  table => [
    uniqueIndex('idx_users_tenant_email').on(table.tenantId, table.email),
    index('idx_users_tenant_id').on(table.tenantId),
    index('idx_users_auth_id').on(table.authId),
    index('idx_users_primary_role').on(table.primaryRole),
    index('idx_users_status').on(table.status),
  ],
);

/**
 * User Roles Table
 * Multi-role support - one user can have multiple roles
 */
export const userRoles = pgTable(
  'user_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 50 }).notNull(),
    grantedAt: timestamp('granted_at').defaultNow().notNull(),
    grantedBy: uuid('granted_by').references(() => users.id),
    revokedAt: timestamp('revoked_at'),
    revokedBy: uuid('revoked_by').references(() => users.id),
  },
  table => [
    uniqueIndex('idx_user_roles_active').on(table.userId, table.tenantId, table.role),
    index('idx_user_roles_user').on(table.userId),
    index('idx_user_roles_tenant').on(table.tenantId),
  ],
);

/**
 * Students Table
 * Student-specific data extending users table
 */
export const students = pgTable(
  'students',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    studentNumber: varchar('student_number', { length: 50 }),
    isVisaStudent: boolean('is_visa_student').default(false),
    visaType: varchar('visa_type', { length: 50 }),
    visaExpiryDate: date('visa_expiry_date'),
    emergencyContactName: varchar('emergency_contact_name', { length: 255 }),
    emergencyContactPhone: varchar('emergency_contact_phone', { length: 50 }),
    emergencyContactRelationship: varchar('emergency_contact_relationship', { length: 100 }),
    medicalConditions: varchar('medical_conditions'),
    dietaryRequirements: varchar('dietary_requirements'),
    status: varchar('status', { length: 50 }).notNull().default('active'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    uniqueIndex('idx_students_tenant_number').on(table.tenantId, table.studentNumber),
    index('idx_students_user').on(table.userId),
    index('idx_students_tenant').on(table.tenantId),
    index('idx_students_visa').on(table.tenantId, table.isVisaStudent),
    index('idx_students_visa_expiry').on(table.visaExpiryDate),
  ],
);

// Type exports
export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type UserRole = typeof userRoles.$inferSelect;
export type NewUserRole = typeof userRoles.$inferInsert;

export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;

// Combined type: User with their roles and student data (if applicable)
export type UserWithRoles = User & {
  roles: UserRole[];
  student?: Student;
};

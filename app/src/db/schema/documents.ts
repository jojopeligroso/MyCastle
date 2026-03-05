/**
 * Documents Schema - Student Documents & Complete History System
 * Implements document management, emergency contacts, notifications, and letter templates.
 *
 * Ref: FRESH_0033_student_documents_system.sql
 * Date: 2026-03-05
 */

import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  text,
  boolean,
  integer,
  date,
  jsonb,
  index,
  uniqueIndex,
  check,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { tenants, users } from './core';

// ============================================================================
// ENUMS
// ============================================================================

export const documentCategoryEnum = pgEnum('document_category', [
  'identity',
  'visa',
  'medical',
  'academic',
  'correspondence',
  'other',
]);

export const documentVisibilityEnum = pgEnum('document_visibility', [
  'admin_only',
  'staff_only',
  'student_can_view',
]);

export const approvalStatusEnum = pgEnum('approval_status', [
  'pending',
  'approved',
  'rejected',
]);

export const notificationEventTypeEnum = pgEnum('notification_event_type', [
  'document_expiry',
  'assessment_overdue',
  'course_end',
  'attendance_low',
  'custom',
]);

export const notificationEntityTypeEnum = pgEnum('notification_entity_type', [
  'student_document',
  'assessment',
  'enrollment',
  'attendance',
  'custom',
]);

export const notificationTypeEnum = pgEnum('notification_type', [
  'email',
  'in_app',
  'both',
]);

export const letterCategoryEnum = pgEnum('letter_category', [
  'correspondence',
  'certificate',
  'official',
  'other',
]);

export const outputFormatEnum = pgEnum('output_format', [
  'pdf',
  'docx',
  'both',
]);

// ============================================================================
// DOCUMENT TYPES
// ============================================================================

/**
 * Document Types Table
 * Customizable document type definitions per tenant
 */
export const documentTypes = pgTable(
  'document_types',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    // Type definition
    name: text('name').notNull(),
    category: varchar('category', { length: 50 }).notNull(),
    description: text('description'),

    // Upload permissions
    adminCanUpload: boolean('admin_can_upload').default(true).notNull(),
    studentCanUpload: boolean('student_can_upload').default(false).notNull(),
    requiresApproval: boolean('requires_approval').default(false).notNull(),

    // View permissions
    defaultVisibility: varchar('default_visibility', { length: 50 })
      .default('admin_only')
      .notNull(),

    // Expiry tracking
    requiresExpiry: boolean('requires_expiry').default(false).notNull(),
    expiryAlertDays: integer('expiry_alert_days').array().default([60, 30]),

    // Display & status
    isRequired: boolean('is_required').default(false).notNull(),
    displayOrder: integer('display_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    uniqueIndex('uk_document_types_tenant_name').on(table.tenantId, table.name),
    index('idx_document_types_tenant').on(table.tenantId),
    index('idx_document_types_category').on(table.category),
    index('idx_document_types_active').on(table.isActive),
  ]
);

// ============================================================================
// STUDENT DOCUMENTS
// ============================================================================

/**
 * Student Documents Table
 * Document storage with soft delete versioning and approval workflow
 */
export const studentDocuments = pgTable(
  'student_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    documentTypeId: uuid('document_type_id').references(() => documentTypes.id, {
      onDelete: 'set null',
    }),

    // File information
    fileName: text('file_name').notNull(),
    fileUrl: text('file_url').notNull(),
    fileSize: integer('file_size'),
    mimeType: varchar('mime_type', { length: 100 }),

    // Metadata
    documentDate: date('document_date'),
    expiryDate: date('expiry_date'),
    notes: text('notes'),

    // Visibility & sharing
    isSharedWithStudent: boolean('is_shared_with_student').default(false).notNull(),
    sharedBy: uuid('shared_by').references(() => users.id),
    sharedAt: timestamp('shared_at'),

    // Version control (soft delete)
    isCurrent: boolean('is_current').default(true).notNull(),
    supersededBy: uuid('superseded_by').references(() => studentDocuments.id),
    supersededAt: timestamp('superseded_at'),

    // Approval workflow
    approvalStatus: varchar('approval_status', { length: 50 })
      .default('approved')
      .notNull(),
    reviewedBy: uuid('reviewed_by').references(() => users.id),
    reviewedAt: timestamp('reviewed_at'),
    rejectionReason: text('rejection_reason'),

    // Audit
    uploadedBy: uuid('uploaded_by')
      .notNull()
      .references(() => users.id),
    uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => [
    index('idx_student_documents_student').on(table.studentId),
    index('idx_student_documents_type').on(table.documentTypeId),
    index('idx_student_documents_tenant').on(table.tenantId),
    index('idx_student_documents_current').on(table.isCurrent),
    index('idx_student_documents_pending').on(table.approvalStatus),
    index('idx_student_documents_expiry').on(table.expiryDate),
    index('idx_student_documents_uploaded_at').on(table.uploadedAt),
  ]
);

// Self-reference for superseded_by
export const studentDocumentsRelations = {
  supersededBy: studentDocuments,
};

// ============================================================================
// EMERGENCY CONTACTS
// ============================================================================

/**
 * Emergency Contacts Table
 * Multiple emergency contacts per student with priority ordering
 */
export const emergencyContacts = pgTable(
  'emergency_contacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Contact details
    name: text('name').notNull(),
    relationship: varchar('relationship', { length: 100 }).notNull(),
    phone: varchar('phone', { length: 50 }).notNull(),
    email: varchar('email', { length: 255 }),
    address: text('address'),

    // Priority
    priority: integer('priority').default(1).notNull(),
    isPrimary: boolean('is_primary').default(false).notNull(),

    // Additional
    notes: text('notes'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    uniqueIndex('uk_emergency_contacts_student_priority').on(
      table.studentId,
      table.priority
    ),
    index('idx_emergency_contacts_student').on(table.studentId),
    index('idx_emergency_contacts_tenant').on(table.tenantId),
    index('idx_emergency_contacts_primary').on(table.isPrimary),
  ]
);

// ============================================================================
// NOTIFICATION RULES
// ============================================================================

/**
 * Notification Rules Table
 * Configurable notification/reminder system per document type and event type
 */
export const notificationRules = pgTable(
  'notification_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    // Rule definition
    name: text('name').notNull(),
    description: text('description'),

    // Trigger condition
    eventType: varchar('event_type', { length: 50 }).notNull(),
    entityType: varchar('entity_type', { length: 50 }),
    documentTypeId: uuid('document_type_id').references(() => documentTypes.id, {
      onDelete: 'set null',
    }),

    // Timing
    triggerDaysBefore: integer('trigger_days_before'),

    // Recipients
    recipientRoles: jsonb('recipient_roles')
      .$type<string[]>()
      .default([])
      .notNull(),
    includeEmergencyContact: boolean('include_emergency_contact')
      .default(false)
      .notNull(),

    // Message template
    notificationType: varchar('notification_type', { length: 50 })
      .default('email')
      .notNull(),
    emailSubject: text('email_subject'),
    emailBody: text('email_body'),

    // Status
    isActive: boolean('is_active').default(true).notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    uniqueIndex('uk_notification_rules_tenant_name').on(table.tenantId, table.name),
    index('idx_notification_rules_tenant').on(table.tenantId),
    index('idx_notification_rules_event_type').on(table.eventType),
    index('idx_notification_rules_active').on(table.isActive),
    index('idx_notification_rules_document_type').on(table.documentTypeId),
  ]
);

// ============================================================================
// LETTER TEMPLATES
// ============================================================================

/**
 * Letter Templates Table
 * Mail merge templates with placeholders for auto-filling student data
 */
export const letterTemplates = pgTable(
  'letter_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    // Template definition
    name: text('name').notNull(),
    category: varchar('category', { length: 50 }),
    description: text('description'),

    // Template content
    content: text('content').notNull(),
    availablePlaceholders: jsonb('available_placeholders')
      .$type<string[]>()
      .default([])
      .notNull(),

    // Output format
    outputFormat: varchar('output_format', { length: 50 }).default('pdf').notNull(),

    // Status
    isActive: boolean('is_active').default(true).notNull(),
    displayOrder: integer('display_order').default(0).notNull(),

    // Audit
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    uniqueIndex('uk_letter_templates_tenant_name').on(table.tenantId, table.name),
    index('idx_letter_templates_tenant').on(table.tenantId),
    index('idx_letter_templates_category').on(table.category),
    index('idx_letter_templates_active').on(table.isActive),
  ]
);

// ============================================================================
// GENERATED LETTERS
// ============================================================================

/**
 * Generated Letters Table
 * Tracking of generated letters from templates (saved PDFs/DOCXs)
 */
export const generatedLetters = pgTable(
  'generated_letters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    templateId: uuid('template_id').references(() => letterTemplates.id, {
      onDelete: 'set null',
    }),

    // Generated output
    fileUrl: text('file_url').notNull(),
    generatedContent: text('generated_content'),

    // Metadata
    generatedBy: uuid('generated_by')
      .notNull()
      .references(() => users.id),
    generatedAt: timestamp('generated_at').defaultNow().notNull(),
  },
  table => [
    index('idx_generated_letters_student').on(table.studentId),
    index('idx_generated_letters_template').on(table.templateId),
    index('idx_generated_letters_tenant').on(table.tenantId),
    index('idx_generated_letters_generated_at').on(table.generatedAt),
  ]
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type DocumentType = typeof documentTypes.$inferSelect;
export type NewDocumentType = typeof documentTypes.$inferInsert;

export type StudentDocument = typeof studentDocuments.$inferSelect;
export type NewStudentDocument = typeof studentDocuments.$inferInsert;

export type EmergencyContact = typeof emergencyContacts.$inferSelect;
export type NewEmergencyContact = typeof emergencyContacts.$inferInsert;

export type NotificationRule = typeof notificationRules.$inferSelect;
export type NewNotificationRule = typeof notificationRules.$inferInsert;

export type LetterTemplate = typeof letterTemplates.$inferSelect;
export type NewLetterTemplate = typeof letterTemplates.$inferInsert;

export type GeneratedLetter = typeof generatedLetters.$inferSelect;
export type NewGeneratedLetter = typeof generatedLetters.$inferInsert;

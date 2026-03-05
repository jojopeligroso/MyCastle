/**
 * Notification Rules Settings API
 * GET/POST /api/admin/settings/notification-rules
 *
 * Manage automated notification rules for document expiry, assessments, etc.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { notificationRules, documentTypes } from '@/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { requireAuth, getTenantId, getUserId } from '@/lib/auth/utils';
import { z } from 'zod';

// ============================================================================
// Validation Schemas
// ============================================================================

const createNotificationRuleSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional(),
  eventType: z.enum([
    'document_expiry',
    'document_pending_approval',
    'assessment_due',
    'course_end',
    'attendance_threshold',
    'visa_expiry',
    'custom',
  ]),
  documentTypeId: z.string().uuid().optional(), // Required for document_expiry events
  triggerDaysBefore: z.number().int().min(0).max(365).optional(), // Days before event
  recipientRoles: z
    .array(z.enum(['admin', 'dos', 'teacher', 'student']))
    .min(1, 'At least one recipient role required'),
  notificationType: z.enum(['email', 'sms', 'in_app']).default('email'),
  emailSubject: z.string().min(1).max(500).optional(),
  emailBody: z.string().min(1).optional(), // Supports {{placeholders}}
  isActive: z.boolean().optional().default(true),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
});

// ============================================================================
// GET - List all notification rules
// ============================================================================

export async function GET(_request: NextRequest) {
  try {
    await requireAuth(['admin', 'dos']);
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
    }

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Get all notification rules for tenant
    const rules = await db
      .select({
        id: notificationRules.id,
        name: notificationRules.name,
        description: notificationRules.description,
        eventType: notificationRules.eventType,
        documentTypeId: notificationRules.documentTypeId,
        documentTypeName: documentTypes.name,
        triggerDaysBefore: notificationRules.triggerDaysBefore,
        recipientRoles: notificationRules.recipientRoles,
        notificationType: notificationRules.notificationType,
        emailSubject: notificationRules.emailSubject,
        emailBody: notificationRules.emailBody,
        isActive: notificationRules.isActive,
        priority: notificationRules.priority,
        createdAt: notificationRules.createdAt,
        updatedAt: notificationRules.updatedAt,
      })
      .from(notificationRules)
      .leftJoin(documentTypes, eq(notificationRules.documentTypeId, documentTypes.id))
      .where(eq(notificationRules.tenantId, tenantId))
      .orderBy(desc(notificationRules.createdAt));

    // Group rules by event type
    const groupedByEventType = rules.reduce(
      (acc, rule) => {
        const eventType = rule.eventType;
        if (!acc[eventType]) {
          acc[eventType] = [];
        }
        acc[eventType].push(rule);
        return acc;
      },
      {} as Record<string, typeof rules>
    );

    return NextResponse.json({
      rules,
      groupedByEventType,
      stats: {
        total: rules.length,
        active: rules.filter(r => r.isActive).length,
        byType: rules.reduce(
          (acc, r) => {
            acc[r.eventType] = (acc[r.eventType] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
        byPriority: rules.reduce(
          (acc, r) => {
            acc[r.priority] = (acc[r.priority] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
      },
    });
  } catch (error) {
    console.error('Error fetching notification rules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification rules' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Create new notification rule
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    await requireAuth(['admin', 'dos']);
    const tenantId = await getTenantId();
    const userId = await getUserId();

    if (!tenantId || !userId) {
      return NextResponse.json({ error: 'No auth context' }, { status: 403 });
    }

    const body = await request.json();

    // Validate input
    const validationResult = createNotificationRuleSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Validate document type if specified
    if (data.documentTypeId) {
      const docType = await db.query.documentTypes.findFirst({
        where: (dt, { and, eq }) =>
          and(eq(dt.id, data.documentTypeId!), eq(dt.tenantId, tenantId)),
      });

      if (!docType) {
        return NextResponse.json(
          { error: 'Document type not found' },
          { status: 404 }
        );
      }

      // Validate event type matches document type requirement
      if (
        data.eventType === 'document_expiry' &&
        !docType.requiresExpiry
      ) {
        return NextResponse.json(
          {
            error: 'Cannot create expiry notification for document type without expiry requirement',
            documentType: docType.name,
          },
          { status: 400 }
        );
      }
    }

    // Validate email fields if notification type is email
    if (data.notificationType === 'email') {
      if (!data.emailSubject || !data.emailBody) {
        return NextResponse.json(
          {
            error: 'Email notifications require emailSubject and emailBody',
          },
          { status: 400 }
        );
      }
    }

    // Create notification rule
    const [rule] = await db
      .insert(notificationRules)
      .values({
        tenantId,
        name: data.name,
        description: data.description || null,
        eventType: data.eventType,
        documentTypeId: data.documentTypeId || null,
        triggerDaysBefore: data.triggerDaysBefore || null,
        recipientRoles: data.recipientRoles,
        notificationType: data.notificationType,
        emailSubject: data.emailSubject || null,
        emailBody: data.emailBody || null,
        isActive: data.isActive ?? true,
        priority: data.priority,
      })
      .returning();

    // TODO: Create audit log entry

    return NextResponse.json(
      {
        rule,
        message: 'Notification rule created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating notification rule:', error);
    return NextResponse.json(
      { error: 'Failed to create notification rule' },
      { status: 500 }
    );
  }
}

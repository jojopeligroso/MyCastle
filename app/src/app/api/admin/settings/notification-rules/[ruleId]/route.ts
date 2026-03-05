/**
 * Individual Notification Rule API
 * GET/PATCH/DELETE /api/admin/settings/notification-rules/[ruleId]
 *
 * Operations on a specific notification rule
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { notificationRules, documentTypes } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth, getTenantId, getUserId } from '@/lib/auth/utils';
import { z } from 'zod';

// ============================================================================
// Validation Schemas
// ============================================================================

const updateNotificationRuleSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  eventType: z
    .enum([
      'document_expiry',
      'document_pending_approval',
      'assessment_due',
      'course_end',
      'attendance_threshold',
      'visa_expiry',
      'custom',
    ])
    .optional(),
  documentTypeId: z.string().uuid().optional().nullable(),
  triggerDaysBefore: z.number().int().min(0).max(365).optional().nullable(),
  recipientRoles: z.array(z.enum(['admin', 'dos', 'teacher', 'student'])).optional(),
  notificationType: z.enum(['email', 'sms', 'in_app']).optional(),
  emailSubject: z.string().min(1).max(500).optional(),
  emailBody: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
});

// ============================================================================
// GET - Get specific notification rule
// ============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  try {
    await requireAuth(['admin', 'dos']);
    const tenantId = await getTenantId();
    const { ruleId } = await params;

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
    }

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Get notification rule
    const rule = await db
      .select({
        id: notificationRules.id,
        name: notificationRules.name,
        description: notificationRules.description,
        eventType: notificationRules.eventType,
        documentTypeId: notificationRules.documentTypeId,
        documentTypeName: documentTypes.name,
        documentTypeCategory: documentTypes.category,
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
      .where(
        and(eq(notificationRules.id, ruleId), eq(notificationRules.tenantId, tenantId))
      )
      .limit(1);

    if (!rule || rule.length === 0) {
      return NextResponse.json(
        { error: 'Notification rule not found' },
        { status: 404 }
      );
    }

    // TODO: Get notification history for this rule (when notifications_sent table exists)

    return NextResponse.json({
      rule: rule[0],
      // stats: {
      //   notificationsSent: 0,
      //   lastSent: null,
      // },
    });
  } catch (error) {
    console.error('Error fetching notification rule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification rule' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH - Update notification rule
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  try {
    await requireAuth(['admin', 'dos']);
    const tenantId = await getTenantId();
    const userId = await getUserId();
    const { ruleId } = await params;

    if (!tenantId || !userId) {
      return NextResponse.json({ error: 'No auth context' }, { status: 403 });
    }

    const body = await request.json();

    // Validate input
    const validationResult = updateNotificationRuleSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Verify rule exists
    const existing = await db.query.notificationRules.findFirst({
      where: (rules, { and, eq }) =>
        and(eq(rules.id, ruleId), eq(rules.tenantId, tenantId)),
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Notification rule not found' },
        { status: 404 }
      );
    }

    // Validate document type if being updated
    if (data.documentTypeId !== undefined && data.documentTypeId) {
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
    }

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined)
      updateData.description = data.description || null;
    if (data.eventType !== undefined) updateData.eventType = data.eventType;
    if (data.documentTypeId !== undefined)
      updateData.documentTypeId = data.documentTypeId;
    if (data.triggerDaysBefore !== undefined)
      updateData.triggerDaysBefore = data.triggerDaysBefore;
    if (data.recipientRoles !== undefined)
      updateData.recipientRoles = data.recipientRoles;
    if (data.notificationType !== undefined)
      updateData.notificationType = data.notificationType;
    if (data.emailSubject !== undefined)
      updateData.emailSubject = data.emailSubject || null;
    if (data.emailBody !== undefined)
      updateData.emailBody = data.emailBody || null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.priority !== undefined) updateData.priority = data.priority;

    // Update rule
    const [updated] = await db
      .update(notificationRules)
      .set(updateData)
      .where(
        and(
          eq(notificationRules.id, ruleId),
          eq(notificationRules.tenantId, tenantId)
        )
      )
      .returning();

    // TODO: Create audit log entry

    return NextResponse.json({
      rule: updated,
      message: 'Notification rule updated successfully',
    });
  } catch (error) {
    console.error('Error updating notification rule:', error);
    return NextResponse.json(
      { error: 'Failed to update notification rule' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Delete notification rule
// ============================================================================

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  try {
    await requireAuth(['admin', 'dos']);
    const tenantId = await getTenantId();
    const { ruleId } = await params;

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
    }

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Verify rule exists
    const existing = await db.query.notificationRules.findFirst({
      where: (rules, { and, eq }) =>
        and(eq(rules.id, ruleId), eq(rules.tenantId, tenantId)),
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Notification rule not found' },
        { status: 404 }
      );
    }

    // Hard delete notification rule
    await db
      .delete(notificationRules)
      .where(
        and(
          eq(notificationRules.id, ruleId),
          eq(notificationRules.tenantId, tenantId)
        )
      );

    // TODO: Create audit log entry
    // TODO: Cancel any scheduled notifications for this rule

    return NextResponse.json({
      message: 'Notification rule deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting notification rule:', error);
    return NextResponse.json(
      { error: 'Failed to delete notification rule' },
      { status: 500 }
    );
  }
}

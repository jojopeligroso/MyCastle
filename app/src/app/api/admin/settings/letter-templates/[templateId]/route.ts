/**
 * Individual Letter Template API
 * GET/PATCH/DELETE /api/admin/settings/letter-templates/[templateId]
 *
 * Operations on a specific letter template
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { letterTemplates } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth, getTenantId, getUserId } from '@/lib/auth/utils';
import { z } from 'zod';

// ============================================================================
// Validation Schemas
// ============================================================================

const updateLetterTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  content: z.string().min(10).optional(),
  category: z.enum(['enrollment', 'completion', 'attendance', 'visa', 'general']).optional(),
  outputFormat: z.enum(['pdf', 'docx', 'html']).optional(),
  customPlaceholders: z
    .array(
      z.object({
        key: z.string(),
        description: z.string(),
      })
    )
    .optional(),
  isActive: z.boolean().optional(),
});

// ============================================================================
// GET - Get specific letter template
// ============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    await requireAuth(['admin', 'dos']);
    const tenantId = await getTenantId();
    const { templateId } = await params;

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
    }

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Get letter template
    const template = await db.query.letterTemplates.findFirst({
      where: (templates, { and, eq }) =>
        and(eq(templates.id, templateId), eq(templates.tenantId, tenantId)),
    });

    if (!template) {
      return NextResponse.json({ error: 'Letter template not found' }, { status: 404 });
    }

    // Get usage count (how many letters have been generated with this template)
    const usageCount = await db.query.generatedLetters.findMany({
      where: (letters, { and, eq }) =>
        and(eq(letters.templateId, templateId), eq(letters.tenantId, tenantId)),
    });

    return NextResponse.json({
      template,
      stats: {
        usageCount: usageCount.length,
      },
    });
  } catch (error) {
    console.error('Error fetching letter template:', error);
    return NextResponse.json({ error: 'Failed to fetch letter template' }, { status: 500 });
  }
}

// ============================================================================
// PATCH - Update letter template
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    await requireAuth(['admin', 'dos']);
    const tenantId = await getTenantId();
    const userId = await getUserId();
    const { templateId } = await params;

    if (!tenantId || !userId) {
      return NextResponse.json({ error: 'No auth context' }, { status: 403 });
    }

    const body = await request.json();

    // Validate input
    const validationResult = updateLetterTemplateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Verify template exists
    const existing = await db.query.letterTemplates.findFirst({
      where: (templates, { and, eq }) =>
        and(eq(templates.id, templateId), eq(templates.tenantId, tenantId)),
    });

    if (!existing) {
      return NextResponse.json({ error: 'Letter template not found' }, { status: 404 });
    }

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.outputFormat !== undefined) updateData.outputFormat = data.outputFormat;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    // If custom placeholders are being updated, merge with common ones
    if (data.customPlaceholders !== undefined) {
      const commonPlaceholders = existing.availablePlaceholders.filter((p: any) =>
        [
          '{{student_name}}',
          '{{student_first_name}}',
          '{{class_name}}',
          '{{school_name}}',
          '{{current_date}}',
        ].includes(p.key)
      );

      updateData.availablePlaceholders = [...commonPlaceholders, ...data.customPlaceholders];
    }

    // Validate content placeholders if content is being updated
    if (data.content !== undefined) {
      const contentPlaceholders = data.content.match(/\{\{[^}]+\}\}/g) || [];
      const definedKeys = (updateData.availablePlaceholders || existing.availablePlaceholders).map(
        (p: any) => p.key
      );

      const undefinedPlaceholders = contentPlaceholders.filter(p => !definedKeys.includes(p));

      if (undefinedPlaceholders.length > 0) {
        return NextResponse.json(
          {
            error: 'Content contains undefined placeholders',
            undefinedPlaceholders,
            availablePlaceholders: definedKeys,
          },
          { status: 400 }
        );
      }
    }

    // Update template
    const [updated] = await db
      .update(letterTemplates)
      .set(updateData)
      .where(and(eq(letterTemplates.id, templateId), eq(letterTemplates.tenantId, tenantId)))
      .returning();

    // TODO: Create audit log entry

    return NextResponse.json({
      template: updated,
      message: 'Letter template updated successfully',
    });
  } catch (error) {
    console.error('Error updating letter template:', error);
    return NextResponse.json({ error: 'Failed to update letter template' }, { status: 500 });
  }
}

// ============================================================================
// DELETE - Delete letter template
// ============================================================================

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    await requireAuth(['admin', 'dos']);
    const tenantId = await getTenantId();
    const { templateId } = await params;

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
    }

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Verify template exists
    const existing = await db.query.letterTemplates.findFirst({
      where: (templates, { and, eq }) =>
        and(eq(templates.id, templateId), eq(templates.tenantId, tenantId)),
    });

    if (!existing) {
      return NextResponse.json({ error: 'Letter template not found' }, { status: 404 });
    }

    // Check if template has been used
    const usageCount = await db.query.generatedLetters.findMany({
      where: (letters, { and, eq }) =>
        and(eq(letters.templateId, templateId), eq(letters.tenantId, tenantId)),
    });

    if (usageCount.length > 0) {
      // Soft delete: mark as inactive instead of deleting
      await db
        .update(letterTemplates)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(and(eq(letterTemplates.id, templateId), eq(letterTemplates.tenantId, tenantId)));

      return NextResponse.json({
        message: 'Letter template deactivated (has been used)',
        isActive: false,
        usageCount: usageCount.length,
      });
    }

    // Hard delete if never used
    await db
      .delete(letterTemplates)
      .where(and(eq(letterTemplates.id, templateId), eq(letterTemplates.tenantId, tenantId)));

    // TODO: Create audit log entry

    return NextResponse.json({
      message: 'Letter template deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting letter template:', error);
    return NextResponse.json({ error: 'Failed to delete letter template' }, { status: 500 });
  }
}

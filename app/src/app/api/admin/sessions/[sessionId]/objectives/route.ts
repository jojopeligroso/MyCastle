/**
 * Session Learning Objectives API
 * GET/PUT /api/admin/sessions/[sessionId]/objectives
 *
 * Manages learning objectives for class sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sessionLearningObjectives, coursebookDescriptors, coursebooks } from '@/db/schema/profile';
import { cefrDescriptors } from '@/db/schema/curriculum';
import { classSessions } from '@/db/schema/academic';
import { eq, and, sql, asc } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { z } from 'zod';

// ============================================================================
// Validation Schemas
// ============================================================================

const objectiveSchema = z.object({
  source: z.enum(['cefr', 'coursebook', 'custom']),
  objectiveType: z.enum(['primary', 'secondary']),
  descriptorId: z.string().uuid().optional(),
  coursebookDescriptorId: z.string().uuid().optional(),
  customDescriptorText: z.string().optional(),
  sortOrder: z.number().int().min(0),
});

const putSchema = z.object({
  objectives: z.array(objectiveSchema),
});

// ============================================================================
// GET - Fetch session learning objectives
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    await requireAuth(['admin', 'teacher', 'dos']);
    const tenantId = await getTenantId();
    const { sessionId } = await params;

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
    }

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Verify session belongs to tenant
    const session = await db
      .select({ id: classSessions.id })
      .from(classSessions)
      .where(and(eq(classSessions.id, sessionId), eq(classSessions.tenantId, tenantId)))
      .limit(1);

    if (session.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Fetch objectives with descriptor details
    const objectives = await db
      .select({
        id: sessionLearningObjectives.id,
        sessionId: sessionLearningObjectives.sessionId,
        descriptorId: sessionLearningObjectives.descriptorId,
        coursebookDescriptorId: sessionLearningObjectives.coursebookDescriptorId,
        objectiveType: sessionLearningObjectives.objectiveType,
        source: sessionLearningObjectives.source,
        customDescriptorText: sessionLearningObjectives.customDescriptorText,
        sortOrder: sessionLearningObjectives.sortOrder,
        // CEFR descriptor fields
        cefrLevel: cefrDescriptors.level,
        cefrText: cefrDescriptors.descriptorText,
        cefrSkill: cefrDescriptors.skillFocus,
        cefrScale: cefrDescriptors.scale,
        // Coursebook descriptor fields
        coursebookText: coursebookDescriptors.descriptorText,
        coursebookLevel: coursebookDescriptors.level,
        coursebookSkill: coursebookDescriptors.skillFocus,
        coursebookPage: coursebookDescriptors.page,
        coursebookUnit: coursebookDescriptors.unit,
        // Coursebook name from joined table
        coursebookName: coursebooks.name,
      })
      .from(sessionLearningObjectives)
      .leftJoin(cefrDescriptors, eq(sessionLearningObjectives.descriptorId, cefrDescriptors.id))
      .leftJoin(
        coursebookDescriptors,
        eq(sessionLearningObjectives.coursebookDescriptorId, coursebookDescriptors.id)
      )
      .leftJoin(coursebooks, eq(coursebookDescriptors.coursebookId, coursebooks.id))
      .where(eq(sessionLearningObjectives.sessionId, sessionId))
      .orderBy(asc(sessionLearningObjectives.sortOrder));

    // Transform to client-friendly format
    const formattedObjectives = objectives.map(obj => {
      let displayText = '';
      let level = '';
      let skillFocus = '';
      let pageRef = '';

      if (obj.source === 'cefr' && obj.cefrText) {
        displayText = obj.cefrText;
        level = obj.cefrLevel || '';
        skillFocus = obj.cefrSkill || '';
      } else if (obj.source === 'coursebook' && obj.coursebookText) {
        displayText = obj.coursebookText;
        level = obj.coursebookLevel || '';
        skillFocus = obj.coursebookSkill || '';
        if (obj.coursebookPage) {
          pageRef = `p.${obj.coursebookPage}`;
        }
      } else if (obj.source === 'custom' && obj.customDescriptorText) {
        displayText = obj.customDescriptorText;
      }

      return {
        id: obj.id,
        source: obj.source,
        objectiveType: obj.objectiveType,
        descriptorId: obj.descriptorId,
        coursebookDescriptorId: obj.coursebookDescriptorId,
        customDescriptorText: obj.customDescriptorText,
        sortOrder: obj.sortOrder,
        displayText,
        level,
        skillFocus,
        pageRef,
      };
    });

    return NextResponse.json({
      objectives: formattedObjectives,
      total: formattedObjectives.length,
    });
  } catch (error) {
    console.error('Error fetching session objectives:', error);
    return NextResponse.json({ error: 'Failed to fetch objectives' }, { status: 500 });
  }
}

// ============================================================================
// PUT - Update session learning objectives (replace all)
// ============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    await requireAuth(['admin', 'teacher', 'dos']);
    const tenantId = await getTenantId();
    const { sessionId } = await params;

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
    }

    // Parse and validate body
    const body = await request.json();
    const parseResult = putSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { objectives } = parseResult.data;

    // Validate limits
    const primaryCount = objectives.filter(o => o.objectiveType === 'primary').length;
    const secondaryCount = objectives.filter(o => o.objectiveType === 'secondary').length;

    if (primaryCount > 2) {
      return NextResponse.json({ error: 'Maximum 2 primary objectives allowed' }, { status: 400 });
    }
    if (secondaryCount > 6) {
      return NextResponse.json(
        { error: 'Maximum 6 secondary objectives allowed' },
        { status: 400 }
      );
    }

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Verify session belongs to tenant
    const session = await db
      .select({ id: classSessions.id })
      .from(classSessions)
      .where(and(eq(classSessions.id, sessionId), eq(classSessions.tenantId, tenantId)))
      .limit(1);

    if (session.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Delete existing objectives for this session
    await db
      .delete(sessionLearningObjectives)
      .where(eq(sessionLearningObjectives.sessionId, sessionId));

    // Insert new objectives
    if (objectives.length > 0) {
      const newObjectives = objectives.map((obj, index) => ({
        sessionId,
        descriptorId: obj.source === 'cefr' ? obj.descriptorId : null,
        coursebookDescriptorId: obj.source === 'coursebook' ? obj.coursebookDescriptorId : null,
        objectiveType: obj.objectiveType,
        source: obj.source,
        customDescriptorText: obj.source === 'custom' ? obj.customDescriptorText : null,
        sortOrder: obj.sortOrder ?? index,
      }));

      await db.insert(sessionLearningObjectives).values(newObjectives);
    }

    return NextResponse.json({
      success: true,
      message: `${objectives.length} objectives saved`,
      count: objectives.length,
    });
  } catch (error) {
    console.error('Error saving session objectives:', error);
    return NextResponse.json({ error: 'Failed to save objectives' }, { status: 500 });
  }
}

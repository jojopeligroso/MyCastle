/**
 * Student Summative Assessments API
 * GET/POST /api/admin/students/[id]/summative
 *
 * Manages summative assessment scores for a specific student
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { summativeAssessments, summativeAssessmentTypes } from '@/db/schema/profile';
import { users, classes } from '@/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { requireAuth, getTenantId, getUserId } from '@/lib/auth/utils';
import { z } from 'zod';

// ============================================================================
// Validation Schemas
// ============================================================================

const createAssessmentSchema = z.object({
  assessmentTypeId: z.string().uuid(),
  scorePercentage: z.number().min(0).max(100),
  assessmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  classId: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
});

// ============================================================================
// GET - List summative assessments for student
// ============================================================================

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(['admin', 'teacher', 'dos']);
    const tenantId = await getTenantId();
    const { id: studentId } = await params;

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
    }

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    const assessments = await db
      .select({
        id: summativeAssessments.id,
        studentId: summativeAssessments.studentId,
        assessmentTypeId: summativeAssessments.assessmentTypeId,
        typeName: summativeAssessmentTypes.name,
        scorePercentage: summativeAssessments.scorePercentage,
        assessmentDate: summativeAssessments.assessmentDate,
        notes: summativeAssessments.notes,
        classId: summativeAssessments.classId,
        className: classes.name,
        assessorId: summativeAssessments.assessorId,
        assessorName: users.name,
        createdAt: summativeAssessments.createdAt,
      })
      .from(summativeAssessments)
      .leftJoin(
        summativeAssessmentTypes,
        eq(summativeAssessments.assessmentTypeId, summativeAssessmentTypes.id)
      )
      .leftJoin(classes, eq(summativeAssessments.classId, classes.id))
      .leftJoin(users, eq(summativeAssessments.assessorId, users.id))
      .where(
        and(
          eq(summativeAssessments.studentId, studentId),
          eq(summativeAssessments.tenantId, tenantId)
        )
      )
      .orderBy(desc(summativeAssessments.assessmentDate));

    // Calculate stats
    const total = assessments.length;
    const avgScore =
      total > 0
        ? assessments.reduce((sum, a) => sum + parseFloat(a.scorePercentage || '0'), 0) / total
        : 0;

    return NextResponse.json({
      assessments: assessments.map(a => ({
        ...a,
        scorePercentage: parseFloat(a.scorePercentage || '0'),
      })),
      total,
      averageScore: Math.round(avgScore * 100) / 100,
    });
  } catch (error) {
    console.error('Error fetching summative assessments:', error);
    return NextResponse.json({ error: 'Failed to fetch assessments' }, { status: 500 });
  }
}

// ============================================================================
// POST - Create new summative assessment
// ============================================================================

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(['admin', 'teacher', 'dos']);
    const tenantId = await getTenantId();
    const assessorId = await getUserId();
    const { id: studentId } = await params;

    if (!tenantId || !assessorId) {
      return NextResponse.json({ error: 'No tenant or user context' }, { status: 403 });
    }

    // Parse and validate body
    const body = await request.json();
    const parseResult = createAssessmentSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { assessmentTypeId, scorePercentage, assessmentDate, classId, notes } = parseResult.data;

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Verify assessment type exists and belongs to tenant
    const [type] = await db
      .select({ id: summativeAssessmentTypes.id })
      .from(summativeAssessmentTypes)
      .where(
        and(
          eq(summativeAssessmentTypes.id, assessmentTypeId),
          eq(summativeAssessmentTypes.tenantId, tenantId),
          eq(summativeAssessmentTypes.isActive, true)
        )
      )
      .limit(1);

    if (!type) {
      return NextResponse.json({ error: 'Assessment type not found' }, { status: 404 });
    }

    // Create the assessment
    const [newAssessment] = await db
      .insert(summativeAssessments)
      .values({
        tenantId,
        studentId,
        assessmentTypeId,
        assessorId,
        scorePercentage: scorePercentage.toFixed(2),
        assessmentDate,
        classId: classId || null,
        notes: notes || null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      assessment: {
        ...newAssessment,
        scorePercentage: parseFloat(newAssessment.scorePercentage || '0'),
      },
    });
  } catch (error) {
    console.error('Error creating summative assessment:', error);
    return NextResponse.json({ error: 'Failed to create assessment' }, { status: 500 });
  }
}

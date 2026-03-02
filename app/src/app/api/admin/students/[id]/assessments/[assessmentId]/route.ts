import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { competencyAssessments, competencyProgress, users } from '@/db/schema';
import { cefrDescriptors } from '@/db/schema/curriculum';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth, getTenantId, getUserId, getCurrentUser } from '@/lib/auth/utils';

type RouteParams = { params: Promise<{ id: string; assessmentId: string }> };

/**
 * GET /api/admin/students/[id]/assessments/[assessmentId]
 * Fetch a single assessment
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth(['admin', 'teacher', 'dos']);
    const tenantId = await getTenantId();
    const { id: studentId, assessmentId } = await params;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const [assessment] = await db
      .select({
        id: competencyAssessments.id,
        studentId: competencyAssessments.studentId,
        descriptorId: competencyAssessments.descriptorId,
        classId: competencyAssessments.classId,
        enrollmentId: competencyAssessments.enrollmentId,
        assignmentId: competencyAssessments.assignmentId,
        assessmentType: competencyAssessments.assessmentType,
        assessmentDate: competencyAssessments.assessmentDate,
        score: competencyAssessments.score,
        notes: competencyAssessments.notes,
        assessedBy: competencyAssessments.assessedBy,
        createdAt: competencyAssessments.createdAt,
        updatedAt: competencyAssessments.updatedAt,
        // Descriptor details
        descriptorLevel: cefrDescriptors.level,
        descriptorText: cefrDescriptors.descriptorText,
        descriptorCategory: cefrDescriptors.category,
        descriptorSubcategory: cefrDescriptors.subcategory,
        assessorName: users.name,
      })
      .from(competencyAssessments)
      .leftJoin(cefrDescriptors, eq(competencyAssessments.descriptorId, cefrDescriptors.id))
      .leftJoin(users, eq(competencyAssessments.assessedBy, users.id))
      .where(
        and(
          eq(competencyAssessments.id, assessmentId),
          eq(competencyAssessments.studentId, studentId),
          eq(competencyAssessments.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    return NextResponse.json({ assessment });
  } catch (error) {
    console.error('Error fetching assessment:', error);
    return NextResponse.json({ error: 'Failed to fetch assessment' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/students/[id]/assessments/[assessmentId]
 * Update an assessment
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth(['admin', 'teacher', 'dos']);
    const tenantId = await getTenantId();
    const userId = await getUserId();
    const user = await getCurrentUser();
    const { id: studentId, assessmentId } = await params;
    const body = await request.json();

    if (!tenantId || !userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 403 });
    }

    const userRole = user?.user_metadata?.role || user?.app_metadata?.role;

    // Find existing assessment
    const [existing] = await db
      .select()
      .from(competencyAssessments)
      .where(
        and(
          eq(competencyAssessments.id, assessmentId),
          eq(competencyAssessments.studentId, studentId),
          eq(competencyAssessments.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    // Only admin or the original assessor can update
    if (userRole !== 'admin' && existing.assessedBy !== userId) {
      return NextResponse.json(
        { error: 'Not authorized to update this assessment' },
        { status: 403 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (body.score !== undefined) {
      if (body.score < 1 || body.score > 4) {
        return NextResponse.json({ error: 'score must be between 1 and 4' }, { status: 400 });
      }
      updateData.score = body.score;
    }
    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }
    if (body.assessmentType !== undefined) {
      updateData.assessmentType = body.assessmentType;
    }
    if (body.assessmentDate !== undefined) {
      updateData.assessmentDate = body.assessmentDate;
    }

    const [updated] = await db
      .update(competencyAssessments)
      .set(updateData)
      .where(eq(competencyAssessments.id, assessmentId))
      .returning();

    // Recalculate competency progress
    await updateCompetencyProgress(
      tenantId,
      studentId,
      existing.descriptorId,
      existing.enrollmentId
    );

    return NextResponse.json({ assessment: updated });
  } catch (error) {
    console.error('Error updating assessment:', error);
    return NextResponse.json({ error: 'Failed to update assessment' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/students/[id]/assessments/[assessmentId]
 * Delete an assessment
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth(['admin', 'dos']);
    const tenantId = await getTenantId();
    const { id: studentId, assessmentId } = await params;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    // Find existing assessment
    const [existing] = await db
      .select()
      .from(competencyAssessments)
      .where(
        and(
          eq(competencyAssessments.id, assessmentId),
          eq(competencyAssessments.studentId, studentId),
          eq(competencyAssessments.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    // Delete the assessment
    await db.delete(competencyAssessments).where(eq(competencyAssessments.id, assessmentId));

    // Recalculate competency progress
    await updateCompetencyProgress(
      tenantId,
      studentId,
      existing.descriptorId,
      existing.enrollmentId
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting assessment:', error);
    return NextResponse.json({ error: 'Failed to delete assessment' }, { status: 500 });
  }
}

/**
 * Update the denormalized competency_progress table after an assessment change
 */
async function updateCompetencyProgress(
  tenantId: string,
  studentId: string,
  descriptorId: string,
  enrollmentId: string | null
) {
  // Calculate aggregated score
  const result = await db
    .select({
      avgScore: sql<string>`avg(${competencyAssessments.score})`,
      count: sql<number>`count(*)::int`,
      lastAssessed: sql<string>`max(${competencyAssessments.assessmentDate})`,
    })
    .from(competencyAssessments)
    .where(
      and(
        eq(competencyAssessments.tenantId, tenantId),
        eq(competencyAssessments.studentId, studentId),
        eq(competencyAssessments.descriptorId, descriptorId)
      )
    );

  const avgScore = result[0]?.avgScore ? parseFloat(result[0].avgScore) : null;
  const count = result[0]?.count || 0;

  if (count === 0) {
    // No assessments left - delete progress record
    await db
      .delete(competencyProgress)
      .where(
        and(
          eq(competencyProgress.tenantId, tenantId),
          eq(competencyProgress.studentId, studentId),
          eq(competencyProgress.descriptorId, descriptorId)
        )
      );
    return;
  }

  const isCompetent = avgScore !== null && avgScore >= 3.5;

  // Upsert into competency_progress
  await db
    .insert(competencyProgress)
    .values({
      tenantId,
      studentId,
      descriptorId,
      enrollmentId: enrollmentId || null,
      currentScore: avgScore?.toFixed(2) || null,
      assessmentCount: count,
      lastAssessedAt: result[0]?.lastAssessed ? new Date(result[0].lastAssessed) : null,
      isCompetent,
      competentSince: isCompetent ? new Date() : null,
    })
    .onConflictDoUpdate({
      target: [
        competencyProgress.studentId,
        competencyProgress.descriptorId,
        competencyProgress.enrollmentId,
      ],
      set: {
        currentScore: avgScore?.toFixed(2) || null,
        assessmentCount: count,
        lastAssessedAt: result[0]?.lastAssessed ? new Date(result[0].lastAssessed) : null,
        isCompetent,
        competentSince: isCompetent
          ? sql`COALESCE(${competencyProgress.competentSince}, NOW())`
          : null,
        updatedAt: new Date(),
      },
    });
}

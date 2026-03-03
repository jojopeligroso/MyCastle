/**
 * Teacher Student Assessments API
 * GET /api/teacher/students/[id]/assessments - List assessments
 * POST /api/teacher/students/[id]/assessments - Create assessment
 *
 * Teachers can only assess students in their classes
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { competencyAssessments, competencyProgress, users, classes } from '@/db/schema';
import { cefrDescriptors } from '@/db/schema/curriculum';
import { eq, and, desc, sql } from 'drizzle-orm';
import { requireAuth, getTenantId, getUserId, getCurrentUser } from '@/lib/auth/utils';
import { canTeacherAccessStudent, getSharedClasses } from '@/lib/teachers';

/**
 * GET /api/teacher/students/[id]/assessments
 * Fetch assessments for a student (teacher view)
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(['teacher']);
    const tenantId = await getTenantId();
    const user = await getCurrentUser();
    const { id: studentId } = await params;

    if (!tenantId || !user) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    // Verify teacher can access this student
    const canAccess = await canTeacherAccessStudent(user.id, studentId, tenantId);
    if (!canAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this student' },
        { status: 403 }
      );
    }

    // Verify student exists
    const [student] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, studentId), eq(users.role, 'student')))
      .limit(1);

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Fetch assessments with descriptor details
    const assessments = await db
      .select({
        id: competencyAssessments.id,
        studentId: competencyAssessments.studentId,
        descriptorId: competencyAssessments.descriptorId,
        classId: competencyAssessments.classId,
        sessionId: competencyAssessments.sessionId,
        enrollmentId: competencyAssessments.enrollmentId,
        assignmentId: competencyAssessments.assignmentId,
        learningObjectiveId: competencyAssessments.learningObjectiveId,
        assessmentType: competencyAssessments.assessmentType,
        assessmentDate: competencyAssessments.assessmentDate,
        score: competencyAssessments.score,
        progress: competencyAssessments.progress,
        demonstratedLevel: competencyAssessments.demonstratedLevel,
        isComplete: competencyAssessments.isComplete,
        isSharedWithStudent: competencyAssessments.isSharedWithStudent,
        notes: competencyAssessments.notes,
        assessedBy: competencyAssessments.assessedBy,
        createdAt: competencyAssessments.createdAt,
        // Descriptor details
        descriptorLevel: cefrDescriptors.level,
        descriptorText: cefrDescriptors.descriptorText,
        descriptorCategory: cefrDescriptors.category,
        descriptorSubcategory: cefrDescriptors.subcategory,
        // Assessor name
        assessorName: users.name,
      })
      .from(competencyAssessments)
      .leftJoin(cefrDescriptors, eq(competencyAssessments.descriptorId, cefrDescriptors.id))
      .leftJoin(users, eq(competencyAssessments.assessedBy, users.id))
      .where(
        and(
          eq(competencyAssessments.studentId, studentId),
          eq(competencyAssessments.tenantId, tenantId)
        )
      )
      .orderBy(desc(competencyAssessments.assessmentDate), desc(competencyAssessments.createdAt));

    // Add canEdit flag (teachers can only edit their own assessments)
    const assessmentsWithFlags = assessments.map(a => ({
      ...a,
      canEdit: a.assessedBy === user.id,
    }));

    return NextResponse.json({ assessments: assessmentsWithFlags });
  } catch (error) {
    console.error('Error fetching teacher assessments:', error);
    return NextResponse.json({ error: 'Failed to fetch assessments' }, { status: 500 });
  }
}

/**
 * POST /api/teacher/students/[id]/assessments
 * Create a new competency assessment
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(['teacher']);
    const tenantId = await getTenantId();
    const userId = await getUserId();
    const user = await getCurrentUser();
    const { id: studentId } = await params;
    const body = await request.json();

    if (!tenantId || !userId || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 403 });
    }

    // Verify teacher can access this student
    const canAccess = await canTeacherAccessStudent(user.id, studentId, tenantId);
    if (!canAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this student' },
        { status: 403 }
      );
    }

    // Get shared classes for this teacher-student pair
    const sharedClasses = await getSharedClasses(user.id, studentId, tenantId);
    if (sharedClasses.length === 0) {
      return NextResponse.json(
        { error: 'Student is not enrolled in any of your classes' },
        { status: 403 }
      );
    }

    // Validate required fields
    const {
      descriptorId,
      assessmentType,
      score,
      progress,
      demonstratedLevel,
      isComplete,
      isSharedWithStudent,
      notes,
      classId,
      sessionId,
      enrollmentId,
      assignmentId,
      learningObjectiveId,
    } = body;

    if (!descriptorId) {
      return NextResponse.json({ error: 'descriptorId is required' }, { status: 400 });
    }
    if (!assessmentType) {
      return NextResponse.json({ error: 'assessmentType is required' }, { status: 400 });
    }
    if (score === undefined || score === null) {
      return NextResponse.json({ error: 'score is required' }, { status: 400 });
    }
    if (score < 1 || score > 4) {
      return NextResponse.json({ error: 'score must be between 1 and 4' }, { status: 400 });
    }

    // Validate progress if provided
    const validProgress = ['not_yet', 'emerging', 'developing', 'achieved'];
    if (progress && !validProgress.includes(progress)) {
      return NextResponse.json(
        { error: 'progress must be one of: not_yet, emerging, developing, achieved' },
        { status: 400 }
      );
    }

    // Validate demonstratedLevel if provided
    const validLevels = ['A1', 'A2', 'A2+', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C2', 'PreA1'];
    if (demonstratedLevel && !validLevels.includes(demonstratedLevel)) {
      return NextResponse.json({ error: 'Invalid CEFR level' }, { status: 400 });
    }

    // If classId is provided, verify teacher teaches that class
    if (classId) {
      const sharedClassIds = sharedClasses.map(c => c.id);
      if (!sharedClassIds.includes(classId)) {
        return NextResponse.json(
          { error: 'You can only create assessments for classes you teach' },
          { status: 403 }
        );
      }
    }

    // Verify student exists
    const [student] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, studentId), eq(users.role, 'student')))
      .limit(1);

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Verify descriptor exists
    const [descriptor] = await db
      .select({ id: cefrDescriptors.id })
      .from(cefrDescriptors)
      .where(eq(cefrDescriptors.id, descriptorId))
      .limit(1);

    if (!descriptor) {
      return NextResponse.json({ error: 'Descriptor not found' }, { status: 404 });
    }

    // Create assessment
    const [newAssessment] = await db
      .insert(competencyAssessments)
      .values({
        tenantId,
        studentId,
        descriptorId,
        classId: classId || sharedClasses[0]?.id || null, // Default to first shared class
        sessionId: sessionId || null,
        enrollmentId: enrollmentId || null,
        assignmentId: assignmentId || null,
        learningObjectiveId: learningObjectiveId || null,
        assessmentType,
        assessmentDate: body.assessmentDate || new Date().toISOString().split('T')[0],
        score,
        progress: progress || 'not_yet',
        demonstratedLevel: demonstratedLevel || null,
        isComplete: isComplete || false,
        isSharedWithStudent: isSharedWithStudent || false,
        notes: notes || null,
        assessedBy: userId,
      })
      .returning();

    // Update competency progress (denormalized table)
    await updateCompetencyProgress(tenantId, studentId, descriptorId, enrollmentId);

    return NextResponse.json({ assessment: newAssessment }, { status: 201 });
  } catch (error) {
    console.error('Error creating teacher assessment:', error);
    return NextResponse.json({ error: 'Failed to create assessment' }, { status: 500 });
  }
}

/**
 * Update the denormalized competency_progress table after an assessment
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

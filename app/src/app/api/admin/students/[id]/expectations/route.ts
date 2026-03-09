import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { studentExpectations, users } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { z } from 'zod';

const expectationsSchema = z.object({
  // Learning Goals
  primaryGoal: z.string().nullable().optional(),
  secondaryGoals: z.array(z.string()).nullable().optional(),
  targetCefrLevel: z.string().max(10).nullable().optional(),
  targetDate: z.string().nullable().optional(),

  // Study Commitment
  weeklyStudyHours: z.number().int().min(0).max(168).nullable().optional(),
  selfStudyHours: z.number().int().min(0).max(168).nullable().optional(),
  preferredLearningStyle: z.string().max(50).nullable().optional(),

  // Motivation & Context
  studyReason: z.string().nullable().optional(),
  specificNeeds: z.string().nullable().optional(),
  prioritySkills: z.array(z.string()).nullable().optional(),

  // Self-Assessment
  currentStrengths: z.array(z.string()).nullable().optional(),
  areasForImprovement: z.array(z.string()).nullable().optional(),
  anticipatedChallenges: z.string().nullable().optional(),

  // Expectations from School
  classroomExpectations: z.string().nullable().optional(),
  teacherSupport: z.string().nullable().optional(),
  feedbackPreference: z.string().max(50).nullable().optional(),

  // Commitment & Accountability
  attendanceCommitment: z.number().int().min(1).max(5).nullable().optional(),
  homeworkCommitment: z.number().int().min(1).max(5).nullable().optional(),
  participationCommitment: z.number().int().min(1).max(5).nullable().optional(),

  // Admin fields
  reviewedBy: z.string().uuid().nullable().optional(),
  reviewedAt: z.string().nullable().optional(),
  reviewNotes: z.string().nullable().optional(),
});

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/admin/students/[id]/expectations
 * Fetch all expectations records for a student
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth(['admin', 'teacher', 'dos']);
    const tenantId = await getTenantId();
    const { id: studentId } = await params;

    if (!tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 403 });
    }

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    const records = await db
      .select()
      .from(studentExpectations)
      .where(and(eq(studentExpectations.studentId, studentId), eq(studentExpectations.tenantId, tenantId)))
      .orderBy(desc(studentExpectations.createdAt));

    return NextResponse.json({ data: records });
  } catch (error) {
    console.error('Error fetching expectations:', error);
    return NextResponse.json({ error: 'Failed to fetch expectations' }, { status: 500 });
  }
}

/**
 * POST /api/admin/students/[id]/expectations
 * Create new expectations record
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth(['admin', 'teacher', 'dos']);
    const tenantId = await getTenantId();
    const { id: studentId } = await params;

    if (!tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 403 });
    }

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = expectationsSchema.parse(body);

    // Verify student exists
    const [student] = await db
      .select({ id: users.id, tenantId: users.tenantId })
      .from(users)
      .where(eq(users.id, studentId))
      .limit(1);

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const [record] = await db
      .insert(studentExpectations)
      .values({
        tenantId,
        studentId,
        primaryGoal: validatedData.primaryGoal || null,
        secondaryGoals: validatedData.secondaryGoals || null,
        targetCefrLevel: validatedData.targetCefrLevel || null,
        targetDate: validatedData.targetDate ? new Date(validatedData.targetDate) : null,
        weeklyStudyHours: validatedData.weeklyStudyHours ?? null,
        selfStudyHours: validatedData.selfStudyHours ?? null,
        preferredLearningStyle: validatedData.preferredLearningStyle || null,
        studyReason: validatedData.studyReason || null,
        specificNeeds: validatedData.specificNeeds || null,
        prioritySkills: validatedData.prioritySkills || null,
        currentStrengths: validatedData.currentStrengths || null,
        areasForImprovement: validatedData.areasForImprovement || null,
        anticipatedChallenges: validatedData.anticipatedChallenges || null,
        classroomExpectations: validatedData.classroomExpectations || null,
        teacherSupport: validatedData.teacherSupport || null,
        feedbackPreference: validatedData.feedbackPreference || null,
        attendanceCommitment: validatedData.attendanceCommitment ?? null,
        homeworkCommitment: validatedData.homeworkCommitment ?? null,
        participationCommitment: validatedData.participationCommitment ?? null,
        reviewedBy: validatedData.reviewedBy || null,
        reviewedAt: validatedData.reviewedAt ? new Date(validatedData.reviewedAt) : null,
        reviewNotes: validatedData.reviewNotes || null,
      })
      .returning();

    return NextResponse.json({ data: record }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    console.error('Error creating expectations:', error);
    return NextResponse.json({ error: 'Failed to create expectations' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/students/[id]/expectations
 * Update existing expectations record
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth(['admin', 'teacher', 'dos']);
    const tenantId = await getTenantId();
    const { id: studentId } = await params;

    if (!tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 403 });
    }

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { id: recordId, ...updateData } = body;

    if (!recordId) {
      return NextResponse.json({ error: 'Record ID is required for update' }, { status: 400 });
    }

    const validatedData = expectationsSchema.partial().parse(updateData);

    const [record] = await db
      .update(studentExpectations)
      .set({
        primaryGoal: validatedData.primaryGoal,
        secondaryGoals: validatedData.secondaryGoals,
        targetCefrLevel: validatedData.targetCefrLevel,
        targetDate: validatedData.targetDate ? new Date(validatedData.targetDate) : undefined,
        weeklyStudyHours: validatedData.weeklyStudyHours,
        selfStudyHours: validatedData.selfStudyHours,
        preferredLearningStyle: validatedData.preferredLearningStyle,
        studyReason: validatedData.studyReason,
        specificNeeds: validatedData.specificNeeds,
        prioritySkills: validatedData.prioritySkills,
        currentStrengths: validatedData.currentStrengths,
        areasForImprovement: validatedData.areasForImprovement,
        anticipatedChallenges: validatedData.anticipatedChallenges,
        classroomExpectations: validatedData.classroomExpectations,
        teacherSupport: validatedData.teacherSupport,
        feedbackPreference: validatedData.feedbackPreference,
        attendanceCommitment: validatedData.attendanceCommitment,
        homeworkCommitment: validatedData.homeworkCommitment,
        participationCommitment: validatedData.participationCommitment,
        reviewedBy: validatedData.reviewedBy,
        reviewedAt: validatedData.reviewedAt ? new Date(validatedData.reviewedAt) : undefined,
        reviewNotes: validatedData.reviewNotes,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(studentExpectations.id, recordId),
          eq(studentExpectations.studentId, studentId),
          eq(studentExpectations.tenantId, tenantId)
        )
      )
      .returning();

    if (!record) {
      return NextResponse.json({ error: 'Expectations record not found' }, { status: 404 });
    }

    return NextResponse.json({ data: record });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    console.error('Error updating expectations:', error);
    return NextResponse.json({ error: 'Failed to update expectations' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/students/[id]/expectations
 * Delete expectations record
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth(['admin', 'dos']);
    const tenantId = await getTenantId();
    const { id: studentId } = await params;
    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('recordId');

    if (!tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 403 });
    }

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    if (!recordId) {
      return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });
    }

    const [deleted] = await db
      .delete(studentExpectations)
      .where(
        and(
          eq(studentExpectations.id, recordId),
          eq(studentExpectations.studentId, studentId),
          eq(studentExpectations.tenantId, tenantId)
        )
      )
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'Expectations record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting expectations:', error);
    return NextResponse.json({ error: 'Failed to delete expectations' }, { status: 500 });
  }
}

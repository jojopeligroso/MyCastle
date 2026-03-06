import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { diagnosticSessions, users, enrollments, classes } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth, getTenantId, getCurrentUser } from '@/lib/auth/utils';
import { z } from 'zod';

// Validation schema for creating/updating diagnostic
const diagnosticSchema = z.object({
  // Written test results (Admin input)
  writtenScore: z.number().min(0).max(100).optional(),
  writtenNotes: z.string().optional(),

  // Oral test results (DoS input)
  oralScore: z.number().min(0).max(100).optional(),
  oralNotes: z.string().optional(),

  // Level recommendation
  recommendedLevel: z.enum(['A1', 'A2', 'A2+', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C2']).optional(),

  // Placement
  placementClassId: z.string().uuid().optional(),
  actualPlacementLevel: z
    .enum(['A1', 'A2', 'A2+', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C2'])
    .optional(),

  // Status
  status: z
    .enum(['in_progress', 'written_complete', 'oral_complete', 'completed', 'finalized'])
    .optional(),

  // General notes
  notes: z.string().optional(),
});

/**
 * GET /api/admin/students/[id]/diagnostics
 * Fetch diagnostic session history for a student
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(['admin', 'teacher', 'dos']);
    const tenantId = await getTenantId();
    const { id: studentId } = await params;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
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

    // Fetch diagnostic sessions with admin details
    const sessions = await db
      .select({
        id: diagnosticSessions.id,
        startedAt: diagnosticSessions.startedAt,
        completedAt: diagnosticSessions.completedAt,
        status: diagnosticSessions.status,
        currentStage: diagnosticSessions.currentStage,
        recommendedLevel: diagnosticSessions.recommendedLevel,
        actualPlacementLevel: diagnosticSessions.actualPlacementLevel,
        stageResults: diagnosticSessions.stageResults,
        notes: diagnosticSessions.notes,
        administeredById: diagnosticSessions.administeredBy,
        administeredByName: users.name,
      })
      .from(diagnosticSessions)
      .leftJoin(users, eq(diagnosticSessions.administeredBy, users.id))
      .where(
        and(eq(diagnosticSessions.studentId, studentId), eq(diagnosticSessions.tenantId, tenantId))
      )
      .orderBy(desc(diagnosticSessions.startedAt));

    // Format response
    const formattedSessions = sessions.map(s => ({
      id: s.id,
      startedAt: s.startedAt.toISOString(),
      completedAt: s.completedAt?.toISOString() || null,
      status: s.status,
      currentStage: s.currentStage,
      recommendedLevel: s.recommendedLevel,
      actualPlacementLevel: s.actualPlacementLevel,
      stageResults: s.stageResults,
      notes: s.notes,
      administeredBy: s.administeredById ? { name: s.administeredByName || 'Unknown' } : null,
    }));

    return NextResponse.json({ diagnostics: formattedSessions });
  } catch (error) {
    console.error('Error fetching diagnostics:', error);
    return NextResponse.json({ error: 'Failed to fetch diagnostics' }, { status: 500 });
  }
}

/**
 * POST /api/admin/students/[id]/diagnostics
 * Create a new diagnostic session for a student
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(['admin', 'dos']);
    const tenantId = await getTenantId();
    const currentUser = await getCurrentUser();
    const { id: studentId } = await params;

    if (!tenantId || !currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = diagnosticSchema.parse(body);

    // Verify student exists
    const [student] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(and(eq(users.id, studentId), eq(users.role, 'student')))
      .limit(1);

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Build stage results from written/oral scores
    const stageResults: Record<string, unknown> = {};
    if (validatedData.writtenScore !== undefined) {
      stageResults.written = {
        score: validatedData.writtenScore,
        notes: validatedData.writtenNotes || null,
        completedAt: new Date().toISOString(),
      };
    }
    if (validatedData.oralScore !== undefined) {
      stageResults.oral = {
        score: validatedData.oralScore,
        notes: validatedData.oralNotes || null,
        completedAt: new Date().toISOString(),
      };
    }

    // Determine status based on what's provided
    let status = validatedData.status || 'in_progress';
    if (validatedData.writtenScore !== undefined && validatedData.oralScore === undefined) {
      status = 'written_complete';
    } else if (validatedData.writtenScore !== undefined && validatedData.oralScore !== undefined) {
      status = validatedData.actualPlacementLevel ? 'completed' : 'oral_complete';
    }

    // Create diagnostic session
    const [newDiagnostic] = await db
      .insert(diagnosticSessions)
      .values({
        tenantId,
        studentId,
        status,
        currentStage:
          status === 'in_progress'
            ? 'written'
            : status === 'written_complete'
              ? 'oral'
              : 'placement',
        recommendedLevel: validatedData.recommendedLevel || null,
        actualPlacementLevel: validatedData.actualPlacementLevel || null,
        stageResults,
        administeredBy: currentUser.id,
        notes: validatedData.notes || null,
        completedAt: status === 'completed' || status === 'finalized' ? new Date() : null,
      })
      .returning();

    // If placement class is specified and diagnostic is complete, create provisional enrollment
    if (validatedData.placementClassId && validatedData.actualPlacementLevel) {
      // Verify the class exists
      const [targetClass] = await db
        .select({ id: classes.id, name: classes.name })
        .from(classes)
        .where(and(eq(classes.id, validatedData.placementClassId), eq(classes.tenantId, tenantId)))
        .limit(1);

      if (targetClass) {
        // Calculate provisional end date (1 week from now)
        const provisionalEndDate = new Date();
        provisionalEndDate.setDate(provisionalEndDate.getDate() + 7);

        // Create provisional enrollment
        await db.insert(enrollments).values({
          tenantId,
          studentId,
          classId: validatedData.placementClassId,
          enrollmentDate: new Date().toISOString().split('T')[0],
          expectedEndDate: provisionalEndDate.toISOString().split('T')[0],
          status: 'active',
          // Note: isProvisional field will be added in migration
        });
      }
    }

    return NextResponse.json({
      success: true,
      diagnostic: {
        id: newDiagnostic.id,
        status: newDiagnostic.status,
        recommendedLevel: newDiagnostic.recommendedLevel,
        actualPlacementLevel: newDiagnostic.actualPlacementLevel,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Error creating diagnostic:', error);
    return NextResponse.json({ error: 'Failed to create diagnostic' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/students/[id]/diagnostics
 * Update an existing diagnostic session (add oral results, finalize placement)
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(['admin', 'dos']);
    const tenantId = await getTenantId();
    const currentUser = await getCurrentUser();
    const { id: studentId } = await params;

    if (!tenantId || !currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 403 });
    }

    const body = await request.json();
    const { diagnosticId, ...updateData } = body;

    if (!diagnosticId) {
      return NextResponse.json({ error: 'diagnosticId is required' }, { status: 400 });
    }

    const validatedData = diagnosticSchema.parse(updateData);

    // Verify diagnostic exists and belongs to this student
    const [existingDiagnostic] = await db
      .select()
      .from(diagnosticSessions)
      .where(
        and(
          eq(diagnosticSessions.id, diagnosticId),
          eq(diagnosticSessions.studentId, studentId),
          eq(diagnosticSessions.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!existingDiagnostic) {
      return NextResponse.json({ error: 'Diagnostic session not found' }, { status: 404 });
    }

    // Merge new stage results with existing
    const existingStageResults = (existingDiagnostic.stageResults as Record<string, unknown>) || {};
    const updatedStageResults = { ...existingStageResults };

    if (validatedData.writtenScore !== undefined) {
      updatedStageResults.written = {
        score: validatedData.writtenScore,
        notes: validatedData.writtenNotes || null,
        completedAt: new Date().toISOString(),
      };
    }
    if (validatedData.oralScore !== undefined) {
      updatedStageResults.oral = {
        score: validatedData.oralScore,
        notes: validatedData.oralNotes || null,
        completedAt: new Date().toISOString(),
      };
    }

    // Determine new status
    let newStatus = validatedData.status || existingDiagnostic.status;
    const hasWritten = updatedStageResults.written !== undefined;
    const hasOral = updatedStageResults.oral !== undefined;

    if (hasWritten && !hasOral) {
      newStatus = 'written_complete';
    } else if (hasWritten && hasOral && !validatedData.actualPlacementLevel) {
      newStatus = 'oral_complete';
    } else if (hasWritten && hasOral && validatedData.actualPlacementLevel) {
      newStatus = 'completed';
    }

    // Update diagnostic session
    const [updatedDiagnostic] = await db
      .update(diagnosticSessions)
      .set({
        status: newStatus,
        currentStage:
          newStatus === 'written_complete'
            ? 'oral'
            : newStatus === 'oral_complete'
              ? 'placement'
              : newStatus === 'completed'
                ? 'done'
                : existingDiagnostic.currentStage,
        recommendedLevel: validatedData.recommendedLevel || existingDiagnostic.recommendedLevel,
        actualPlacementLevel:
          validatedData.actualPlacementLevel || existingDiagnostic.actualPlacementLevel,
        stageResults: updatedStageResults,
        notes: validatedData.notes || existingDiagnostic.notes,
        completedAt:
          newStatus === 'completed' || newStatus === 'finalized'
            ? new Date()
            : existingDiagnostic.completedAt,
        updatedAt: new Date(),
      })
      .where(eq(diagnosticSessions.id, diagnosticId))
      .returning();

    // If completing with placement, create provisional enrollment
    if (
      validatedData.placementClassId &&
      validatedData.actualPlacementLevel &&
      newStatus === 'completed'
    ) {
      // Check if enrollment already exists
      const [existingEnrollment] = await db
        .select({ id: enrollments.id })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.studentId, studentId),
            eq(enrollments.classId, validatedData.placementClassId),
            eq(enrollments.status, 'active')
          )
        )
        .limit(1);

      if (!existingEnrollment) {
        // Verify the class exists
        const [targetClass] = await db
          .select({ id: classes.id })
          .from(classes)
          .where(
            and(eq(classes.id, validatedData.placementClassId), eq(classes.tenantId, tenantId))
          )
          .limit(1);

        if (targetClass) {
          // Calculate provisional end date (1 week from now)
          const provisionalEndDate = new Date();
          provisionalEndDate.setDate(provisionalEndDate.getDate() + 7);

          await db.insert(enrollments).values({
            tenantId,
            studentId,
            classId: validatedData.placementClassId,
            enrollmentDate: new Date().toISOString().split('T')[0],
            expectedEndDate: provisionalEndDate.toISOString().split('T')[0],
            status: 'active',
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      diagnostic: {
        id: updatedDiagnostic.id,
        status: updatedDiagnostic.status,
        recommendedLevel: updatedDiagnostic.recommendedLevel,
        actualPlacementLevel: updatedDiagnostic.actualPlacementLevel,
        stageResults: updatedDiagnostic.stageResults,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Error updating diagnostic:', error);
    return NextResponse.json({ error: 'Failed to update diagnostic' }, { status: 500 });
  }
}

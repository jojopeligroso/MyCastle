import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { diagnosticSessions, users } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';

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

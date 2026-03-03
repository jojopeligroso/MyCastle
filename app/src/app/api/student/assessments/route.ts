/**
 * GET /api/student/assessments
 * Get assessments shared with the current student
 */

import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users, students } from '@/db/schema';
import { competencyAssessments } from '@/db/schema/profile';
import { cefrDescriptors } from '@/db/schema/curriculum';
import { eq, and, sql, desc } from 'drizzle-orm';
import { requireAuth, getTenantId, getUserId } from '@/lib/auth/utils';

export async function GET() {
  try {
    await requireAuth(['student']);
    const tenantId = await getTenantId();
    const userId = await getUserId();

    if (!tenantId || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Get student record
    const [studentData] = await db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.userId, userId))
      .limit(1);

    if (!studentData) {
      return NextResponse.json({ assessments: [] });
    }

    // Get assessments that are shared with the student
    const assessments = await db
      .select({
        id: competencyAssessments.id,
        assessmentDate: competencyAssessments.assessmentDate,
        progress: competencyAssessments.progress,
        demonstratedLevel: competencyAssessments.demonstratedLevel,
        isComplete: competencyAssessments.isComplete,
        notes: competencyAssessments.notes,
        // Descriptor details
        descriptorText: cefrDescriptors.descriptorText,
        descriptorLevel: cefrDescriptors.level,
        category: cefrDescriptors.category,
        subcategory: cefrDescriptors.subcategory,
      })
      .from(competencyAssessments)
      .innerJoin(cefrDescriptors, eq(competencyAssessments.descriptorId, cefrDescriptors.id))
      .where(
        and(
          eq(competencyAssessments.studentId, studentData.id),
          eq(competencyAssessments.isSharedWithStudent, true)
        )
      )
      .orderBy(desc(competencyAssessments.assessmentDate))
      .limit(50);

    // Group by category for display
    const byCategory: Record<string, typeof assessments> = {};
    for (const assessment of assessments) {
      const cat = assessment.category || 'Other';
      if (!byCategory[cat]) {
        byCategory[cat] = [];
      }
      byCategory[cat].push(assessment);
    }

    return NextResponse.json({
      assessments: assessments.map(a => ({
        id: a.id,
        date: a.assessmentDate,
        progress: a.progress,
        demonstratedLevel: a.demonstratedLevel,
        isComplete: a.isComplete,
        notes: a.notes,
        descriptor: {
          text: a.descriptorText,
          level: a.descriptorLevel,
          category: a.category,
          subcategory: a.subcategory,
        },
      })),
      byCategory: Object.entries(byCategory).map(([category, items]) => ({
        category,
        count: items.length,
        achieved: items.filter(i => i.isComplete).length,
      })),
    });
  } catch (error) {
    console.error('Error fetching student assessments:', error);
    return NextResponse.json({ error: 'Failed to fetch assessments' }, { status: 500 });
  }
}

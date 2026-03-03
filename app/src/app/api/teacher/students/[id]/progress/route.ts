/**
 * GET /api/teacher/students/[id]/progress
 * Fetch competency progress for a student (teacher view)
 * Verifies teacher has access via class enrollment
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { competencyProgress, users } from '@/db/schema';
import { cefrDescriptors } from '@/db/schema/curriculum';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth, getTenantId, getCurrentUser } from '@/lib/auth/utils';
import { canTeacherAccessStudent } from '@/lib/teachers';

interface SkillGap {
  id: string;
  category: string;
  subcategory: string;
  descriptorText: string;
  currentScore: number | null;
  assessmentCount: number;
  lastAssessedAt: string | null;
  isCompetent: boolean;
}

interface SkillGroup {
  category: string;
  competent: number;
  total: number;
  gaps: SkillGap[];
}

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

    // Fetch all competency progress records with descriptor details
    const progressRecords = await db
      .select({
        progressId: competencyProgress.id,
        descriptorId: competencyProgress.descriptorId,
        currentScore: competencyProgress.currentScore,
        assessmentCount: competencyProgress.assessmentCount,
        lastAssessedAt: competencyProgress.lastAssessedAt,
        isCompetent: competencyProgress.isCompetent,
        // Descriptor details
        category: cefrDescriptors.category,
        subcategory: cefrDescriptors.subcategory,
        descriptorText: cefrDescriptors.descriptorText,
        level: cefrDescriptors.level,
      })
      .from(competencyProgress)
      .innerJoin(cefrDescriptors, eq(competencyProgress.descriptorId, cefrDescriptors.id))
      .where(
        and(eq(competencyProgress.studentId, studentId), eq(competencyProgress.tenantId, tenantId))
      );

    // Also get total descriptors per category
    const totalDescriptors = await db
      .select({
        category: cefrDescriptors.category,
        count: sql<number>`count(*)::int`,
      })
      .from(cefrDescriptors)
      .where(eq(cefrDescriptors.tenantId, tenantId))
      .groupBy(cefrDescriptors.category);

    // Standard CEFR skill categories
    const standardCategories = ['Reading', 'Writing', 'Listening', 'Speaking'];

    // Group by category
    const categoryMap = new Map<string, { competent: number; total: number; gaps: SkillGap[] }>();

    // Initialize with standard categories
    for (const cat of standardCategories) {
      const totalForCategory = totalDescriptors.find(t => t.category === cat)?.count || 0;
      categoryMap.set(cat, { competent: 0, total: totalForCategory, gaps: [] });
    }

    // Process progress records
    for (const record of progressRecords) {
      const category = record.category || 'Other';

      if (!categoryMap.has(category)) {
        const totalForCategory = totalDescriptors.find(t => t.category === category)?.count || 0;
        categoryMap.set(category, { competent: 0, total: totalForCategory, gaps: [] });
      }

      const group = categoryMap.get(category)!;

      if (record.isCompetent) {
        group.competent++;
      } else {
        // Add to gaps (non-competent descriptors)
        group.gaps.push({
          id: record.progressId,
          category: category,
          subcategory: record.subcategory || '',
          descriptorText: record.descriptorText || '',
          currentScore: record.currentScore ? parseFloat(record.currentScore) : null,
          assessmentCount: record.assessmentCount || 0,
          lastAssessedAt: record.lastAssessedAt?.toISOString() || null,
          isCompetent: record.isCompetent || false,
        });
      }
    }

    // Convert map to array
    const skillGroups: SkillGroup[] = [];
    for (const category of standardCategories) {
      const group = categoryMap.get(category);
      if (group) {
        skillGroups.push({
          category,
          competent: group.competent,
          total: group.total,
          gaps: group.gaps.sort((a, b) => (a.currentScore || 0) - (b.currentScore || 0)),
        });
      }
    }

    // Add any non-standard categories
    for (const [category, group] of categoryMap) {
      if (!standardCategories.includes(category)) {
        skillGroups.push({
          category,
          competent: group.competent,
          total: group.total,
          gaps: group.gaps.sort((a, b) => (a.currentScore || 0) - (b.currentScore || 0)),
        });
      }
    }

    // Calculate overall summary
    const overallCompetent = skillGroups.reduce((sum, g) => sum + g.competent, 0);
    const overallTotal = skillGroups.reduce((sum, g) => sum + g.total, 0);
    const overallProgress =
      overallTotal > 0 ? Math.round((overallCompetent / overallTotal) * 100) : 0;

    return NextResponse.json({
      skillGroups,
      summary: {
        competent: overallCompetent,
        total: overallTotal,
        progress: overallProgress,
      },
    });
  } catch (error) {
    console.error('Error fetching teacher progress:', error);
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
  }
}

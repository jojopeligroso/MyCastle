/**
 * Student Tutor Context API
 * Exposes student profile data for LLM prompt construction
 *
 * GET /api/student/tutor-context
 *
 * This endpoint provides comprehensive student context that can be used
 * to construct personalized LLM prompts for the AI tutor feature.
 *
 * Ref: STUDENT_PROFILE_ROADMAP.md Task #10
 * Spec: spec/STUDENT_MCP_SPEC.md
 */

import { NextResponse } from 'next/server';
import { db } from '@/db';
import { requireAuth, getTenantId, getUserId } from '@/lib/auth/utils';
import { users, students, enrollments, classes } from '@/db/schema';
import {
  competencyAssessments,
  competencyProgress,
  vocabLists,
  sessionLearningObjectives,
} from '@/db/schema/profile';
import { cefrDescriptors, classSessions } from '@/db/schema';
import { eq, and, desc, sql, gte } from 'drizzle-orm';

interface TutorContext {
  profile: {
    name: string | null;
    currentLevel: string | null;
    initialLevel: string | null;
    memberSince: string;
  };
  currentClass: {
    id: string;
    name: string;
    level: string | null;
  } | null;
  progress: {
    competencyRate: number;
    skillBreakdown: Record<string, number>;
    recentGaps: string[];
  };
  recentAssessments: Array<{
    descriptor: string;
    level: string;
    progress: string | null;
    date: string;
  }>;
  vocabularyStats: {
    total: number;
    mastered: number;
    learning: number;
    new: number;
    recentlyAdded: string[];
  };
  currentObjectives: Array<{
    descriptor: string;
    level: string;
    source: string;
  }>;
}

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

    // Fetch user profile
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        currentLevel: users.currentLevel,
        initialLevel: users.initialLevel,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch student record
    const [studentData] = await db
      .select({
        id: students.id,
      })
      .from(students)
      .where(eq(students.userId, userId))
      .limit(1);

    // Fetch current enrollment and class
    const enrollmentResult = studentData
      ? await db
          .select({
            classId: enrollments.classId,
            className: classes.name,
            classLevel: classes.level,
          })
          .from(enrollments)
          .innerJoin(classes, eq(enrollments.classId, classes.id))
          .where(and(eq(enrollments.studentId, studentData.id), eq(enrollments.status, 'active')))
          .orderBy(desc(enrollments.enrollmentDate))
          .limit(1)
      : [];

    const currentEnrollment = enrollmentResult[0] || null;

    // Fetch competency progress stats
    const progressResult = studentData
      ? await db
          .select({
            total: sql<number>`COUNT(*)::int`,
            achieved: sql<number>`COUNT(*) FILTER (WHERE ${competencyProgress.isCompetent} = true)::int`,
          })
          .from(competencyProgress)
          .where(eq(competencyProgress.studentId, studentData.id))
      : [{ total: 0, achieved: 0 }];

    const progressStats = progressResult[0] || { total: 0, achieved: 0 };
    const competencyRate =
      progressStats.total > 0
        ? Math.round((progressStats.achieved / progressStats.total) * 100)
        : 0;

    // Fetch skill breakdown from assessments
    const skillBreakdownResult = studentData
      ? await db
          .select({
            category: cefrDescriptors.category,
            avgScore: sql<number>`AVG(${competencyAssessments.score})`,
          })
          .from(competencyAssessments)
          .innerJoin(cefrDescriptors, eq(competencyAssessments.descriptorId, cefrDescriptors.id))
          .where(eq(competencyAssessments.studentId, studentData.id))
          .groupBy(cefrDescriptors.category)
      : [];

    const skillBreakdown: Record<string, number> = {};
    for (const row of skillBreakdownResult) {
      if (row.category) {
        // Convert 1-4 scale to percentage
        skillBreakdown[row.category] = Math.round((Number(row.avgScore) / 4) * 100);
      }
    }

    // Find recent gaps (descriptors with low scores)
    const gapsResult = studentData
      ? await db
          .select({
            descriptor: cefrDescriptors.descriptorText,
          })
          .from(competencyAssessments)
          .innerJoin(cefrDescriptors, eq(competencyAssessments.descriptorId, cefrDescriptors.id))
          .where(
            and(
              eq(competencyAssessments.studentId, studentData.id),
              sql`${competencyAssessments.score} <= 2`
            )
          )
          .orderBy(desc(competencyAssessments.assessmentDate))
          .limit(5)
      : [];

    const recentGaps = gapsResult.map(r => r.descriptor).filter((d): d is string => d !== null);

    // Fetch recent assessments
    const recentAssessmentsResult = studentData
      ? await db
          .select({
            descriptor: cefrDescriptors.descriptorText,
            level: cefrDescriptors.level,
            progress: competencyAssessments.progress,
            date: competencyAssessments.assessmentDate,
          })
          .from(competencyAssessments)
          .innerJoin(cefrDescriptors, eq(competencyAssessments.descriptorId, cefrDescriptors.id))
          .where(eq(competencyAssessments.studentId, studentData.id))
          .orderBy(desc(competencyAssessments.assessmentDate))
          .limit(10)
      : [];

    const recentAssessments = recentAssessmentsResult.map(a => ({
      descriptor: a.descriptor || '',
      level: a.level,
      progress: a.progress,
      date: a.date?.toString() || '',
    }));

    // Fetch vocabulary stats
    const vocabStatsResult = studentData
      ? await db
          .select({
            total: sql<number>`COUNT(*)::int`,
            mastered: sql<number>`COUNT(*) FILTER (WHERE ${vocabLists.masteryLevel} >= 4)::int`,
            learning: sql<number>`COUNT(*) FILTER (WHERE ${vocabLists.masteryLevel} >= 2 AND ${vocabLists.masteryLevel} < 4)::int`,
            new: sql<number>`COUNT(*) FILTER (WHERE ${vocabLists.masteryLevel} < 2)::int`,
          })
          .from(vocabLists)
          .where(eq(vocabLists.studentId, studentData.id))
      : [{ total: 0, mastered: 0, learning: 0, new: 0 }];

    const vocabStats = vocabStatsResult[0] || { total: 0, mastered: 0, learning: 0, new: 0 };

    // Fetch recently added vocabulary
    const recentVocabResult = studentData
      ? await db
          .select({
            word: vocabLists.word,
          })
          .from(vocabLists)
          .where(eq(vocabLists.studentId, studentData.id))
          .orderBy(desc(vocabLists.createdAt))
          .limit(10)
      : [];

    const recentlyAdded = recentVocabResult.map(v => v.word);

    // Fetch current learning objectives (from upcoming sessions)
    const today = new Date().toISOString().split('T')[0];
    let currentObjectives: Array<{ descriptor: string; level: string; source: string }> = [];

    if (currentEnrollment) {
      const objectivesResult = await db
        .select({
          descriptor: cefrDescriptors.descriptorText,
          level: cefrDescriptors.level,
          source: sessionLearningObjectives.source,
        })
        .from(sessionLearningObjectives)
        .innerJoin(classSessions, eq(sessionLearningObjectives.sessionId, classSessions.id))
        .leftJoin(cefrDescriptors, eq(sessionLearningObjectives.descriptorId, cefrDescriptors.id))
        .where(
          and(
            eq(classSessions.classId, currentEnrollment.classId),
            gte(classSessions.sessionDate, today)
          )
        )
        .orderBy(classSessions.sessionDate)
        .limit(10);

      currentObjectives = objectivesResult
        .filter(o => o.descriptor)
        .map(o => ({
          descriptor: o.descriptor || '',
          level: o.level || '',
          source: o.source,
        }));
    }

    const context: TutorContext = {
      profile: {
        name: user.name,
        currentLevel: user.currentLevel,
        initialLevel: user.initialLevel,
        memberSince: user.createdAt?.toISOString() || new Date().toISOString(),
      },
      currentClass: currentEnrollment
        ? {
            id: currentEnrollment.classId,
            name: currentEnrollment.className,
            level: currentEnrollment.classLevel,
          }
        : null,
      progress: {
        competencyRate,
        skillBreakdown,
        recentGaps,
      },
      recentAssessments,
      vocabularyStats: {
        total: vocabStats.total,
        mastered: vocabStats.mastered,
        learning: vocabStats.learning,
        new: vocabStats.new,
        recentlyAdded,
      },
      currentObjectives,
    };

    return NextResponse.json(context);
  } catch (error) {
    console.error('Error fetching tutor context:', error);
    return NextResponse.json({ error: 'Failed to fetch tutor context' }, { status: 500 });
  }
}

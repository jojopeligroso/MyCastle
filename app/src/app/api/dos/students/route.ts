/**
 * GET /api/dos/students
 * List all students in tenant for DoS view
 * Includes promotion status and assessment summary
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, students, classes, enrollments } from '@/db/schema';
import { levelPromotions, competencyProgress, summativeAssessments } from '@/db/schema/profile';
import { eq, and, sql, desc, count, avg, gte } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';

interface StudentWithStatus {
  id: string;
  userId: string;
  name: string | null;
  email: string | null;
  currentLevel: string | null;
  levelStatus: string | null;
  isActive: boolean;
  currentClassName: string | null;
  currentClassId: string | null;
  hasPendingPromotion: boolean;
  pendingPromotionId: string | null;
  pendingToLevel: string | null;
  summativeAvg: number | null;
  competencyProgress: number | null;
  createdAt: Date;
}

export async function GET(request: NextRequest) {
  try {
    // Only DoS and admin can access
    await requireAuth(['admin', 'dos', 'assistant_dos']);
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const levelFilter = searchParams.get('level');
    const statusFilter = searchParams.get('status'); // active, inactive, all
    const promotionFilter = searchParams.get('promotion'); // pending, none, all
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Build base query for students
    const baseConditions = [eq(users.role, 'student'), eq(users.tenantId, tenantId)];

    // Add level filter
    if (levelFilter) {
      baseConditions.push(eq(users.currentLevel, levelFilter));
    }

    // Add status filter
    if (statusFilter === 'active') {
      baseConditions.push(eq(users.isActive, true));
    } else if (statusFilter === 'inactive') {
      baseConditions.push(eq(users.isActive, false));
    }

    // Add search filter
    if (search) {
      baseConditions.push(
        sql`(${users.name} ILIKE ${'%' + search + '%'} OR ${users.email} ILIKE ${'%' + search + '%'})`
      );
    }

    // Get students with current enrollment
    const studentsQuery = await db
      .select({
        id: students.id,
        userId: users.id,
        name: users.name,
        email: users.email,
        currentLevel: users.currentLevel,
        levelStatus: users.levelStatus,
        isActive: users.isActive,
        currentClassName: classes.name,
        currentClassId: classes.id,
        createdAt: users.createdAt,
      })
      .from(users)
      .leftJoin(students, eq(students.userId, users.id))
      .leftJoin(
        enrollments,
        and(eq(enrollments.studentId, students.id), eq(enrollments.status, 'active'))
      )
      .leftJoin(classes, eq(classes.id, enrollments.classId))
      .where(and(...baseConditions))
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    // Get pending promotions for these students
    const studentIds = studentsQuery.filter(s => s.id).map(s => s.id as string);

    const pendingPromotions =
      studentIds.length > 0
        ? await db
            .select({
              studentId: levelPromotions.studentId,
              promotionId: levelPromotions.id,
              toLevel: levelPromotions.toLevel,
            })
            .from(levelPromotions)
            .where(
              and(
                eq(levelPromotions.tenantId, tenantId),
                eq(levelPromotions.status, 'pending'),
                sql`${levelPromotions.studentId} = ANY(ARRAY[${sql.join(
                  studentIds.map(id => sql`${id}::uuid`),
                  sql`, `
                )}])`
              )
            )
        : [];

    // Get competency progress summary for students
    const competencyStats =
      studentIds.length > 0
        ? await db
            .select({
              studentId: competencyProgress.studentId,
              total: count(competencyProgress.id),
              competent: sql<number>`SUM(CASE WHEN ${competencyProgress.isCompetent} THEN 1 ELSE 0 END)::int`,
            })
            .from(competencyProgress)
            .where(
              and(
                eq(competencyProgress.tenantId, tenantId),
                sql`${competencyProgress.studentId} = ANY(ARRAY[${sql.join(
                  studentIds.map(id => sql`${id}::uuid`),
                  sql`, `
                )}])`
              )
            )
            .groupBy(competencyProgress.studentId)
        : [];

    // Get recent summative averages (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const summativeStats =
      studentIds.length > 0
        ? await db
            .select({
              studentId: summativeAssessments.studentId,
              avgScore: avg(summativeAssessments.scorePercentage),
            })
            .from(summativeAssessments)
            .where(
              and(
                eq(summativeAssessments.tenantId, tenantId),
                gte(summativeAssessments.assessmentDate, ninetyDaysAgo.toISOString().split('T')[0]),
                sql`${summativeAssessments.studentId} = ANY(ARRAY[${sql.join(
                  studentIds.map(id => sql`${id}::uuid`),
                  sql`, `
                )}])`
              )
            )
            .groupBy(summativeAssessments.studentId)
        : [];

    // Build promotion map
    const promotionMap = new Map(
      pendingPromotions.map(p => [p.studentId, { promotionId: p.promotionId, toLevel: p.toLevel }])
    );

    // Build competency map
    const competencyMap = new Map(
      competencyStats.map(c => [
        c.studentId,
        c.total > 0 ? Math.round((Number(c.competent) / Number(c.total)) * 100) : 0,
      ])
    );

    // Build summative map
    const summativeMap = new Map(
      summativeStats.map(s => [
        s.studentId,
        s.avgScore ? Math.round(parseFloat(String(s.avgScore)) * 100) / 100 : null,
      ])
    );

    // Combine data
    let result: StudentWithStatus[] = studentsQuery.map(s => {
      const promotion = promotionMap.get(s.id || '');
      return {
        id: s.id || '',
        userId: s.userId,
        name: s.name,
        email: s.email,
        currentLevel: s.currentLevel,
        levelStatus: s.levelStatus,
        isActive: s.isActive,
        currentClassName: s.currentClassName,
        currentClassId: s.currentClassId,
        hasPendingPromotion: !!promotion,
        pendingPromotionId: promotion?.promotionId || null,
        pendingToLevel: promotion?.toLevel || null,
        summativeAvg: summativeMap.get(s.id || '') || null,
        competencyProgress: competencyMap.get(s.id || '') || null,
        createdAt: s.createdAt,
      };
    });

    // Apply promotion filter
    if (promotionFilter === 'pending') {
      result = result.filter(s => s.hasPendingPromotion);
    } else if (promotionFilter === 'none') {
      result = result.filter(s => !s.hasPendingPromotion);
    }

    // Get counts for stats
    const [totalCount] = await db
      .select({ count: count() })
      .from(users)
      .where(and(eq(users.role, 'student'), eq(users.tenantId, tenantId)));

    const [activeCount] = await db
      .select({ count: count() })
      .from(users)
      .where(
        and(eq(users.role, 'student'), eq(users.tenantId, tenantId), eq(users.isActive, true))
      );

    const [pendingPromotionCount] = await db
      .select({ count: count() })
      .from(levelPromotions)
      .where(and(eq(levelPromotions.tenantId, tenantId), eq(levelPromotions.status, 'pending')));

    return NextResponse.json({
      students: result,
      stats: {
        total: totalCount.count,
        active: activeCount.count,
        pendingPromotions: pendingPromotionCount.count,
      },
      pagination: {
        limit,
        offset,
        hasMore: result.length === limit,
      },
    });
  } catch (error) {
    console.error('Error fetching DoS students:', error);
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
  }
}

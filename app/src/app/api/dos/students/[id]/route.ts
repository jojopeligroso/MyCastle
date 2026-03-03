/**
 * GET /api/dos/students/[id]
 * Get student profile for DoS view
 * Full access to student data with promotion-focused context
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, students, classes, enrollments, attendance } from '@/db/schema';
import { levelPromotions, summativeAssessments, competencyProgress } from '@/db/schema/profile';
import { eq, and, sql, desc, count, avg, gte } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(['admin', 'dos', 'assistant_dos']);
    const tenantId = await getTenantId();
    const { id: studentId } = await params;

    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Fetch student with user data
    const [studentData] = await db
      .select({
        id: students.id,
        userId: users.id,
        name: users.name,
        email: users.email,
        currentLevel: users.currentLevel,
        initialLevel: users.initialLevel,
        levelStatus: users.levelStatus,
        avatarUrl: users.avatarUrl,
        isActive: users.isActive,
        createdAt: users.createdAt,
        studentNumber: students.studentNumber,
      })
      .from(students)
      .innerJoin(users, eq(students.userId, users.id))
      .where(and(eq(students.id, studentId), eq(users.tenantId, tenantId)))
      .limit(1);

    if (!studentData) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Get current enrollment with class info
    const [currentEnrollment] = await db
      .select({
        id: enrollments.id,
        classId: enrollments.classId,
        className: classes.name,
        classLevel: classes.level,
        enrollmentDate: enrollments.enrollmentDate,
        status: enrollments.status,
      })
      .from(enrollments)
      .innerJoin(classes, eq(enrollments.classId, classes.id))
      .where(
        and(
          eq(enrollments.studentId, studentId),
          eq(enrollments.status, 'active')
        )
      )
      .limit(1);

    // Get promotion history
    const promotionHistory = await db
      .select({
        id: levelPromotions.id,
        fromLevel: levelPromotions.fromLevel,
        toLevel: levelPromotions.toLevel,
        status: levelPromotions.status,
        recommendedAt: levelPromotions.recommendedAt,
        recommendationReason: levelPromotions.recommendationReason,
        reviewedAt: levelPromotions.reviewedAt,
        reviewNotes: levelPromotions.reviewNotes,
        appliedAt: levelPromotions.appliedAt,
      })
      .from(levelPromotions)
      .where(eq(levelPromotions.studentId, studentId))
      .orderBy(desc(levelPromotions.recommendedAt));

    const pendingPromotion = promotionHistory.find(p => p.status === 'pending');

    // Get competency progress summary
    const [competencyStats] = await db
      .select({
        total: count(competencyProgress.id),
        competent: sql<number>`SUM(CASE WHEN ${competencyProgress.isCompetent} THEN 1 ELSE 0 END)::int`,
      })
      .from(competencyProgress)
      .where(eq(competencyProgress.studentId, studentId));

    const competencyRate = competencyStats.total > 0
      ? Math.round((Number(competencyStats.competent) / Number(competencyStats.total)) * 100)
      : 0;

    // Get summative assessment summary (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const [summativeStats] = await db
      .select({
        avgScore: avg(summativeAssessments.scorePercentage),
        count: count(summativeAssessments.id),
      })
      .from(summativeAssessments)
      .where(
        and(
          eq(summativeAssessments.studentId, studentId),
          gte(summativeAssessments.assessmentDate, ninetyDaysAgo.toISOString().split('T')[0])
        )
      );

    // Get attendance summary
    const attendanceRecords = await db
      .select({
        status: attendance.status,
        count: sql<number>`count(*)::int`,
      })
      .from(attendance)
      .where(eq(attendance.studentId, studentId))
      .groupBy(attendance.status);

    const attendanceSummary = {
      present: attendanceRecords.find(r => r.status === 'present')?.count || 0,
      absent: attendanceRecords.find(r => r.status === 'absent')?.count || 0,
      late: attendanceRecords.find(r => r.status === 'late')?.count || 0,
      excused: attendanceRecords.find(r => r.status === 'excused')?.count || 0,
    };

    const totalSessions =
      attendanceSummary.present +
      attendanceSummary.absent +
      attendanceSummary.late +
      attendanceSummary.excused;

    const attendanceRate =
      totalSessions > 0
        ? Math.round(((attendanceSummary.present + attendanceSummary.late) / totalSessions) * 100)
        : null;

    // Check if student meets promotion threshold (90%)
    const summativeAvg = summativeStats.avgScore
      ? Math.round(parseFloat(String(summativeStats.avgScore)) * 100) / 100
      : null;

    const meetsPromotionThreshold = summativeAvg !== null && summativeAvg >= 80;
    const strongCandidate = summativeAvg !== null && summativeAvg >= 90;

    return NextResponse.json({
      student: {
        ...studentData,
        status: studentData.isActive ? 'active' : 'inactive',
      },
      currentEnrollment: currentEnrollment || null,
      promotionStatus: {
        hasPending: !!pendingPromotion,
        pending: pendingPromotion || null,
        history: promotionHistory,
        meetsThreshold: meetsPromotionThreshold,
        strongCandidate,
      },
      assessmentSummary: {
        competencyRate,
        competencyTotal: competencyStats.total,
        competencyAchieved: Number(competencyStats.competent) || 0,
        summativeAvg,
        summativeCount: summativeStats.count,
      },
      attendance: {
        summary: attendanceSummary,
        rate: attendanceRate,
        total: totalSessions,
      },
      // Flag for UI to know this is DoS context
      isDoSView: true,
    });
  } catch (error) {
    console.error('Error fetching student for DoS:', error);
    return NextResponse.json({ error: 'Failed to fetch student details' }, { status: 500 });
  }
}

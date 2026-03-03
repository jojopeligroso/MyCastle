/**
 * GET /api/student/profile
 * Get the current student's own profile
 */

import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users, students, classes, enrollments, attendance } from '@/db/schema';
import { diagnosticSessions, levelPromotions, competencyProgress } from '@/db/schema/profile';
import { eq, and, sql, desc, count, avg } from 'drizzle-orm';
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

    // Get user and student data
    const [userData] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        avatarUrl: users.avatarUrl,
        currentLevel: users.currentLevel,
        initialLevel: users.initialLevel,
        levelStatus: users.levelStatus,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get student record
    const [studentData] = await db
      .select({
        id: students.id,
        studentNumber: students.studentNumber,
      })
      .from(students)
      .where(eq(students.userId, userId))
      .limit(1);

    // Get current enrollment with class info
    const currentEnrollment = studentData
      ? await db
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
          .where(and(eq(enrollments.studentId, studentData.id), eq(enrollments.status, 'active')))
          .limit(1)
      : [];

    // Get attendance summary
    const attendanceRecords = studentData
      ? await db
          .select({
            status: attendance.status,
            count: sql<number>`count(*)::int`,
          })
          .from(attendance)
          .where(eq(attendance.studentId, studentData.id))
          .groupBy(attendance.status)
      : [];

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

    // Get competency progress summary
    const [progressStats] = studentData
      ? await db
          .select({
            total: count(competencyProgress.id),
            competent: sql<number>`SUM(CASE WHEN ${competencyProgress.isCompetent} THEN 1 ELSE 0 END)::int`,
          })
          .from(competencyProgress)
          .where(eq(competencyProgress.studentId, studentData.id))
      : [{ total: 0, competent: 0 }];

    const competencyRate =
      progressStats && Number(progressStats.total) > 0
        ? Math.round((Number(progressStats.competent) / Number(progressStats.total)) * 100)
        : 0;

    // Get diagnostic history
    const diagnostics = studentData
      ? await db
          .select({
            id: diagnosticSessions.id,
            startedAt: diagnosticSessions.startedAt,
            completedAt: diagnosticSessions.completedAt,
            status: diagnosticSessions.status,
            recommendedLevel: diagnosticSessions.recommendedLevel,
            actualPlacementLevel: diagnosticSessions.actualPlacementLevel,
          })
          .from(diagnosticSessions)
          .where(eq(diagnosticSessions.studentId, studentData.id))
          .orderBy(desc(diagnosticSessions.startedAt))
          .limit(5)
      : [];

    // Get level promotion history (only approved ones visible to student)
    const promotions = studentData
      ? await db
          .select({
            id: levelPromotions.id,
            fromLevel: levelPromotions.fromLevel,
            toLevel: levelPromotions.toLevel,
            status: levelPromotions.status,
            appliedAt: levelPromotions.appliedAt,
          })
          .from(levelPromotions)
          .where(
            and(
              eq(levelPromotions.studentId, studentData.id),
              eq(levelPromotions.status, 'approved')
            )
          )
          .orderBy(desc(levelPromotions.appliedAt))
      : [];

    return NextResponse.json({
      profile: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        phone: userData.phone || null,
        avatarUrl: userData.avatarUrl,
        studentNumber: studentData?.studentNumber || null,
        currentLevel: userData.currentLevel,
        initialLevel: userData.initialLevel,
        levelStatus: userData.levelStatus,
        memberSince: userData.createdAt.toISOString(),
      },
      currentClass: currentEnrollment[0] || null,
      attendance: {
        summary: attendanceSummary,
        rate: attendanceRate,
        total: totalSessions,
      },
      progress: {
        competencyRate,
        total: Number(progressStats?.total) || 0,
        achieved: Number(progressStats?.competent) || 0,
      },
      diagnosticHistory: diagnostics.map(d => ({
        id: d.id,
        date: d.completedAt?.toISOString() || d.startedAt.toISOString(),
        status: d.status,
        recommendedLevel: d.recommendedLevel,
        placedLevel: d.actualPlacementLevel,
      })),
      levelHistory: promotions.map(p => ({
        id: p.id,
        fromLevel: p.fromLevel,
        toLevel: p.toLevel,
        date: p.appliedAt?.toISOString() || null,
      })),
    });
  } catch (error) {
    console.error('Error fetching student profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

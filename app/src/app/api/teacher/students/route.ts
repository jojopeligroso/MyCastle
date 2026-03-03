/**
 * GET /api/teacher/students
 * List all students accessible to the current teacher
 * Students are accessible if enrolled in one of the teacher's classes
 */

import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users, classes, enrollments } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { requireAuth, getTenantId, getCurrentUser } from '@/lib/auth/utils';

export async function GET() {
  try {
    await requireAuth(['teacher']);
    const user = await getCurrentUser();
    const tenantId = await getTenantId();

    if (!user || !tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all classes taught by this teacher
    const teacherClasses = await db
      .select({
        id: classes.id,
        name: classes.name,
        code: classes.code,
        level: classes.level,
      })
      .from(classes)
      .where(
        and(
          eq(classes.teacherId, user.id),
          eq(classes.tenantId, tenantId),
          eq(classes.status, 'active')
        )
      );

    if (teacherClasses.length === 0) {
      return NextResponse.json({ students: [], classes: [] });
    }

    const teacherClassIds = teacherClasses.map(c => c.id);

    // Get all students enrolled in those classes
    const studentEnrollments = await db
      .select({
        studentId: enrollments.studentId,
        classId: enrollments.classId,
        enrollmentDate: enrollments.enrollmentDate,
        status: enrollments.status,
      })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.tenantId, tenantId),
          eq(enrollments.status, 'active'),
          inArray(enrollments.classId, teacherClassIds)
        )
      );

    const studentIds = [...new Set(studentEnrollments.map(e => e.studentId))];

    if (studentIds.length === 0) {
      return NextResponse.json({ students: [], classes: teacherClasses });
    }

    // Get student details (exclude sensitive PII)
    const students = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        currentLevel: users.currentLevel,
        avatarUrl: users.avatarUrl,
        isActive: users.isActive,
      })
      .from(users)
      .where(and(eq(users.role, 'student'), inArray(users.id, studentIds)));

    // Attach enrollment info to each student
    const studentsWithEnrollments = students.map(student => {
      const studentEnrollmentList = studentEnrollments
        .filter(e => e.studentId === student.id)
        .map(e => {
          const cls = teacherClasses.find(c => c.id === e.classId);
          return {
            classId: e.classId,
            className: cls?.name || 'Unknown',
            classCode: cls?.code,
            classLevel: cls?.level,
            enrollmentDate: e.enrollmentDate,
          };
        });

      return {
        ...student,
        enrollments: studentEnrollmentList,
      };
    });

    return NextResponse.json({
      students: studentsWithEnrollments,
      classes: teacherClasses,
    });
  } catch (error) {
    console.error('Error fetching teacher students:', error);
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
  }
}

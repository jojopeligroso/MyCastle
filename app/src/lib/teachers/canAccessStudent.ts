/**
 * Teacher Student Access Utilities
 * Verifies that a teacher can access a student based on class enrollment
 * Ref: STUDENT_PROFILE_ROADMAP.md Task #4
 */

import { db } from '@/db';
import { classes, enrollments } from '@/db/schema/academic';
import { eq, and, inArray } from 'drizzle-orm';

/**
 * Check if a teacher can access a student's profile
 * A teacher can access a student if the student is enrolled in any of the teacher's classes
 *
 * @param teacherId - The teacher's user ID
 * @param studentId - The student's user ID
 * @param tenantId - The tenant ID for multi-tenancy isolation
 * @returns true if teacher can access student, false otherwise
 */
export async function canTeacherAccessStudent(
  teacherId: string,
  studentId: string,
  tenantId: string
): Promise<boolean> {
  // Get all classes taught by this teacher
  const teacherClasses = await db
    .select({ id: classes.id })
    .from(classes)
    .where(
      and(
        eq(classes.teacherId, teacherId),
        eq(classes.tenantId, tenantId),
        eq(classes.status, 'active')
      )
    );

  if (teacherClasses.length === 0) {
    return false;
  }

  const teacherClassIds = teacherClasses.map(c => c.id);

  // Check if student is enrolled in any of those classes
  const studentEnrollments = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.tenantId, tenantId),
        eq(enrollments.status, 'active'),
        inArray(enrollments.classId, teacherClassIds)
      )
    )
    .limit(1);

  return studentEnrollments.length > 0;
}

/**
 * Get all student IDs that a teacher can access
 * Useful for listing students or validating bulk operations
 *
 * @param teacherId - The teacher's user ID
 * @param tenantId - The tenant ID for multi-tenancy isolation
 * @returns Array of student user IDs
 */
export async function getAccessibleStudentIds(
  teacherId: string,
  tenantId: string
): Promise<string[]> {
  // Get all classes taught by this teacher
  const teacherClasses = await db
    .select({ id: classes.id })
    .from(classes)
    .where(
      and(
        eq(classes.teacherId, teacherId),
        eq(classes.tenantId, tenantId),
        eq(classes.status, 'active')
      )
    );

  if (teacherClasses.length === 0) {
    return [];
  }

  const teacherClassIds = teacherClasses.map(c => c.id);

  // Get all students enrolled in those classes
  const studentEnrollments = await db
    .select({ studentId: enrollments.studentId })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.tenantId, tenantId),
        eq(enrollments.status, 'active'),
        inArray(enrollments.classId, teacherClassIds)
      )
    );

  // Return unique student IDs
  return [...new Set(studentEnrollments.map(e => e.studentId))];
}

/**
 * Get the classes that connect a teacher to a student
 * Useful for showing context in the teacher profile view
 *
 * @param teacherId - The teacher's user ID
 * @param studentId - The student's user ID
 * @param tenantId - The tenant ID for multi-tenancy isolation
 * @returns Array of class details
 */
export async function getSharedClasses(
  teacherId: string,
  studentId: string,
  tenantId: string
): Promise<Array<{ id: string; name: string; code: string | null; level: string | null }>> {
  // Get teacher's classes
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
        eq(classes.teacherId, teacherId),
        eq(classes.tenantId, tenantId),
        eq(classes.status, 'active')
      )
    );

  if (teacherClasses.length === 0) {
    return [];
  }

  const teacherClassIds = teacherClasses.map(c => c.id);

  // Get student's enrollments in teacher's classes
  const studentEnrollments = await db
    .select({ classId: enrollments.classId })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.tenantId, tenantId),
        eq(enrollments.status, 'active'),
        inArray(enrollments.classId, teacherClassIds)
      )
    );

  const enrolledClassIds = new Set(studentEnrollments.map(e => e.classId));

  // Return only the classes where the student is enrolled
  return teacherClasses.filter(c => enrolledClassIds.has(c.id));
}

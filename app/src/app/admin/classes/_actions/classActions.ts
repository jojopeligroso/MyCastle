'use server';

import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { getTenantId } from '@/lib/auth/utils';
import { revalidatePath } from 'next/cache';

/**
 * Get classes with enrollment details
 */
export async function getClassesWithEnrollment() {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  try {
    const result = await db.execute(sql`
      SELECT
        c.id,
        c.name,
        c.code,
        c.description,
        c.level,
        c.subject,
        c.capacity,
        c.enrolled_count,
        c.teacher_id,
        c.start_date,
        c.end_date,
        c.status,
        u.name AS teacher_name,
        COALESCE(
          (SELECT COUNT(*)
           FROM enrollments e
           WHERE e.class_id = c.id
             AND e.status = 'active'
             AND e.tenant_id = c.tenant_id
          ), 0
        ) AS current_enrollment,
        CASE
          WHEN c.capacity > 0
          THEN (COALESCE(
            (SELECT COUNT(*) FROM enrollments e
             WHERE e.class_id = c.id AND e.status = 'active' AND e.tenant_id = c.tenant_id
            ), 0
          )::float / c.capacity * 100)
          ELSE 0
        END AS capacity_percent
      FROM classes c
      LEFT JOIN users u ON c.teacher_id = u.id
      WHERE c.tenant_id = ${tenantId}
      ORDER BY c.start_date DESC, c.name ASC
    `);

    return result;
  } catch (error) {
    console.error('Error fetching classes with enrollment:', error);
    return [];
  }
}

/**
 * Get class enrollments
 */
export async function getClassEnrollments(classId: string) {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  try {
    const result = await db.execute(sql`
      SELECT
        e.id,
        e.student_id,
        e.enrollment_date,
        e.completion_date,
        e.status,
        e.attendance_rate,
        e.current_grade,
        u.name AS student_name,
        u.email AS student_email,
        s.student_number,
        s.current_level
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      LEFT JOIN students s ON s.user_id = u.id AND s.tenant_id = e.tenant_id
      WHERE e.class_id = ${classId}
        AND e.tenant_id = ${tenantId}
      ORDER BY e.enrollment_date DESC
    `);

    return result;
  } catch (error) {
    console.error('Error fetching class enrollments:', error);
    return [];
  }
}

/**
 * Enroll student in class
 */
export async function enrollStudentInClass(studentUserId: string, classId: string) {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  try {
    // Check capacity
    const [classInfo] = await db.execute(sql`
      SELECT capacity, enrolled_count
      FROM classes
      WHERE id = ${classId}
        AND tenant_id = ${tenantId}
    `);

    if (classInfo && (classInfo as any).capacity <= (classInfo as any).enrolled_count) {
      return { success: false, error: 'Class is at full capacity' };
    }

    // Check if already enrolled
    const existing = await db.execute(sql`
      SELECT id FROM enrollments
      WHERE student_id = ${studentUserId}
        AND class_id = ${classId}
        AND tenant_id = ${tenantId}
        AND status = 'active'
    `);

    if (existing.length > 0) {
      return { success: false, error: 'Student already enrolled in this class' };
    }

    // Create enrollment
    const result = await db.execute(sql`
      INSERT INTO enrollments (
        tenant_id,
        student_id,
        class_id,
        enrollment_date,
        status
      ) VALUES (
        ${tenantId},
        ${studentUserId},
        ${classId},
        CURRENT_DATE,
        'active'
      )
      RETURNING id
    `);

    // Update class enrolled_count
    await db.execute(sql`
      UPDATE classes
      SET enrolled_count = enrolled_count + 1
      WHERE id = ${classId}
        AND tenant_id = ${tenantId}
    `);

    const enrollmentId = (result[0] as any).id;

    // Create audit log
    await db.execute(sql`
      INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, changes)
      VALUES (
        ${tenantId},
        (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1),
        'class.enroll',
        'enrollment',
        ${enrollmentId},
        ${JSON.stringify({ studentUserId, classId })}
      )
    `);

    revalidatePath('/admin/classes');
    revalidatePath(`/admin/classes/${classId}`);
    return { success: true, enrollmentId };
  } catch (error) {
    console.error('Error enrolling student:', error);
    return { success: false, error: 'Failed to enroll student' };
  }
}

/**
 * Remove student from class
 */
export async function removeStudentFromClass(enrollmentId: string) {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  try {
    // Get enrollment details
    const [enrollment] = await db.execute(sql`
      SELECT class_id FROM enrollments
      WHERE id = ${enrollmentId}
        AND tenant_id = ${tenantId}
    `);

    if (!enrollment) {
      return { success: false, error: 'Enrollment not found' };
    }

    // Update enrollment status
    await db.execute(sql`
      UPDATE enrollments
      SET status = 'withdrawn',
          completion_date = CURRENT_DATE
      WHERE id = ${enrollmentId}
        AND tenant_id = ${tenantId}
    `);

    // Update class enrolled_count
    await db.execute(sql`
      UPDATE classes
      SET enrolled_count = (
        SELECT COUNT(*) FROM enrollments
        WHERE class_id = ${(enrollment as any).class_id}
          AND status = 'active'
          AND tenant_id = ${tenantId}
      )
      WHERE id = ${(enrollment as any).class_id}
        AND tenant_id = ${tenantId}
    `);

    // Create audit log
    await db.execute(sql`
      INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id)
      VALUES (
        ${tenantId},
        (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1),
        'class.unenroll',
        'enrollment',
        ${enrollmentId}
      )
    `);

    revalidatePath('/admin/classes');
    return { success: true };
  } catch (error) {
    console.error('Error removing student from class:', error);
    return { success: false, error: 'Failed to remove student' };
  }
}

/**
 * Assign teacher to class
 */
export async function assignTeacherToClass(classId: string, teacherUserId: string) {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  try {
    await db.execute(sql`
      UPDATE classes
      SET teacher_id = ${teacherUserId},
          updated_at = NOW()
      WHERE id = ${classId}
        AND tenant_id = ${tenantId}
    `);

    // Create audit log
    await db.execute(sql`
      INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, changes)
      VALUES (
        ${tenantId},
        (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1),
        'class.assign_teacher',
        'class',
        ${classId},
        ${JSON.stringify({ teacherUserId })}
      )
    `);

    revalidatePath('/admin/classes');
    revalidatePath(`/admin/classes/${classId}`);
    return { success: true };
  } catch (error) {
    console.error('Error assigning teacher:', error);
    return { success: false, error: 'Failed to assign teacher' };
  }
}

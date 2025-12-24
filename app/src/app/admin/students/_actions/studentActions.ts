'use server';

/**
 * Server Actions for Student Registry
 * Handles student CRUD operations, level approval, and duplicate detection
 * Ref: Student Registry Implementation Plan - Phase 3
 */

import { db } from '@/db';
import { users, submissions, assignments } from '@/db/schema';
import { sql, eq, and } from 'drizzle-orm';
import { getTenantId } from '@/lib/auth/utils';
import { revalidatePath } from 'next/cache';

/**
 * Student creation data interface
 */
interface CreateStudentData {
  name: string;
  email: string;
  phone?: string;
  current_level?: string;
  initial_level?: string;
  level_status?: 'confirmed' | 'provisional' | 'pending_approval';
  visa_type?: string;
  visa_expiry?: string;

  // Diagnostic test data (optional)
  diagnostic_test?: {
    score: number;
    max_score: number;
    suggested_level: string;
  };
}

/**
 * Student update data interface
 */
interface UpdateStudentData {
  name?: string;
  email?: string;
  phone?: string;
  current_level?: string;
  initial_level?: string;
  level_status?: 'confirmed' | 'provisional' | 'pending_approval';
  visa_type?: string;
  visa_expiry?: string;
  status?: 'active' | 'inactive' | 'suspended' | 'archived';
}

/**
 * Create a new student
 *
 * @param data - Student creation data
 * @returns Success status and student ID or error message
 *
 * Logic:
 * - If diagnostic_test provided: Create assessment record + set level as provisional
 * - If manual level selection: Set level as confirmed
 * - Creates audit log entry
 * - Revalidates student registry cache
 */
export async function createStudent(data: CreateStudentData) {
  const tenantId = await getTenantId();
  if (!tenantId) {
    return { success: false, error: 'Tenant not found' };
  }

  try {
    // Check for duplicate email
    const [existing] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, data.email), eq(users.tenant_id, tenantId)))
      .limit(1);

    if (existing) {
      return { success: false, error: 'A user with this email already exists' };
    }

    // Determine level status based on input
    let levelStatus: 'confirmed' | 'provisional' | 'pending_approval' = 'confirmed';
    let currentLevel = data.current_level || null;
    let initialLevel = data.initial_level || null;

    if (data.diagnostic_test) {
      // Diagnostic test path: set as provisional
      levelStatus = 'provisional';
      currentLevel = data.diagnostic_test.suggested_level;
      initialLevel = data.diagnostic_test.suggested_level;
    } else if (data.level_status) {
      // Use explicitly provided status
      levelStatus = data.level_status;
    }

    // Create student user record
    const [newStudent] = await db
      .insert(users)
      .values({
        tenant_id: tenantId,
        email: data.email,
        name: data.name,
        phone: data.phone || null,
        role: 'student',
        status: 'active',
        current_level: currentLevel,
        initial_level: initialLevel,
        level_status: levelStatus,
        visa_type: data.visa_type || null,
        visa_expiry: data.visa_expiry || null,
        email_verified: false,
        metadata: data.diagnostic_test
          ? {
              enrollment_date: new Date().toISOString().split('T')[0],
              notes: [
                {
                  date: new Date().toISOString(),
                  content: `Diagnostic test: ${data.diagnostic_test.score}/${data.diagnostic_test.max_score}. Suggested level: ${data.diagnostic_test.suggested_level}`,
                  type: 'general',
                },
              ],
            }
          : {
              enrollment_date: new Date().toISOString().split('T')[0],
            },
      })
      .returning();

    // If diagnostic test was provided, create assessment record
    if (data.diagnostic_test && newStudent) {
      try {
        // First, check if a diagnostic assignment exists or create one
        const diagnosticAssignmentId = await getOrCreateDiagnosticAssignment(tenantId);

        // Create submission record for the diagnostic test
        await db.execute(sql`
          INSERT INTO submissions (tenant_id, assignment_id, student_id, submitted_at, content, status)
          VALUES (
            ${tenantId},
            ${diagnosticAssignmentId},
            ${newStudent.id},
            NOW(),
            ${JSON.stringify({
              score: data.diagnostic_test.score,
              max_score: data.diagnostic_test.max_score,
              percentage: Math.round((data.diagnostic_test.score / data.diagnostic_test.max_score) * 100),
              suggested_level: data.diagnostic_test.suggested_level,
            })},
            'graded'
          )
        `);
      } catch (error) {
        console.error('Failed to create diagnostic test record:', error);
        // Don't fail student creation if diagnostic test record fails
      }
    }

    // Create audit log
    await db.execute(sql`
      INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, changes)
      VALUES (
        ${tenantId},
        (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1),
        'student.create',
        'user',
        ${newStudent.id},
        ${JSON.stringify({
          name: data.name,
          email: data.email,
          role: 'student',
          current_level: currentLevel,
          level_status: levelStatus,
          has_diagnostic_test: !!data.diagnostic_test,
        })}
      )
    `);

    // Revalidate student registry page
    revalidatePath('/admin/students');

    return {
      success: true,
      studentId: newStudent.id,
      levelStatus: levelStatus,
    };
  } catch (error) {
    console.error('Error creating student:', error);
    return { success: false, error: 'Failed to create student' };
  }
}

/**
 * Update student information
 *
 * @param studentId - Student user ID
 * @param data - Fields to update
 * @returns Success status or error message
 */
export async function updateStudent(studentId: string, data: UpdateStudentData) {
  const tenantId = await getTenantId();
  if (!tenantId) {
    return { success: false, error: 'Tenant not found' };
  }

  try {
    // Get current student data
    const [currentStudent] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, studentId), eq(users.tenant_id, tenantId), eq(users.role, 'student')))
      .limit(1);

    if (!currentStudent) {
      return { success: false, error: 'Student not found' };
    }

    // Check for email conflicts if email is being changed
    if (data.email && data.email !== currentStudent.email) {
      const [emailConflict] = await db
        .select()
        .from(users)
        .where(and(eq(users.email, data.email), eq(users.tenant_id, tenantId)))
        .limit(1);

      if (emailConflict) {
        return { success: false, error: 'Email already in use' };
      }
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.current_level !== undefined) updateData.current_level = data.current_level;
    if (data.initial_level !== undefined) updateData.initial_level = data.initial_level;
    if (data.level_status !== undefined) updateData.level_status = data.level_status;
    if (data.visa_type !== undefined) updateData.visa_type = data.visa_type;
    if (data.visa_expiry !== undefined) updateData.visa_expiry = data.visa_expiry;
    if (data.status !== undefined) updateData.status = data.status;

    // Update student
    await db
      .update(users)
      .set(updateData)
      .where(and(eq(users.id, studentId), eq(users.tenant_id, tenantId)));

    // Create audit log
    await db.execute(sql`
      INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, changes)
      VALUES (
        ${tenantId},
        (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1),
        'student.update',
        'user',
        ${studentId},
        ${JSON.stringify({ updated_fields: Object.keys(data) })}
      )
    `);

    revalidatePath('/admin/students');
    revalidatePath(`/admin/students/${studentId}`);

    return { success: true };
  } catch (error) {
    console.error('Error updating student:', error);
    return { success: false, error: 'Failed to update student' };
  }
}

/**
 * Archive/deactivate student (soft delete)
 *
 * @param studentId - Student user ID
 * @param reason - Reason for archiving
 * @returns Success status or error message
 */
export async function archiveStudent(studentId: string, reason: string) {
  const tenantId = await getTenantId();
  if (!tenantId) {
    return { success: false, error: 'Tenant not found' };
  }

  try {
    // Verify student exists and belongs to tenant
    const [student] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, studentId), eq(users.tenant_id, tenantId), eq(users.role, 'student')))
      .limit(1);

    if (!student) {
      return { success: false, error: 'Student not found' };
    }

    // Soft delete
    await db
      .update(users)
      .set({
        status: 'archived',
        deleted_at: new Date(),
        updated_at: new Date(),
      })
      .where(and(eq(users.id, studentId), eq(users.tenant_id, tenantId)));

    // Create audit log
    await db.execute(sql`
      INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, changes, metadata)
      VALUES (
        ${tenantId},
        (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1),
        'student.archive',
        'user',
        ${studentId},
        ${JSON.stringify({ status: 'archived' })},
        ${JSON.stringify({ reason })}
      )
    `);

    revalidatePath('/admin/students');
    return { success: true };
  } catch (error) {
    console.error('Error archiving student:', error);
    return { success: false, error: 'Failed to archive student' };
  }
}

/**
 * Approve a provisional CEFR level (change from provisional to confirmed)
 * Admin/DOS only action
 *
 * @param studentId - Student user ID
 * @returns Success status or error message
 */
export async function approveLevelStatus(studentId: string) {
  const tenantId = await getTenantId();
  if (!tenantId) {
    return { success: false, error: 'Tenant not found' };
  }

  try {
    // Get current student
    const [student] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, studentId), eq(users.tenant_id, tenantId), eq(users.role, 'student')))
      .limit(1);

    if (!student) {
      return { success: false, error: 'Student not found' };
    }

    if (student.level_status !== 'provisional' && student.level_status !== 'pending_approval') {
      return { success: false, error: 'Student level is already confirmed' };
    }

    // Update to confirmed
    await db
      .update(users)
      .set({
        level_status: 'confirmed',
        updated_at: new Date(),
      })
      .where(and(eq(users.id, studentId), eq(users.tenant_id, tenantId)));

    // Create audit log
    await db.execute(sql`
      INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, changes)
      VALUES (
        ${tenantId},
        (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1),
        'student.level_approved',
        'user',
        ${studentId},
        ${JSON.stringify({
          level_status: 'confirmed',
          approved_level: student.current_level,
          previous_status: student.level_status,
        })}
      )
    `);

    revalidatePath('/admin/students');
    revalidatePath(`/admin/students/${studentId}`);

    return { success: true };
  } catch (error) {
    console.error('Error approving level:', error);
    return { success: false, error: 'Failed to approve level' };
  }
}

/**
 * Get potential duplicate student records
 * Uses v_student_duplicate_candidates database view
 *
 * @returns Array of duplicate candidate pairs
 */
export async function getDuplicateCandidates() {
  const tenantId = await getTenantId();
  if (!tenantId) {
    return [];
  }

  try {
    const result = await db.execute(sql`
      SELECT * FROM v_student_duplicate_candidates
      WHERE tenant_id = ${tenantId}
      ORDER BY match_score DESC
      LIMIT 50
    `);

    return result as unknown as Array<{
      student1_id: string;
      student1_name: string;
      student1_email: string;
      student1_created: Date;
      student2_id: string;
      student2_name: string;
      student2_email: string;
      student2_created: Date;
      match_score: number;
      email_match: boolean;
      name_match: boolean;
      phone_match: boolean;
      name_normalized_match: boolean;
      date_proximity: boolean;
    }>;
  } catch (error) {
    console.error('Error fetching duplicate candidates:', error);
    return [];
  }
}

/**
 * Helper: Get or create the diagnostic assignment
 * Used for storing diagnostic test results
 */
async function getOrCreateDiagnosticAssignment(tenantId: string): Promise<string> {
  // Check if diagnostic assignment exists
  const existing = await db.execute(sql`
    SELECT id FROM assignments
    WHERE tenant_id = ${tenantId}
      AND title = 'Diagnostic Test'
      AND class_id IS NULL
    LIMIT 1
  `);

  if (existing && existing.length > 0) {
    return existing[0].id;
  }

  // Create diagnostic assignment
  const result = await db.execute(sql`
    INSERT INTO assignments (tenant_id, title, description, assignment_type)
    VALUES (
      ${tenantId},
      'Diagnostic Test',
      'Initial diagnostic test for new students to determine CEFR level',
      'diagnostic'
    )
    RETURNING id
  `);

  return result[0].id;
}

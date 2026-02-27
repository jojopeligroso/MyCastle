'use server';

/**
 * Server Actions for Student Registry
 * Handles student CRUD operations, level approval, and duplicate detection
 * Ref: Student Registry Implementation Plan - Phase 3
 */

import { db } from '@/db';
import { users } from '@/db/schema';
import { sql, eq, and } from 'drizzle-orm';
import { getTenantId } from '@/lib/auth/utils';
import { revalidatePath } from 'next/cache';

/**
 * Student creation data interface
 */
export interface CreateStudentData {
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
export interface UpdateStudentData {
  // User table fields
  name?: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  nationality?: string;
  // Student table fields
  student_number?: string;
  is_visa_student?: boolean;
  visa_type?: string;
  visa_expiry_date?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  medical_conditions?: string;
  dietary_requirements?: string;
  status?: 'active' | 'inactive' | 'suspended' | 'archived' | 'graduated' | 'withdrawn';
  // Legacy fields (kept for compatibility)
  current_level?: string;
  initial_level?: string;
  level_status?: 'confirmed' | 'provisional' | 'pending_approval';
  visa_expiry?: string;
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
      .where(and(eq(users.email, data.email), eq(users.tenantId, tenantId)))
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

    // TODO: CRITICAL - This needs refactoring to split data between users and students tables
    // Currently inserting only valid user fields. Student-specific fields (visa, levels) need to go to students table

    // Create student user record
    const [newStudent] = await db
      .insert(users)
      .values({
        tenantId: tenantId,
        email: data.email,
        name: data.name,
        role: 'student',
        isActive: true,
        metadata: data.diagnostic_test
          ? {
              enrollment_date: new Date().toISOString().split('T')[0],
              current_level: currentLevel,
              initial_level: initialLevel,
              level_status: levelStatus,
              visa_type: data.visa_type || null,
              visa_expiry: data.visa_expiry || null,
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
              current_level: currentLevel,
              initial_level: initialLevel,
              level_status: levelStatus,
              visa_type: data.visa_type || null,
              visa_expiry: data.visa_expiry || null,
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
              percentage: Math.round(
                (data.diagnostic_test.score / data.diagnostic_test.max_score) * 100
              ),
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
 * Updates both users table and students table as appropriate
 *
 * @param studentId - Student ID (from students table) or User ID
 * @param data - Fields to update
 * @returns Success status or error message
 */
export async function updateStudent(studentId: string, data: UpdateStudentData) {
  const tenantId = await getTenantId();
  if (!tenantId) {
    return { success: false, error: 'Tenant not found' };
  }

  try {
    // First, try to find by student ID
    let studentRecord = await db.execute(sql`
      SELECT s.id as student_id, s.user_id, u.id as user_id_check, u.email as current_email
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ${studentId} AND s.tenant_id = ${tenantId}
      LIMIT 1
    `);

    let userId: string;
    let studentTableId: string;
    let currentEmail: string;

    if (studentRecord && studentRecord.length > 0) {
      const record = studentRecord[0] as {
        student_id: string;
        user_id: string;
        current_email: string;
      };
      userId = record.user_id;
      studentTableId = record.student_id;
      currentEmail = record.current_email;
    } else {
      // Try to find by user ID (backwards compatibility)
      const userRecord = await db.execute(sql`
        SELECT u.id as user_id, u.email as current_email, s.id as student_id
        FROM users u
        LEFT JOIN students s ON s.user_id = u.id AND s.tenant_id = ${tenantId}
        WHERE u.id = ${studentId} AND u.tenant_id = ${tenantId} AND u.role = 'student'
        LIMIT 1
      `);

      if (!userRecord || userRecord.length === 0) {
        return { success: false, error: 'Student not found' };
      }

      const record = userRecord[0] as {
        user_id: string;
        current_email: string;
        student_id: string | null;
      };
      userId = record.user_id;
      studentTableId = record.student_id || '';
      currentEmail = record.current_email;
    }

    // Check for email conflicts if email is being changed
    if (data.email && data.email !== currentEmail) {
      const emailConflict = await db.execute(sql`
        SELECT id FROM users
        WHERE email = ${data.email} AND tenant_id = ${tenantId} AND id != ${userId}
        LIMIT 1
      `);

      if (emailConflict && emailConflict.length > 0) {
        return { success: false, error: 'Email already in use' };
      }
    }

    // Update users table
    const userUpdates: string[] = [];
    const userValues: unknown[] = [];

    if (data.name !== undefined) {
      userUpdates.push('name = $' + (userValues.length + 1));
      userValues.push(data.name);
    }
    if (data.email !== undefined) {
      userUpdates.push('email = $' + (userValues.length + 1));
      userValues.push(data.email);
    }
    if (data.phone !== undefined) {
      userUpdates.push('phone = $' + (userValues.length + 1));
      userValues.push(data.phone || null);
    }
    if (data.date_of_birth !== undefined) {
      userUpdates.push('date_of_birth = $' + (userValues.length + 1));
      userValues.push(data.date_of_birth || null);
    }
    if (data.nationality !== undefined) {
      userUpdates.push('nationality = $' + (userValues.length + 1));
      userValues.push(data.nationality || null);
    }
    if (data.status !== undefined) {
      userUpdates.push('is_active = $' + (userValues.length + 1));
      userValues.push(data.status === 'active');
    }

    if (userUpdates.length > 0) {
      userUpdates.push('updated_at = NOW()');
      await db.execute(
        sql.raw(
          `
        UPDATE users SET ${userUpdates.join(', ')}
        WHERE id = '${userId}' AND tenant_id = '${tenantId}'
      `.replace(/\$(\d+)/g, (_, n) => {
            const val = userValues[parseInt(n) - 1];
            if (val === null) return 'NULL';
            if (typeof val === 'boolean') return val.toString();
            return `'${String(val).replace(/'/g, "''")}'`;
          })
        )
      );
    }

    // Update students table if we have a student record
    if (studentTableId) {
      const studentUpdates: string[] = [];

      if (data.student_number !== undefined) {
        studentUpdates.push(
          `student_number = ${data.student_number ? `'${data.student_number.replace(/'/g, "''")}'` : 'NULL'}`
        );
      }
      if (data.is_visa_student !== undefined) {
        studentUpdates.push(`is_visa_student = ${data.is_visa_student}`);
      }
      if (data.visa_type !== undefined) {
        studentUpdates.push(
          `visa_type = ${data.visa_type ? `'${data.visa_type.replace(/'/g, "''")}'` : 'NULL'}`
        );
      }
      if (data.visa_expiry_date !== undefined || data.visa_expiry !== undefined) {
        const expiryDate = data.visa_expiry_date || data.visa_expiry;
        studentUpdates.push(`visa_expiry_date = ${expiryDate ? `'${expiryDate}'` : 'NULL'}`);
      }
      if (data.emergency_contact_name !== undefined) {
        studentUpdates.push(
          `emergency_contact_name = ${data.emergency_contact_name ? `'${data.emergency_contact_name.replace(/'/g, "''")}'` : 'NULL'}`
        );
      }
      if (data.emergency_contact_phone !== undefined) {
        studentUpdates.push(
          `emergency_contact_phone = ${data.emergency_contact_phone ? `'${data.emergency_contact_phone.replace(/'/g, "''")}'` : 'NULL'}`
        );
      }
      if (data.emergency_contact_relationship !== undefined) {
        studentUpdates.push(
          `emergency_contact_relationship = ${data.emergency_contact_relationship ? `'${data.emergency_contact_relationship.replace(/'/g, "''")}'` : 'NULL'}`
        );
      }
      if (data.medical_conditions !== undefined) {
        studentUpdates.push(
          `medical_conditions = ${data.medical_conditions ? `'${data.medical_conditions.replace(/'/g, "''")}'` : 'NULL'}`
        );
      }
      if (data.dietary_requirements !== undefined) {
        studentUpdates.push(
          `dietary_requirements = ${data.dietary_requirements ? `'${data.dietary_requirements.replace(/'/g, "''")}'` : 'NULL'}`
        );
      }
      if (data.status !== undefined) {
        // Map status values for students table
        const studentStatus =
          data.status === 'inactive' || data.status === 'archived' ? 'withdrawn' : data.status;
        studentUpdates.push(`status = '${studentStatus}'`);
      }

      if (studentUpdates.length > 0) {
        studentUpdates.push('updated_at = NOW()');
        await db.execute(
          sql.raw(`
          UPDATE students SET ${studentUpdates.join(', ')}
          WHERE id = '${studentTableId}' AND tenant_id = '${tenantId}'
        `)
        );
      }
    }

    // Create audit log
    try {
      await db.execute(sql`
        INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, changes)
        VALUES (
          ${tenantId},
          ${userId},
          'student.update',
          'student',
          ${studentTableId || userId},
          ${JSON.stringify({ updated_fields: Object.keys(data) })}
        )
      `);
    } catch (auditError) {
      // Don't fail the update if audit log fails
      console.error('Failed to create audit log:', auditError);
    }

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
      .where(and(eq(users.id, studentId), eq(users.tenantId, tenantId), eq(users.role, 'student')))
      .limit(1);

    if (!student) {
      return { success: false, error: 'Student not found' };
    }

    // Soft delete
    await db
      .update(users)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, studentId), eq(users.tenantId, tenantId)));

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
      .where(and(eq(users.id, studentId), eq(users.tenantId, tenantId), eq(users.role, 'student')))
      .limit(1);

    if (!student) {
      return { success: false, error: 'Student not found' };
    }

    // TODO: CRITICAL - level_status and current_level should be in students table or enrollment records
    const levelStatus = (student.metadata as Record<string, unknown>)?.level_status;
    const currentLevel = (student.metadata as Record<string, unknown>)?.current_level;

    if (levelStatus !== 'provisional' && levelStatus !== 'pending_approval') {
      return { success: false, error: 'Student level is already confirmed' };
    }

    // Update to confirmed (stored in metadata until proper refactoring)
    await db
      .update(users)
      .set({
        metadata: sql`COALESCE(metadata, '{}'::jsonb) || '{"level_status": "confirmed"}'::jsonb`,
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, studentId), eq(users.tenantId, tenantId)));

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
          approved_level: currentLevel,
          previous_status: levelStatus,
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
    return (existing[0] as { id: string }).id;
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

  return (result[0] as { id: string }).id;
}

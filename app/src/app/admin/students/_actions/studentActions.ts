'use server';

import { db } from '@/db';
import { users } from '@/db/schema';
import { sql, eq, and } from 'drizzle-orm';
import { getTenantId } from '@/lib/auth/utils';
import { revalidatePath } from 'next/cache';

/**
 * Types for Student Registry
 */
export type StudentWithMetadata = {
  id: string;
  tenant_id: string;
  user_id: string;
  student_number: string | null;
  date_of_birth: Date | null;
  nationality: string | null;
  passport_number: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  visa_type: string | null;
  visa_number: string | null;
  visa_expiry_date: Date | null;
  ilr_status: boolean;
  current_level: string | null;
  intake_date: Date | null;
  expected_completion_date: Date | null;
  status: string;
  tags: string[];
  created_at: Date;
  updated_at: Date;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  active_enrollments_count: number;
  overall_attendance_rate: number;
  days_until_visa_expiry: number | null;
  visa_status: string;
  total_documents: number;
  verified_documents: number;
  has_safeguarding_notes: boolean;
  outstanding_followups: number;
};

/**
 * Get students with metadata
 */
export async function getStudentsWithMetadata(): Promise<StudentWithMetadata[]> {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  try {
    const result = await db.execute(sql`
      SELECT * FROM v_students_with_metadata
      ORDER BY name ASC
    `);

    return result as unknown as StudentWithMetadata[];
  } catch (error) {
    console.error('Error fetching students with metadata:', error);
    return [];
  }
}

/**
 * Get single student details
 */
export async function getStudentById(studentId: string): Promise<StudentWithMetadata | null> {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  try {
    const result = await db.execute(sql`
      SELECT * FROM v_students_with_metadata
      WHERE id = ${studentId}
    `);

    const students = result as unknown as StudentWithMetadata[];
    return students.length > 0 ? students[0] : null;
  } catch (error) {
    console.error('Error fetching student by ID:', error);
    return null;
  }
}

/**
 * Create a new student profile
 */
export async function createStudent(data: {
  userId: string;
  studentNumber?: string;
  dateOfBirth?: Date;
  nationality?: string;
  passportNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  visaType?: string;
  visaNumber?: string;
  visaExpiryDate?: Date;
  ilrStatus?: boolean;
  currentLevel?: string;
  intakeDate?: Date;
  expectedCompletionDate?: Date;
  tags?: string[];
}) {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  try {
    // Verify user exists
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, data.userId), eq(users.tenant_id, tenantId)));

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Check if student profile already exists
    const existing = await db.execute(sql`
      SELECT id FROM students
      WHERE user_id = ${data.userId}
        AND tenant_id = ${tenantId}
    `);

    if (existing.length > 0) {
      return { success: false, error: 'Student profile already exists for this user' };
    }

    // Create student profile
    const result = await db.execute(sql`
      INSERT INTO students (
        tenant_id,
        user_id,
        student_number,
        date_of_birth,
        nationality,
        passport_number,
        emergency_contact_name,
        emergency_contact_phone,
        address_line1,
        address_line2,
        city,
        postal_code,
        country,
        visa_type,
        visa_number,
        visa_expiry_date,
        ilr_status,
        current_level,
        intake_date,
        expected_completion_date,
        tags,
        status,
        created_by
      ) VALUES (
        ${tenantId},
        ${data.userId},
        ${data.studentNumber || null},
        ${data.dateOfBirth || null},
        ${data.nationality || null},
        ${data.passportNumber || null},
        ${data.emergencyContactName || null},
        ${data.emergencyContactPhone || null},
        ${data.addressLine1 || null},
        ${data.addressLine2 || null},
        ${data.city || null},
        ${data.postalCode || null},
        ${data.country || null},
        ${data.visaType || null},
        ${data.visaNumber || null},
        ${data.visaExpiryDate || null},
        ${data.ilrStatus || false},
        ${data.currentLevel || null},
        ${data.intakeDate || null},
        ${data.expectedCompletionDate || null},
        ${data.tags || []},
        'active',
        (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1)
      )
      RETURNING id
    `);

    const studentId = (result[0] as any).id;

    // Create audit log
    await db.execute(sql`
      INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, changes)
      VALUES (
        ${tenantId},
        (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1),
        'student.create',
        'student',
        ${studentId},
        ${JSON.stringify(data)}
      )
    `);

    revalidatePath('/admin/students');
    return { success: true, studentId };
  } catch (error) {
    console.error('Error creating student:', error);
    return { success: false, error: 'Failed to create student profile' };
  }
}

/**
 * Update student profile
 */
export async function updateStudent(
  studentId: string,
  data: Partial<{
    studentNumber: string;
    dateOfBirth: Date;
    nationality: string;
    passportNumber: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    postalCode: string;
    country: string;
    visaType: string;
    visaNumber: string;
    visaExpiryDate: Date;
    ilrStatus: boolean;
    currentLevel: string;
    intakeDate: Date;
    expectedCompletionDate: Date;
    status: string;
    tags: string[];
  }>
) {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  try {
    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        updates.push(`${snakeKey} = $${values.length + 1}`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      return { success: false, error: 'No fields to update' };
    }

    updates.push(`updated_by = (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1)`);
    updates.push(`updated_at = NOW()`);

    await db.execute(sql.raw(`
      UPDATE students
      SET ${updates.join(', ')}
      WHERE id = '${studentId}'
        AND tenant_id = '${tenantId}'
    `));

    // Create audit log
    await db.execute(sql`
      INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, changes)
      VALUES (
        ${tenantId},
        (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1),
        'student.update',
        'student',
        ${studentId},
        ${JSON.stringify(data)}
      )
    `);

    revalidatePath('/admin/students');
    revalidatePath(`/admin/students/${studentId}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating student:', error);
    return { success: false, error: 'Failed to update student profile' };
  }
}

/**
 * Get student documents
 */
export async function getStudentDocuments(studentId: string) {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  try {
    const result = await db.execute(sql`
      SELECT * FROM student_documents
      WHERE student_id = ${studentId}
        AND tenant_id = ${tenantId}
      ORDER BY created_at DESC
    `);

    return result;
  } catch (error) {
    console.error('Error fetching student documents:', error);
    return [];
  }
}

/**
 * Add student document
 */
export async function addStudentDocument(data: {
  studentId: string;
  documentType: string;
  documentName: string;
  documentUrl: string;
  fileSize?: number;
  mimeType?: string;
  expiryDate?: Date;
  issueDate?: Date;
  issuingAuthority?: string;
  visibility?: string;
}) {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  try {
    const result = await db.execute(sql`
      INSERT INTO student_documents (
        tenant_id,
        student_id,
        document_type,
        document_name,
        document_url,
        file_size,
        mime_type,
        expiry_date,
        issue_date,
        issuing_authority,
        visibility,
        created_by
      ) VALUES (
        ${tenantId},
        ${data.studentId},
        ${data.documentType},
        ${data.documentName},
        ${data.documentUrl},
        ${data.fileSize || null},
        ${data.mimeType || null},
        ${data.expiryDate || null},
        ${data.issueDate || null},
        ${data.issuingAuthority || null},
        ${data.visibility || 'admin'},
        (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1)
      )
      RETURNING id
    `);

    const documentId = (result[0] as any).id;

    // Create audit log
    await db.execute(sql`
      INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, changes)
      VALUES (
        ${tenantId},
        (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1),
        'student.document.add',
        'student_document',
        ${documentId},
        ${JSON.stringify(data)}
      )
    `);

    revalidatePath('/admin/students');
    revalidatePath(`/admin/students/${data.studentId}`);
    return { success: true, documentId };
  } catch (error) {
    console.error('Error adding student document:', error);
    return { success: false, error: 'Failed to add document' };
  }
}

/**
 * Get student notes (filtered by permissions)
 */
export async function getStudentNotes(studentId: string) {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  try {
    // TODO: Add role-based filtering for safeguarding notes
    const result = await db.execute(sql`
      SELECT * FROM student_notes
      WHERE student_id = ${studentId}
        AND tenant_id = ${tenantId}
      ORDER BY created_at DESC
    `);

    return result;
  } catch (error) {
    console.error('Error fetching student notes:', error);
    return [];
  }
}

/**
 * Add student note
 */
export async function addStudentNote(data: {
  studentId: string;
  noteType: string;
  noteTitle?: string;
  noteContent: string;
  isSafeguarding?: boolean;
  requiresFollowup?: boolean;
  followupDate?: Date;
}) {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  try {
    const result = await db.execute(sql`
      INSERT INTO student_notes (
        tenant_id,
        student_id,
        note_type,
        note_title,
        note_content,
        is_safeguarding,
        requires_followup,
        followup_date,
        created_by
      ) VALUES (
        ${tenantId},
        ${data.studentId},
        ${data.noteType},
        ${data.noteTitle || null},
        ${data.noteContent},
        ${data.isSafeguarding || false},
        ${data.requiresFollowup || false},
        ${data.followupDate || null},
        (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1)
      )
      RETURNING id
    `);

    const noteId = (result[0] as any).id;

    // Create audit log
    await db.execute(sql`
      INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, changes)
      VALUES (
        ${tenantId},
        (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1),
        'student.note.add',
        'student_note',
        ${noteId},
        ${JSON.stringify({ ...data, isSafeguarding: data.isSafeguarding || false })}
      )
    `);

    revalidatePath('/admin/students');
    revalidatePath(`/admin/students/${data.studentId}`);
    return { success: true, noteId };
  } catch (error) {
    console.error('Error adding student note:', error);
    return { success: false, error: 'Failed to add note' };
  }
}

/**
 * Get duplicate student candidates
 */
export async function getDuplicateStudentCandidates() {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  try {
    const result = await db.execute(sql`
      SELECT * FROM v_student_duplicate_candidates
      WHERE similarity_score >= 50
      ORDER BY similarity_score DESC
      LIMIT 20
    `);

    return result;
  } catch (error) {
    console.error('Error fetching duplicate candidates:', error);
    return [];
  }
}

/**
 * Get students by visa status
 */
export async function getStudentsByVisaStatus(status?: string) {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  try {
    const query = status
      ? sql`SELECT * FROM v_student_visa_status WHERE visa_status = ${status} ORDER BY days_until_expiry ASC`
      : sql`SELECT * FROM v_student_visa_status ORDER BY alert_priority ASC NULLS LAST, days_until_expiry ASC`;

    const result = await db.execute(query);
    return result;
  } catch (error) {
    console.error('Error fetching students by visa status:', error);
    return [];
  }
}

/**
 * Assign student to cohort (class)
 */
export async function assignStudentToCohort(studentUserId: string, classId: string) {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  try {
    // Check if already enrolled
    const existing = await db.execute(sql`
      SELECT id FROM enrollments
      WHERE student_id = ${studentUserId}
        AND class_id = ${classId}
        AND tenant_id = ${tenantId}
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

    const enrollmentId = (result[0] as any).id;

    // Update class enrolled_count
    await db.execute(sql`
      UPDATE classes
      SET enrolled_count = (
        SELECT COUNT(*) FROM enrollments
        WHERE class_id = ${classId} AND status = 'active'
      )
      WHERE id = ${classId}
    `);

    // Create audit log
    await db.execute(sql`
      INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, changes)
      VALUES (
        ${tenantId},
        (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1),
        'student.enroll',
        'enrollment',
        ${enrollmentId},
        ${JSON.stringify({ studentUserId, classId })}
      )
    `);

    revalidatePath('/admin/students');
    revalidatePath('/admin/classes');
    return { success: true, enrollmentId };
  } catch (error) {
    console.error('Error assigning student to cohort:', error);
    return { success: false, error: 'Failed to enroll student' };
  }
}

/**
 * Tag student (add tags)
 */
export async function tagStudent(studentId: string, tags: string[]) {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  try {
    await db.execute(sql`
      UPDATE students
      SET tags = ${tags},
          updated_at = NOW(),
          updated_by = (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1)
      WHERE id = ${studentId}
        AND tenant_id = ${tenantId}
    `);

    // Create audit log
    await db.execute(sql`
      INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, changes)
      VALUES (
        ${tenantId},
        (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1),
        'student.tag',
        'student',
        ${studentId},
        ${JSON.stringify({ tags })}
      )
    `);

    revalidatePath('/admin/students');
    revalidatePath(`/admin/students/${studentId}`);
    return { success: true };
  } catch (error) {
    console.error('Error tagging student:', error);
    return { success: false, error: 'Failed to tag student' };
  }
}

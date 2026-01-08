'use server';

import { db } from '@/db';
import { users } from '@/db/schema';
import { sql, eq, and } from 'drizzle-orm';
import { getTenantId } from '@/lib/auth/utils';
import { revalidatePath } from 'next/cache';

/**
 * Types for Teacher Registry
 */
export type TeacherWithMetadata = {
  id: string;
  tenant_id: string;
  user_id: string;
  employee_number: string | null;
  employment_type: string;
  contract_start_date: Date;
  contract_end_date: Date | null;
  max_hours_per_week: number | null;
  hourly_rate: number | null;
  work_permit_required: boolean;
  work_permit_number: string | null;
  work_permit_expiry: Date | null;
  status: string;
  created_at: Date;
  updated_at: Date;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  last_login: Date | null;
  active_classes_count: number;
  hours_this_week: number;
  total_qualifications: number;
  verified_qualifications: number;
  expiring_soon_count: number;
  work_permit_expiring_soon: boolean;
  can_teach_levels: string[] | null;
  can_teach_subjects: string[] | null;
};

export type TeacherQualification = {
  id: string;
  tenant_id: string;
  teacher_id: string;
  qualification_type: string;
  qualification_name: string;
  institution: string | null;
  country: string | null;
  date_obtained: Date;
  expiry_date: Date | null;
  document_url: string | null;
  document_type: string | null;
  verified: boolean;
  verified_by: string | null;
  verified_at: Date | null;
  verification_notes: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
};

export type TeacherAvailability = {
  id: string;
  tenant_id: string;
  teacher_id: string;
  user_id: string;
  teacher_name: string;
  availability_type: string;
  day_of_week: number | null;
  specific_date: Date | null;
  start_time: string;
  end_time: string;
  effective_from: Date;
  effective_until: Date | null;
  reason: string | null;
  notes: string | null;
  is_currently_effective: boolean;
};

export type SchedulingConflict = {
  session_1_id: string;
  session_1_class: string;
  session_date: Date;
  session_1_start: string;
  session_1_end: string;
  session_2_id: string;
  session_2_class: string;
  session_2_start: string;
  session_2_end: string;
  teacher_id: string;
  teacher_name: string;
  conflict_type: string;
  overlap_minutes: number;
};

/**
 * Get teachers with metadata (workload, qualifications, compliance)
 */
export async function getTeachersWithMetadata(): Promise<TeacherWithMetadata[]> {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  try {
    const result = await db.execute(sql`
      SELECT * FROM v_teachers_with_metadata
      ORDER BY name ASC
    `);

    return result as unknown as TeacherWithMetadata[];
  } catch (error) {
    console.error('Error fetching teachers with metadata:', error);
    return [];
  }
}

/**
 * Get single teacher details
 */
export async function getTeacherById(teacherId: string): Promise<TeacherWithMetadata | null> {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  try {
    const result = await db.execute(sql`
      SELECT * FROM v_teachers_with_metadata
      WHERE id = ${teacherId}
    `);

    const teachers = result as unknown as TeacherWithMetadata[];
    return teachers.length > 0 ? teachers[0] : null;
  } catch (error) {
    console.error('Error fetching teacher by ID:', error);
    return null;
  }
}

/**
 * Create a new teacher profile
 */
export async function createTeacher(data: {
  userId: string;
  employeeNumber?: string;
  employmentType: string;
  contractStartDate: Date;
  contractEndDate?: Date;
  maxHoursPerWeek?: number;
  hourlyRate?: number;
  workPermitRequired: boolean;
  workPermitNumber?: string;
  workPermitExpiry?: Date;
}) {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  try {
    // Verify user exists and is in correct tenant
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, data.userId), eq(users.tenant_id, tenantId)));

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Check if teacher profile already exists
    const existing = await db.execute(sql`
      SELECT id FROM teachers
      WHERE user_id = ${data.userId}
        AND tenant_id = ${tenantId}
    `);

    if (existing.length > 0) {
      return { success: false, error: 'Teacher profile already exists for this user' };
    }

    // Create teacher profile
    const result = await db.execute(sql`
      INSERT INTO teachers (
        tenant_id,
        user_id,
        employee_number,
        employment_type,
        contract_start_date,
        contract_end_date,
        max_hours_per_week,
        hourly_rate,
        work_permit_required,
        work_permit_number,
        work_permit_expiry,
        status,
        created_by
      ) VALUES (
        ${tenantId},
        ${data.userId},
        ${data.employeeNumber || null},
        ${data.employmentType},
        ${data.contractStartDate},
        ${data.contractEndDate || null},
        ${data.maxHoursPerWeek || null},
        ${data.hourlyRate || null},
        ${data.workPermitRequired},
        ${data.workPermitNumber || null},
        ${data.workPermitExpiry || null},
        'active',
        (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1)
      )
      RETURNING id
    `);

    const teacherId = (result[0] as any).id;

    // Create audit log
    await db.execute(sql`
      INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, changes)
      VALUES (
        ${tenantId},
        (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1),
        'teacher.create',
        'teacher',
        ${teacherId},
        ${JSON.stringify(data)}
      )
    `);

    revalidatePath('/admin/teachers');
    return { success: true, teacherId };
  } catch (error) {
    console.error('Error creating teacher:', error);
    return { success: false, error: 'Failed to create teacher profile' };
  }
}

/**
 * Update teacher profile
 */
export async function updateTeacher(
  teacherId: string,
  data: {
    employeeNumber?: string;
    employmentType?: string;
    contractStartDate?: Date;
    contractEndDate?: Date | null;
    maxHoursPerWeek?: number | null;
    hourlyRate?: number | null;
    workPermitRequired?: boolean;
    workPermitNumber?: string | null;
    workPermitExpiry?: Date | null;
    status?: string;
  }
) {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  try {
    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const values: any[] = [];

    if (data.employeeNumber !== undefined) {
      updates.push(`employee_number = $${values.length + 1}`);
      values.push(data.employeeNumber);
    }
    if (data.employmentType !== undefined) {
      updates.push(`employment_type = $${values.length + 1}`);
      values.push(data.employmentType);
    }
    if (data.contractStartDate !== undefined) {
      updates.push(`contract_start_date = $${values.length + 1}`);
      values.push(data.contractStartDate);
    }
    if (data.contractEndDate !== undefined) {
      updates.push(`contract_end_date = $${values.length + 1}`);
      values.push(data.contractEndDate);
    }
    if (data.maxHoursPerWeek !== undefined) {
      updates.push(`max_hours_per_week = $${values.length + 1}`);
      values.push(data.maxHoursPerWeek);
    }
    if (data.hourlyRate !== undefined) {
      updates.push(`hourly_rate = $${values.length + 1}`);
      values.push(data.hourlyRate);
    }
    if (data.workPermitRequired !== undefined) {
      updates.push(`work_permit_required = $${values.length + 1}`);
      values.push(data.workPermitRequired);
    }
    if (data.workPermitNumber !== undefined) {
      updates.push(`work_permit_number = $${values.length + 1}`);
      values.push(data.workPermitNumber);
    }
    if (data.workPermitExpiry !== undefined) {
      updates.push(`work_permit_expiry = $${values.length + 1}`);
      values.push(data.workPermitExpiry);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${values.length + 1}`);
      values.push(data.status);
    }

    if (updates.length === 0) {
      return { success: false, error: 'No fields to update' };
    }

    // Always update updated_by and updated_at
    updates.push(`updated_by = (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1)`);
    updates.push(`updated_at = NOW()`);

    await db.execute(sql.raw(`
      UPDATE teachers
      SET ${updates.join(', ')}
      WHERE id = '${teacherId}'
        AND tenant_id = '${tenantId}'
    `));

    // Create audit log
    await db.execute(sql`
      INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, changes)
      VALUES (
        ${tenantId},
        (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1),
        'teacher.update',
        'teacher',
        ${teacherId},
        ${JSON.stringify(data)}
      )
    `);

    revalidatePath('/admin/teachers');
    revalidatePath(`/admin/teachers/${teacherId}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating teacher:', error);
    return { success: false, error: 'Failed to update teacher profile' };
  }
}

/**
 * Get teacher qualifications
 */
export async function getTeacherQualifications(teacherId: string): Promise<TeacherQualification[]> {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  try {
    const result = await db.execute(sql`
      SELECT * FROM teacher_qualifications
      WHERE teacher_id = ${teacherId}
        AND tenant_id = ${tenantId}
      ORDER BY date_obtained DESC
    `);

    return result as unknown as TeacherQualification[];
  } catch (error) {
    console.error('Error fetching teacher qualifications:', error);
    return [];
  }
}

/**
 * Add teacher qualification
 */
export async function addTeacherQualification(data: {
  teacherId: string;
  qualificationType: string;
  qualificationName: string;
  institution?: string;
  country?: string;
  dateObtained: Date;
  expiryDate?: Date;
  documentUrl?: string;
  documentType?: string;
}) {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  try {
    const result = await db.execute(sql`
      INSERT INTO teacher_qualifications (
        tenant_id,
        teacher_id,
        qualification_type,
        qualification_name,
        institution,
        country,
        date_obtained,
        expiry_date,
        document_url,
        document_type,
        created_by
      ) VALUES (
        ${tenantId},
        ${data.teacherId},
        ${data.qualificationType},
        ${data.qualificationName},
        ${data.institution || null},
        ${data.country || null},
        ${data.dateObtained},
        ${data.expiryDate || null},
        ${data.documentUrl || null},
        ${data.documentType || null},
        (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1)
      )
      RETURNING id
    `);

    const qualificationId = (result[0] as any).id;

    // Create audit log
    await db.execute(sql`
      INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, changes)
      VALUES (
        ${tenantId},
        (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1),
        'teacher.qualification.add',
        'teacher_qualification',
        ${qualificationId},
        ${JSON.stringify(data)}
      )
    `);

    revalidatePath('/admin/teachers');
    revalidatePath(`/admin/teachers/${data.teacherId}`);
    return { success: true, qualificationId };
  } catch (error) {
    console.error('Error adding teacher qualification:', error);
    return { success: false, error: 'Failed to add qualification' };
  }
}

/**
 * Verify teacher qualification
 */
export async function verifyTeacherQualification(
  qualificationId: string,
  verified: boolean,
  notes?: string
) {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  try {
    await db.execute(sql`
      UPDATE teacher_qualifications
      SET
        verified = ${verified},
        verified_by = (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1),
        verified_at = NOW(),
        verification_notes = ${notes || null}
      WHERE id = ${qualificationId}
        AND tenant_id = ${tenantId}
    `);

    // Create audit log
    await db.execute(sql`
      INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, changes)
      VALUES (
        ${tenantId},
        (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1),
        'teacher.qualification.verify',
        'teacher_qualification',
        ${qualificationId},
        ${JSON.stringify({ verified, notes })}
      )
    `);

    revalidatePath('/admin/teachers');
    return { success: true };
  } catch (error) {
    console.error('Error verifying qualification:', error);
    return { success: false, error: 'Failed to verify qualification' };
  }
}

/**
 * Get teacher permissions
 */
export async function getTeacherPermissions(teacherId: string) {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  try {
    const result = await db.execute(sql`
      SELECT * FROM teacher_permissions
      WHERE teacher_id = ${teacherId}
        AND tenant_id = ${tenantId}
        AND effective_from <= CURRENT_DATE
        AND (effective_until IS NULL OR effective_until >= CURRENT_DATE)
      ORDER BY effective_from DESC
      LIMIT 1
    `);

    return result.length > 0 ? (result[0] as any) : null;
  } catch (error) {
    console.error('Error fetching teacher permissions:', error);
    return null;
  }
}

/**
 * Set teacher permissions
 */
export async function setTeacherPermissions(data: {
  teacherId: string;
  canTeachLevels: string[];
  canTeachSubjects: string[];
  canTeachOnline: boolean;
  canTeachOnsite: boolean;
  maxStudentsPerClass?: number;
  notes?: string;
  effectiveFrom?: Date;
  effectiveUntil?: Date;
}) {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  try {
    const result = await db.execute(sql`
      INSERT INTO teacher_permissions (
        tenant_id,
        teacher_id,
        can_teach_levels,
        can_teach_subjects,
        can_teach_online,
        can_teach_onsite,
        max_students_per_class,
        notes,
        effective_from,
        effective_until,
        created_by
      ) VALUES (
        ${tenantId},
        ${data.teacherId},
        ${data.canTeachLevels},
        ${data.canTeachSubjects},
        ${data.canTeachOnline},
        ${data.canTeachOnsite},
        ${data.maxStudentsPerClass || null},
        ${data.notes || null},
        ${data.effectiveFrom || new Date()},
        ${data.effectiveUntil || null},
        (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1)
      )
      RETURNING id
    `);

    const permissionId = (result[0] as any).id;

    // Create audit log
    await db.execute(sql`
      INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, changes)
      VALUES (
        ${tenantId},
        (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1),
        'teacher.permissions.set',
        'teacher_permissions',
        ${permissionId},
        ${JSON.stringify(data)}
      )
    `);

    revalidatePath('/admin/teachers');
    revalidatePath(`/admin/teachers/${data.teacherId}`);
    return { success: true, permissionId };
  } catch (error) {
    console.error('Error setting teacher permissions:', error);
    return { success: false, error: 'Failed to set permissions' };
  }
}

/**
 * Get teacher availability
 */
export async function getTeacherAvailability(teacherId: string): Promise<TeacherAvailability[]> {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  try {
    const result = await db.execute(sql`
      SELECT * FROM v_teacher_availability
      WHERE teacher_id = ${teacherId}
        AND is_currently_effective = TRUE
      ORDER BY
        CASE
          WHEN availability_type = 'recurring' THEN day_of_week
          ELSE NULL
        END,
        start_time
    `);

    return result as unknown as TeacherAvailability[];
  } catch (error) {
    console.error('Error fetching teacher availability:', error);
    return [];
  }
}

/**
 * Set teacher availability
 */
export async function setTeacherAvailability(data: {
  teacherId: string;
  availabilityType: 'recurring' | 'one-off' | 'unavailable';
  dayOfWeek?: number;
  specificDate?: Date;
  startTime: string;
  endTime: string;
  effectiveFrom?: Date;
  effectiveUntil?: Date;
  reason?: string;
  notes?: string;
}) {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  try {
    // Validate input
    if (data.availabilityType === 'recurring' && data.dayOfWeek === undefined) {
      return { success: false, error: 'Day of week required for recurring availability' };
    }
    if (data.availabilityType !== 'recurring' && !data.specificDate) {
      return { success: false, error: 'Specific date required for one-off availability' };
    }

    const result = await db.execute(sql`
      INSERT INTO teacher_availability (
        tenant_id,
        teacher_id,
        availability_type,
        day_of_week,
        specific_date,
        start_time,
        end_time,
        effective_from,
        effective_until,
        reason,
        notes,
        created_by
      ) VALUES (
        ${tenantId},
        ${data.teacherId},
        ${data.availabilityType},
        ${data.dayOfWeek ?? null},
        ${data.specificDate ?? null},
        ${data.startTime},
        ${data.endTime},
        ${data.effectiveFrom || new Date()},
        ${data.effectiveUntil || null},
        ${data.reason || null},
        ${data.notes || null},
        (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1)
      )
      RETURNING id
    `);

    const availabilityId = (result[0] as any).id;

    // Create audit log
    await db.execute(sql`
      INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, changes)
      VALUES (
        ${tenantId},
        (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1),
        'teacher.availability.set',
        'teacher_availability',
        ${availabilityId},
        ${JSON.stringify(data)}
      )
    `);

    revalidatePath('/admin/teachers');
    revalidatePath(`/admin/teachers/${data.teacherId}`);
    return { success: true, availabilityId };
  } catch (error) {
    console.error('Error setting teacher availability:', error);
    return { success: false, error: 'Failed to set availability' };
  }
}

/**
 * Delete teacher availability
 */
export async function deleteTeacherAvailability(availabilityId: string) {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  try {
    await db.execute(sql`
      DELETE FROM teacher_availability
      WHERE id = ${availabilityId}
        AND tenant_id = ${tenantId}
    `);

    // Create audit log
    await db.execute(sql`
      INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id)
      VALUES (
        ${tenantId},
        (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1),
        'teacher.availability.delete',
        'teacher_availability',
        ${availabilityId}
      )
    `);

    revalidatePath('/admin/teachers');
    return { success: true };
  } catch (error) {
    console.error('Error deleting teacher availability:', error);
    return { success: false, error: 'Failed to delete availability' };
  }
}

/**
 * Check for scheduling conflicts
 */
export async function checkSchedulingConflicts(teacherId?: string): Promise<SchedulingConflict[]> {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  try {
    const query = teacherId
      ? sql`SELECT * FROM v_scheduling_conflicts WHERE teacher_id = ${teacherId}`
      : sql`SELECT * FROM v_scheduling_conflicts`;

    const result = await db.execute(query);
    return result as unknown as SchedulingConflict[];
  } catch (error) {
    console.error('Error checking scheduling conflicts:', error);
    return [];
  }
}

'use server';

/**
 * Bulk Upload Server Actions
 * Handles xlsx/csv parsing, validation, change detection, and database insertion
 */

import { db } from '@/db';
import { users, students, classes, enrollments } from '@/db/schema/core';
import { bookings, courses, accommodationTypes, agencies } from '@/db/schema/business';
import { requireAuth, setRLSContext, getTenantId } from '@/lib/auth/utils';
import { eq, and } from 'drizzle-orm';
import * as XLSX from 'xlsx';

// ============================================================================
// Types
// ============================================================================

export type EntityType = 'students' | 'classes' | 'enrollments' | 'bookings';

export type ValidationError = {
  row: number;
  field: string;
  message: string;
  value?: string;
};

export type ChangeType = 'insert' | 'update' | 'skip';

export type PreviewRecord = {
  rowNumber: number;
  changeType: ChangeType;
  data: Record<string, unknown>;
  existingData?: Record<string, unknown>;
  errors: ValidationError[];
};

export type UploadPreview = {
  success: boolean;
  entityType: EntityType;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  inserts: number;
  updates: number;
  skips: number;
  records: PreviewRecord[];
  errors: ValidationError[];
};

export type UploadResult = {
  success: boolean;
  inserted: number;
  updated: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
};

// ============================================================================
// Parse and Validate File
// ============================================================================

/**
 * Parse xlsx/csv file and validate data
 * Returns preview of changes before committing to database
 */
export async function parseAndValidateFile(
  fileBuffer: ArrayBuffer,
  entityType: EntityType
): Promise<UploadPreview> {
  try {
    await requireAuth(['admin']);
    await setRLSContext(db);

    // Parse workbook
    const workbook = XLSX.read(fileBuffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
      defval: '',
      raw: false, // Convert dates to strings
    });

    if (rows.length === 0) {
      return {
        success: false,
        entityType,
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        inserts: 0,
        updates: 0,
        skips: 0,
        records: [],
        errors: [{ row: 0, field: 'file', message: 'File is empty or has no data rows' }],
      };
    }

    // Validate and detect changes based on entity type
    let records: PreviewRecord[];
    switch (entityType) {
      case 'students':
        records = await validateStudents(rows);
        break;
      case 'classes':
        records = await validateClasses(rows);
        break;
      case 'enrollments':
        records = await validateEnrollments(rows);
        break;
      case 'bookings':
        records = await validateBookings(rows);
        break;
      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }

    // Calculate stats
    const validRows = records.filter(r => r.errors.length === 0).length;
    const invalidRows = records.filter(r => r.errors.length > 0).length;
    const inserts = records.filter(r => r.changeType === 'insert' && r.errors.length === 0).length;
    const updates = records.filter(r => r.changeType === 'update' && r.errors.length === 0).length;
    const skips = records.filter(r => r.changeType === 'skip').length;

    // Collect all errors
    const allErrors = records.flatMap(r => r.errors);

    return {
      success: validRows > 0,
      entityType,
      totalRows: rows.length,
      validRows,
      invalidRows,
      inserts,
      updates,
      skips,
      records,
      errors: allErrors,
    };
  } catch (error) {
    console.error('[Bulk Upload] Parse error:', error);
    return {
      success: false,
      entityType,
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      inserts: 0,
      updates: 0,
      skips: 0,
      records: [],
      errors: [
        { row: 0, field: 'file', message: `Failed to parse file: ${(error as Error).message}` },
      ],
    };
  }
}

// ============================================================================
// Validate Students
// ============================================================================

async function validateStudents(rows: Record<string, unknown>[]): Promise<PreviewRecord[]> {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant ID required');

  // Fetch existing users by email
  const emails = rows.map(r => String(r.email || '')).filter(Boolean);
  const existingUsers =
    emails.length > 0 ? await db.select().from(users).where(eq(users.tenantId, tenantId)) : [];

  const existingUsersByEmail = new Map(existingUsers.map(u => [u.email, u]));

  // Fetch existing students
  const existingStudents = await db.select().from(students).where(eq(students.tenantId, tenantId));

  const existingStudentsByUserId = new Map(existingStudents.map(s => [s.userId, s]));

  return rows.map((row, index) => {
    const errors: ValidationError[] = [];
    const rowNumber = index + 2; // Account for header row

    // Required fields - name is a single field in the database
    const name = String(row.name || '').trim();
    const email = String(row.email || '')
      .trim()
      .toLowerCase();

    if (!name) {
      errors.push({ row: rowNumber, field: 'name', message: 'Name is required' });
    }
    if (!email) {
      errors.push({ row: rowNumber, field: 'email', message: 'Email is required' });
    } else if (!email.includes('@')) {
      errors.push({
        row: rowNumber,
        field: 'email',
        message: 'Invalid email format',
        value: email,
      });
    }

    // Optional student-specific fields
    const studentNumber = row.studentNumber ? String(row.studentNumber) : null;
    const isVisaStudent = row.isVisaStudent === 'true' || row.isVisaStudent === true;

    // Check if user exists
    const existingUser = existingUsersByEmail.get(email);
    const changeType: ChangeType = existingUser ? 'update' : 'insert';

    return {
      rowNumber,
      changeType,
      data: {
        name,
        email,
        dateOfBirth: row.dateOfBirth || null,
        nationality: row.nationality || null,
        phone: row.phone || null,
        studentNumber,
        isVisaStudent,
        visaType: row.visaType || null,
        visaExpiryDate: row.visaExpiryDate || null,
        emergencyContactName: row.emergencyContactName || null,
        emergencyContactPhone: row.emergencyContactPhone || null,
        emergencyContactRelationship: row.emergencyContactRelationship || null,
      },
      existingData: existingUser
        ? {
            name: existingUser.name,
            email: existingUser.email,
            dateOfBirth: existingUser.dateOfBirth,
            nationality: existingUser.nationality,
            phone: existingUser.phone,
          }
        : undefined,
      errors,
    };
  });
}

// ============================================================================
// Validate Classes
// ============================================================================

async function validateClasses(rows: Record<string, unknown>[]): Promise<PreviewRecord[]> {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant ID required');

  // Fetch existing classes by name
  const existingClasses = await db.select().from(classes).where(eq(classes.tenantId, tenantId));

  const existingClassesByName = new Map(existingClasses.map(c => [c.name.toLowerCase(), c]));

  return rows.map((row, index) => {
    const errors: ValidationError[] = [];
    const rowNumber = index + 2;

    // Required fields
    const name = String(row.name || '').trim();
    const level = String(row.level || '')
      .trim()
      .toUpperCase();

    if (!name) {
      errors.push({ row: rowNumber, field: 'name', message: 'Class name is required' });
    }
    if (!level) {
      errors.push({ row: rowNumber, field: 'level', message: 'Level is required' });
    } else if (!['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(level)) {
      errors.push({
        row: rowNumber,
        field: 'level',
        message: 'Level must be one of: A1, A2, B1, B2, C1, C2',
        value: level,
      });
    }

    // Validate dates
    const startDate = row.startDate ? String(row.startDate) : null;
    const endDate = row.endDate ? String(row.endDate) : null;

    if (startDate && !isValidDate(startDate)) {
      errors.push({
        row: rowNumber,
        field: 'startDate',
        message: 'Invalid date format (use YYYY-MM-DD)',
        value: startDate,
      });
    }
    if (endDate && !isValidDate(endDate)) {
      errors.push({
        row: rowNumber,
        field: 'endDate',
        message: 'Invalid date format (use YYYY-MM-DD)',
        value: endDate,
      });
    }

    // Check if class exists
    const existingClass = existingClassesByName.get(name.toLowerCase());
    const changeType: ChangeType = existingClass ? 'update' : 'insert';

    return {
      rowNumber,
      changeType,
      data: {
        name,
        level,
        startDate,
        endDate,
        capacity: row.capacity ? Number(row.capacity) : null,
        teacherEmail: row.teacherEmail || null,
      },
      existingData: existingClass
        ? {
            name: existingClass.name,
            level: existingClass.level,
            startDate: existingClass.startDate,
            endDate: existingClass.endDate,
            capacity: existingClass.capacity,
          }
        : undefined,
      errors,
    };
  });
}

// ============================================================================
// Validate Enrollments
// ============================================================================

async function validateEnrollments(rows: Record<string, unknown>[]): Promise<PreviewRecord[]> {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant ID required');

  // Fetch existing users (students)
  const existingUsers = await db.select().from(users).where(eq(users.tenantId, tenantId));

  const usersByEmail = new Map(existingUsers.map(u => [u.email.toLowerCase(), u]));

  // Fetch existing classes
  const existingClasses = await db.select().from(classes).where(eq(classes.tenantId, tenantId));

  const classesByName = new Map(existingClasses.map(c => [c.name.toLowerCase(), c]));

  // Fetch existing students
  const existingStudents = await db.select().from(students).where(eq(students.tenantId, tenantId));

  const studentsByUserId = new Map(existingStudents.map(s => [s.userId, s]));

  return rows.map((row, index) => {
    const errors: ValidationError[] = [];
    const rowNumber = index + 2;

    // Required fields
    const studentEmail = String(row.studentEmail || '')
      .trim()
      .toLowerCase();
    const className = String(row.className || '').trim();

    if (!studentEmail) {
      errors.push({ row: rowNumber, field: 'studentEmail', message: 'Student email is required' });
    } else {
      const user = usersByEmail.get(studentEmail);
      if (!user) {
        errors.push({
          row: rowNumber,
          field: 'studentEmail',
          message: 'Student not found',
          value: studentEmail,
        });
      } else {
        const student = studentsByUserId.get(user.id);
        if (!student) {
          errors.push({
            row: rowNumber,
            field: 'studentEmail',
            message: 'User is not a student',
            value: studentEmail,
          });
        }
      }
    }

    if (!className) {
      errors.push({ row: rowNumber, field: 'className', message: 'Class name is required' });
    } else {
      const classRecord = classesByName.get(className.toLowerCase());
      if (!classRecord) {
        errors.push({
          row: rowNumber,
          field: 'className',
          message: 'Class not found',
          value: className,
        });
      }
    }

    // Validate dates - enrollments table uses enrollmentDate and expectedEndDate
    const enrollmentDate = row.enrollmentDate ? String(row.enrollmentDate) : null;
    const expectedEndDate = row.expectedEndDate ? String(row.expectedEndDate) : null;
    const bookedWeeks = row.bookedWeeks ? Number(row.bookedWeeks) : null;

    if (enrollmentDate && !isValidDate(enrollmentDate)) {
      errors.push({
        row: rowNumber,
        field: 'enrollmentDate',
        message: 'Invalid date format (use YYYY-MM-DD)',
        value: enrollmentDate,
      });
    }
    if (expectedEndDate && !isValidDate(expectedEndDate)) {
      errors.push({
        row: rowNumber,
        field: 'expectedEndDate',
        message: 'Invalid date format (use YYYY-MM-DD)',
        value: expectedEndDate,
      });
    }
    if (bookedWeeks !== null && (isNaN(bookedWeeks) || bookedWeeks <= 0)) {
      errors.push({
        row: rowNumber,
        field: 'bookedWeeks',
        message: 'Booked weeks must be a positive number',
        value: String(row.bookedWeeks),
      });
    }

    return {
      rowNumber,
      changeType: 'insert', // Enrollments are always inserts
      data: {
        studentEmail,
        className,
        enrollmentDate,
        expectedEndDate,
        bookedWeeks,
      },
      existingData: undefined,
      errors,
    };
  });
}

// ============================================================================
// Validate Bookings (Combined Student + Booking + Financial Data)
// ============================================================================

async function validateBookings(rows: Record<string, unknown>[]): Promise<PreviewRecord[]> {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant ID required');

  // Fetch reference data
  const existingCourses = await db.select().from(courses).where(eq(courses.tenantId, tenantId));
  const coursesByName = new Map(existingCourses.map(c => [c.name.toLowerCase(), c]));

  const existingAccomTypes = await db
    .select()
    .from(accommodationTypes)
    .where(eq(accommodationTypes.tenantId, tenantId));
  const accomTypesByName = new Map(existingAccomTypes.map(a => [a.name.toLowerCase(), a]));

  const existingAgencies = await db.select().from(agencies).where(eq(agencies.tenantId, tenantId));
  const agenciesByName = new Map(existingAgencies.map(a => [a.name.toLowerCase(), a]));

  const existingUsers = await db.select().from(users).where(eq(users.tenantId, tenantId));
  const usersByEmail = new Map(existingUsers.map(u => [u.email.toLowerCase(), u]));

  return rows.map((row, index) => {
    const errors: ValidationError[] = [];
    const rowNumber = index + 2;

    // Required student fields
    const name = String(row['Name'] || row.name || '').trim();
    const email = name ? `${name.toLowerCase().replace(/\s+/g, '.')}@import.temp` : ''; // Generate temp email if not provided
    const nationality = String(row['Nationality'] || row.nationality || '').trim();
    const dob = String(row['DOB'] || row.dateOfBirth || '').trim();

    if (!name) {
      errors.push({ row: rowNumber, field: 'Name', message: 'Name is required' });
    }

    // Booking required fields
    const saleDate = String(row['Sale Date'] || row.saleDate || '').trim();
    const courseName = String(row['Course'] || row.course || '').trim();
    const weeks = row['Weeks'] || row.weeks ? Number(row['Weeks'] || row.weeks) : null;
    const courseStartDate = String(row['Start date'] || row.courseStartDate || '').trim();
    const courseEndDate = String(row['End date'] || row.courseEndDate || '').trim();

    if (!saleDate) {
      errors.push({ row: rowNumber, field: 'Sale Date', message: 'Sale Date is required' });
    } else if (!isValidDate(saleDate)) {
      errors.push({
        row: rowNumber,
        field: 'Sale Date',
        message: 'Invalid date format (use YYYY-MM-DD)',
        value: saleDate,
      });
    }

    if (!courseName) {
      errors.push({ row: rowNumber, field: 'Course', message: 'Course is required' });
    } else {
      const course = coursesByName.get(courseName.toLowerCase());
      if (!course) {
        errors.push({
          row: rowNumber,
          field: 'Course',
          message: 'Course not found',
          value: courseName,
        });
      }
    }

    if (!weeks || weeks <= 0) {
      errors.push({ row: rowNumber, field: 'Weeks', message: 'Weeks must be a positive number' });
    }

    if (!courseStartDate) {
      errors.push({ row: rowNumber, field: 'Start date', message: 'Start date is required' });
    } else if (!isValidDate(courseStartDate)) {
      errors.push({
        row: rowNumber,
        field: 'Start date',
        message: 'Invalid date format',
        value: courseStartDate,
      });
    }

    if (!courseEndDate) {
      errors.push({ row: rowNumber, field: 'End date', message: 'End date is required' });
    } else if (!isValidDate(courseEndDate)) {
      errors.push({
        row: rowNumber,
        field: 'End date',
        message: 'Invalid date format',
        value: courseEndDate,
      });
    }

    // Optional fields
    const source = String(row['Source'] || row.source || 'Direct').trim();
    const visaType = String(row['Visa Type'] || row.visaType || '').trim();
    const levelClass = String(row['Level/Class'] || row.level || '').trim();
    const placementTestScore = String(
      row['Placement test score'] || row.placementTestScore || ''
    ).trim();
    const accomType = String(row['Accom Type'] || row.accomType || '').trim();
    const accomStartDate = String(row['Start date'] || row.accommodationStartDate || '').trim(); // Note: might conflict with course start
    const accomEndDate = String(row['End date'] || row.accommodationEndDate || '').trim(); // Note: might conflict with course end

    // Financial fields (convert to numbers, default to 0)
    const depositPaid = parseFloat(String(row['Deposit Paid'] || row.depositPaid || '0'));
    const totalPaid = parseFloat(String(row['Paid'] || row.paid || '0'));
    const courseFee = parseFloat(String(row['Course Fee Due'] || row.courseFee || '0'));
    const accommodationFee = parseFloat(
      String(row['Accomodation'] || row['Accommodation'] || row.accommodationFee || '0')
    );
    const transferFee = parseFloat(String(row['Transfer'] || row.transferFee || '0'));
    const examFee = parseFloat(String(row['Exam Fee'] || row.examFee || '0'));
    const registrationFee = parseFloat(
      String(row['Registration Fee'] || row.registrationFee || '0')
    );
    const learnerProtection = parseFloat(
      String(row['Learner Protection'] || row.learnerProtection || '0')
    );
    const medicalInsurance = parseFloat(
      String(row['Medical Insurance'] || row.medicalInsurance || '0')
    );
    const totalBooking = parseFloat(String(row['Total Booking'] || row.totalBooking || '0'));

    // Check if user exists
    const existingUser = usersByEmail.get(email.toLowerCase());
    const changeType: ChangeType = existingUser ? 'update' : 'insert';

    return {
      rowNumber,
      changeType,
      data: {
        // Student fields
        name,
        email,
        nationality,
        dob,
        visaType,
        // Booking fields
        saleDate,
        source,
        courseName,
        weeks,
        courseStartDate,
        courseEndDate,
        levelClass,
        placementTestScore,
        accomType,
        accomStartDate,
        accomEndDate,
        // Financial fields
        depositPaid,
        totalPaid,
        courseFee,
        accommodationFee,
        transferFee,
        examFee,
        registrationFee,
        learnerProtection,
        medicalInsurance,
        totalBooking,
      },
      existingData: existingUser
        ? {
            name: existingUser.name,
            email: existingUser.email,
          }
        : undefined,
      errors,
    };
  });
}

// ============================================================================
// Commit Changes to Database
// ============================================================================

/**
 * Insert validated records into database
 */
export async function commitBulkUpload(preview: UploadPreview): Promise<UploadResult> {
  try {
    await requireAuth(['admin']);
    await setRLSContext(db);
    const tenantId = await getTenantId();
    if (!tenantId) throw new Error('Tenant ID required');

    // Only process valid records
    const validRecords = preview.records.filter(r => r.errors.length === 0);

    let inserted = 0;
    let updated = 0;
    let failed = 0;
    const errors: Array<{ row: number; message: string }> = [];

    for (const record of validRecords) {
      try {
        switch (preview.entityType) {
          case 'students':
            if (record.changeType === 'insert') {
              await insertStudent(record.data, tenantId);
              inserted++;
            } else if (record.changeType === 'update') {
              await updateStudent(record.data);
              updated++;
            }
            break;

          case 'classes':
            if (record.changeType === 'insert') {
              await insertClass(record.data, tenantId);
              inserted++;
            } else if (record.changeType === 'update') {
              await updateClass(record.data, tenantId);
              updated++;
            }
            break;

          case 'enrollments':
            await insertEnrollment(record.data, tenantId);
            inserted++;
            break;

          case 'bookings':
            await insertBooking(record.data, tenantId);
            inserted++;
            break;
        }
      } catch (error) {
        failed++;
        errors.push({
          row: record.rowNumber,
          message: `Failed to process: ${(error as Error).message}`,
        });
      }
    }

    return {
      success: inserted + updated > 0,
      inserted,
      updated,
      failed,
      errors,
    };
  } catch (error) {
    console.error('[Bulk Upload] Commit error:', error);
    return {
      success: false,
      inserted: 0,
      updated: 0,
      failed: preview.validRows,
      errors: [{ row: 0, message: `Failed to commit changes: ${(error as Error).message}` }],
    };
  }
}

// ============================================================================
// Database Insertion Helpers
// ============================================================================

async function insertStudent(data: Record<string, unknown>, tenantId: string) {
  // Create user first
  const [user] = await db
    .insert(users)
    .values({
      tenantId,
      email: String(data.email),
      name: String(data.name),
      dateOfBirth: data.dateOfBirth ? String(data.dateOfBirth) : null,
      nationality: data.nationality ? String(data.nationality) : null,
      phone: data.phone ? String(data.phone) : null,
      primaryRole: 'student',
      status: 'active',
      emailVerified: false,
    })
    .returning();

  // Create student record
  await db.insert(students).values({
    userId: user.id,
    tenantId,
    studentNumber: data.studentNumber ? String(data.studentNumber) : `STU-${Date.now()}`,
    isVisaStudent: Boolean(data.isVisaStudent),
    visaType: data.visaType ? String(data.visaType) : null,
    visaExpiryDate: data.visaExpiryDate ? String(data.visaExpiryDate) : null,
    emergencyContactName: data.emergencyContactName ? String(data.emergencyContactName) : null,
    emergencyContactPhone: data.emergencyContactPhone ? String(data.emergencyContactPhone) : null,
    emergencyContactRelationship: data.emergencyContactRelationship
      ? String(data.emergencyContactRelationship)
      : null,
    status: 'active',
  });
}

async function updateStudent(data: Record<string, unknown>) {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant ID required');

  // Update user record
  const [user] = await db
    .update(users)
    .set({
      name: String(data.name),
      dateOfBirth: data.dateOfBirth ? String(data.dateOfBirth) : null,
      nationality: data.nationality ? String(data.nationality) : null,
      phone: data.phone ? String(data.phone) : null,
      updatedAt: new Date(),
    })
    .where(and(eq(users.tenantId, tenantId), eq(users.email, String(data.email))))
    .returning();

  // Update student record if exists
  if (user) {
    await db
      .update(students)
      .set({
        studentNumber: data.studentNumber ? String(data.studentNumber) : undefined,
        isVisaStudent: Boolean(data.isVisaStudent),
        visaType: data.visaType ? String(data.visaType) : null,
        visaExpiryDate: data.visaExpiryDate ? String(data.visaExpiryDate) : null,
        emergencyContactName: data.emergencyContactName ? String(data.emergencyContactName) : null,
        emergencyContactPhone: data.emergencyContactPhone
          ? String(data.emergencyContactPhone)
          : null,
        emergencyContactRelationship: data.emergencyContactRelationship
          ? String(data.emergencyContactRelationship)
          : null,
        updatedAt: new Date(),
      })
      .where(eq(students.userId, user.id));
  }
}

async function insertClass(data: Record<string, unknown>, tenantId: string) {
  await db.insert(classes).values({
    tenantId,
    name: String(data.name),
    level: String(data.level),
    startDate: data.startDate ? String(data.startDate) : null,
    endDate: data.endDate ? String(data.endDate) : null,
    capacity: data.capacity ? Number(data.capacity) : null,
    status: 'active',
  });
}

async function updateClass(data: Record<string, unknown>, tenantId: string) {
  await db
    .update(classes)
    .set({
      level: String(data.level),
      startDate: data.startDate ? String(data.startDate) : null,
      endDate: data.endDate ? String(data.endDate) : null,
      capacity: data.capacity ? Number(data.capacity) : null,
      updatedAt: new Date(),
    })
    .where(and(eq(classes.tenantId, tenantId), eq(classes.name, String(data.name))));
}

async function insertEnrollment(data: Record<string, unknown>, tenantId: string) {
  // Look up student user by email
  const user = await db.query.users.findFirst({
    where: (users, { and, eq }) =>
      and(eq(users.tenantId, tenantId), eq(users.email, String(data.studentEmail))),
  });

  if (!user) {
    throw new Error(`Student user not found: ${data.studentEmail}`);
  }

  // Look up student record
  const student = await db.query.students.findFirst({
    where: (students, { and, eq }) =>
      and(eq(students.tenantId, tenantId), eq(students.userId, user.id)),
  });

  if (!student) {
    throw new Error(`Student record not found for user: ${data.studentEmail}`);
  }

  // Look up class by name
  const classRecord = await db.query.classes.findFirst({
    where: (classes, { and, eq }) =>
      and(eq(classes.tenantId, tenantId), eq(classes.name, String(data.className))),
  });

  if (!classRecord) {
    throw new Error(`Class not found: ${data.className}`);
  }

  // Insert enrollment - note: studentId in enrollments table is the user.id, not student.id
  await db.insert(enrollments).values({
    tenantId,
    studentId: user.id, // enrollments.studentId references users.id
    classId: classRecord.id,
    enrollmentDate: data.enrollmentDate
      ? String(data.enrollmentDate)
      : new Date().toISOString().split('T')[0],
    expectedEndDate: data.expectedEndDate ? String(data.expectedEndDate) : null,
    bookedWeeks: data.bookedWeeks ? Number(data.bookedWeeks) : null,
    status: 'active',
  });
}

async function insertBooking(data: Record<string, unknown>, tenantId: string) {
  // 1. Create or find student
  let student;
  const email = String(data.email);
  const existingUser = await db.query.users.findFirst({
    where: (users, { and, eq }) => and(eq(users.tenantId, tenantId), eq(users.email, email)),
  });

  if (existingUser) {
    // Update existing user
    await db
      .update(users)
      .set({
        name: String(data.name),
        nationality: data.nationality ? String(data.nationality) : null,
        dateOfBirth: data.dob ? String(data.dob) : null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existingUser.id));

    // Find or create student record
    student = await db.query.students.findFirst({
      where: (students, { and, eq }) =>
        and(eq(students.tenantId, tenantId), eq(students.userId, existingUser.id)),
    });

    if (!student) {
      [student] = await db
        .insert(students)
        .values({
          userId: existingUser.id,
          tenantId,
          studentNumber: `STU-${Date.now()}`,
          isVisaStudent: !!data.visaType,
          visaType: data.visaType ? String(data.visaType) : null,
          status: 'active',
        })
        .returning();
    }
  } else {
    // Create new user and student
    const [newUser] = await db
      .insert(users)
      .values({
        tenantId,
        email,
        name: String(data.name),
        nationality: data.nationality ? String(data.nationality) : null,
        dateOfBirth: data.dob ? String(data.dob) : null,
        primaryRole: 'student',
        status: 'active',
        emailVerified: false,
      })
      .returning();

    [student] = await db
      .insert(students)
      .values({
        userId: newUser.id,
        tenantId,
        studentNumber: `STU-${Date.now()}`,
        isVisaStudent: !!data.visaType,
        visaType: data.visaType ? String(data.visaType) : null,
        status: 'active',
      })
      .returning();
  }

  // 2. Look up or create agency
  let agency = null;
  const sourceName = String(data.source || 'Direct');
  if (sourceName && sourceName.toLowerCase() !== 'direct') {
    agency = await db.query.agencies.findFirst({
      where: (agencies, { and, eq }) =>
        and(eq(agencies.tenantId, tenantId), eq(agencies.name, sourceName)),
    });

    if (!agency) {
      [agency] = await db
        .insert(agencies)
        .values({
          tenantId,
          name: sourceName,
          status: 'active',
        })
        .returning();
    }
  }

  // 3. Look up course
  const course = await db.query.courses.findFirst({
    where: (courses, { and, eq }) =>
      and(eq(courses.tenantId, tenantId), eq(courses.name, String(data.courseName))),
  });

  if (!course) {
    throw new Error(`Course not found: ${data.courseName}`);
  }

  // 4. Look up accommodation type (if provided)
  let accommodationType = null;
  if (data.accomType && String(data.accomType).trim()) {
    accommodationType = await db.query.accommodationTypes.findFirst({
      where: (accommodationTypes, { and, eq }) =>
        and(
          eq(accommodationTypes.tenantId, tenantId),
          eq(accommodationTypes.name, String(data.accomType))
        ),
    });
  }

  // 5. Create booking
  const bookingNumber = `BK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  await db.insert(bookings).values({
    tenantId,
    bookingNumber,
    saleDate: String(data.saleDate),
    studentId: student.id,
    agencyId: agency?.id || null,
    courseId: course.id,
    weeks: Number(data.weeks),
    courseStartDate: String(data.courseStartDate),
    courseEndDate: String(data.courseEndDate),
    placementTestScore: data.placementTestScore ? String(data.placementTestScore) : null,
    assignedLevel: data.levelClass ? String(data.levelClass) : null,
    accommodationTypeId: accommodationType?.id || null,
    accommodationStartDate: data.accomStartDate ? String(data.accomStartDate) : null,
    accommodationEndDate: data.accomEndDate ? String(data.accomEndDate) : null,
    courseFeeEur: String(data.courseFee || 0),
    accommodationFeeEur: String(data.accommodationFee || 0),
    transferFeeEur: String(data.transferFee || 0),
    examFeeEur: String(data.examFee || 0),
    registrationFeeEur: String(data.registrationFee || 0),
    learnerProtectionFeeEur: String(data.learnerProtection || 0),
    medicalInsuranceFeeEur: String(data.medicalInsurance || 0),
    totalBookingEur: String(data.totalBooking || 0),
    depositPaidEur: String(data.depositPaid || 0),
    totalPaidEur: String(data.totalPaid || 0),
    status: 'confirmed',
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

function isValidDate(dateStr: string): boolean {
  // Check YYYY-MM-DD format
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;

  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
}

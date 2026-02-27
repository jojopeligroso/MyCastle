'use server';

import { db } from '@/db';
import { bookings, payments, students, users } from '@/db/schema';
import { sql, eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

interface NewStudentData {
  name: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  isMinor?: boolean;
  cefrLevel?: string;
}

interface BookedByData {
  type: 'self' | 'parent' | 'guardian' | 'other';
  name?: string;
  email?: string;
  phone?: string;
}

interface CreateBookingData {
  tenantId: string;
  studentId?: string; // Existing student
  newStudent?: NewStudentData; // New student to create
  bookedBy?: BookedByData; // Who is making the booking
  courseId: string;
  agencyId: string;
  accommodationTypeId: string | null;
  weeks: number;
  courseStartDate: string;
  courseEndDate: string;
  courseFeeEur: string;
  accommodationFeeEur: string;
  registrationFeeEur: string;
  learnerProtectionFeeEur: string;
  medicalInsuranceFeeEur: string;
  totalBookingEur: string;
  depositPaidEur: string;
}

export async function createBooking(data: CreateBookingData) {
  try {
    // Set RLS context
    await db.execute(sql.raw(`SET app.user_email = 'eoinmaleoin@gmail.com'`));
    await db.execute(sql.raw(`SET app.tenant_id = '${data.tenantId}'`));

    let finalStudentId = data.studentId;

    // If creating a new student, do that first
    if (data.newStudent && !data.studentId) {
      const newStudentResult = await createNewStudent(data.tenantId, data.newStudent);

      if (!newStudentResult.success) {
        return {
          success: false,
          error: newStudentResult.error,
          existingStudentId: newStudentResult.existingStudentId,
        };
      }

      finalStudentId = newStudentResult.studentId;
    }

    if (!finalStudentId) {
      return { success: false, error: 'Student ID is required' };
    }

    // Generate booking number (BK-YYYY-XXX)
    const year = new Date().getFullYear();
    const bookingNumber = `BK-${year}-${String(Date.now()).slice(-6)}`;

    // Prepare booked_by fields
    const bookedByName =
      data.bookedBy && data.bookedBy.type !== 'self' ? data.bookedBy.name || null : null;
    const bookedByEmail =
      data.bookedBy && data.bookedBy.type !== 'self' ? data.bookedBy.email || null : null;
    const bookedByPhone =
      data.bookedBy && data.bookedBy.type !== 'self' ? data.bookedBy.phone || null : null;

    // Insert booking
    const result = await db
      .insert(bookings)
      .values({
        tenantId: data.tenantId,
        bookingNumber,
        saleDate: new Date().toISOString().split('T')[0],
        studentId: finalStudentId,
        // Booked By fields
        bookedByName,
        bookedByEmail,
        bookedByPhone,
        // Course details
        courseId: data.courseId,
        agencyId: data.agencyId,
        accommodationTypeId: data.accommodationTypeId,
        weeks: data.weeks,
        courseStartDate: data.courseStartDate,
        courseEndDate: data.courseEndDate,
        // Financial
        courseFeeEur: data.courseFeeEur,
        accommodationFeeEur: data.accommodationFeeEur,
        transferFeeEur: '0',
        examFeeEur: '0',
        registrationFeeEur: data.registrationFeeEur,
        learnerProtectionFeeEur: data.learnerProtectionFeeEur,
        medicalInsuranceFeeEur: data.medicalInsuranceFeeEur,
        totalBookingEur: data.totalBookingEur,
        depositPaidEur: data.depositPaidEur,
        totalPaidEur: '0', // Will be updated by trigger when payment is inserted
        status: 'pending',
      })
      .returning({ id: bookings.id });

    const bookingId = result[0].id;

    // If deposit was paid, create a payment record
    // The database trigger will automatically update bookings.total_paid_eur
    if (parseFloat(data.depositPaidEur) > 0) {
      await db.insert(payments).values({
        tenantId: data.tenantId,
        bookingId,
        paymentDate: new Date().toISOString().split('T')[0],
        amountEur: data.depositPaidEur,
        paymentMethod: 'Bank Transfer',
        referenceNumber: `DEPOSIT-${bookingNumber}`,
      });
    }

    // Revalidate bookings page
    revalidatePath('/admin/bookings');

    return { success: true, bookingId };
  } catch (error) {
    console.error('Failed to create booking:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create booking',
    };
  }
}

/**
 * Create a new student (user + student record)
 * Returns student ID on success, or existing student ID if email already exists
 */
async function createNewStudent(
  tenantId: string,
  data: NewStudentData
): Promise<{
  success: boolean;
  studentId?: string;
  error?: string;
  existingStudentId?: string;
}> {
  try {
    // Check for duplicate email
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, data.email), eq(users.tenantId, tenantId)))
      .limit(1);

    if (existingUser) {
      // Check if this user has a student record
      const [existingStudent] = await db
        .select({ id: students.id })
        .from(students)
        .where(eq(students.userId, existingUser.id))
        .limit(1);

      if (existingStudent) {
        return {
          success: false,
          error: `A student with email ${data.email} already exists. Please use the existing student or update their information.`,
          existingStudentId: existingStudent.id,
        };
      }
    }

    // Create user record
    const [newUser] = await db
      .insert(users)
      .values({
        tenantId: tenantId,
        email: data.email,
        name: data.name,
        phone: data.phone || null,
        dateOfBirth: data.dateOfBirth || null,
        role: 'student',
        isActive: true,
        currentLevel: data.cefrLevel || null,
        initialLevel: data.cefrLevel || null,
        levelStatus: data.cefrLevel ? 'confirmed' : null,
        metadata: {
          enrollment_date: new Date().toISOString().split('T')[0],
          is_minor: data.isMinor || false,
        },
      })
      .returning({ id: users.id });

    if (!newUser) {
      return { success: false, error: 'Failed to create user record' };
    }

    // Generate student number
    const studentNumber = `STU-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    // Create student record
    const [newStudent] = await db
      .insert(students)
      .values({
        userId: newUser.id,
        tenantId: tenantId,
        studentNumber,
        status: 'active',
      })
      .returning({ id: students.id });

    if (!newStudent) {
      return { success: false, error: 'Failed to create student record' };
    }

    // Revalidate students page
    revalidatePath('/admin/students');

    return { success: true, studentId: newStudent.id };
  } catch (error) {
    console.error('Failed to create new student:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create student',
    };
  }
}

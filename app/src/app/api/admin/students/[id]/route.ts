import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import {
  users,
  enrollments,
  enrollmentAmendments,
  attendance,
  grades,
  submissions,
  classes,
} from '@/db/schema';
import { eq, and, isNull, sql, desc, ne } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/utils';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(['admin']);
    const { id: studentId } = await params;

    // Fetch student basic info
    const [student] = await db
      .select()
      .from(users)
      .where(
        and(eq(users.id, studentId), eq(users.primaryRole, 'student'), isNull(users.deletedAt))
      )
      .limit(1);

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Fetch enrollment history with amendments
    const enrollmentHistory = await db
      .select({
        id: enrollments.id,
        classId: enrollments.classId,
        className: classes.name,
        classLevel: classes.level,
        enrollmentDate: enrollments.enrollmentDate,
        expectedEndDate: enrollments.expectedEndDate,
        status: enrollments.status,
        createdAt: enrollments.createdAt,
      })
      .from(enrollments)
      .leftJoin(classes, eq(enrollments.classId, classes.id))
      .where(and(eq(enrollments.studentId, studentId), ne(enrollments.status, 'deleted')))
      .orderBy(desc(enrollments.enrollmentDate));

    // Fetch amendments for each enrollment
    const enrollmentIds = enrollmentHistory.map(e => e.id);
    const amendments =
      enrollmentIds.length > 0
        ? await db
            .select()
            .from(enrollmentAmendments)
            .where(sql`${enrollmentAmendments.enrollmentId} IN ${enrollmentIds}`)
            .orderBy(desc(enrollmentAmendments.createdAt))
        : [];

    // Fetch attendance summary
    const attendanceRecords = await db
      .select({
        status: attendance.status,
        count: sql<number>`count(*)::int`,
      })
      .from(attendance)
      .where(and(eq(attendance.studentId, studentId), isNull(attendance.deletedAt)))
      .groupBy(attendance.status);

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
        ? ((attendanceSummary.present + attendanceSummary.late) / totalSessions) * 100
        : null;

    // Fetch grades and submissions
    const studentGrades = await db
      .select({
        gradeId: grades.id,
        assignmentId: grades.assignmentId,
        score: grades.score,
        maxScore: grades.maxScore,
        feedback: grades.feedback,
        cefrLevel: grades.cefrLevel,
        gradedAt: grades.gradedAt,
        submissionId: submissions.id,
        submittedAt: submissions.submittedAt,
        status: submissions.status,
      })
      .from(grades)
      .leftJoin(submissions, eq(grades.submissionId, submissions.id))
      .where(and(eq(grades.studentId, studentId), isNull(grades.deletedAt)))
      .orderBy(desc(grades.gradedAt));

    // Calculate average grade
    const averageGrade =
      studentGrades.length > 0
        ? studentGrades.reduce((acc, g) => {
            const score = parseFloat(g.score || '0');
            const maxScore = parseFloat(g.maxScore || '100');
            const percentage = maxScore ? (score / maxScore) * 100 : 0;
            return acc + percentage;
          }, 0) / studentGrades.length
        : null;

    // Combine all data
    const studentDetail = {
      ...student,
      enrollments: enrollmentHistory.map(e => ({
        ...e,
        amendments: amendments.filter(a => a.enrollmentId === e.id),
      })),
      attendance: {
        summary: attendanceSummary,
        rate: attendanceRate,
        total: totalSessions,
      },
      grades: studentGrades,
      averageGrade,
    };

    return NextResponse.json(studentDetail);
  } catch (error) {
    console.error('Error fetching student details:', error);
    return NextResponse.json({ error: 'Failed to fetch student details' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(['admin']);
    const { id: studentId } = await params;
    const body = await request.json();

    // Validate that the user exists and is a student
    const [existingStudent] = await db
      .select()
      .from(users)
      .where(
        and(eq(users.id, studentId), eq(users.primaryRole, 'student'), isNull(users.deletedAt))
      )
      .limit(1);

    if (!existingStudent) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Build update data from allowed fields
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Map snake_case input fields to camelCase schema fields
    const fieldMapping: Record<string, string> = {
      name: 'name',
      email: 'email',
      phone: 'phone',
      status: 'status',
    };

    for (const [inputField, schemaField] of Object.entries(fieldMapping)) {
      if (body[inputField] !== undefined) {
        updateData[schemaField] = body[inputField];
      }
    }

    // Store additional fields in metadata
    const metadataFields = [
      'date_of_birth',
      'address',
      'city',
      'country',
      'postal_code',
      'emergency_contact_name',
      'emergency_contact_phone',
      'emergency_contact_relationship',
      'current_level',
      'target_level',
      'visa_type',
      'visa_expiry',
      'visa_conditions',
      'notes',
    ];

    const metadata: Record<string, unknown> =
      (existingStudent.metadata as Record<string, unknown>) || {};
    for (const field of metadataFields) {
      if (body[field] !== undefined) {
        metadata[field] = body[field];
      }
    }
    if (Object.keys(metadata).length > 0) {
      updateData.metadata = metadata;
    }

    // Update student
    const [updatedStudent] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, studentId))
      .returning();

    return NextResponse.json(updatedStudent);
  } catch (error) {
    console.error('Error updating student:', error);
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(['admin']);
    const { id: studentId } = await params;

    // Soft delete the student
    const [deletedStudent] = await db
      .update(users)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, studentId), eq(users.primaryRole, 'student')))
      .returning();

    if (!deletedStudent) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting student:', error);
    return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 });
  }
}

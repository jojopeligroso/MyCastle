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
import { eq, and, isNull, sql, desc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/utils';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth(['admin']);
    const studentId = params.id;

    // Fetch student basic info
    const [student] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, studentId), eq(users.role, 'student'), isNull(users.deleted_at)))
      .limit(1);

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Fetch enrollment history with amendments
    const enrollmentHistory = await db
      .select({
        id: enrollments.id,
        classId: enrollments.class_id,
        className: classes.name,
        classLevel: classes.level,
        startDate: enrollments.start_date,
        endDate: enrollments.end_date,
        status: enrollments.status,
        createdAt: enrollments.created_at,
      })
      .from(enrollments)
      .leftJoin(classes, eq(enrollments.class_id, classes.id))
      .where(and(eq(enrollments.student_id, studentId), isNull(enrollments.deleted_at)))
      .orderBy(desc(enrollments.start_date));

    // Fetch amendments for each enrollment
    const enrollmentIds = enrollmentHistory.map(e => e.id);
    const amendments =
      enrollmentIds.length > 0
        ? await db
            .select()
            .from(enrollmentAmendments)
            .where(sql`${enrollmentAmendments.enrollment_id} IN ${enrollmentIds}`)
            .orderBy(desc(enrollmentAmendments.created_at))
        : [];

    // Fetch attendance summary
    const attendanceRecords = await db
      .select({
        status: attendance.status,
        count: sql<number>`count(*)::int`,
      })
      .from(attendance)
      .where(and(eq(attendance.student_id, studentId), isNull(attendance.deleted_at)))
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
        assignmentId: grades.assignment_id,
        score: grades.score,
        maxScore: grades.max_score,
        feedback: grades.feedback,
        cefrLevel: grades.cefr_level,
        gradedAt: grades.graded_at,
        submissionId: submissions.id,
        submittedAt: submissions.submitted_at,
        status: submissions.status,
      })
      .from(grades)
      .leftJoin(submissions, eq(grades.submission_id, submissions.id))
      .where(and(eq(grades.student_id, studentId), isNull(grades.deleted_at)))
      .orderBy(desc(grades.graded_at));

    // Calculate average grade
    const averageGrade =
      studentGrades.length > 0
        ? studentGrades.reduce((acc, g) => {
            const percentage = g.maxScore ? (g.score / g.maxScore) * 100 : 0;
            return acc + percentage;
          }, 0) / studentGrades.length
        : null;

    // Combine all data
    const studentDetail = {
      ...student,
      enrollments: enrollmentHistory.map(e => ({
        ...e,
        amendments: amendments.filter(a => a.enrollment_id === e.id),
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

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(['admin']);
    const studentId = params.id;
    const body = await request.json();

    // Validate that the user exists and is a student
    const [existingStudent] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, studentId), eq(users.role, 'student'), isNull(users.deleted_at)))
      .limit(1);

    if (!existingStudent) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Extract allowed fields for update
    const allowedFields = [
      'name',
      'email',
      'phone',
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
      'status',
      'notes',
    ];

    const updateData: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Update student
    const [updatedStudent] = await db
      .update(users)
      .set({
        ...updateData,
        updated_at: new Date(),
      })
      .where(eq(users.id, studentId))
      .returning();

    return NextResponse.json(updatedStudent);
  } catch (error) {
    console.error('Error updating student:', error);
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth(['admin']);
    const studentId = params.id;

    // Soft delete the student
    const [deletedStudent] = await db
      .update(users)
      .set({
        deleted_at: new Date(),
        updated_at: new Date(),
      })
      .where(and(eq(users.id, studentId), eq(users.role, 'student')))
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

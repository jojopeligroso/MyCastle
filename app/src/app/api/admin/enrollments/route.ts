import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { enrollments, classes, users } from '@/db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/utils';
import { z } from 'zod';

const createEnrollmentSchema = z.object({
  student_id: z.string().uuid('Valid student ID is required'),
  class_id: z.string().uuid('Valid class ID is required'),
  start_date: z.string(),
  end_date: z.string().optional(),
  status: z.enum(['active', 'completed', 'withdrawn', 'transferred']).default('active'),
});

export async function GET(request: NextRequest) {
  try {
    await requireAuth(['admin']);

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');
    const classId = searchParams.get('class_id');
    const status = searchParams.get('status');

    let query = db
      .select({
        enrollment: enrollments,
        student: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
        class: {
          id: classes.id,
          name: classes.name,
          level: classes.level,
        },
      })
      .from(enrollments)
      .leftJoin(users, eq(enrollments.student_id, users.id))
      .leftJoin(classes, eq(enrollments.class_id, classes.id))
      .where(isNull(enrollments.deleted_at))
      .$dynamic();

    if (studentId) {
      query = query.where(eq(enrollments.student_id, studentId));
    }

    if (classId) {
      query = query.where(eq(enrollments.class_id, classId));
    }

    if (status) {
      query = query.where(eq(enrollments.status, status));
    }

    const results = await query;

    return NextResponse.json({ enrollments: results });
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    return NextResponse.json({ error: 'Failed to fetch enrollments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(['admin']);
    const body = await request.json();

    const validationResult = createEnrollmentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if student exists
    const [student] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, data.student_id), eq(users.role, 'student')))
      .limit(1);

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Check if class exists and has capacity
    const [classData] = await db
      .select()
      .from(classes)
      .where(eq(classes.id, data.class_id))
      .limit(1);

    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Check current enrollment count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.class_id, data.class_id),
          eq(enrollments.status, 'active'),
          isNull(enrollments.deleted_at)
        )
      );

    if (count >= classData.capacity) {
      return NextResponse.json({ error: 'Class is at full capacity' }, { status: 409 });
    }

    // Create enrollment
    const [newEnrollment] = await db
      .insert(enrollments)
      .values({
        student_id: data.student_id,
        class_id: data.class_id,
        start_date: new Date(data.start_date),
        end_date: data.end_date ? new Date(data.end_date) : null,
        status: data.status,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    // Update class enrolled count
    await db
      .update(classes)
      .set({
        enrolled_count: sql`${classes.enrolled_count} + 1`,
        updated_at: new Date(),
      })
      .where(eq(classes.id, data.class_id));

    return NextResponse.json(newEnrollment, { status: 201 });
  } catch (error) {
    console.error('Error creating enrollment:', error);
    return NextResponse.json({ error: 'Failed to create enrollment' }, { status: 500 });
  }
}

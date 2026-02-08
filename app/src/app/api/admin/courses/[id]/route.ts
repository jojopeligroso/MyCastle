import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { programmeCourses } from '@/db/schema/programmes';
import { eq, and, isNull } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/utils';
import { z } from 'zod';

const updateCourseSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().optional(),
  description: z.string().optional(),
  level: z.string().optional(),
  duration_weeks: z.number().positive().optional(),
  objectives: z.string().optional(),
  cefr_descriptor_ids: z.array(z.string().uuid()).optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(['admin']);
    const { id: courseId } = await params;

    const [course] = await db
      .select()
      .from(programmeCourses)
      .where(and(eq(programmeCourses.id, courseId), isNull(programmeCourses.deleted_at)))
      .limit(1);

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    return NextResponse.json(course);
  } catch (error) {
    console.error('Error fetching course:', error);
    return NextResponse.json({ error: 'Failed to fetch course' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(['admin']);
    const { id: courseId } = await params;
    const body = await request.json();

    const validationResult = updateCourseSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    const updateData: Record<string, unknown> = { updated_at: new Date() };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.code !== undefined) updateData.code = data.code;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.level !== undefined) updateData.cefr_level = data.level;
    if (data.duration_weeks !== undefined) updateData.duration_weeks = data.duration_weeks;

    const [updatedCourse] = await db
      .update(programmeCourses)
      .set(updateData)
      .where(eq(programmeCourses.id, courseId))
      .returning();

    if (!updatedCourse) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    return NextResponse.json(updatedCourse);
  } catch (error) {
    console.error('Error updating course:', error);
    return NextResponse.json({ error: 'Failed to update course' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(['admin']);
    const { id: courseId } = await params;

    const [deletedCourse] = await db
      .update(programmeCourses)
      .set({
        deleted_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(programmeCourses.id, courseId))
      .returning();

    if (!deletedCourse) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting course:', error);
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 });
  }
}

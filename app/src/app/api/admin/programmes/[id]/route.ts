import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { programmes, courses } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/utils';
import { z } from 'zod';

const updateProgrammeSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().optional(),
  description: z.string().optional(),
  duration_weeks: z.number().positive().optional(),
  cefr_levels: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(['admin']);
    const programmeId = params.id;

    const [programme] = await db
      .select()
      .from(programmes)
      .where(and(eq(programmes.id, programmeId), isNull(programmes.deleted_at)))
      .limit(1);

    if (!programme) {
      return NextResponse.json({ error: 'Programme not found' }, { status: 404 });
    }

    // Fetch associated courses
    const programmeCourses = await db
      .select()
      .from(courses)
      .where(and(eq(courses.programme_id, programmeId), isNull(courses.deleted_at)))
      .orderBy(courses.level, courses.name);

    return NextResponse.json({ ...programme, courses: programmeCourses });
  } catch (error) {
    console.error('Error fetching programme:', error);
    return NextResponse.json(
      { error: 'Failed to fetch programme' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(['admin']);
    const programmeId = params.id;
    const body = await request.json();

    const validationResult = updateProgrammeSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    const updateData: Record<string, any> = { updated_at: new Date() };

    Object.keys(data).forEach((key) => {
      if (data[key as keyof typeof data] !== undefined) {
        updateData[key] = data[key as keyof typeof data];
      }
    });

    const [updatedProgramme] = await db
      .update(programmes)
      .set(updateData)
      .where(eq(programmes.id, programmeId))
      .returning();

    if (!updatedProgramme) {
      return NextResponse.json({ error: 'Programme not found' }, { status: 404 });
    }

    return NextResponse.json(updatedProgramme);
  } catch (error) {
    console.error('Error updating programme:', error);
    return NextResponse.json(
      { error: 'Failed to update programme' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(['admin']);
    const programmeId = params.id;

    const [deletedProgramme] = await db
      .update(programmes)
      .set({
        deleted_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(programmes.id, programmeId))
      .returning();

    if (!deletedProgramme) {
      return NextResponse.json({ error: 'Programme not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting programme:', error);
    return NextResponse.json(
      { error: 'Failed to delete programme' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { programmes, programmeCourses } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/utils';
import { z } from 'zod';

const updateProgrammeSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().optional(),
  description: z.string().optional(),
  duration_weeks: z.number().positive().optional(),
  hours_per_week: z.number().positive().optional(),
  levels: z.array(z.string()).optional(),
  status: z.enum(['active', 'archived']).optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(['admin']);
    const { id: programmeId } = await params;

    const [programme] = await db
      .select()
      .from(programmes)
      .where(and(eq(programmes.id, programmeId), isNull(programmes.deletedAt)))
      .limit(1);

    if (!programme) {
      return NextResponse.json({ error: 'Programme not found' }, { status: 404 });
    }

    // Fetch associated courses from programme_courses table
    const courses = await db
      .select()
      .from(programmeCourses)
      .where(
        and(eq(programmeCourses.programmeId, programmeId), isNull(programmeCourses.deletedAt))
      )
      .orderBy(programmeCourses.cefrLevel, programmeCourses.name);

    return NextResponse.json({ ...programme, courses });
  } catch (error) {
    console.error('Error fetching programme:', error);
    return NextResponse.json({ error: 'Failed to fetch programme' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(['admin']);
    const { id: programmeId } = await params;
    const body = await request.json();

    const validationResult = updateProgrammeSchema.safeParse(body);
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
    if (data.duration_weeks !== undefined) updateData.duration_weeks = data.duration_weeks;
    if (data.hours_per_week !== undefined) updateData.hours_per_week = data.hours_per_week;
    if (data.levels !== undefined) updateData.levels = data.levels;
    if (data.status !== undefined) updateData.status = data.status;

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
    return NextResponse.json({ error: 'Failed to update programme' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(['admin']);
    const { id: programmeId } = await params;

    const [deletedProgramme] = await db
      .update(programmes)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(programmes.id, programmeId))
      .returning();

    if (!deletedProgramme) {
      return NextResponse.json({ error: 'Programme not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting programme:', error);
    return NextResponse.json({ error: 'Failed to delete programme' }, { status: 500 });
  }
}

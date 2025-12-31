import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { programmes, courses } from '@/db/schema';
import { eq, isNull, sql } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/utils';
import { z } from 'zod';

const createProgrammeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().optional(),
  description: z.string().optional(),
  duration_weeks: z.number().positive().optional(),
  cefr_levels: z.array(z.string()).optional(),
  is_active: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    await requireAuth(['admin']);

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('is_active');

    let query = db
      .select({
        programme: programmes,
        courseCount: sql<number>`count(${courses.id})::int`,
      })
      .from(programmes)
      .leftJoin(courses, eq(programmes.id, courses.programme_id))
      .where(isNull(programmes.deleted_at))
      .groupBy(programmes.id)
      .$dynamic();

    if (isActive !== null) {
      query = query.where(eq(programmes.is_active, isActive === 'true'));
    }

    const results = await query.orderBy(programmes.name);

    return NextResponse.json({ programmes: results });
  } catch (error) {
    console.error('Error fetching programmes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch programmes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(['admin']);
    const body = await request.json();

    const validationResult = createProgrammeSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Generate programme code if not provided
    const programmeCode = data.code || data.name.substring(0, 3).toUpperCase();

    const [newProgramme] = await db
      .insert(programmes)
      .values({
        name: data.name,
        code: programmeCode,
        description: data.description || null,
        duration_weeks: data.duration_weeks || null,
        cefr_levels: data.cefr_levels || null,
        is_active: data.is_active,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    return NextResponse.json(newProgramme, { status: 201 });
  } catch (error) {
    console.error('Error creating programme:', error);
    return NextResponse.json(
      { error: 'Failed to create programme' },
      { status: 500 }
    );
  }
}

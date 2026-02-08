import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { programmes, programmeCourses } from '@/db/schema/programmes';
import { eq, isNull } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/utils';
import { z } from 'zod';

const createCourseSchema = z.object({
  programme_id: z.string().uuid('Valid programme ID is required'),
  name: z.string().min(1, 'Name is required'),
  code: z.string().optional(),
  description: z.string().optional(),
  level: z.string().min(1, 'CEFR level is required'),
  duration_weeks: z.number().positive().optional(),
  objectives: z.string().optional(),
  cefr_descriptor_ids: z.array(z.string().uuid()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    await requireAuth(['admin']);

    const { searchParams } = new URL(request.url);
    const programmeId = searchParams.get('programme_id');
    const level = searchParams.get('level');

    let query = db
      .select({
        course: programmeCourses,
        programme: {
          id: programmes.id,
          name: programmes.name,
          code: programmes.code,
        },
      })
      .from(programmeCourses)
      .leftJoin(programmes, eq(programmeCourses.programme_id, programmes.id))
      .where(isNull(programmeCourses.deleted_at))
      .$dynamic();

    if (programmeId) {
      query = query.where(eq(programmeCourses.programme_id, programmeId));
    }

    if (level) {
      query = query.where(eq(programmeCourses.cefr_level, level));
    }

    const results = await query.orderBy(programmeCourses.cefr_level, programmeCourses.name);

    return NextResponse.json({ courses: results });
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(['admin']);
    const body = await request.json();

    const validationResult = createCourseSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    const [programme] = await db
      .select()
      .from(programmes)
      .where(eq(programmes.id, data.programme_id))
      .limit(1);

    if (!programme) {
      return NextResponse.json({ error: 'Programme not found' }, { status: 404 });
    }

    const courseCode = data.code || `${data.level}-${data.name.substring(0, 3).toUpperCase()}`;

    const [newCourse] = await db
      .insert(programmeCourses)
      .values({
        tenant_id: programme.tenant_id,
        programme_id: data.programme_id,
        name: data.name,
        code: courseCode,
        description: data.description || null,
        cefr_level: data.level,
        duration_weeks: data.duration_weeks || 12,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    return NextResponse.json(newCourse, { status: 201 });
  } catch (error) {
    console.error('Error creating course:', error);
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });
  }
}

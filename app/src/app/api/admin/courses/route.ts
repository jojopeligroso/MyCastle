import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { courses } from '@/db/schema';
import { eq, ne, and } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { z } from 'zod';

const createCourseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().optional(),
  description: z.string().optional(),
  level: z.string().optional(),
  hoursPerWeek: z.number().positive().optional(),
  pricePerWeekEur: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    await requireAuth(['admin']);
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');
    const status = searchParams.get('status');

    let query = db
      .select()
      .from(courses)
      .where(and(eq(courses.tenantId, tenantId), ne(courses.status, 'deleted')))
      .$dynamic();

    if (level) {
      query = query.where(eq(courses.level, level));
    }

    if (status) {
      query = query.where(eq(courses.status, status));
    }

    const results = await query.orderBy(courses.name);

    return NextResponse.json({ courses: results });
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(['admin']);
    const tenantId = await getTenantId();
    const body = await request.json();

    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const validationResult = createCourseSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Generate course code if not provided
    const courseCode =
      data.code ||
      `${(data.level || 'GEN').substring(0, 2).toUpperCase()}-${data.name.substring(0, 3).toUpperCase()}`;

    const [newCourse] = await db
      .insert(courses)
      .values({
        tenantId,
        name: data.name,
        code: courseCode,
        description: data.description,
        level: data.level,
        hoursPerWeek: data.hoursPerWeek,
        pricePerWeekEur: data.pricePerWeekEur,
        status: 'active',
      })
      .returning();

    return NextResponse.json(newCourse, { status: 201 });
  } catch (error) {
    console.error('Error creating course:', error);
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });
  }
}

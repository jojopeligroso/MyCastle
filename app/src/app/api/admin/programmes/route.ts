import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { programmes, programmeCourses } from '@/db/schema';
import { eq, isNull, sql } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { z } from 'zod';

const createProgrammeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().optional(),
  description: z.string().optional(),
  duration_weeks: z.number().positive().optional(),
  hours_per_week: z.number().positive().optional(),
  levels: z.array(z.string()).optional(),
  status: z.enum(['active', 'archived']).default('active'),
});

export async function GET(request: NextRequest) {
  try {
    await requireAuth(['admin']);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = db
      .select({
        programme: programmes,
        courseCount: sql<number>`count(${programmeCourses.id})::int`,
      })
      .from(programmes)
      .leftJoin(programmeCourses, eq(programmes.id, programmeCourses.programme_id))
      .where(isNull(programmes.deleted_at))
      .groupBy(programmes.id)
      .$dynamic();

    if (status) {
      query = query.where(eq(programmes.status, status));
    }

    const results = await query.orderBy(programmes.name);

    return NextResponse.json({ programmes: results });
  } catch (error) {
    console.error('Error fetching programmes:', error);
    return NextResponse.json({ error: 'Failed to fetch programmes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(['admin']);
    const tenantId = await getTenantId();
    const body = await request.json();

    const validationResult = createProgrammeSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context available' }, { status: 400 });
    }

    // Generate programme code if not provided
    const programmeCode = data.code || data.name.substring(0, 3).toUpperCase();

    const [newProgramme] = await db
      .insert(programmes)
      .values({
        tenant_id: tenantId,
        name: data.name,
        code: programmeCode,
        description: data.description || null,
        duration_weeks: data.duration_weeks || 12,
        hours_per_week: data.hours_per_week || 15,
        levels: data.levels || ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
        status: data.status,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    return NextResponse.json(newProgramme, { status: 201 });
  } catch (error) {
    console.error('Error creating programme:', error);
    return NextResponse.json({ error: 'Failed to create programme' }, { status: 500 });
  }
}

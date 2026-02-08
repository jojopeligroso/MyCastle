import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema/core';
import { classes } from '@/db/schema/academic';
import { eq, and, isNull, sql, or, ilike } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/utils';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(['admin']);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');

    let query = db
      .select({
        teacher: users,
        assignedClasses: sql<number>`count(DISTINCT ${classes.id})::int`,
      })
      .from(users)
      .leftJoin(classes, eq(users.id, classes.teacherId))
      .where(and(eq(users.primaryRole, 'teacher'), isNull(users.deletedAt)))
      .groupBy(users.id)
      .$dynamic();

    if (search) {
      query = query.where(or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`)));
    }

    if (status) {
      query = query.where(eq(users.status, status));
    }

    const results = await query.orderBy(users.name);

    return NextResponse.json({ teachers: results });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    return NextResponse.json({ error: 'Failed to fetch teachers' }, { status: 500 });
  }
}

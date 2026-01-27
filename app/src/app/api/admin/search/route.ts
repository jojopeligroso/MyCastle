import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, classes } from '@/db/schema';
import { or, ilike, isNull, eq, and } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/utils';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query || query.length < 2) {
      return NextResponse.json({
        students: [],
        teachers: [],
        classes: [],
        message: 'Query must be at least 2 characters',
      });
    }

    const searchPattern = `%${query}%`;

    // Search students
    const students = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        status: users.status,
      })
      .from(users)
      .where(
        and(
          eq(users.primaryRole, 'student'),
          isNull(users.deletedAt),
          or(ilike(users.name, searchPattern), ilike(users.email, searchPattern))
        )
      )
      .limit(limit);

    // Search teachers
    const teachers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        status: users.status,
      })
      .from(users)
      .where(
        and(
          eq(users.primaryRole, 'teacher'),
          isNull(users.deletedAt),
          or(ilike(users.name, searchPattern), ilike(users.email, searchPattern))
        )
      )
      .limit(limit);

    // Search classes
    const searchClasses = await db
      .select({
        id: classes.id,
        name: classes.name,
        code: classes.code,
        level: classes.level,
        status: classes.status,
      })
      .from(classes)
      .where(
        and(
          isNull(classes.deletedAt),
          or(ilike(classes.name, searchPattern), ilike(classes.code, searchPattern))
        )
      )
      .limit(limit);

    return NextResponse.json({
      students: students.map(s => ({ ...s, type: 'student' })),
      teachers: teachers.map(t => ({ ...t, type: 'teacher' })),
      classes: searchClasses.map(c => ({ ...c, type: 'class' })),
      query,
    });
  } catch (error) {
    console.error('Error performing search:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

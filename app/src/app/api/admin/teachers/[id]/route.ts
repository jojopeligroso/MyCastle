import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, classes } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/utils';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(['admin']);
    const { id: teacherId } = await params;

    // Fetch teacher
    const [teacher] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, teacherId), eq(users.primaryRole, 'teacher'), isNull(users.deletedAt)))
      .limit(1);

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    // Fetch assigned classes
    const assignedClasses = await db
      .select()
      .from(classes)
      .where(and(eq(classes.teacherId, teacherId), isNull(classes.deletedAt)))
      .orderBy(classes.name);

    return NextResponse.json({
      ...teacher,
      classes: assignedClasses,
    });
  } catch (error) {
    console.error('Error fetching teacher:', error);
    return NextResponse.json({ error: 'Failed to fetch teacher' }, { status: 500 });
  }
}

/**
 * GET /api/student/notes
 * Get notes shared with the current student
 */

import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users, students } from '@/db/schema';
import { studentNotes } from '@/db/schema/profile';
import { eq, and, sql, desc } from 'drizzle-orm';
import { requireAuth, getTenantId, getUserId } from '@/lib/auth/utils';

export async function GET() {
  try {
    await requireAuth(['student']);
    const tenantId = await getTenantId();
    const userId = await getUserId();

    if (!tenantId || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Get student record
    const [studentData] = await db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.userId, userId))
      .limit(1);

    if (!studentData) {
      return NextResponse.json({ notes: [] });
    }

    // Get notes that are shared with the student
    const notes = await db
      .select({
        id: studentNotes.id,
        content: studentNotes.content,
        noteType: studentNotes.noteType,
        sharedAt: studentNotes.sharedAt,
        createdAt: studentNotes.createdAt,
        authorName: users.name,
      })
      .from(studentNotes)
      .leftJoin(users, eq(studentNotes.authorId, users.id))
      .where(
        and(eq(studentNotes.studentId, studentData.id), eq(studentNotes.isSharedWithStudent, true))
      )
      .orderBy(desc(studentNotes.sharedAt))
      .limit(50);

    return NextResponse.json({
      notes: notes.map(n => ({
        id: n.id,
        content: n.content,
        type: n.noteType,
        sharedAt: n.sharedAt?.toISOString() || n.createdAt.toISOString(),
        author: n.authorName || 'Teacher',
      })),
    });
  } catch (error) {
    console.error('Error fetching student notes:', error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

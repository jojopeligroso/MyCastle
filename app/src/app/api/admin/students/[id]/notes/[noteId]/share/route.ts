import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { studentNotes } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';

type RouteParams = { params: Promise<{ id: string; noteId: string }> };

/**
 * PUT /api/admin/students/[id]/notes/[noteId]/share
 * Share a note with the student
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth(['admin', 'teacher', 'dos']);
    const tenantId = await getTenantId();
    const { id: studentId, noteId } = await params;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    // Find the note
    const [note] = await db
      .select()
      .from(studentNotes)
      .where(
        and(
          eq(studentNotes.id, noteId),
          eq(studentNotes.studentId, studentId),
          eq(studentNotes.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Only shareable notes can be shared
    if (note.visibility !== 'shareable') {
      return NextResponse.json(
        { error: 'Only shareable notes can be shared with students' },
        { status: 400 }
      );
    }

    // Already shared
    if (note.isSharedWithStudent) {
      return NextResponse.json({ error: 'Note is already shared' }, { status: 400 });
    }

    // Share the note
    const [updated] = await db
      .update(studentNotes)
      .set({
        isSharedWithStudent: true,
        sharedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(studentNotes.id, noteId))
      .returning();

    // TODO: Send notification to student

    return NextResponse.json({ note: updated });
  } catch (error) {
    console.error('Error sharing note:', error);
    return NextResponse.json({ error: 'Failed to share note' }, { status: 500 });
  }
}

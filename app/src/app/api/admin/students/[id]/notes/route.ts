import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { studentNotes, users } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth, getTenantId, getUserId, getCurrentUser } from '@/lib/auth/utils';

/**
 * GET /api/admin/students/[id]/notes
 * Fetch all notes for a student
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(['admin', 'teacher', 'dos']);
    const tenantId = await getTenantId();
    const userId = await getUserId();
    const user = await getCurrentUser();
    const { id: studentId } = await params;

    if (!tenantId || !userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 403 });
    }

    const userRole = user?.user_metadata?.role || user?.app_metadata?.role;

    // Verify student exists
    const [student] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, studentId), eq(users.role, 'student')))
      .limit(1);

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Fetch notes with author details
    const notes = await db
      .select({
        id: studentNotes.id,
        content: studentNotes.content,
        noteType: studentNotes.noteType,
        visibility: studentNotes.visibility,
        isSharedWithStudent: studentNotes.isSharedWithStudent,
        sharedAt: studentNotes.sharedAt,
        tags: studentNotes.tags,
        authorId: studentNotes.authorId,
        authorRole: studentNotes.authorRole,
        editedAt: studentNotes.editedAt,
        editedBy: studentNotes.editedBy,
        createdAt: studentNotes.createdAt,
        updatedAt: studentNotes.updatedAt,
        // Author details
        authorName: users.name,
      })
      .from(studentNotes)
      .leftJoin(users, eq(studentNotes.authorId, users.id))
      .where(and(eq(studentNotes.studentId, studentId), eq(studentNotes.tenantId, tenantId)))
      .orderBy(desc(studentNotes.createdAt));

    // Filter based on visibility and user role
    const filteredNotes = notes.filter(note => {
      // Admins and DoS can see all notes
      if (userRole === 'admin' || userRole === 'dos') {
        return true;
      }
      // Teachers can see their own private notes and all staff_only/shareable notes
      if (note.visibility === 'private') {
        return note.authorId === userId;
      }
      return true;
    });

    // Format response
    const formattedNotes = filteredNotes.map(note => ({
      id: note.id,
      content: note.content,
      noteType: note.noteType,
      visibility: note.visibility,
      isSharedWithStudent: note.isSharedWithStudent,
      sharedAt: note.sharedAt?.toISOString() || null,
      tags: note.tags || [],
      author: {
        id: note.authorId,
        name: note.authorName || 'Unknown',
        role: note.authorRole,
      },
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      editedAt: note.editedAt?.toISOString() || null,
      editedBy: note.editedBy ? { name: 'Edited' } : null,
    }));

    return NextResponse.json({ notes: formattedNotes });
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

/**
 * POST /api/admin/students/[id]/notes
 * Create a new note
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(['admin', 'teacher', 'dos']);
    const tenantId = await getTenantId();
    const userId = await getUserId();
    const user = await getCurrentUser();
    const { id: studentId } = await params;
    const body = await request.json();

    if (!tenantId || !userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 403 });
    }

    const userRole = user?.user_metadata?.role || user?.app_metadata?.role || 'teacher';

    // Validate required fields
    const { content, noteType, visibility } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    // Verify student exists
    const [student] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, studentId), eq(users.role, 'student')))
      .limit(1);

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Create note
    const [newNote] = await db
      .insert(studentNotes)
      .values({
        tenantId,
        studentId,
        authorId: userId,
        authorRole: userRole,
        content: content.trim(),
        noteType: noteType || 'general',
        visibility: visibility || 'staff_only',
        tags: body.tags || [],
      })
      .returning();

    return NextResponse.json({ note: newNote }, { status: 201 });
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }
}

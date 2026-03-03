/**
 * Teacher Student Notes API
 * GET /api/teacher/students/[id]/notes - List notes (filtered for teacher access)
 * POST /api/teacher/students/[id]/notes - Create a note
 *
 * Teachers can:
 * - View staff_only and shareable notes
 * - View their own private notes
 * - Create notes (general, academic, behavioral - NOT medical/pastoral)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { studentNotes, users } from '@/db/schema';
import { eq, and, desc, ne } from 'drizzle-orm';
import { requireAuth, getTenantId, getUserId, getCurrentUser } from '@/lib/auth/utils';
import { canTeacherAccessStudent } from '@/lib/teachers';

// Note types teachers can create (medical and pastoral are restricted)
const TEACHER_ALLOWED_NOTE_TYPES = ['general', 'academic', 'behavioral'];

/**
 * GET /api/teacher/students/[id]/notes
 * Fetch notes for a student (filtered for teacher access)
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(['teacher']);
    const tenantId = await getTenantId();
    const userId = await getUserId();
    const user = await getCurrentUser();
    const { id: studentId } = await params;

    if (!tenantId || !userId || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 403 });
    }

    // Verify teacher can access this student
    const canAccess = await canTeacherAccessStudent(user.id, studentId, tenantId);
    if (!canAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this student' },
        { status: 403 }
      );
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
      .where(
        and(
          eq(studentNotes.studentId, studentId),
          eq(studentNotes.tenantId, tenantId),
          // Exclude medical notes for teachers
          ne(studentNotes.noteType, 'medical')
        )
      )
      .orderBy(desc(studentNotes.createdAt));

    // Filter based on visibility - teachers can see:
    // - Their own private notes
    // - All staff_only notes
    // - All shareable notes
    const filteredNotes = notes.filter(note => {
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
      // Can only edit own notes
      canEdit: note.authorId === userId,
    }));

    return NextResponse.json({ notes: formattedNotes });
  } catch (error) {
    console.error('Error fetching teacher notes:', error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

/**
 * POST /api/teacher/students/[id]/notes
 * Create a new note (restricted note types for teachers)
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(['teacher']);
    const tenantId = await getTenantId();
    const userId = await getUserId();
    const user = await getCurrentUser();
    const { id: studentId } = await params;
    const body = await request.json();

    if (!tenantId || !userId || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 403 });
    }

    // Verify teacher can access this student
    const canAccess = await canTeacherAccessStudent(user.id, studentId, tenantId);
    if (!canAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this student' },
        { status: 403 }
      );
    }

    // Validate required fields
    const { content, noteType, visibility } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    // Validate note type for teachers
    const validatedNoteType = noteType || 'general';
    if (!TEACHER_ALLOWED_NOTE_TYPES.includes(validatedNoteType)) {
      return NextResponse.json(
        {
          error: `Teachers can only create ${TEACHER_ALLOWED_NOTE_TYPES.join(', ')} notes`,
        },
        { status: 400 }
      );
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
        authorRole: 'teacher',
        content: content.trim(),
        noteType: validatedNoteType,
        visibility: visibility || 'staff_only',
        tags: body.tags || [],
      })
      .returning();

    return NextResponse.json({ note: newNote }, { status: 201 });
  } catch (error) {
    console.error('Error creating teacher note:', error);
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }
}

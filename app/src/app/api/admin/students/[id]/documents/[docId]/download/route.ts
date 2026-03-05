/**
 * Document Download API
 * GET /api/admin/students/[id]/documents/[docId]/download
 *
 * Generate presigned URL for secure document download from Supabase Storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { studentDocuments } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth, getTenantId, getUserId } from '@/lib/auth/utils';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// GET - Generate presigned download URL
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    await requireAuth(['admin', 'dos', 'teacher', 'student']);
    const tenantId = await getTenantId();
    const userId = await getUserId();
    const { id: studentId, docId } = await params;

    if (!tenantId || !userId) {
      return NextResponse.json({ error: 'No auth context' }, { status: 403 });
    }

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Get document metadata
    const document = await db.query.studentDocuments.findFirst({
      where: (docs, { and, eq }) =>
        and(
          eq(docs.id, docId),
          eq(docs.studentId, studentId),
          eq(docs.tenantId, tenantId)
        ),
      with: {
        documentType: true,
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Get current user's role
    const currentUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, userId),
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 403 });
    }

    // Permission check based on role and document visibility
    const role = currentUser.primaryRole;
    const isStudent = role === 'student';
    const isOwnDocument = userId === studentId;

    if (isStudent) {
      // Students can only download:
      // 1. Documents they uploaded themselves
      // 2. Documents explicitly shared with them
      const canAccess =
        (isOwnDocument && document.uploadedBy === userId) || // Own uploads
        (isOwnDocument && document.isSharedWithStudent); // Shared documents

      if (!canAccess) {
        return NextResponse.json(
          { error: 'You do not have permission to access this document' },
          { status: 403 }
        );
      }
    }
    // admin, dos, teacher roles have access (already checked by requireAuth)

    // Initialize Supabase client with service role for signed URL generation
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase credentials');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate presigned URL (valid for 1 hour)
    const expiresIn = 3600; // 1 hour in seconds
    const { data, error } = await supabase.storage
      .from('student-documents')
      .createSignedUrl(document.fileUrl, expiresIn);

    if (error) {
      console.error('Error generating signed URL:', error);
      return NextResponse.json(
        { error: 'Failed to generate download URL' },
        { status: 500 }
      );
    }

    if (!data?.signedUrl) {
      return NextResponse.json(
        { error: 'Failed to generate download URL' },
        { status: 500 }
      );
    }

    // TODO: Create audit log entry (document accessed)

    return NextResponse.json({
      url: data.signedUrl,
      expiresIn,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      fileName: document.fileName,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
    });
  } catch (error) {
    console.error('Error generating download URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate download URL' },
      { status: 500 }
    );
  }
}

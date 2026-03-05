/**
 * Student Timeline API
 * GET /api/admin/students/[id]/timeline
 *
 * Aggregates all student history into chronological timeline:
 * - Document uploads/approvals
 * - Assessment scores
 * - Class enrollments
 * - Attendance events (detailed mode)
 * - Generated letters
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import {
  studentDocuments,
  documentTypes,
  enrollments,
  classes,
  generatedLetters,
  letterTemplates,
  users,
} from '@/db/schema';
import { eq, and, sql, gte, lte, desc } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';

// ============================================================================
// Timeline Event Types
// ============================================================================

type TimelineEventType =
  | 'document_upload'
  | 'document_approved'
  | 'document_rejected'
  | 'assessment'
  | 'enrollment'
  | 'letter_generated'
  | 'attendance';

interface TimelineEvent {
  id: string;
  timestamp: Date;
  eventType: TimelineEventType;
  title: string;
  description?: string;
  metadata: Record<string, any>;
  relatedEntityId?: string;
  performedBy?: {
    id: string;
    name: string;
  };
}

// ============================================================================
// GET - Get student timeline
// ============================================================================

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(['admin', 'dos', 'teacher']);
    const tenantId = await getTenantId();
    const { id: studentId } = await params;

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from'); // ISO 8601 date
    const to = searchParams.get('to'); // ISO 8601 date
    const eventTypesParam = searchParams.get('eventTypes'); // Comma-separated
    const detailLevel = searchParams.get('detailLevel') || 'summary'; // summary | detailed
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Parse event types filter
    const eventTypes: TimelineEventType[] = eventTypesParam
      ? (eventTypesParam.split(',') as TimelineEventType[])
      : [
          'document_upload',
          'document_approved',
          'document_rejected',
          'assessment',
          'enrollment',
          'letter_generated',
        ];

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Verify student exists
    const student = await db.query.users.findFirst({
      where: (users, { and, eq }) => and(eq(users.id, studentId), eq(users.tenantId, tenantId)),
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const events: TimelineEvent[] = [];

    // ========================================================================
    // 1. Document Events
    // ========================================================================
    if (
      eventTypes.some(t =>
        ['document_upload', 'document_approved', 'document_rejected'].includes(t)
      )
    ) {
      const documentConditions = [
        eq(studentDocuments.studentId, studentId),
        eq(studentDocuments.tenantId, tenantId),
      ];

      if (from) {
        documentConditions.push(gte(studentDocuments.uploadedAt, new Date(from)));
      }
      if (to) {
        documentConditions.push(lte(studentDocuments.uploadedAt, new Date(to)));
      }

      const documents = await db
        .select({
          id: studentDocuments.id,
          fileName: studentDocuments.fileName,
          uploadedAt: studentDocuments.uploadedAt,
          uploadedBy: studentDocuments.uploadedBy,
          uploadedByName: users.name,
          approvalStatus: studentDocuments.approvalStatus,
          reviewedAt: studentDocuments.reviewedAt,
          reviewedBy: studentDocuments.reviewedBy,
          rejectionReason: studentDocuments.rejectionReason,
          documentTypeName: documentTypes.name,
          documentTypeCategory: documentTypes.category,
        })
        .from(studentDocuments)
        .leftJoin(users, eq(studentDocuments.uploadedBy, users.id))
        .leftJoin(documentTypes, eq(studentDocuments.documentTypeId, documentTypes.id))
        .where(and(...documentConditions));

      for (const doc of documents) {
        // Upload event
        if (eventTypes.includes('document_upload')) {
          events.push({
            id: `doc-upload-${doc.id}`,
            timestamp: doc.uploadedAt,
            eventType: 'document_upload',
            title: `Document Uploaded: ${doc.fileName}`,
            description: `${doc.documentTypeCategory}: ${doc.documentTypeName}`,
            metadata: {
              documentId: doc.id,
              fileName: doc.fileName,
              documentType: doc.documentTypeName,
              category: doc.documentTypeCategory,
            },
            relatedEntityId: doc.id,
            performedBy: doc.uploadedBy
              ? { id: doc.uploadedBy, name: doc.uploadedByName || 'Unknown' }
              : undefined,
          });
        }

        // Approval/Rejection events (if reviewed)
        if (doc.reviewedAt) {
          if (doc.approvalStatus === 'approved' && eventTypes.includes('document_approved')) {
            events.push({
              id: `doc-approved-${doc.id}`,
              timestamp: doc.reviewedAt,
              eventType: 'document_approved',
              title: `Document Approved: ${doc.fileName}`,
              description: `${doc.documentTypeName} approved`,
              metadata: {
                documentId: doc.id,
                fileName: doc.fileName,
              },
              relatedEntityId: doc.id,
            });
          } else if (
            doc.approvalStatus === 'rejected' &&
            eventTypes.includes('document_rejected')
          ) {
            events.push({
              id: `doc-rejected-${doc.id}`,
              timestamp: doc.reviewedAt,
              eventType: 'document_rejected',
              title: `Document Rejected: ${doc.fileName}`,
              description: doc.rejectionReason || undefined,
              metadata: {
                documentId: doc.id,
                fileName: doc.fileName,
                reason: doc.rejectionReason,
              },
              relatedEntityId: doc.id,
            });
          }
        }
      }
    }

    // ========================================================================
    // 2. Class Enrollment Events
    // ========================================================================
    if (eventTypes.includes('enrollment')) {
      const enrollmentConditions = [
        eq(enrollments.studentId, studentId),
        eq(enrollments.tenantId, tenantId),
      ];

      if (from) {
        enrollmentConditions.push(gte(enrollments.enrollmentDate, from));
      }
      if (to) {
        enrollmentConditions.push(lte(enrollments.enrollmentDate, to));
      }

      const enrollmentRecords = await db
        .select({
          id: enrollments.id,
          enrollmentDate: enrollments.enrollmentDate,
          status: enrollments.status,
          className: classes.name,
          classStartDate: classes.startDate,
          classEndDate: classes.endDate,
        })
        .from(enrollments)
        .leftJoin(classes, eq(enrollments.classId, classes.id))
        .where(and(...enrollmentConditions));

      for (const enrollment of enrollmentRecords) {
        events.push({
          id: `enrollment-${enrollment.id}`,
          timestamp: new Date(enrollment.enrollmentDate),
          eventType: 'enrollment',
          title: `Enrolled in ${enrollment.className}`,
          description: `Status: ${enrollment.status}`,
          metadata: {
            enrollmentId: enrollment.id,
            className: enrollment.className,
            status: enrollment.status,
            classStartDate: enrollment.classStartDate,
            classEndDate: enrollment.classEndDate,
          },
          relatedEntityId: enrollment.id,
        });
      }
    }

    // ========================================================================
    // 3. Generated Letters
    // ========================================================================
    if (eventTypes.includes('letter_generated')) {
      const letterConditions = [
        eq(generatedLetters.studentId, studentId),
        eq(generatedLetters.tenantId, tenantId),
      ];

      if (from) {
        letterConditions.push(gte(generatedLetters.generatedAt, new Date(from)));
      }
      if (to) {
        letterConditions.push(lte(generatedLetters.generatedAt, new Date(to)));
      }

      const letters = await db
        .select({
          id: generatedLetters.id,
          generatedAt: generatedLetters.generatedAt,
          generatedBy: generatedLetters.generatedBy,
          generatedByName: users.name,
          templateName: letterTemplates.name,
          outputFormat: letterTemplates.outputFormat,
        })
        .from(generatedLetters)
        .leftJoin(users, eq(generatedLetters.generatedBy, users.id))
        .leftJoin(letterTemplates, eq(generatedLetters.templateId, letterTemplates.id))
        .where(and(...letterConditions));

      for (const letter of letters) {
        events.push({
          id: `letter-${letter.id}`,
          timestamp: letter.generatedAt,
          eventType: 'letter_generated',
          title: `Letter Generated: ${letter.templateName}`,
          description: `Format: ${letter.outputFormat || 'PDF'}`,
          metadata: {
            letterId: letter.id,
            templateName: letter.templateName,
            format: letter.outputFormat || 'pdf',
          },
          relatedEntityId: letter.id,
          performedBy: letter.generatedBy
            ? { id: letter.generatedBy, name: letter.generatedByName || 'Unknown' }
            : undefined,
        });
      }
    }

    // ========================================================================
    // 4. Assessment Events (TODO - requires assessments table)
    // ========================================================================
    // Note: This will be implemented once assessments table is finalized
    // if (eventTypes.includes('assessment')) {
    //   // Query assessments table when available
    // }

    // ========================================================================
    // Sort events chronologically (newest first)
    // ========================================================================
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const paginatedEvents = events.slice(offset, offset + limit);

    // ========================================================================
    // Calculate statistics
    // ========================================================================
    const stats = {
      total: events.length,
      byType: events.reduce(
        (acc, event) => {
          acc[event.eventType] = (acc[event.eventType] || 0) + 1;
          return acc;
        },
        {} as Record<TimelineEventType, number>
      ),
      dateRange: {
        earliest: events[events.length - 1]?.timestamp,
        latest: events[0]?.timestamp,
      },
    };

    return NextResponse.json({
      events: paginatedEvents,
      stats,
      pagination: {
        total: events.length,
        limit,
        offset,
        hasMore: offset + limit < events.length,
      },
      filters: {
        from,
        to,
        eventTypes,
        detailLevel,
      },
    });
  } catch (error) {
    console.error('Error fetching student timeline:', error);
    return NextResponse.json({ error: 'Failed to fetch student timeline' }, { status: 500 });
  }
}

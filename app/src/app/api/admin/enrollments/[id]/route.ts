import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { enrollments, enrollmentAmendments, classes, auditLogs } from '@/db/schema';
import { eq, and, ne, desc, sql } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { z } from 'zod';

const updateEnrollmentSchema = z.object({
  end_date: z.string().optional(),
  status: z.enum(['active', 'completed', 'withdrawn', 'transferred']).optional(),
});

const createAmendmentSchema = z.object({
  amendment_type: z.enum(['EXTENSION', 'REDUCTION', 'LEVEL_CHANGE', 'TRANSFER']),
  previous_value: z.string().optional(),
  new_value: z.string().optional(),
  reason: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(['admin']);
    const { id: enrollmentId } = await params;

    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.id, enrollmentId), ne(enrollments.status, 'dropped')))
      .limit(1);

    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    // Fetch amendments
    const amendments = await db
      .select()
      .from(enrollmentAmendments)
      .where(eq(enrollmentAmendments.enrollmentId, enrollmentId))
      .orderBy(desc(enrollmentAmendments.createdAt));

    return NextResponse.json({ ...enrollment, amendments });
  } catch (error) {
    console.error('Error fetching enrollment:', error);
    return NextResponse.json({ error: 'Failed to fetch enrollment' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(['admin']);
    const { id: enrollmentId } = await params;
    const body = await request.json();

    const validationResult = updateEnrollmentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    const updateData: Record<string, unknown> = { updated_at: new Date() };
    if (data.end_date !== undefined) {
      updateData.end_date = new Date(data.end_date);
    }
    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    const [updatedEnrollment] = await db
      .update(enrollments)
      .set(updateData)
      .where(eq(enrollments.id, enrollmentId))
      .returning();

    if (!updatedEnrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    return NextResponse.json(updatedEnrollment);
  } catch (error) {
    console.error('Error updating enrollment:', error);
    return NextResponse.json({ error: 'Failed to update enrollment' }, { status: 500 });
  }
}

// Amendment creation endpoint
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const tenantId = await getTenantId();
    const { id: enrollmentId } = await params;
    const body = await request.json();

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    const validationResult = createAmendmentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Verify enrollment exists
    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.id, enrollmentId))
      .limit(1);

    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    // Create amendment
    const [newAmendment] = await db
      .insert(enrollmentAmendments)
      .values({
        tenantId: tenantId,
        enrollmentId: enrollmentId,
        amendmentType: data.amendment_type,
        reason: data.reason || null,
        metadata: data.metadata || {},
        requestedBy: user.id,
        status: 'approved', // Auto-approve for now
      })
      .returning();

    // Apply amendment to enrollment if needed
    if (data.amendment_type === 'EXTENSION' && data.new_value) {
      await db
        .update(enrollments)
        .set({
          expectedEndDate: data.new_value,
          updatedAt: new Date(),
        })
        .where(eq(enrollments.id, enrollmentId));
    }

    if (data.amendment_type === 'REDUCTION' && data.new_value) {
      await db
        .update(enrollments)
        .set({
          expectedEndDate: data.new_value,
          updatedAt: new Date(),
        })
        .where(eq(enrollments.id, enrollmentId));
    }

    // Create audit log entry
    await db.insert(auditLogs).values({
      tenantId: tenantId,
      userId: user.id,
      action: 'enrollment_amended',
      resourceType: 'enrollment',
      resourceId: enrollmentId,
      metadata: {
        amendmentId: newAmendment.id,
        amendmentType: data.amendment_type,
        previousValue: data.previous_value,
        newValue: data.new_value,
        reason: data.reason,
      },
    });

    return NextResponse.json(newAmendment, { status: 201 });
  } catch (error) {
    console.error('Error creating amendment:', error);
    return NextResponse.json({ error: 'Failed to create amendment' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(['admin']);
    const { id: enrollmentId } = await params;

    // Get enrollment to decrement class count
    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.id, enrollmentId))
      .limit(1);

    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    // Soft delete enrollment by setting status to dropped
    await db
      .update(enrollments)
      .set({
        status: 'dropped',
        updatedAt: new Date(),
      })
      .where(eq(enrollments.id, enrollmentId));

    // Decrement class enrolled count if enrollment was active
    if (enrollment.status === 'active') {
      await db.execute(
        sql`UPDATE classes SET enrolled_count = GREATEST(0, enrolled_count - 1), updated_at = NOW() WHERE id = ${enrollment.classId}`
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting enrollment:', error);
    return NextResponse.json({ error: 'Failed to delete enrollment' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { enrollments, enrollmentAmendments, classes } from '@/db/schema/academic';
import { auditLogs } from '@/db/schema/system';
import { eq, sql } from 'drizzle-orm';
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
  metadata: z.record(z.any()).optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(['admin']);
    const { id: enrollmentId } = await params;

    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.id, enrollmentId))
      .limit(1);

    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    const amendments = await db
      .select()
      .from(enrollmentAmendments)
      .where(eq(enrollmentAmendments.enrollmentId, enrollmentId))
      .orderBy(enrollmentAmendments.createdAt);

    return NextResponse.json({ ...enrollment, amendments });
  } catch (error) {
    console.error('Error fetching enrollment:', error);
    return NextResponse.json({ error: 'Failed to fetch enrollment' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.end_date !== undefined) {
      updateData.completionDate = new Date(data.end_date);
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

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.id, enrollmentId))
      .limit(1);

    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    const [newAmendment] = await db
      .insert(enrollmentAmendments)
      .values({
        tenantId,
        enrollmentId,
        amendmentType: data.amendment_type.toLowerCase(),
        amendmentDate: new Date(),
        previousEndDate: data.previous_value
          ? new Date(data.previous_value)
          : enrollment.completionDate,
        newEndDate: data.new_value ? new Date(data.new_value) : null,
        reason: data.reason || null,
        metadata: data.metadata || {},
        requestedBy: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    if (
      (data.amendment_type === 'EXTENSION' || data.amendment_type === 'REDUCTION') &&
      data.new_value
    ) {
      await db
        .update(enrollments)
        .set({
          completionDate: new Date(data.new_value),
          updatedAt: new Date(),
          isAmended: true,
        })
        .where(eq(enrollments.id, enrollmentId));
    }

    await db.insert(auditLogs).values({
      tenant_id: tenantId,
      user_id: user.id,
      action: 'enrollment_amended',
      resource_type: 'enrollment',
      resource_id: enrollmentId,
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

    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.id, enrollmentId))
      .limit(1);

    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    await db.delete(enrollments).where(eq(enrollments.id, enrollmentId));

    if (enrollment.status === 'active') {
      await db
        .update(classes)
        .set({
          enrolledCount: sql`GREATEST(0, ${classes.enrolledCount} - 1)`,
          updatedAt: new Date(),
        })
        .where(eq(classes.id, enrollment.classId));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting enrollment:', error);
    return NextResponse.json({ error: 'Failed to delete enrollment' }, { status: 500 });
  }
}

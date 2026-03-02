/**
 * Field Trip API
 * PATCH /api/lessons/[id]/field-trip
 * Add or update field trip details for a lesson plan
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { db } from '@/db';
import { lessonPlans } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { FieldTripSchema } from '@/lib/lessons/chat-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(['teacher', 'admin']);
    const tenantId = await getTenantId();
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Lesson plan ID is required' },
        { status: 400 }
      );
    }

    // Parse and validate field trip data
    const body = await request.json();
    const fieldTrip = FieldTripSchema.parse(body);

    // Find the lesson plan
    const [plan] = await db
      .select()
      .from(lessonPlans)
      .where(
        and(
          eq(lessonPlans.id, id),
          tenantId ? eq(lessonPlans.tenantId, tenantId) : undefined
        )
      )
      .limit(1);

    if (!plan) {
      return NextResponse.json(
        { error: 'Lesson plan not found' },
        { status: 404 }
      );
    }

    // Update the json_plan with field trip data
    const existingPlan = (plan.jsonPlan as Record<string, unknown>) || {};
    const updatedJsonPlan = {
      ...existingPlan,
      field_trip: {
        location: fieldTrip.location,
        venue_name: fieldTrip.venueName,
        date: fieldTrip.date,
        departure_time: fieldTrip.departureTime,
        return_time: fieldTrip.returnTime,
        educational_objectives: fieldTrip.educationalObjectives,
        cefr_alignment: fieldTrip.cefrAlignment,
        risk_assessment: fieldTrip.riskAssessment,
        permissions_required: fieldTrip.permissionsRequired,
        transport: fieldTrip.transport,
        emergency_contact: fieldTrip.emergencyContact,
        notes: fieldTrip.notes,
      },
    };

    // Save the updated plan
    const [updatedPlan] = await db
      .update(lessonPlans)
      .set({
        jsonPlan: updatedJsonPlan,
        updatedAt: new Date(),
      })
      .where(eq(lessonPlans.id, id))
      .returning();

    console.log(
      `Field trip added to lesson plan ${id} by ${user.id}`
    );

    return NextResponse.json({
      success: true,
      data: {
        id: updatedPlan.id,
        fieldTrip: updatedJsonPlan.field_trip,
      },
    });
  } catch (error) {
    console.error('Error saving field trip:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid field trip data', details: error },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to save field trip' },
      { status: 500 }
    );
  }
}

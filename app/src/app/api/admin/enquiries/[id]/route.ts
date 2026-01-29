/**
 * Admin Enquiry Detail API - CRUD operations for individual enquiries
 * GET /api/admin/enquiries/[id] - Fetch single enquiry
 * PUT /api/admin/enquiries/[id] - Update enquiry (typically status changes)
 * DELETE /api/admin/enquiries/[id] - Delete enquiry
 * REQ: spec/01-admin-mcp.md §1.2.6 - admin://enquiries resource
 * DESIGN: Task 1.10.2 - Enquiry Detail View (supporting routes)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { enquiries } from '@/db/schema';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const updateEnquirySchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  programmeInterest: z.string().optional(),
  levelEstimate: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional(),
  startDatePreference: z.string().optional(),
  status: z.enum(['new', 'contacted', 'converted', 'rejected']).optional(),
  source: z.enum(['website', 'referral', 'agent', 'social', 'phone', 'walk_in']).optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/admin/enquiries/[id]
 * Fetch a single enquiry by ID
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Verify authentication and get tenant
    await requireAuth(['admin']);
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    // Fetch enquiry with RLS enforcement
    const [enquiry] = await db
      .select()
      .from(enquiries)
      .where(and(eq(enquiries.id, id), eq(enquiries.tenantId, tenantId)))
      .limit(1);

    if (!enquiry) {
      return NextResponse.json({ error: 'Enquiry not found' }, { status: 404 });
    }

    return NextResponse.json(enquiry);
  } catch (error: unknown) {
    console.error('Error fetching enquiry:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch enquiry' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/enquiries/[id]
 * Update an enquiry (typically status changes, notes, or details)
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Verify authentication and get tenant
    await requireAuth(['admin']);
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateEnquirySchema.parse(body);

    // Check if enquiry exists and belongs to this tenant
    const [existingEnquiry] = await db
      .select()
      .from(enquiries)
      .where(and(eq(enquiries.id, id), eq(enquiries.tenantId, tenantId)))
      .limit(1);

    if (!existingEnquiry) {
      return NextResponse.json({ error: 'Enquiry not found' }, { status: 404 });
    }

    // Prepare update data (only include fields that were provided)
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.email !== undefined) updateData.email = validatedData.email;
    if (validatedData.phone !== undefined) updateData.phone = validatedData.phone;
    if (validatedData.programmeInterest !== undefined)
      updateData.programmeInterest = validatedData.programmeInterest;
    if (validatedData.levelEstimate !== undefined)
      updateData.levelEstimate = validatedData.levelEstimate;
    if (validatedData.startDatePreference !== undefined)
      updateData.startDatePreference = validatedData.startDatePreference
        ? new Date(validatedData.startDatePreference)
        : null;
    if (validatedData.status !== undefined) updateData.status = validatedData.status;
    if (validatedData.source !== undefined) updateData.source = validatedData.source;
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes;

    // Update enquiry
    const [updatedEnquiry] = await db
      .update(enquiries)
      .set(updateData)
      .where(and(eq(enquiries.id, id), eq(enquiries.tenantId, tenantId)))
      .returning();

    return NextResponse.json({
      success: true,
      enquiry: updatedEnquiry,
    });
  } catch (error: unknown) {
    console.error('Error updating enquiry:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update enquiry' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/enquiries/[id]
 * Delete an enquiry (hard delete for MVP, consider soft delete later)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify authentication and get tenant
    await requireAuth(['admin']);
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    // Check if enquiry exists and belongs to this tenant
    const [existingEnquiry] = await db
      .select()
      .from(enquiries)
      .where(and(eq(enquiries.id, id), eq(enquiries.tenantId, tenantId)))
      .limit(1);

    if (!existingEnquiry) {
      return NextResponse.json({ error: 'Enquiry not found' }, { status: 404 });
    }

    // Delete enquiry (hard delete - cascade will handle related records)
    await db.delete(enquiries).where(and(eq(enquiries.id, id), eq(enquiries.tenantId, tenantId)));

    return NextResponse.json({
      success: true,
      message: 'Enquiry deleted successfully',
    });
  } catch (error: unknown) {
    console.error('Error deleting enquiry:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete enquiry' },
      { status: 500 }
    );
  }
}

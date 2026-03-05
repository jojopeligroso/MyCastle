/**
 * Individual Emergency Contact API
 * GET/PATCH/DELETE /api/admin/students/[id]/emergency-contacts/[contactId]
 *
 * Operations on a specific emergency contact
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { emergencyContacts } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth, getTenantId, getUserId } from '@/lib/auth/utils';
import { z } from 'zod';

// ============================================================================
// Validation Schemas
// ============================================================================

const updateEmergencyContactSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  relationship: z.string().min(1).max(100).optional(),
  phone: z.string().min(1).max(50).optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  isLegalGuardian: z.boolean().optional(),
  priority: z.number().int().min(1).max(2).optional(),
  notes: z.string().optional(),
});

// ============================================================================
// GET - Get specific emergency contact
// ============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    await requireAuth(['admin', 'dos', 'teacher']);
    const tenantId = await getTenantId();
    const { id: studentId, contactId } = await params;

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
    }

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Get emergency contact
    const contact = await db.query.emergencyContacts.findFirst({
      where: (contacts, { and, eq }) =>
        and(
          eq(contacts.id, contactId),
          eq(contacts.studentId, studentId),
          eq(contacts.tenantId, tenantId)
        ),
    });

    if (!contact) {
      return NextResponse.json({ error: 'Emergency contact not found' }, { status: 404 });
    }

    return NextResponse.json({ contact });
  } catch (error) {
    console.error('Error fetching emergency contact:', error);
    return NextResponse.json({ error: 'Failed to fetch emergency contact' }, { status: 500 });
  }
}

// ============================================================================
// PATCH - Update emergency contact
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    await requireAuth(['admin', 'dos']);
    const tenantId = await getTenantId();
    const userId = await getUserId();
    const { id: studentId, contactId } = await params;

    if (!tenantId || !userId) {
      return NextResponse.json({ error: 'No auth context' }, { status: 403 });
    }

    const body = await request.json();

    // Validate input
    const validationResult = updateEmergencyContactSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Verify contact exists
    const existing = await db.query.emergencyContacts.findFirst({
      where: (contacts, { and, eq }) =>
        and(
          eq(contacts.id, contactId),
          eq(contacts.studentId, studentId),
          eq(contacts.tenantId, tenantId)
        ),
    });

    if (!existing) {
      return NextResponse.json({ error: 'Emergency contact not found' }, { status: 404 });
    }

    // If priority is changing, check if new priority is available
    if (data.priority !== undefined && data.priority !== existing.priority) {
      const newPriority = data.priority; // TypeScript narrowing
      const priorityTaken = await db.query.emergencyContacts.findFirst({
        where: (contacts, { and, eq }) =>
          and(
            eq(contacts.studentId, studentId),
            eq(contacts.tenantId, tenantId),
            eq(contacts.priority, newPriority)
          ),
      });

      if (priorityTaken) {
        return NextResponse.json(
          {
            error: `Priority ${data.priority} is already assigned to another contact`,
            suggestion: 'Please update the other contact first or use a different priority',
          },
          { status: 400 }
        );
      }
    }

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.relationship !== undefined) updateData.relationship = data.relationship;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.address !== undefined) updateData.address = data.address || null;
    if (data.isLegalGuardian !== undefined) updateData.isLegalGuardian = data.isLegalGuardian;
    if (data.notes !== undefined) updateData.notes = data.notes || null;

    // If priority is changing, update isPrimary accordingly
    if (data.priority !== undefined) {
      updateData.priority = data.priority;
      updateData.isPrimary = data.priority === 1;
    }

    // Update contact
    const [updated] = await db
      .update(emergencyContacts)
      .set(updateData)
      .where(and(eq(emergencyContacts.id, contactId), eq(emergencyContacts.tenantId, tenantId)))
      .returning();

    // TODO: Create audit log entry
    // TODO: Send notification if critical fields changed (phone, etc.)

    return NextResponse.json({
      contact: updated,
      message: 'Emergency contact updated successfully',
    });
  } catch (error) {
    console.error('Error updating emergency contact:', error);

    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('unique_student_priority')) {
      return NextResponse.json(
        {
          error: 'A contact with this priority already exists',
          suggestion: 'Please use a different priority',
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: 'Failed to update emergency contact' }, { status: 500 });
  }
}

// ============================================================================
// DELETE - Delete emergency contact
// ============================================================================

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    await requireAuth(['admin', 'dos']);
    const tenantId = await getTenantId();
    const { id: studentId, contactId } = await params;

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
    }

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Verify contact exists
    const existing = await db.query.emergencyContacts.findFirst({
      where: (contacts, { and, eq }) =>
        and(
          eq(contacts.id, contactId),
          eq(contacts.studentId, studentId),
          eq(contacts.tenantId, tenantId)
        ),
    });

    if (!existing) {
      return NextResponse.json({ error: 'Emergency contact not found' }, { status: 404 });
    }

    // Hard delete (emergency contacts don't need soft delete)
    await db
      .delete(emergencyContacts)
      .where(and(eq(emergencyContacts.id, contactId), eq(emergencyContacts.tenantId, tenantId)));

    // TODO: Create audit log entry
    // TODO: Send notification/alert if student now has <2 contacts

    return NextResponse.json({
      message: 'Emergency contact deleted successfully',
      deletedPriority: existing.priority,
    });
  } catch (error) {
    console.error('Error deleting emergency contact:', error);
    return NextResponse.json({ error: 'Failed to delete emergency contact' }, { status: 500 });
  }
}

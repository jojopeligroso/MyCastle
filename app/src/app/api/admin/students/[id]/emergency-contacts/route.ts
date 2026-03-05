/**
 * Emergency Contacts API
 * GET/POST /api/admin/students/[id]/emergency-contacts
 *
 * Manage student emergency contacts (max 2 per student)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { emergencyContacts } from '@/db/schema';
import { eq, and, sql, asc } from 'drizzle-orm';
import { requireAuth, getTenantId, getUserId } from '@/lib/auth/utils';
import { z } from 'zod';

// ============================================================================
// Validation Schemas
// ============================================================================

const createEmergencyContactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  relationship: z.string().min(1, 'Relationship is required').max(100),
  phone: z.string().min(1, 'Phone is required').max(50),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  isLegalGuardian: z.boolean().optional().default(false),
  priority: z.number().int().min(1).max(2), // 1=primary, 2=secondary
  notes: z.string().optional(),
});

// ============================================================================
// GET - List all emergency contacts for student
// ============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(['admin', 'dos', 'teacher']);
    const tenantId = await getTenantId();
    const { id: studentId } = await params;

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
    }

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Get all emergency contacts for student, ordered by priority
    const contacts = await db
      .select()
      .from(emergencyContacts)
      .where(
        and(
          eq(emergencyContacts.studentId, studentId),
          eq(emergencyContacts.tenantId, tenantId)
        )
      )
      .orderBy(asc(emergencyContacts.priority));

    // Calculate available slots
    const availableSlots = {
      primary: !contacts.some(c => c.priority === 1),
      secondary: !contacts.some(c => c.priority === 2),
      total: 2 - contacts.length,
    };

    return NextResponse.json({
      contacts,
      availableSlots,
      count: contacts.length,
      maxContacts: 2,
    });
  } catch (error) {
    console.error('Error fetching emergency contacts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch emergency contacts' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Add new emergency contact
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(['admin', 'dos']);
    const tenantId = await getTenantId();
    const userId = await getUserId();
    const { id: studentId } = await params;

    if (!tenantId || !userId) {
      return NextResponse.json({ error: 'No auth context' }, { status: 403 });
    }

    const body = await request.json();

    // Validate input
    const validationResult = createEmergencyContactSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Verify student exists and belongs to tenant
    const student = await db.query.users.findFirst({
      where: (users, { and, eq }) =>
        and(eq(users.id, studentId), eq(users.tenantId, tenantId)),
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Check if max contacts (2) already exists
    const existingContacts = await db
      .select()
      .from(emergencyContacts)
      .where(
        and(
          eq(emergencyContacts.studentId, studentId),
          eq(emergencyContacts.tenantId, tenantId)
        )
      );

    if (existingContacts.length >= 2) {
      return NextResponse.json(
        {
          error: 'Maximum 2 emergency contacts allowed per student',
          current: existingContacts.length,
        },
        { status: 400 }
      );
    }

    // Check if priority slot is already taken
    const priorityExists = existingContacts.some(c => c.priority === data.priority);
    if (priorityExists) {
      return NextResponse.json(
        {
          error: `Priority ${data.priority} contact already exists`,
          suggestion: `Please use priority ${data.priority === 1 ? 2 : 1} or update the existing contact`,
        },
        { status: 400 }
      );
    }

    // Auto-set isPrimary for priority 1
    const isPrimary = data.priority === 1;

    // Create emergency contact
    const [contact] = await db
      .insert(emergencyContacts)
      .values({
        tenantId,
        studentId,
        name: data.name,
        relationship: data.relationship,
        phone: data.phone,
        email: data.email || null,
        address: data.address || null,
        isLegalGuardian: data.isLegalGuardian,
        priority: data.priority,
        isPrimary,
        notes: data.notes || null,
      })
      .returning();

    // TODO: Create audit log entry
    // TODO: Send notification if this is a change from existing contact

    return NextResponse.json(
      {
        contact,
        message: 'Emergency contact added successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating emergency contact:', error);

    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('unique_student_priority')) {
      return NextResponse.json(
        {
          error: 'A contact with this priority already exists',
          suggestion: 'Please update the existing contact or use a different priority',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create emergency contact' },
      { status: 500 }
    );
  }
}

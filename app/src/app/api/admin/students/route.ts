import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema/core';
import { eq, and, isNull, or, ilike, sql } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/utils';
import { z } from 'zod';

const createStudentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  date_of_birth: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  postal_code: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  emergency_contact_relationship: z.string().optional(),
  current_level: z.string().optional(),
  target_level: z.string().optional(),
  visa_type: z.string().optional(),
  visa_expiry: z.string().optional(),
  visa_conditions: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    await requireAuth(['admin']);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const level = searchParams.get('level');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = db
      .select()
      .from(users)
      .where(and(eq(users.primaryRole, 'student'), isNull(users.deletedAt)))
      .$dynamic();

    // Apply search filter
    if (search) {
      query = query.where(or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`)));
    }

    // Apply status filter
    if (status) {
      query = query.where(eq(users.status, status));
    }

    // Apply level filter - check metadata for current_level since it's not on users table
    if (level) {
      query = query.where(sql`${users.metadata}->>'current_level' = ${level}`);
    }

    // Apply pagination
    const students = await query.limit(limit).offset(offset).orderBy(users.name);

    // Get total count for pagination
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(and(eq(users.primaryRole, 'student'), isNull(users.deletedAt)));

    return NextResponse.json({
      students,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + students.length < count,
      },
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(['admin']);
    const body = await request.json();

    // Validate input
    const validationResult = createStudentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if email already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    if (existingUser) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }

    // Create student user - store student-specific fields in metadata
    const metadata = {
      date_of_birth: data.date_of_birth || null,
      address: data.address || null,
      city: data.city || null,
      country: data.country || null,
      postal_code: data.postal_code || null,
      emergency_contact_name: data.emergency_contact_name || null,
      emergency_contact_phone: data.emergency_contact_phone || null,
      emergency_contact_relationship: data.emergency_contact_relationship || null,
      current_level: data.current_level || null,
      target_level: data.target_level || null,
      visa_type: data.visa_type || null,
      visa_expiry: data.visa_expiry || null,
      visa_conditions: data.visa_conditions || null,
      notes: data.notes || null,
    };

    const [newStudent] = await db
      .insert(users)
      .values({
        tenantId: '00000000-0000-0000-0000-000000000001', // Default tenant - should come from auth context
        name: data.name,
        email: data.email,
        primaryRole: 'student',
        phone: data.phone || null,
        dateOfBirth: data.date_of_birth ? data.date_of_birth : null,
        metadata,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(newStudent, { status: 201 });
  } catch (error) {
    console.error('Error creating student:', error);
    return NextResponse.json({ error: 'Failed to create student' }, { status: 500 });
  }
}

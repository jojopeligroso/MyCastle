/**
 * Admin Classes API - Create and list classes
 * POST /api/admin/classes - Create new class
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { classes } from '@/db/schema';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { z } from 'zod';

const createClassSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  level: z.string(),
  subject: z.string(),
  capacity: z.number().positive(),
  teacher_id: z.string().uuid().optional(),
  schedule_description: z.string(),
  start_date: z.string(),
  end_date: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await requireAuth();
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    // Verify admin role
    const userRole = user.user_metadata?.role || user.app_metadata?.role;
    const isAdmin =
      userRole === 'admin' || userRole === 'super_admin' || userRole?.startsWith('admin_');

    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createClassSchema.parse(body);

    // Generate class code if not provided
    const classCode =
      validatedData.code || generateClassCode(validatedData.subject, validatedData.level);

    // Create class
    const [newClass] = await db
      .insert(classes)
      .values({
        tenant_id: tenantId,
        name: validatedData.name,
        code: classCode,
        description: `${validatedData.level} ${validatedData.subject}`,
        level: validatedData.level,
        subject: validatedData.subject,
        capacity: validatedData.capacity,
        enrolled_count: 0,
        teacher_id: validatedData.teacher_id || null,
        schedule_description: validatedData.schedule_description,
        start_date: validatedData.start_date,
        end_date: validatedData.end_date || null,
        status: 'active',
      })
      .returning();

    return NextResponse.json({
      success: true,
      class: newClass,
    });
  } catch (error: any) {
    console.error('Error creating class:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: error.message || 'Failed to create class' }, { status: 500 });
  }
}

/**
 * Helper: Generate class code
 */
function generateClassCode(subject: string, level: string): string {
  const subjectCode = subject.substring(0, 3).toUpperCase();
  const levelCode = level.substring(0, 1).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${subjectCode}-${levelCode}${random}`;
}

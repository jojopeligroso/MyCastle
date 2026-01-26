/**
 * Admin Classes API - Create and list classes
 * POST /api/admin/classes - Create new class
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { classes } from '@/db/schema';
import { classSessions } from '@/db/schema/academic';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { generateSessions } from '@/lib/utils/generateSessions';

const createClassSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  level: z.string(),
  subject: z.string(),
  capacity: z.number().positive(),
  teacher_id: z.string().uuid().optional(),
  programme_id: z.string().uuid(),
  schedule_description: z.string().optional(),
  start_time: z.string(),
  end_time: z.string(),
  break_duration_minutes: z.number().min(0).max(60).default(0),
  days_of_week: z.array(z.string()),
  start_date: z.string(),
  end_date: z.string().optional(),
  show_capacity_publicly: z.boolean().default(true),
  generate_sessions: z.boolean().default(false),
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

    // Check for duplicate class name (unique constraint enforcement)
    const existingClass = await db
      .select({ id: classes.id })
      .from(classes)
      .where(and(eq(classes.tenantId, tenantId), eq(classes.name, validatedData.name)))
      .limit(1);

    if (existingClass.length > 0) {
      return NextResponse.json(
        {
          error: `A class with the name "${validatedData.name}" already exists. Please choose a different name.`,
        },
        { status: 409 }
      );
    }

    // Generate class code if not provided
    const classCode =
      validatedData.code || generateClassCode(validatedData.subject, validatedData.level);

    // Create class with new fields
    const [newClass] = await db
      .insert(classes)
      .values({
        tenantId: tenantId,
        name: validatedData.name,
        code: classCode,
        description: `${validatedData.level} ${validatedData.subject}`,
        level: validatedData.level,
        subject: validatedData.subject,
        capacity: validatedData.capacity,
        enrolledCount: 0,
        teacherId: validatedData.teacher_id || null,
        programmeId: validatedData.programme_id,
        scheduleDescription: validatedData.schedule_description || null,
        startTime: validatedData.start_time,
        endTime: validatedData.end_time,
        breakDurationMinutes: validatedData.break_duration_minutes,
        daysOfWeek: validatedData.days_of_week,
        startDate: validatedData.start_date,
        endDate: validatedData.end_date || null,
        showCapacityPublicly: validatedData.show_capacity_publicly,
        status: 'active',
      })
      .returning();

    // Generate sessions if requested
    let sessionsCreated = 0;
    if (validatedData.generate_sessions) {
      try {
        const sessions = generateSessions({
          classId: newClass.id,
          tenantId: tenantId,
          startDate: validatedData.start_date,
          endDate: validatedData.end_date || null,
          daysOfWeek: validatedData.days_of_week,
          startTime: validatedData.start_time,
          endTime: validatedData.end_time,
        });

        if (sessions.length > 0) {
          await db.insert(classSessions).values(sessions);
          sessionsCreated = sessions.length;
        }
      } catch (error) {
        console.error('Error generating sessions:', error);
        // Don't fail the entire request if session generation fails
        // The class was created successfully, sessions can be generated manually later
      }
    }

    return NextResponse.json({
      success: true,
      class: newClass,
      sessionsCreated,
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

/**
 * Cumulative Lateness API
 * GET /api/attendance/cumulative
 *
 * Returns cumulative lateness data for students in a class for a given week.
 * Used by the attendance register to display weekly totals and absence equivalents.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getTenantId } from '@/lib/auth/utils';
import { calculateClassWeeklyCumulativeLateness } from '@/lib/attendance/cumulative-lateness';
import { z } from 'zod';

const CumulativeQuerySchema = z.object({
  classId: z.string().uuid(),
  weekDate: z.string().optional(), // ISO date string, defaults to today
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    const tenantId = await getTenantId();
    if (!tenantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'No tenant context',
        },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const params = {
      classId: searchParams.get('classId'),
      weekDate: searchParams.get('weekDate'),
    };

    const validation = CumulativeQuerySchema.safeParse(params);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { classId, weekDate } = validation.data;
    const targetDate = weekDate ? new Date(weekDate) : new Date();

    // Calculate cumulative lateness for all students in the class
    const cumulativeMap = await calculateClassWeeklyCumulativeLateness(
      classId,
      targetDate,
      tenantId
    );

    // Convert Map to array for JSON response
    const data = Array.from(cumulativeMap.values());

    return NextResponse.json(
      {
        success: true,
        data,
        metadata: {
          classId,
          weekDate: targetDate.toISOString().split('T')[0],
          studentCount: data.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Cumulative Lateness API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

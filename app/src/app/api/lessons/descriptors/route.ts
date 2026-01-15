/**
 * CEFR Descriptors API
 * T-034: Verify CEFR descriptors endpoint
 *
 * GET /api/lessons/descriptors?level=B1&category=Reading
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { cefrDescriptors } from '@/db/schema/curriculum';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const level = searchParams.get('level');
    const category = searchParams.get('category');

    let query = db.select().from(cefrDescriptors);

    // Apply filters
    const conditions = [];
    if (level) {
      conditions.push(eq(cefrDescriptors.level, level));
    }
    if (category) {
      conditions.push(eq(cefrDescriptors.category, category));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const descriptors = await query.execute();

    // Group by level and category for summary
    const summary = descriptors.reduce(
      (acc, descriptor) => {
        const key = `${descriptor.level}-${descriptor.category}`;
        if (!acc[key]) {
          acc[key] = {
            level: descriptor.level,
            category: descriptor.category,
            count: 0,
          };
        }
        acc[key].count++;
        return acc;
      },
      {} as Record<string, { level: string; category: string; count: number }>
    );

    return NextResponse.json({
      descriptors,
      total: descriptors.length,
      summary: Object.values(summary),
    });
  } catch (error) {
    console.error('Error fetching CEFR descriptors:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch CEFR descriptors',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

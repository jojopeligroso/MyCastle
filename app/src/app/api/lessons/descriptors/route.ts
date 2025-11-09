/**
 * CEFR Descriptors API
 * GET /api/lessons/descriptors
 *
 * T-034: Seed CEFR Descriptors
 *
 * Query parameters:
 * - level: Filter by CEFR level (A1, A2, B1, B2, C1, C2)
 * - category: Filter by category (Listening, Reading, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { cefrDescriptors } from '@/db/schema/curriculum';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

/**
 * Query parameters schema
 */
const QuerySchema = z.object({
  level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional(),
  category: z.string().optional(),
});

/**
 * GET /api/lessons/descriptors
 * Fetch CEFR descriptors with optional filtering
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');
    const category = searchParams.get('category');

    // Validate query parameters
    const validation = QuerySchema.safeParse({ level, category });

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_QUERY',
            message: 'Invalid query parameters',
            details: validation.error.errors,
          },
        },
        { status: 400 }
      );
    }

    // Build query conditions
    const conditions = [];
    if (level) {
      conditions.push(eq(cefrDescriptors.level, level));
    }
    if (category) {
      conditions.push(eq(cefrDescriptors.category, category));
    }

    // Fetch descriptors
    const descriptors =
      conditions.length > 0
        ? await db
            .select()
            .from(cefrDescriptors)
            .where(and(...conditions))
            .orderBy(cefrDescriptors.level, cefrDescriptors.category, cefrDescriptors.subcategory)
        : await db
            .select()
            .from(cefrDescriptors)
            .orderBy(cefrDescriptors.level, cefrDescriptors.category, cefrDescriptors.subcategory);

    // Get unique categories and levels for metadata
    const uniqueCategories = [...new Set(descriptors.map(d => d.category))];
    const uniqueLevels = [...new Set(descriptors.map(d => d.level))].sort();

    return NextResponse.json(
      {
        success: true,
        data: {
          descriptors: descriptors.map(d => ({
            id: d.id,
            level: d.level,
            category: d.category,
            subcategory: d.subcategory,
            descriptor_text: d.descriptor_text,
            metadata: d.metadata,
          })),
          meta: {
            total: descriptors.length,
            filters: {
              level: level || null,
              category: category || null,
            },
            available: {
              levels: uniqueLevels,
              categories: uniqueCategories,
            },
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[CEFR Descriptors API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}

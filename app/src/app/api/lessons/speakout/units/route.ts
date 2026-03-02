/**
 * Speakout Units API
 * GET /api/lessons/speakout/units?book=X
 * Returns distinct units for a specific Speakout book
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/utils';
import { db } from '@/db';
import { textbookDescriptors } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(['teacher', 'admin', 'dos']);

    const searchParams = request.nextUrl.searchParams;
    const book = searchParams.get('book');

    if (!book) {
      return NextResponse.json(
        { error: 'Missing required parameter: book' },
        { status: 400 }
      );
    }

    // Get distinct units with lesson count for the specified book
    const units = await db
      .select({
        unit: textbookDescriptors.unit,
        lessonCount: sql<number>`count(DISTINCT ${textbookDescriptors.lesson})::int`,
      })
      .from(textbookDescriptors)
      .where(eq(textbookDescriptors.book, book))
      .groupBy(textbookDescriptors.unit)
      .orderBy(sql`${textbookDescriptors.unit} ASC`);

    return NextResponse.json({
      success: true,
      data: units,
    });
  } catch (error) {
    console.error('Error fetching Speakout units:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Failed to fetch units' }, { status: 500 });
  }
}

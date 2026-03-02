/**
 * Speakout Lessons API
 * GET /api/lessons/speakout/lessons?book=X&unit=Y
 * Returns lessons with CEFR descriptors for a specific book and unit
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/utils';
import { db } from '@/db';
import { textbookDescriptors, cefrDescriptors } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(['teacher', 'admin', 'dos']);

    const searchParams = request.nextUrl.searchParams;
    const book = searchParams.get('book');
    const unit = searchParams.get('unit');

    if (!book || !unit) {
      return NextResponse.json(
        { error: 'Missing required parameters: book and unit' },
        { status: 400 }
      );
    }

    // Get lessons with their textbook descriptors and matched CEFR descriptors
    const lessons = await db
      .select({
        id: textbookDescriptors.id,
        lesson: textbookDescriptors.lesson,
        page: textbookDescriptors.page,
        level: textbookDescriptors.level,
        skillFocus: textbookDescriptors.skillFocus,
        descriptorText: textbookDescriptors.descriptorText,
        cefrDescriptorId: textbookDescriptors.cefrDescriptorId,
        // Join with CEFR descriptors for additional context
        cefrText: cefrDescriptors.descriptorText,
        cefrCategory: cefrDescriptors.category,
        cefrScale: cefrDescriptors.scale,
      })
      .from(textbookDescriptors)
      .leftJoin(
        cefrDescriptors,
        eq(textbookDescriptors.cefrDescriptorId, cefrDescriptors.id)
      )
      .where(
        and(
          eq(textbookDescriptors.book, book),
          eq(textbookDescriptors.unit, unit)
        )
      )
      .orderBy(
        sql`${textbookDescriptors.page} ASC NULLS LAST`,
        sql`${textbookDescriptors.lesson} ASC`
      );

    // Group by lesson for easier frontend consumption
    const groupedLessons = lessons.reduce(
      (acc, row) => {
        const lessonKey = row.lesson || 'Untitled';
        if (!acc[lessonKey]) {
          acc[lessonKey] = {
            lesson: row.lesson,
            page: row.page,
            descriptors: [],
          };
        }
        acc[lessonKey].descriptors.push({
          id: row.id,
          level: row.level,
          skillFocus: row.skillFocus,
          descriptorText: row.descriptorText,
          cefrDescriptorId: row.cefrDescriptorId,
          cefrText: row.cefrText,
          cefrCategory: row.cefrCategory,
          cefrScale: row.cefrScale,
        });
        return acc;
      },
      {} as Record<
        string,
        {
          lesson: string | null;
          page: number | null;
          descriptors: Array<{
            id: string;
            level: string;
            skillFocus: string;
            descriptorText: string;
            cefrDescriptorId: string | null;
            cefrText: string | null;
            cefrCategory: string | null;
            cefrScale: string | null;
          }>;
        }
      >
    );

    return NextResponse.json({
      success: true,
      data: Object.values(groupedLessons),
    });
  } catch (error) {
    console.error('Error fetching Speakout lessons:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Failed to fetch lessons' }, { status: 500 });
  }
}

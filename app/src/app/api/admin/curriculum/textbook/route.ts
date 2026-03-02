/**
 * Textbook Descriptors API
 * GET /api/admin/curriculum/textbook
 *
 * Returns all Speakout textbook descriptors for the browser
 */

import { NextResponse } from 'next/server';
import { db } from '@/db';
import { textbookDescriptors } from '@/db/schema/curriculum';
import { asc } from 'drizzle-orm';

export async function GET() {
  try {
    const descriptors = await db
      .select({
        id: textbookDescriptors.id,
        book: textbookDescriptors.book,
        unit: textbookDescriptors.unit,
        page: textbookDescriptors.page,
        lesson: textbookDescriptors.lesson,
        level: textbookDescriptors.level,
        skillFocus: textbookDescriptors.skillFocus,
        descriptorText: textbookDescriptors.descriptorText,
      })
      .from(textbookDescriptors)
      .orderBy(
        asc(textbookDescriptors.book),
        asc(textbookDescriptors.unit),
        asc(textbookDescriptors.page)
      );

    return NextResponse.json({
      descriptors,
      total: descriptors.length,
    });
  } catch (error) {
    console.error('Error fetching textbook descriptors:', error);
    return NextResponse.json({ error: 'Failed to fetch textbook descriptors' }, { status: 500 });
  }
}

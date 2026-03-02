/**
 * Speakout Books API
 * GET /api/lessons/speakout/books
 * Returns distinct Speakout books from textbook_descriptors
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/utils';
import { db } from '@/db';
import { textbookDescriptors } from '@/db/schema';
import { sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAuth(['teacher', 'admin', 'dos']);

    // Get distinct books ordered alphabetically
    const books = await db
      .selectDistinct({ book: textbookDescriptors.book })
      .from(textbookDescriptors)
      .orderBy(sql`${textbookDescriptors.book} ASC`);

    return NextResponse.json({
      success: true,
      data: books.map(b => b.book),
    });
  } catch (error) {
    console.error('Error fetching Speakout books:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Failed to fetch books' }, { status: 500 });
  }
}

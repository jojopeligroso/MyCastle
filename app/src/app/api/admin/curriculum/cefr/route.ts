/**
 * CEFR Descriptors API
 * GET /api/admin/curriculum/cefr
 *
 * Returns all official CEFR descriptors for the browser
 */

import { NextResponse } from 'next/server';
import { db } from '@/db';
import { cefrDescriptors } from '@/db/schema/curriculum';
import { asc } from 'drizzle-orm';

export async function GET() {
  try {
    const descriptors = await db
      .select({
        id: cefrDescriptors.id,
        level: cefrDescriptors.level,
        category: cefrDescriptors.category,
        subcategory: cefrDescriptors.subcategory,
        descriptorText: cefrDescriptors.descriptorText,
        scale: cefrDescriptors.scale,
        skillFocus: cefrDescriptors.skillFocus,
        isOverall: cefrDescriptors.isOverall,
        youngLearners7To10: cefrDescriptors.youngLearners7To10,
        youngLearners11To15: cefrDescriptors.youngLearners11To15,
      })
      .from(cefrDescriptors)
      .orderBy(
        asc(cefrDescriptors.level),
        asc(cefrDescriptors.category),
        asc(cefrDescriptors.scale)
      );

    return NextResponse.json({
      descriptors,
      total: descriptors.length,
    });
  } catch (error) {
    console.error('Error fetching CEFR descriptors:', error);
    return NextResponse.json({ error: 'Failed to fetch CEFR descriptors' }, { status: 500 });
  }
}

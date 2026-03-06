/**
 * Textbook Descriptors API
 * GET /api/admin/curriculum/textbook
 *
 * Returns Speakout textbook descriptors for the browser
 * Supports filtering by tenant's active textbooks when filterByTenant=true
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { textbookDescriptors } from '@/db/schema/curriculum';
import { tenants } from '@/db/schema/core';
import { asc, eq, inArray } from 'drizzle-orm';
import { getTenantId } from '@/lib/auth/utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filterByTenant = searchParams.get('filterByTenant') === 'true';

    let activeTextbooks: string[] | null = null;

    // If filtering by tenant, get the active textbooks list
    if (filterByTenant) {
      const tenantId = await getTenantId();
      if (tenantId) {
        const [tenant] = await db
          .select({ activeTextbooks: tenants.activeTextbooks })
          .from(tenants)
          .where(eq(tenants.id, tenantId))
          .limit(1);

        if (tenant) {
          activeTextbooks = tenant.activeTextbooks as string[] | null;
        }
      }
    }

    // Build the query
    let query = db
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
      .from(textbookDescriptors);

    // Apply filter if activeTextbooks is an array (not null)
    // null means all textbooks active, empty array means none
    if (filterByTenant && activeTextbooks !== null) {
      if (activeTextbooks.length === 0) {
        // No textbooks active, return empty
        return NextResponse.json({
          descriptors: [],
          total: 0,
          filtered: true,
        });
      }
      query = query.where(inArray(textbookDescriptors.book, activeTextbooks)) as typeof query;
    }

    const descriptors = await query.orderBy(
      asc(textbookDescriptors.book),
      asc(textbookDescriptors.unit),
      asc(textbookDescriptors.page)
    );

    return NextResponse.json({
      descriptors,
      total: descriptors.length,
      filtered: filterByTenant && activeTextbooks !== null,
    });
  } catch (error) {
    console.error('Error fetching textbook descriptors:', error);
    return NextResponse.json({ error: 'Failed to fetch textbook descriptors' }, { status: 500 });
  }
}

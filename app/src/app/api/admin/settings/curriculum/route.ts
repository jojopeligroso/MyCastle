/**
 * Curriculum Settings API
 * GET/PUT /api/admin/settings/curriculum
 *
 * Manage tenant-level curriculum settings including active textbooks
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { tenants, textbookDescriptors } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { z } from 'zod';

// Validation schema for updating curriculum settings
const updateSchema = z.object({
  activeTextbooks: z.array(z.string()).nullable(),
});

/**
 * GET /api/admin/settings/curriculum
 * Get curriculum settings including available and active textbooks
 */
export async function GET() {
  try {
    await requireAuth(['admin', 'dos']);
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    // Get tenant settings
    const [tenant] = await db
      .select({
        activeTextbooks: tenants.activeTextbooks,
      })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Get all unique textbook names from the database
    const uniqueBooks = await db
      .selectDistinct({ book: textbookDescriptors.book })
      .from(textbookDescriptors)
      .orderBy(textbookDescriptors.book);

    const availableTextbooks = uniqueBooks.map(r => r.book);

    // Get descriptor counts per book
    const bookCounts = await db
      .select({
        book: textbookDescriptors.book,
        count: sql<number>`count(*)::int`,
      })
      .from(textbookDescriptors)
      .groupBy(textbookDescriptors.book);

    const textbookDetails = availableTextbooks.map(book => ({
      name: book,
      descriptorCount: bookCounts.find(b => b.book === book)?.count || 0,
      isActive:
        tenant.activeTextbooks === null || (tenant.activeTextbooks as string[]).includes(book),
    }));

    return NextResponse.json({
      activeTextbooks: tenant.activeTextbooks,
      availableTextbooks: textbookDetails,
      totalDescriptors: bookCounts.reduce((sum, b) => sum + b.count, 0),
    });
  } catch (error) {
    console.error('Error fetching curriculum settings:', error);
    return NextResponse.json({ error: 'Failed to fetch curriculum settings' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/settings/curriculum
 * Update curriculum settings
 */
export async function PUT(request: NextRequest) {
  try {
    await requireAuth(['admin']);
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateSchema.parse(body);

    // Update tenant settings
    const [updated] = await db
      .update(tenants)
      .set({
        activeTextbooks: validatedData.activeTextbooks,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId))
      .returning({ activeTextbooks: tenants.activeTextbooks });

    return NextResponse.json({
      success: true,
      activeTextbooks: updated.activeTextbooks,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Error updating curriculum settings:', error);
    return NextResponse.json({ error: 'Failed to update curriculum settings' }, { status: 500 });
  }
}

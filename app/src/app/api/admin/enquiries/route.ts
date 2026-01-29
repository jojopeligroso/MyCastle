/**
 * Admin Enquiries API - Create and list enquiries
 * GET /api/admin/enquiries - List all enquiries with optional filtering
 * POST /api/admin/enquiries - Create new enquiry (manual entry)
 * REQ: spec/01-admin-mcp.md §1.2.6 - admin://enquiries resource
 * DESIGN: Task 1.10.1 - Enquiries List Page
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { enquiries } from '@/db/schema';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { eq, and, isNull, desc, or, ilike, inArray } from 'drizzle-orm';
import { z } from 'zod';

const createEnquirySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  programmeInterest: z.string().optional(),
  levelEstimate: z
    .enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
    .optional()
    .describe('CEFR level estimate'),
  startDatePreference: z.string().optional().describe('ISO date string'),
  source: z
    .enum(['website', 'referral', 'agent', 'social', 'phone', 'walk_in'])
    .default('phone')
    .describe('Lead source'),
  notes: z.string().optional(),
});

/**
 * GET /api/admin/enquiries
 * List all enquiries for the current tenant with optional filtering
 * Query params:
 *  - search: string (search name/email)
 *  - status: string | string[] (filter by status: new, contacted, converted, rejected)
 *  - limit: number (pagination limit, default 100)
 *  - offset: number (pagination offset, default 0)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication and get tenant
    await requireAuth(['admin']);
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const statusParam = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Parse status filter (can be comma-separated string or single value)
    let statusFilter: string[] | null = null;
    if (statusParam) {
      statusFilter = statusParam.includes(',') ? statusParam.split(',') : [statusParam];
    }

    // Build query
    const conditions = [eq(enquiries.tenantId, tenantId)];

    // Apply search filter (name or email)
    if (search) {
      conditions.push(
        or(ilike(enquiries.name, `%${search}%`), ilike(enquiries.email, `%${search}%`))!
      );
    }

    // Apply status filter
    if (statusFilter && statusFilter.length > 0) {
      conditions.push(inArray(enquiries.status, statusFilter));
    }

    // Fetch enquiries
    const enquiriesList = await db
      .select()
      .from(enquiries)
      .where(and(...conditions))
      .orderBy(desc(enquiries.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const [{ count }] = await db
      .select({ count: db.$count(enquiries) })
      .from(enquiries)
      .where(and(...conditions));

    return NextResponse.json({
      success: true,
      enquiries: enquiriesList,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + enquiriesList.length < count,
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching enquiries:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch enquiries' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/enquiries
 * Create a new enquiry (manual entry from phone/walk-in)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication and get tenant
    await requireAuth(['admin']);
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createEnquirySchema.parse(body);

    // Check for duplicate email within this tenant (optional - warn only)
    const existingEnquiry = await db
      .select({ id: enquiries.id, status: enquiries.status })
      .from(enquiries)
      .where(and(eq(enquiries.tenantId, tenantId), eq(enquiries.email, validatedData.email)))
      .limit(1);

    if (existingEnquiry.length > 0) {
      // Email exists - could warn but still allow creation for MVP
      console.warn(
        `Duplicate enquiry email detected: ${validatedData.email} (existing status: ${existingEnquiry[0].status})`
      );
    }

    // Create enquiry
    const [newEnquiry] = await db
      .insert(enquiries)
      .values({
        tenantId: tenantId,
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone || null,
        programmeInterest: validatedData.programmeInterest || null,
        levelEstimate: validatedData.levelEstimate || null,
        startDatePreference: validatedData.startDatePreference
          ? new Date(validatedData.startDatePreference)
          : null,
        source: validatedData.source,
        notes: validatedData.notes || null,
        status: 'new', // Default status for new enquiries
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        enquiry: newEnquiry,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error creating enquiry:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create enquiry' },
      { status: 500 }
    );
  }
}

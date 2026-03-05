/**
 * Letter Templates Settings API
 * GET/POST /api/admin/settings/letter-templates
 *
 * Manage mail merge letter templates with {{placeholder}} syntax
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { letterTemplates } from '@/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { requireAuth, getTenantId, getUserId } from '@/lib/auth/utils';
import { z } from 'zod';

// ============================================================================
// Common Placeholder Definitions
// ============================================================================

const COMMON_PLACEHOLDERS = [
  // Student info
  { key: '{{student_name}}', description: 'Full student name' },
  { key: '{{student_first_name}}', description: 'Student first name' },
  { key: '{{student_last_name}}', description: 'Student last name' },
  { key: '{{student_number}}', description: 'Student ID number' },
  { key: '{{student_email}}', description: 'Student email address' },
  { key: '{{student_nationality}}', description: 'Student nationality' },
  { key: '{{student_dob}}', description: 'Date of birth (formatted)' },

  // Current class info
  { key: '{{class_name}}', description: 'Current class name' },
  { key: '{{class_level}}', description: 'Current CEFR level' },
  { key: '{{class_start_date}}', description: 'Class start date' },
  { key: '{{class_end_date}}', description: 'Class end date' },
  { key: '{{teacher_name}}', description: 'Current teacher name' },

  // School info
  { key: '{{school_name}}', description: 'School/tenant name' },
  { key: '{{school_address}}', description: 'School address' },
  { key: '{{school_phone}}', description: 'School phone number' },
  { key: '{{school_email}}', description: 'School email' },

  // Dates
  { key: '{{current_date}}', description: 'Current date (formatted)' },
  { key: '{{current_year}}', description: 'Current year' },

  // Emergency contacts
  { key: '{{emergency_contact_name}}', description: 'Primary emergency contact name' },
  { key: '{{emergency_contact_phone}}', description: 'Primary emergency contact phone' },
];

// ============================================================================
// Validation Schemas
// ============================================================================

const createLetterTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional(),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  category: z
    .enum(['enrollment', 'completion', 'attendance', 'visa', 'general'])
    .default('general'),
  outputFormat: z.enum(['pdf', 'docx', 'html']).default('pdf'),
  customPlaceholders: z
    .array(
      z.object({
        key: z.string(),
        description: z.string(),
      })
    )
    .optional(),
  isActive: z.boolean().optional().default(true),
});

// ============================================================================
// GET - List all letter templates
// ============================================================================

export async function GET(_request: NextRequest) {
  try {
    await requireAuth(['admin', 'dos']);
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
    }

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Get all letter templates for tenant
    const templates = await db
      .select()
      .from(letterTemplates)
      .where(eq(letterTemplates.tenantId, tenantId))
      .orderBy(desc(letterTemplates.createdAt));

    // Group templates by category
    const groupedByCategory = templates.reduce(
      (acc, template) => {
        const category = template.category || 'general';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(template);
        return acc;
      },
      {} as Record<string, typeof templates>
    );

    return NextResponse.json({
      templates,
      groupedByCategory,
      commonPlaceholders: COMMON_PLACEHOLDERS,
      stats: {
        total: templates.length,
        active: templates.filter(t => t.isActive).length,
        byFormat: templates.reduce(
          (acc, t) => {
            acc[t.outputFormat] = (acc[t.outputFormat] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
      },
    });
  } catch (error) {
    console.error('Error fetching letter templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch letter templates' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Create new letter template
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    await requireAuth(['admin', 'dos']);
    const tenantId = await getTenantId();
    const userId = await getUserId();

    if (!tenantId || !userId) {
      return NextResponse.json({ error: 'No auth context' }, { status: 403 });
    }

    const body = await request.json();

    // Validate input
    const validationResult = createLetterTemplateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Combine common placeholders with custom ones
    const allPlaceholders = [
      ...COMMON_PLACEHOLDERS,
      ...(data.customPlaceholders || []),
    ];

    // Validate that content only uses defined placeholders
    const contentPlaceholders = data.content.match(/\{\{[^}]+\}\}/g) || [];
    const definedKeys = allPlaceholders.map(p => p.key);
    const undefinedPlaceholders = contentPlaceholders.filter(
      p => !definedKeys.includes(p)
    );

    if (undefinedPlaceholders.length > 0) {
      return NextResponse.json(
        {
          error: 'Content contains undefined placeholders',
          undefinedPlaceholders,
          availablePlaceholders: definedKeys,
        },
        { status: 400 }
      );
    }

    // Create letter template
    const [template] = await db
      .insert(letterTemplates)
      .values({
        tenantId,
        name: data.name,
        description: data.description || null,
        content: data.content,
        category: data.category,
        outputFormat: data.outputFormat,
        availablePlaceholders: allPlaceholders,
        isActive: data.isActive ?? true,
      })
      .returning();

    // TODO: Create audit log entry

    return NextResponse.json(
      {
        template,
        message: 'Letter template created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating letter template:', error);
    return NextResponse.json(
      { error: 'Failed to create letter template' },
      { status: 500 }
    );
  }
}

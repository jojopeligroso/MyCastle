/**
 * Lesson Plan Generation API
 * POST /api/lessons/generate
 * Ref: DESIGN.md §6.3, TASKS.md T-031
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/utils';
import { LessonPlanRequestSchema } from '@/lib/lessons/schemas';
import { generateLessonPlan, generateCacheKey } from '@/lib/lessons/generator';
import { db } from '@/db';
import { lessonPlans } from '@/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Generate a new lesson plan
 * Requires teacher or admin role
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Require teacher or admin role
    await requireRole(['teacher', 'admin']);
    const user = await requireAuth();

    // Parse and validate request
    const body = await request.json();
    const validatedRequest = LessonPlanRequestSchema.parse(body);

    // Generate cache key
    const cacheKey = generateCacheKey(validatedRequest);

    // Check if plan already exists in cache/database
    const existingPlan = await db.query.lessonPlans.findFirst({
      where: (plans, { eq }) => eq(plans.cache_key, cacheKey),
    });

    if (existingPlan) {
      console.log(`Cache hit for lesson plan: ${cacheKey}`);
      return NextResponse.json({
        id: existingPlan.id,
        plan: existingPlan.json_plan,
        cache_key: cacheKey,
        is_cached: true,
        generation_time_ms: Date.now() - startTime,
        created_at: existingPlan.created_at,
      });
    }

    // Generate new lesson plan
    console.log(
      `Generating new lesson plan for topic: ${validatedRequest.topic}, level: ${validatedRequest.cefr_level}`,
    );

    const plan = await generateLessonPlan(validatedRequest);

    // Save to database
    const [savedPlan] = await db
      .insert(lessonPlans)
      .values({
        teacher_id: user.id,
        class_id: validatedRequest.class_id || null,
        cefr_level: validatedRequest.cefr_level,
        descriptor_id: validatedRequest.descriptor_id || null,
        title: plan.title,
        topic: plan.topic,
        duration_minutes: plan.duration_minutes.toString(),
        json_plan: plan,
        is_ai_generated: 'true',
        cache_key: cacheKey,
        status: 'draft',
      })
      .returning();

    const generationTime = Date.now() - startTime;
    console.log(`Lesson plan saved in ${generationTime}ms`);

    // Log performance metrics
    if (generationTime > 5000) {
      console.warn(
        `⚠️  Lesson generation exceeded SLA (${generationTime}ms > 5000ms)`,
      );
    }

    return NextResponse.json(
      {
        id: savedPlan.id,
        plan: savedPlan.json_plan,
        cache_key: cacheKey,
        is_cached: false,
        generation_time_ms: generationTime,
        created_at: savedPlan.created_at,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error in lesson generation API:', error);

    if (error instanceof Error) {
      if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }

      if (error.name === 'ZodError') {
        return NextResponse.json(
          { error: 'Invalid request data', details: error },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to generate lesson plan' },
      { status: 500 },
    );
  }
}

/**
 * Lesson Plan Schemas
 * Zod schemas for lesson plan validation
 * Ref: DESIGN.md §6.3, spec/05-teacher-mcp.md
 */

import { z } from 'zod';

/**
 * CEFR Levels
 */
export const CefrLevel = z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
export type CefrLevel = z.infer<typeof CefrLevel>;

/**
 * Activity Schema
 * Individual classroom activity within a lesson
 */
export const ActivitySchema = z.object({
  name: z.string().min(1).max(255),
  duration_minutes: z.number().int().min(1).max(120),
  description: z.string().min(1),
  materials: z.array(z.string()).optional(),
  interaction_pattern: z.enum(['individual', 'pairs', 'small_groups', 'whole_class']).optional(),
});

export type Activity = z.infer<typeof ActivitySchema>;

/**
 * Learning Objective Schema
 */
export const LearningObjectiveSchema = z.object({
  description: z.string().min(1),
  cefr_alignment: z.string().optional(),
});

export type LearningObjective = z.infer<typeof LearningObjectiveSchema>;

/**
 * Assessment Criteria Schema
 */
export const AssessmentCriteriaSchema = z.object({
  type: z.enum(['formative', 'summative', 'diagnostic']),
  description: z.string().min(1),
  success_criteria: z.array(z.string()).optional(),
});

export type AssessmentCriteria = z.infer<typeof AssessmentCriteriaSchema>;

/**
 * Complete Lesson Plan Schema
 * Structured lesson plan matching database json_plan column
 */
export const LessonPlanSchema = z.object({
  title: z.string().min(1).max(255),
  topic: z.string().min(1).max(255),
  cefr_level: CefrLevel,
  duration_minutes: z.number().int().min(30).max(240),

  objectives: z.array(LearningObjectiveSchema).min(1),

  activities: z.array(ActivitySchema).min(1),

  materials: z.array(z.string()).optional(),

  assessment: z.array(AssessmentCriteriaSchema).optional(),

  homework: z.string().optional(),

  notes: z.string().optional(),
});

export type LessonPlan = z.infer<typeof LessonPlanSchema>;

/**
 * Lesson Plan Generation Request Schema
 */
export const LessonPlanRequestSchema = z.object({
  cefr_level: CefrLevel,
  topic: z.string().min(1).max(255),
  duration_minutes: z.number().int().min(30).max(240).default(60),
  descriptor_id: z.string().uuid().optional(),
  class_id: z.string().uuid().optional(),
  additional_context: z.string().max(1000).optional(),
});

export type LessonPlanRequest = z.infer<typeof LessonPlanRequestSchema>;

/**
 * Lesson Plan Response Schema
 */
export const LessonPlanResponseSchema = z.object({
  id: z.string().uuid(),
  plan: LessonPlanSchema,
  cache_key: z.string(),
  is_cached: z.boolean(),
  generation_time_ms: z.number().int(),
  created_at: z.string().datetime(),
});

export type LessonPlanResponse = z.infer<typeof LessonPlanResponseSchema>;

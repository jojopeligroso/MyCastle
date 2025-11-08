/**
 * Lesson Plan Generator
 * AI-assisted lesson plan generation using OpenAI
 * Ref: DESIGN.md §6.3, REQ.md §6.6
 */

import OpenAI from 'openai';
import type { LessonPlan, LessonPlanRequest, CefrLevel } from './schemas';
import { LessonPlanSchema } from './schemas';
import { createHash } from 'crypto';

/**
 * Get OpenAI client (lazy initialization)
 */
function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'test-key',
  });
}

/**
 * Generate cache key for lesson plan request
 * Deterministic SHA256 hash for deduplication
 */
export function generateCacheKey(request: LessonPlanRequest): string {
  const key = `${request.cefr_level}-${request.topic}-${request.duration_minutes}-${request.descriptor_id || ''}`;
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Build system prompt for lesson plan generation
 */
function buildSystemPrompt(): string {
  return `You are an expert ESL (English as a Second Language) teacher with extensive experience in CEFR-aligned curriculum design.

Your task is to generate detailed, practical lesson plans that:
1. Align with CEFR descriptors for the specified level
2. Include engaging, age-appropriate activities
3. Provide clear learning objectives
4. Specify realistic materials and resources
5. Include formative assessment strategies
6. Follow communicative language teaching principles

Format your response as a valid JSON object matching this structure exactly:
{
  "title": "Lesson title",
  "topic": "Main topic",
  "cefr_level": "A1|A2|B1|B2|C1|C2",
  "duration_minutes": number,
  "objectives": [
    {
      "description": "What students will learn",
      "cefr_alignment": "Reference to CEFR descriptor"
    }
  ],
  "activities": [
    {
      "name": "Activity name",
      "duration_minutes": number,
      "description": "Detailed description",
      "materials": ["material1", "material2"],
      "interaction_pattern": "individual|pairs|small_groups|whole_class"
    }
  ],
  "materials": ["All required materials"],
  "assessment": [
    {
      "type": "formative|summative|diagnostic",
      "description": "How to assess",
      "success_criteria": ["criterion1", "criterion2"]
    }
  ],
  "homework": "Optional homework assignment",
  "notes": "Additional notes for teacher"
}`;
}

/**
 * Build user prompt for specific lesson request
 */
function buildUserPrompt(request: LessonPlanRequest): string {
  let prompt = `Generate a ${request.duration_minutes}-minute lesson plan for:

CEFR Level: ${request.cefr_level}
Topic: ${request.topic}`;

  if (request.additional_context) {
    prompt += `\n\nAdditional Context:\n${request.additional_context}`;
  }

  prompt += `\n\nEnsure the lesson is appropriate for ${request.cefr_level} level students and includes varied activities to maintain engagement.`;

  return prompt;
}

/**
 * Generate lesson plan using OpenAI
 */
export async function generateLessonPlan(
  request: LessonPlanRequest,
): Promise<LessonPlan> {
  const startTime = Date.now();

  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using mini for cost efficiency
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: buildUserPrompt(request) },
      ],
      temperature: 0.7, // Balanced creativity and consistency
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // Parse and validate response
    const rawPlan = JSON.parse(responseText);
    const validatedPlan = LessonPlanSchema.parse(rawPlan);

    const generationTime = Date.now() - startTime;
    console.log(
      `Lesson plan generated in ${generationTime}ms for topic: ${request.topic}`,
    );

    return validatedPlan;
  } catch (error) {
    console.error('Error generating lesson plan:', error);
    throw new Error(
      `Failed to generate lesson plan: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Get CEFR level description for context
 */
export function getCefrLevelDescription(level: CefrLevel): string {
  const descriptions: Record<CefrLevel, string> = {
    A1: 'Beginner - Can understand and use familiar everyday expressions and very basic phrases',
    A2: 'Elementary - Can communicate in simple and routine tasks requiring simple and direct exchange',
    B1: 'Intermediate - Can deal with most situations likely to arise whilst travelling',
    B2: 'Upper Intermediate - Can interact with a degree of fluency and spontaneity',
    C1: 'Advanced - Can express ideas fluently and spontaneously without much obvious searching',
    C2: 'Proficiency - Can understand with ease virtually everything heard or read',
  };
  return descriptions[level];
}

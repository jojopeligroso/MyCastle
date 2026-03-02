/**
 * RAG Context Builder
 * Builds context from Speakout textbook and CEFR descriptors for lesson generation
 */

import { db } from '@/db';
import { textbookDescriptors, cefrDescriptors } from '@/db/schema';
import { eq, and, or, ilike } from 'drizzle-orm';
import type { SpeakoutContext, ChatContext, TeacherIntent } from './chat-types';

/**
 * Build RAG context from Speakout selection
 */
export async function buildSpeakoutContext(
  book: string,
  unit: string,
  lesson: string
): Promise<SpeakoutContext | null> {
  try {
    // Fetch all descriptors for the selected lesson
    const descriptors = await db
      .select({
        id: textbookDescriptors.id,
        lesson: textbookDescriptors.lesson,
        page: textbookDescriptors.page,
        level: textbookDescriptors.level,
        skillFocus: textbookDescriptors.skillFocus,
        descriptorText: textbookDescriptors.descriptorText,
        cefrDescriptorId: textbookDescriptors.cefrDescriptorId,
        cefrText: cefrDescriptors.descriptorText,
        cefrCategory: cefrDescriptors.category,
        cefrScale: cefrDescriptors.scale,
      })
      .from(textbookDescriptors)
      .leftJoin(
        cefrDescriptors,
        eq(textbookDescriptors.cefrDescriptorId, cefrDescriptors.id)
      )
      .where(
        and(
          eq(textbookDescriptors.book, book),
          eq(textbookDescriptors.unit, unit),
          eq(textbookDescriptors.lesson, lesson)
        )
      );

    if (descriptors.length === 0) {
      return null;
    }

    // Determine primary level from descriptors
    const levels = [...new Set(descriptors.map(d => d.level))];
    const primaryLevel = levels[0]; // Use first level found

    return {
      book,
      unit,
      lesson,
      page: descriptors[0].page ?? undefined,
      level: primaryLevel,
      descriptors: descriptors.map(d => ({
        id: d.id,
        level: d.level,
        skillFocus: d.skillFocus,
        descriptorText: d.descriptorText,
        cefrDescriptorId: d.cefrDescriptorId ?? undefined,
        cefrText: d.cefrText ?? undefined,
        cefrCategory: d.cefrCategory ?? undefined,
        cefrScale: d.cefrScale ?? undefined,
      })),
    };
  } catch (error) {
    console.error('Error building Speakout context:', error);
    return null;
  }
}

/**
 * Build additional CEFR context based on level and skills
 */
export async function buildCefrContext(
  level: string,
  skillFocus?: string[]
): Promise<string> {
  try {
    // Build query conditions
    const conditions = [eq(cefrDescriptors.level, level)];

    if (skillFocus && skillFocus.length > 0) {
      conditions.push(
        or(
          ...skillFocus.map(skill =>
            ilike(cefrDescriptors.skillFocus, `%${skill}%`)
          )
        )!
      );
    }

    const descriptors = await db
      .select({
        descriptorText: cefrDescriptors.descriptorText,
        skillFocus: cefrDescriptors.skillFocus,
        scale: cefrDescriptors.scale,
      })
      .from(cefrDescriptors)
      .where(and(...conditions))
      .limit(10);

    if (descriptors.length === 0) {
      return '';
    }

    return descriptors
      .map(d => `- [${d.skillFocus || 'General'}] ${d.descriptorText}`)
      .join('\n');
  } catch (error) {
    console.error('Error building CEFR context:', error);
    return '';
  }
}

/**
 * Format context for AI prompt
 */
export function formatContextForPrompt(context: ChatContext): string {
  const parts: string[] = [];

  // Speakout context
  if (context.speakout) {
    parts.push(`## Speakout Textbook Reference
- Book: ${context.speakout.book}
- Unit: ${context.speakout.unit}
- Lesson: ${context.speakout.lesson}
- CEFR Level: ${context.speakout.level}
${context.speakout.page ? `- Page: ${context.speakout.page}` : ''}`);

    if (context.speakout.descriptors.length > 0) {
      parts.push(`\n### Learning Objectives from Speakout:`);
      context.speakout.descriptors.forEach(d => {
        parts.push(`- [${d.skillFocus}] ${d.descriptorText}`);
        if (d.cefrText && d.cefrText !== d.descriptorText) {
          parts.push(`  ↳ CEFR: ${d.cefrText}`);
        }
      });
    }
  }

  // Teacher intent
  if (context.intent) {
    const intentDescriptions: Record<TeacherIntent, string> = {
      follow:
        'Teacher wants to follow the Speakout lesson as designed, maintaining the textbook structure and activities.',
      deviate:
        'Teacher wants to use Speakout as a starting point but adapt significantly for their specific class needs.',
      supplement:
        'Teacher wants to supplement the Speakout lesson with additional activities and materials.',
    };
    parts.push(`\n## Teacher Intent: ${context.intent.toUpperCase()}`);
    parts.push(intentDescriptions[context.intent]);
  }

  // Class info
  if (context.classInfo) {
    parts.push(`\n## Class Information`);
    parts.push(`- Class: ${context.classInfo.name}`);
    parts.push(`- Level: ${context.classInfo.level}`);
    if (context.classInfo.studentCount) {
      parts.push(`- Students: ${context.classInfo.studentCount}`);
    }
  }

  // Additional context from teacher
  if (context.additionalContext) {
    parts.push(`\n## Additional Notes from Teacher`);
    parts.push(context.additionalContext);
  }

  return parts.join('\n');
}

/**
 * Get related lessons for cross-referencing
 */
export async function getRelatedLessons(
  book: string,
  unit: string,
  excludeLesson: string
): Promise<Array<{ lesson: string; level: string; skillFocus: string }>> {
  try {
    const related = await db
      .selectDistinct({
        lesson: textbookDescriptors.lesson,
        level: textbookDescriptors.level,
        skillFocus: textbookDescriptors.skillFocus,
      })
      .from(textbookDescriptors)
      .where(
        and(
          eq(textbookDescriptors.book, book),
          eq(textbookDescriptors.unit, unit)
        )
      )
      .limit(5);

    return related
      .filter(r => r.lesson !== excludeLesson)
      .map(r => ({
        lesson: r.lesson || 'Untitled',
        level: r.level,
        skillFocus: r.skillFocus,
      }));
  } catch (error) {
    console.error('Error fetching related lessons:', error);
    return [];
  }
}

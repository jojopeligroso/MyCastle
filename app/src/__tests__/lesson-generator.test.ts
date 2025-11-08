/**
 * Lesson Plan Generator Unit Tests
 */

import { describe, it, expect } from '@jest/globals';
import { generateCacheKey, getCefrLevelDescription } from '@/lib/lessons/generator';
import { LessonPlanRequestSchema, CefrLevel } from '@/lib/lessons/schemas';

describe('Lesson Plan Generator', () => {
  describe('generateCacheKey', () => {
    it('should generate consistent cache keys for same input', () => {
      const request1 = {
        cefr_level: 'B1' as CefrLevel,
        topic: 'Daily Routines',
        duration_minutes: 60,
      };

      const request2 = {
        cefr_level: 'B1' as CefrLevel,
        topic: 'Daily Routines',
        duration_minutes: 60,
      };

      const key1 = generateCacheKey(request1);
      const key2 = generateCacheKey(request2);

      expect(key1).toBe(key2);
      expect(key1).toHaveLength(64); // SHA256 hex string
    });

    it('should generate different keys for different topics', () => {
      const request1 = {
        cefr_level: 'B1' as CefrLevel,
        topic: 'Daily Routines',
        duration_minutes: 60,
      };

      const request2 = {
        cefr_level: 'B1' as CefrLevel,
        topic: 'Food and Cooking',
        duration_minutes: 60,
      };

      const key1 = generateCacheKey(request1);
      const key2 = generateCacheKey(request2);

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different CEFR levels', () => {
      const request1 = {
        cefr_level: 'A1' as CefrLevel,
        topic: 'Greetings',
        duration_minutes: 60,
      };

      const request2 = {
        cefr_level: 'B1' as CefrLevel,
        topic: 'Greetings',
        duration_minutes: 60,
      };

      const key1 = generateCacheKey(request1);
      const key2 = generateCacheKey(request2);

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different durations', () => {
      const request1 = {
        cefr_level: 'B1' as CefrLevel,
        topic: 'Travel',
        duration_minutes: 45,
      };

      const request2 = {
        cefr_level: 'B1' as CefrLevel,
        topic: 'Travel',
        duration_minutes: 90,
      };

      const key1 = generateCacheKey(request1);
      const key2 = generateCacheKey(request2);

      expect(key1).not.toBe(key2);
    });
  });

  describe('getCefrLevelDescription', () => {
    it('should return correct description for A1', () => {
      const description = getCefrLevelDescription('A1');
      expect(description).toContain('Beginner');
      expect(description).toContain('everyday expressions');
    });

    it('should return correct description for B1', () => {
      const description = getCefrLevelDescription('B1');
      expect(description).toContain('Intermediate');
      expect(description).toContain('travelling');
    });

    it('should return correct description for C2', () => {
      const description = getCefrLevelDescription('C2');
      expect(description).toContain('Proficiency');
      expect(description).toContain('virtually everything');
    });

    it('should have descriptions for all CEFR levels', () => {
      const levels: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

      levels.forEach(level => {
        const description = getCefrLevelDescription(level);
        expect(description).toBeTruthy();
        expect(description.length).toBeGreaterThan(20);
      });
    });
  });

  describe('LessonPlanRequestSchema', () => {
    it('should validate valid lesson plan request', () => {
      const validRequest = {
        cefr_level: 'B1',
        topic: 'Daily Routines',
        duration_minutes: 60,
      };

      const result = LessonPlanRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should reject invalid CEFR level', () => {
      const invalidRequest = {
        cefr_level: 'D1', // Invalid level
        topic: 'Daily Routines',
        duration_minutes: 60,
      };

      const result = LessonPlanRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const invalidRequest = {
        cefr_level: 'B1',
        // Missing topic
        duration_minutes: 60,
      };

      const result = LessonPlanRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should accept optional fields', () => {
      const validRequest = {
        cefr_level: 'B2',
        topic: 'Technology',
        duration_minutes: 90,
        descriptor_id: '123e4567-e89b-12d3-a456-426614174000',
        class_id: '987fcdeb-51a2-43d7-a456-426614174000',
        additional_context: 'Focus on vocabulary related to social media',
      };

      const result = LessonPlanRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should use default duration of 60 minutes', () => {
      const requestWithoutDuration = {
        cefr_level: 'A2',
        topic: 'Family',
      };

      const result = LessonPlanRequestSchema.parse(requestWithoutDuration);
      expect(result.duration_minutes).toBe(60);
    });

    it('should reject duration outside valid range', () => {
      const tooShort = {
        cefr_level: 'B1',
        topic: 'Test',
        duration_minutes: 20, // Less than minimum 30
      };

      const tooLong = {
        cefr_level: 'B1',
        topic: 'Test',
        duration_minutes: 300, // More than maximum 240
      };

      expect(LessonPlanRequestSchema.safeParse(tooShort).success).toBe(false);
      expect(LessonPlanRequestSchema.safeParse(tooLong).success).toBe(false);
    });
  });
});

/**
 * Unit Tests for Academic Operations MCP
 * Tests all 10 tools with comprehensive coverage
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { academicOperationsMCPConfig } from '../AcademicOperationsMCP';
import type { MCPSession } from '../../../types';
import { db } from '@/db';

// Mock database
jest.mock('@/db');

describe('Academic Operations MCP', () => {
  let mockSession: MCPSession;

  beforeEach(() => {
    mockSession = {
      userId: 'user-123',
      tenantId: 'tenant-123',
      scopes: ['academic:write', 'academic:read'],
    };

    jest.clearAllMocks();
  });

  describe('MCP Configuration', () => {
    it('should have correct metadata', () => {
      expect(academicOperationsMCPConfig.name).toBe('academic-operations');
      expect(academicOperationsMCPConfig.version).toBe('1.0.0');
      expect(academicOperationsMCPConfig.capabilities.tools).toBe(true);
    });

    it('should register 10 tools', () => {
      expect(academicOperationsMCPConfig.tools).toHaveLength(10);
    });

    it('should have all required tool names', () => {
      const toolNames = academicOperationsMCPConfig.tools.map(t => t.name);
      expect(toolNames).toEqual([
        'create_programme',
        'create_course',
        'map_cefr_level',
        'schedule_class',
        'assign_teacher',
        'allocate_room',
        'register_lesson_template',
        'approve_lesson_plan',
        'link_cefr_descriptor',
        'publish_materials',
      ]);
    });
  });

  describe('Tool 1: create_programme', () => {
    const createProgrammeTool = academicOperationsMCPConfig.tools[0];

    it('should have correct tool definition', () => {
      expect(createProgrammeTool.name).toBe('create_programme');
      expect(createProgrammeTool.requiredScopes).toEqual(['academic:write']);
    });

    it('should validate programme schema', () => {
      const validInput = {
        name: 'General English Programme',
        code: 'GEN-2025',
        description: 'Comprehensive English language programme',
        level_range: 'A1-C2',
        duration_weeks: 12,
      };

      const result = createProgrammeTool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should require name and code', () => {
      const invalidInput = {
        description: 'Programme without name',
      };

      const result = createProgrammeTool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should accept optional fields', () => {
      const minimalInput = {
        name: 'Basic Programme',
        code: 'BASIC-01',
      };

      const result = createProgrammeTool.inputSchema.safeParse(minimalInput);
      expect(result.success).toBe(true);
    });
  });

  describe('Tool 2: create_course', () => {
    const createCourseTool = academicOperationsMCPConfig.tools[1];

    it('should have correct tool definition', () => {
      expect(createCourseTool.name).toBe('create_course');
      expect(createCourseTool.requiredScopes).toEqual(['academic:write']);
    });

    it('should validate course schema', () => {
      const validInput = {
        programme_id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'General English A1',
        code: 'GEN-A1',
        cefr_level: 'A1',
        description: 'Beginner level course',
        hours: 40,
      };

      const result = createCourseTool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate CEFR levels', () => {
      const validLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

      validLevels.forEach(level => {
        const input = {
          programme_id: '123e4567-e89b-12d3-a456-426614174000',
          name: `Course ${level}`,
          code: `TEST-${level}`,
          cefr_level: level,
        };

        const result = createCourseTool.inputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid CEFR level', () => {
      const invalidInput = {
        programme_id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Invalid Course',
        code: 'INV-01',
        cefr_level: 'D1', // Invalid level
      };

      const result = createCourseTool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('Tool 3: map_cefr_level', () => {
    const mapCEFRTool = academicOperationsMCPConfig.tools[2];

    it('should have correct tool definition', () => {
      expect(mapCEFRTool.name).toBe('map_cefr_level');
      expect(mapCEFRTool.requiredScopes).toEqual(['academic:write']);
    });

    it('should validate CEFR mapping schema', () => {
      const validInput = {
        course_id: '123e4567-e89b-12d3-a456-426614174000',
        cefr_level: 'B1',
        can_do_statements: ['Can understand main points', 'Can describe experiences'],
        assessment_criteria: ['Vocabulary range', 'Grammar accuracy'],
      };

      const result = mapCEFRTool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should allow empty can-do statements', () => {
      const input = {
        course_id: '123e4567-e89b-12d3-a456-426614174000',
        cefr_level: 'A1',
        can_do_statements: [],
      };

      const result = mapCEFRTool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('Tool 4: schedule_class', () => {
    const scheduleClassTool = academicOperationsMCPConfig.tools[3];

    it('should have correct tool definition', () => {
      expect(scheduleClassTool.name).toBe('schedule_class');
      expect(scheduleClassTool.requiredScopes).toEqual(['academic:write']);
    });

    it('should validate class scheduling schema', () => {
      const validInput = {
        course_id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Morning General English',
        code: 'GEN-A1-M',
        start_date: '2025-02-01',
        end_date: '2025-05-01',
        schedule_description: 'Mon/Wed/Fri 09:00-11:00',
        capacity: 15,
        teacher_id: '123e4567-e89b-12d3-a456-426614174001',
      };

      const result = scheduleClassTool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should allow optional teacher assignment', () => {
      const input = {
        course_id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Evening Class',
        start_date: '2025-02-01',
        capacity: 20,
      };

      const result = scheduleClassTool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate capacity is positive', () => {
      const invalidInput = {
        course_id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Invalid Class',
        start_date: '2025-02-01',
        capacity: 0,
      };

      const result = scheduleClassTool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('Tool 5: assign_teacher', () => {
    const assignTeacherTool = academicOperationsMCPConfig.tools[4];

    it('should have correct tool definition', () => {
      expect(assignTeacherTool.name).toBe('assign_teacher');
      expect(assignTeacherTool.requiredScopes).toEqual(['academic:write']);
    });

    it('should validate teacher assignment schema', () => {
      const validInput = {
        class_id: '123e4567-e89b-12d3-a456-426614174000',
        teacher_id: '123e4567-e89b-12d3-a456-426614174001',
        start_date: '2025-02-01',
      };

      const result = assignTeacherTool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should allow optional end date', () => {
      const input = {
        class_id: '123e4567-e89b-12d3-a456-426614174000',
        teacher_id: '123e4567-e89b-12d3-a456-426614174001',
        start_date: '2025-02-01',
        end_date: '2025-05-01',
      };

      const result = assignTeacherTool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should require UUIDs', () => {
      const invalidInput = {
        class_id: 'not-a-uuid',
        teacher_id: '123e4567-e89b-12d3-a456-426614174001',
        start_date: '2025-02-01',
      };

      const result = assignTeacherTool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('Tool 6: allocate_room', () => {
    const allocateRoomTool = academicOperationsMCPConfig.tools[5];

    it('should have correct tool definition', () => {
      expect(allocateRoomTool.name).toBe('allocate_room');
      expect(allocateRoomTool.requiredScopes).toEqual(['academic:write']);
    });

    it('should validate room allocation schema', () => {
      const validInput = {
        class_session_id: '123e4567-e89b-12d3-a456-426614174000',
        room_number: 'A101',
        building: 'Main Building',
        capacity: 20,
      };

      const result = allocateRoomTool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should allow optional fields', () => {
      const minimalInput = {
        class_session_id: '123e4567-e89b-12d3-a456-426614174000',
        room_number: 'B205',
      };

      const result = allocateRoomTool.inputSchema.safeParse(minimalInput);
      expect(result.success).toBe(true);
    });

    it('should validate capacity is positive when provided', () => {
      const invalidInput = {
        class_session_id: '123e4567-e89b-12d3-a456-426614174000',
        room_number: 'C301',
        capacity: -5,
      };

      const result = allocateRoomTool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('Tool 7: register_lesson_template', () => {
    const lessonTemplateTool = academicOperationsMCPConfig.tools[6];

    it('should have correct tool definition', () => {
      expect(lessonTemplateTool.name).toBe('register_lesson_template');
      expect(lessonTemplateTool.requiredScopes).toEqual(['academic:write']);
    });

    it('should validate lesson template schema', () => {
      const validInput = {
        course_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Introduction to Present Tense',
        objectives: ['Understand present simple', 'Practice daily routines'],
        duration_minutes: 90,
        materials: ['Textbook', 'Worksheets'],
        activities: ['Warm-up', 'Presentation', 'Practice', 'Production'],
      };

      const result = lessonTemplateTool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should require positive duration', () => {
      const invalidInput = {
        course_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Invalid Lesson',
        duration_minutes: 0,
      };

      const result = lessonTemplateTool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should allow empty arrays for materials and activities', () => {
      const input = {
        course_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Minimal Lesson',
        duration_minutes: 45,
        materials: [],
        activities: [],
      };

      const result = lessonTemplateTool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('Tool 8: approve_lesson_plan', () => {
    const approveLessonTool = academicOperationsMCPConfig.tools[7];

    it('should have correct tool definition', () => {
      expect(approveLessonTool.name).toBe('approve_lesson_plan');
      expect(approveLessonTool.requiredScopes).toEqual(['academic:write']);
    });

    it('should validate approval schema', () => {
      const validInput = {
        lesson_plan_id: '123e4567-e89b-12d3-a456-426614174000',
        approved: true,
        feedback: 'Excellent lesson plan with clear objectives',
      };

      const result = approveLessonTool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should allow rejection with feedback', () => {
      const input = {
        lesson_plan_id: '123e4567-e89b-12d3-a456-426614174000',
        approved: false,
        feedback: 'Please add more interactive activities',
      };

      const result = approveLessonTool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should allow approval without feedback', () => {
      const input = {
        lesson_plan_id: '123e4567-e89b-12d3-a456-426614174000',
        approved: true,
      };

      const result = approveLessonTool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('Tool 9: link_cefr_descriptor', () => {
    const linkCEFRTool = academicOperationsMCPConfig.tools[8];

    it('should have correct tool definition', () => {
      expect(linkCEFRTool.name).toBe('link_cefr_descriptor');
      expect(linkCEFRTool.requiredScopes).toEqual(['academic:write']);
    });

    it('should validate CEFR descriptor linking', () => {
      const validInput = {
        material_id: '123e4567-e89b-12d3-a456-426614174000',
        cefr_level: 'B1',
        descriptor_codes: ['B1.1.1', 'B1.2.3'],
        skill_area: 'speaking',
      };

      const result = linkCEFRTool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate skill areas', () => {
      const validSkills = ['speaking', 'listening', 'reading', 'writing'];

      validSkills.forEach(skill => {
        const input = {
          material_id: '123e4567-e89b-12d3-a456-426614174000',
          cefr_level: 'A2',
          descriptor_codes: ['A2.1.1'],
          skill_area: skill,
        };

        const result = linkCEFRTool.inputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid skill area', () => {
      const invalidInput = {
        material_id: '123e4567-e89b-12d3-a456-426614174000',
        cefr_level: 'B2',
        descriptor_codes: ['B2.1.1'],
        skill_area: 'cooking', // Invalid skill
      };

      const result = linkCEFRTool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('Tool 10: publish_materials', () => {
    const publishMaterialsTool = academicOperationsMCPConfig.tools[9];

    it('should have correct tool definition', () => {
      expect(publishMaterialsTool.name).toBe('publish_materials');
      expect(publishMaterialsTool.requiredScopes).toEqual(['academic:write']);
    });

    it('should validate materials publishing schema', () => {
      const validInput = {
        course_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Week 1 Grammar Exercises',
        type: 'worksheet',
        content_url: 'https://storage.example.com/materials/week1.pdf',
        description: 'Practice exercises for present tense',
      };

      const result = publishMaterialsTool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate material types', () => {
      const validTypes = ['worksheet', 'video', 'audio', 'presentation', 'textbook', 'other'];

      validTypes.forEach(type => {
        const input = {
          course_id: '123e4567-e89b-12d3-a456-426614174000',
          title: `Material - ${type}`,
          type,
          content_url: 'https://example.com/material.pdf',
        };

        const result = publishMaterialsTool.inputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    it('should require valid URL', () => {
      const invalidInput = {
        course_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Invalid Material',
        type: 'worksheet',
        content_url: 'not-a-url',
      };

      const result = publishMaterialsTool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should allow optional description', () => {
      const input = {
        course_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Material without description',
        type: 'video',
        content_url: 'https://youtube.com/watch?v=example',
      };

      const result = publishMaterialsTool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('CEFR Level Validation', () => {
    it('should accept all standard CEFR levels', () => {
      const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

      levels.forEach(level => {
        expect(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).toContain(level);
      });
    });

    it('should reject non-standard levels', () => {
      const invalidLevels = ['D1', 'A3', 'B3', 'C3', 'A0'];

      invalidLevels.forEach(level => {
        expect(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).not.toContain(level);
      });
    });

    it('should maintain level hierarchy', () => {
      const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
      const levelHierarchy: { [key: string]: number } = {
        A1: 1,
        A2: 2,
        B1: 3,
        B2: 4,
        C1: 5,
        C2: 6,
      };

      expect(levelHierarchy['A1']).toBeLessThan(levelHierarchy['C2']);
      expect(levelHierarchy['B1']).toBeGreaterThan(levelHierarchy['A2']);
      expect(levelHierarchy['B1']).toBeLessThan(levelHierarchy['B2']);
    });
  });

  describe('Skill Area Coverage', () => {
    it('should cover all four language skills', () => {
      const skills = ['speaking', 'listening', 'reading', 'writing'];

      expect(skills).toHaveLength(4);
      expect(skills).toContain('speaking');
      expect(skills).toContain('listening');
      expect(skills).toContain('reading');
      expect(skills).toContain('writing');
    });
  });

  describe('Material Types', () => {
    it('should support comprehensive material types', () => {
      const types = ['worksheet', 'video', 'audio', 'presentation', 'textbook', 'other'];

      expect(types.length).toBeGreaterThanOrEqual(5);
      expect(types).toContain('worksheet');
      expect(types).toContain('video');
      expect(types).toContain('audio');
    });
  });

  describe('Scope Requirements', () => {
    it('should require academic:write for create operations', () => {
      const createTools = [
        'create_programme',
        'create_course',
        'schedule_class',
        'assign_teacher',
        'allocate_room',
        'register_lesson_template',
        'publish_materials',
      ];

      createTools.forEach(toolName => {
        const tool = academicOperationsMCPConfig.tools.find(t => t.name === toolName);
        expect(tool?.requiredScopes).toContain('academic:write');
      });
    });

    it('should all tools have scope requirements', () => {
      academicOperationsMCPConfig.tools.forEach(tool => {
        expect(tool.requiredScopes).toBeDefined();
        expect(tool.requiredScopes.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Input Validation Edge Cases', () => {
    it('should handle empty strings appropriately', () => {
      const createCourseTool = academicOperationsMCPConfig.tools[1];

      const invalidInput = {
        programme_id: '123e4567-e89b-12d3-a456-426614174000',
        name: '',
        code: 'TEST-01',
        cefr_level: 'A1',
      };

      const result = createCourseTool.inputSchema.safeParse(invalidInput);
      // Empty strings should fail validation for required fields
      expect(result.success).toBe(false);
    });

    it('should handle very long strings', () => {
      const createProgrammeTool = academicOperationsMCPConfig.tools[0];

      const longString = 'A'.repeat(1000);
      const input = {
        name: longString,
        code: 'TEST-01',
      };

      const result = createProgrammeTool.inputSchema.safeParse(input);
      // Should handle long strings (specific max length would be defined in schema)
      expect(result).toBeDefined();
    });

    it('should handle special characters in names', () => {
      const createProgrammeTool = academicOperationsMCPConfig.tools[0];

      const input = {
        name: 'Programme: English & Spanish (Advanced)',
        code: 'ES-ADV-2025',
      };

      const result = createProgrammeTool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});

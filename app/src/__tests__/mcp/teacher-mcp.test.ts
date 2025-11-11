/**
 * Teacher MCP Unit Tests
 *
 * Tests for Teacher MCP tools, resources, and schema validation.
 * Ref: TASKS.md T-022, MVP-SPRINT-PLAN.md (Sprint 1)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { teacherMCPConfig } from '@/lib/mcp/teacher/server';
import type { MCPSession } from '@/lib/mcp/types';
import {
  TimetableResponseSchema,
  RegisterSchema,
  MarkAttendanceInputSchema,
} from '@/lib/mcp/schemas/teacher-schemas';
import { LessonPlanRequestSchema } from '@/lib/lessons/schemas';

// ============================================================================
// Test Setup
// ============================================================================

const mockSession: MCPSession = {
  sessionId: 'session-123',
  userId: 'teacher-456',
  tenantId: 'org-789',
  role: 'teacher',
  scopes: ['teacher:*'],
  expiresAt: new Date(Date.now() + 3600000),
};

describe('Teacher MCP Configuration', () => {
  it('should have exactly 10 tools (architectural constraint)', () => {
    expect(teacherMCPConfig.tools.length).toBe(10);
  });

  it('should have teacher scope prefix', () => {
    expect(teacherMCPConfig.scopePrefix).toBe('teacher');
  });

  it('should have 3 resources (timetable, lesson-plans, register)', () => {
    expect(teacherMCPConfig.resources.length).toBe(3);
    expect(teacherMCPConfig.resources.map(r => r.name)).toEqual([
      'timetable',
      'lesson-plans',
      'register',
    ]);
  });

  it('all tools should have required scopes', () => {
    teacherMCPConfig.tools.forEach(tool => {
      expect(tool.requiredScopes).toBeDefined();
      expect(tool.requiredScopes.length).toBeGreaterThan(0);
      expect(tool.requiredScopes.some(s => s.startsWith('teacher:'))).toBe(true);
    });
  });

  it('all tools should have Zod input schemas', () => {
    teacherMCPConfig.tools.forEach(tool => {
      expect(tool.inputSchema).toBeDefined();
      expect(typeof tool.inputSchema.parse).toBe('function');
    });
  });
});

describe('Teacher MCP Tools', () => {
  describe('Tool 1: view_timetable', () => {
    it('should have correct name and description', () => {
      const tool = teacherMCPConfig.tools.find(t => t.name === 'view_timetable');
      expect(tool).toBeDefined();
      expect(tool!.description).toContain('weekly timetable');
    });

    it('should validate timetable input schema', () => {
      const tool = teacherMCPConfig.tools.find(t => t.name === 'view_timetable');
      expect(tool).toBeDefined();

      // Valid input
      const validInput = { week_start: '2025-11-11' };
      expect(() => tool!.inputSchema.parse(validInput)).not.toThrow();

      // Empty input should also work (defaults to current week)
      expect(() => tool!.inputSchema.parse({})).not.toThrow();
    });
  });

  describe('Tool 2: create_lesson_plan', () => {
    it('should have correct name and description', () => {
      const tool = teacherMCPConfig.tools.find(t => t.name === 'create_lesson_plan');
      expect(tool).toBeDefined();
      expect(tool!.description).toContain('CEFR-aligned');
      expect(tool!.description).toContain('AI');
    });

    it('should validate lesson plan request schema', () => {
      const tool = teacherMCPConfig.tools.find(t => t.name === 'create_lesson_plan');
      expect(tool).toBeDefined();

      // Valid input
      const validInput = {
        cefr_level: 'B1',
        topic: 'Daily Routines',
        duration_minutes: 60,
      };
      expect(() => tool!.inputSchema.parse(validInput)).not.toThrow();

      // Invalid CEFR level should throw
      const invalidInput = {
        cefr_level: 'X1',
        topic: 'Test',
        duration_minutes: 60,
      };
      expect(() => tool!.inputSchema.parse(invalidInput)).toThrow();

      // Duration too short should throw
      const invalidDuration = {
        cefr_level: 'B1',
        topic: 'Test',
        duration_minutes: 10,
      };
      expect(() => tool!.inputSchema.parse(invalidDuration)).toThrow();
    });
  });

  describe('Tool 3: attach_materials', () => {
    it('should validate materials input schema', () => {
      const tool = teacherMCPConfig.tools.find(t => t.name === 'attach_materials');
      expect(tool).toBeDefined();

      const validInput = {
        lesson_plan_id: '123e4567-e89b-12d3-a456-426614174000',
        materials: [
          {
            name: 'Vocabulary Worksheet',
            type: 'pdf',
            url: 'https://example.com/worksheet.pdf',
            description: 'Practice vocabulary',
          },
        ],
      };
      expect(() => tool!.inputSchema.parse(validInput)).not.toThrow();

      // Invalid UUID should throw
      const invalidInput = {
        lesson_plan_id: 'not-a-uuid',
        materials: [],
      };
      expect(() => tool!.inputSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('Tool 4: map_cefr_objectives', () => {
    it('should validate CEFR mapping schema', () => {
      const tool = teacherMCPConfig.tools.find(t => t.name === 'map_cefr_objectives');
      expect(tool).toBeDefined();

      const validInput = {
        lesson_plan_id: '123e4567-e89b-12d3-a456-426614174000',
        objectives: [
          {
            objective_text: 'Students will be able to describe daily routines',
            cefr_descriptor_id: '123e4567-e89b-12d3-a456-426614174001',
            skill: 'speaking',
          },
        ],
      };
      expect(() => tool!.inputSchema.parse(validInput)).not.toThrow();
    });
  });

  describe('Tool 5: mark_attendance', () => {
    it('should validate attendance input schema', () => {
      const tool = teacherMCPConfig.tools.find(t => t.name === 'mark_attendance');
      expect(tool).toBeDefined();

      const validInput = {
        session_id: '123e4567-e89b-12d3-a456-426614174000',
        attendance: [
          {
            student_id: '123e4567-e89b-12d3-a456-426614174001',
            status: 'present',
          },
          {
            student_id: '123e4567-e89b-12d3-a456-426614174002',
            status: 'absent',
            notes: 'Sick',
          },
        ],
      };
      expect(() => tool!.inputSchema.parse(validInput)).not.toThrow();

      // Invalid status should throw
      const invalidInput = {
        session_id: '123e4567-e89b-12d3-a456-426614174000',
        attendance: [
          {
            student_id: '123e4567-e89b-12d3-a456-426614174001',
            status: 'maybe',
          },
        ],
      };
      expect(() => tool!.inputSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('Tool 6: record_progress_note', () => {
    it('should validate progress note schema', () => {
      const tool = teacherMCPConfig.tools.find(t => t.name === 'record_progress_note');
      expect(tool).toBeDefined();

      const validInput = {
        student_id: '123e4567-e89b-12d3-a456-426614174000',
        class_id: '123e4567-e89b-12d3-a456-426614174001',
        note: 'Excellent progress in speaking skills',
        skills_assessed: ['speaking', 'listening'],
        cefr_level_estimate: 'B1',
      };
      expect(() => tool!.inputSchema.parse(validInput)).not.toThrow();

      // Note too long (> 2000 chars) should throw
      const invalidInput = {
        student_id: '123e4567-e89b-12d3-a456-426614174000',
        class_id: '123e4567-e89b-12d3-a456-426614174001',
        note: 'a'.repeat(2001),
      };
      expect(() => tool!.inputSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('Tool 7: assign_homework', () => {
    it('should validate homework schema', () => {
      const tool = teacherMCPConfig.tools.find(t => t.name === 'assign_homework');
      expect(tool).toBeDefined();

      const validInput = {
        class_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Vocabulary Review',
        description: 'Complete exercises 1-10',
        due_date: '2025-11-20',
        estimated_minutes: 30,
      };
      expect(() => tool!.inputSchema.parse(validInput)).not.toThrow();
    });
  });

  describe('Tool 8: grade_submission', () => {
    it('should validate grading schema', () => {
      const tool = teacherMCPConfig.tools.find(t => t.name === 'grade_submission');
      expect(tool).toBeDefined();

      const validInput = {
        submission_id: '123e4567-e89b-12d3-a456-426614174000',
        score: 85,
        feedback: 'Good work! Watch your verb tenses.',
        skills_breakdown: {
          grammar: 80,
          vocabulary: 90,
          fluency: 85,
        },
      };
      expect(() => tool!.inputSchema.parse(validInput)).not.toThrow();

      // Score out of range should throw
      const invalidInput = {
        submission_id: '123e4567-e89b-12d3-a456-426614174000',
        score: 150,
        feedback: 'Test',
      };
      expect(() => tool!.inputSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('Tool 9: export_class_data', () => {
    it('should validate export schema', () => {
      const tool = teacherMCPConfig.tools.find(t => t.name === 'export_class_data');
      expect(tool).toBeDefined();

      const validInput = {
        class_id: '123e4567-e89b-12d3-a456-426614174000',
        format: 'csv',
        include_attendance: true,
        include_grades: true,
        date_from: '2025-01-01',
        date_to: '2025-11-11',
      };
      expect(() => tool!.inputSchema.parse(validInput)).not.toThrow();

      // Invalid format should throw
      const invalidInput = {
        class_id: '123e4567-e89b-12d3-a456-426614174000',
        format: 'pdf',
      };
      expect(() => tool!.inputSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('Tool 10: raise_support_ticket', () => {
    it('should validate support ticket schema', () => {
      const tool = teacherMCPConfig.tools.find(t => t.name === 'raise_support_ticket');
      expect(tool).toBeDefined();

      const validInput = {
        title: 'Projector not working in Room 101',
        description: 'The HDMI connection is not working',
        priority: 'high',
        category: 'facilities',
      };
      expect(() => tool!.inputSchema.parse(validInput)).not.toThrow();
    });
  });
});

describe('Teacher MCP Resources', () => {
  describe('Timetable Resource', () => {
    it('should have correct URI and scope', () => {
      const resource = teacherMCPConfig.resources.find(r => r.name === 'timetable');
      expect(resource).toBeDefined();
      expect(resource!.uri).toBe('mycastle://teacher/timetable');
      expect(resource!.requiredScopes).toContain('teacher:*');
    });

    it('should validate timetable response schema', () => {
      const validResponse = {
        teacher_id: '123e4567-e89b-12d3-a456-426614174000',
        week_start: '2025-11-11',
        week_end: '2025-11-18',
        entries: [
          {
            session_id: '123e4567-e89b-12d3-a456-426614174001',
            class_id: '123e4567-e89b-12d3-a456-426614174002',
            class_name: 'B1 General English',
            start_time: '2025-11-11T09:00:00Z',
            end_time: '2025-11-11T10:30:00Z',
            room_number: '101',
            student_count: 15,
            cefr_level: 'B1',
          },
        ],
        total_hours: 1.5,
      };
      expect(() => TimetableResponseSchema.parse(validResponse)).not.toThrow();
    });
  });

  describe('Register Resource', () => {
    it('should have correct URI and scope', () => {
      const resource = teacherMCPConfig.resources.find(r => r.name === 'register');
      expect(resource).toBeDefined();
      expect(resource!.uri).toBe('mycastle://teacher/register');
      expect(resource!.requiredScopes).toContain('teacher:*');
    });

    it('should validate register response schema', () => {
      const validResponse = {
        session_id: '123e4567-e89b-12d3-a456-426614174000',
        class_id: '123e4567-e89b-12d3-a456-426614174001',
        class_name: 'B1 General English',
        date: '2025-11-11',
        students: [
          {
            student_id: '123e4567-e89b-12d3-a456-426614174002',
            student_name: 'John Doe',
            status: 'present',
          },
        ],
        is_finalized: true,
      };
      expect(() => RegisterSchema.parse(validResponse)).not.toThrow();
    });
  });
});

describe('Schema Validation', () => {
  it('should reject invalid UUIDs', () => {
    expect(() =>
      MarkAttendanceInputSchema.parse({
        session_id: 'not-a-uuid',
        attendance: [],
      }),
    ).toThrow();
  });

  it('should enforce CEFR level enum', () => {
    expect(() =>
      LessonPlanRequestSchema.parse({
        cefr_level: 'Z9',
        topic: 'Test',
        duration_minutes: 60,
      }),
    ).toThrow();
  });

  it('should enforce duration constraints', () => {
    // Too short
    expect(() =>
      LessonPlanRequestSchema.parse({
        cefr_level: 'B1',
        topic: 'Test',
        duration_minutes: 5,
      }),
    ).toThrow();

    // Too long
    expect(() =>
      LessonPlanRequestSchema.parse({
        cefr_level: 'B1',
        topic: 'Test',
        duration_minutes: 500,
      }),
    ).toThrow();
  });
});

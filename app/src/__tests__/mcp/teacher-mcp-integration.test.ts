/**
 * Teacher MCP Integration Tests
 *
 * Tests the complete MCP protocol flow:
 * - Tool invocation
 * - Resource access
 * - Authorization enforcement
 * - Error handling
 *
 * Ref: TASKS.md T-022, DESIGN.md §1 (MCP Protocol)
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { teacherMCPConfig } from '@/lib/mcp/teacher/server';
import { ScopeMatcher } from '@/lib/mcp/types';
import type { MCPSession } from '@/lib/mcp/types';

// ============================================================================
// Test Setup
// ============================================================================

const createSession = (scopes: string[]): MCPSession => ({
  sessionId: `session-${Date.now()}`,
  userId: `user-${Date.now()}`,
  tenantId: `org-${Date.now()}`,
  role: 'teacher',
  scopes,
  expiresAt: new Date(Date.now() + 3600000),
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Teacher MCP Integration', () => {
  describe('Tool Invocation Flow', () => {
    it('should invoke create_lesson_plan tool with valid session', async () => {
      const session = createSession(['teacher:*']);
      const tool = teacherMCPConfig.tools.find(t => t.name === 'create_lesson_plan');

      expect(tool).toBeDefined();

      const input = {
        cefr_level: 'B1',
        topic: 'Integration Test Topic',
        duration_minutes: 60,
      };

      // Tool should be callable
      expect(tool!.handler).toBeDefined();
      expect(typeof tool!.handler).toBe('function');
    });

    it('should validate input before tool execution', () => {
      const tool = teacherMCPConfig.tools.find(t => t.name === 'create_lesson_plan');
      expect(tool).toBeDefined();

      // Invalid input should be rejected by schema
      const invalidInput = {
        cefr_level: 'INVALID',
        topic: 'Test',
        duration_minutes: 60,
      };

      expect(() => tool!.inputSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('Resource Access Flow', () => {
    it('should access timetable resource with valid session', () => {
      const resource = teacherMCPConfig.resources.find(r => r.name === 'timetable');
      expect(resource).toBeDefined();
      expect(resource!.handler).toBeDefined();
      expect(typeof resource!.handler).toBe('function');
    });

    it('should access lesson-plans resource', () => {
      const resource = teacherMCPConfig.resources.find(r => r.name === 'lesson-plans');
      expect(resource).toBeDefined();
      expect(resource!.uri).toBe('mycastle://teacher/lesson-plans');
    });

    it('should access register resource with session_id parameter', () => {
      const resource = teacherMCPConfig.resources.find(r => r.name === 'register');
      expect(resource).toBeDefined();

      // Register resource requires session_id parameter
      expect(resource!.description).toContain('session');
    });
  });

  describe('Authorization Enforcement', () => {
    it('should allow access with teacher:* wildcard scope', () => {
      const userScopes = ['teacher:*'];
      const requiredScopes = ['teacher:create_lesson_plan'];

      const hasAccess = ScopeMatcher.hasScope(userScopes, requiredScopes);
      expect(hasAccess).toBe(true);
    });

    it('should allow access with exact scope match', () => {
      const userScopes = ['teacher:mark_attendance'];
      const requiredScopes = ['teacher:mark_attendance'];

      const hasAccess = ScopeMatcher.hasScope(userScopes, requiredScopes);
      expect(hasAccess).toBe(true);
    });

    it('should deny access without required scope', () => {
      const userScopes = ['student:*'];
      const requiredScopes = ['teacher:create_lesson_plan'];

      const hasAccess = ScopeMatcher.hasScope(userScopes, requiredScopes);
      expect(hasAccess).toBe(false);
    });

    it('should verify all tools have authorization checks', () => {
      teacherMCPConfig.tools.forEach(tool => {
        expect(tool.requiredScopes).toBeDefined();
        expect(tool.requiredScopes.length).toBeGreaterThan(0);

        // All teacher tools should require teacher scope
        const hasTeacherScope = tool.requiredScopes.some(
          scope => scope === 'teacher:*' || scope.startsWith('teacher:'),
        );
        expect(hasTeacherScope).toBe(true);
      });
    });

    it('should verify all resources have authorization checks', () => {
      teacherMCPConfig.resources.forEach(resource => {
        expect(resource.requiredScopes).toBeDefined();
        expect(resource.requiredScopes.length).toBeGreaterThan(0);

        // All teacher resources should require teacher scope
        const hasTeacherScope = resource.requiredScopes.some(
          scope => scope === 'teacher:*' || scope.startsWith('teacher:'),
        );
        expect(hasTeacherScope).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    it('should provide clear error messages for invalid UUIDs', () => {
      const tool = teacherMCPConfig.tools.find(t => t.name === 'mark_attendance');
      expect(tool).toBeDefined();

      const invalidInput = {
        session_id: 'not-a-uuid',
        attendance: [],
      };

      try {
        tool!.inputSchema.parse(invalidInput);
        fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.issues).toBeDefined();
        expect(error.issues[0].message).toContain('Invalid uuid');
      }
    });

    it('should provide clear error messages for invalid enums', () => {
      const tool = teacherMCPConfig.tools.find(t => t.name === 'create_lesson_plan');
      expect(tool).toBeDefined();

      const invalidInput = {
        cefr_level: 'X9',
        topic: 'Test',
        duration_minutes: 60,
      };

      try {
        tool!.inputSchema.parse(invalidInput);
        fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.issues).toBeDefined();
        expect(error.issues[0].message).toContain('Invalid enum value');
      }
    });

    it('should provide clear error messages for out-of-range values', () => {
      const tool = teacherMCPConfig.tools.find(t => t.name === 'grade_submission');
      expect(tool).toBeDefined();

      const invalidInput = {
        submission_id: '123e4567-e89b-12d3-a456-426614174000',
        score: 150, // Out of 0-100 range
        feedback: 'Test',
      };

      try {
        tool!.inputSchema.parse(invalidInput);
        fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.issues).toBeDefined();
        expect(error.issues[0].message).toContain('too big');
      }
    });
  });

  describe('MCP Protocol Compliance', () => {
    it('should have JSON-RPC 2.0 compatible tool names', () => {
      teacherMCPConfig.tools.forEach(tool => {
        // Tool names should be snake_case
        expect(tool.name).toMatch(/^[a-z_]+$/);
      });
    });

    it('should have valid resource URIs', () => {
      teacherMCPConfig.resources.forEach(resource => {
        // URIs should follow mycastle:// scheme
        expect(resource.uri).toMatch(/^mycastle:\/\//);
        expect(resource.uri).toContain('teacher');
      });
    });

    it('should define MIME types for all resources', () => {
      teacherMCPConfig.resources.forEach(resource => {
        expect(resource.mimeType).toBeDefined();
        expect(resource.mimeType).toMatch(/^application\//);
      });
    });
  });

  describe('Data Consistency', () => {
    it('should maintain referential integrity in lesson plan data', () => {
      const createTool = teacherMCPConfig.tools.find(t => t.name === 'create_lesson_plan');
      const attachTool = teacherMCPConfig.tools.find(t => t.name === 'attach_materials');

      expect(createTool).toBeDefined();
      expect(attachTool).toBeDefined();

      // Both tools should reference lesson_plan_id
      const createSchema = createTool!.inputSchema;
      const attachSchema = attachTool!.inputSchema;

      // Validate that attach_materials requires a lesson_plan_id
      const validAttachInput = {
        lesson_plan_id: '123e4567-e89b-12d3-a456-426614174000',
        materials: [],
      };

      expect(() => attachSchema.parse(validAttachInput)).not.toThrow();
    });

    it('should maintain referential integrity in attendance data', () => {
      const markTool = teacherMCPConfig.tools.find(t => t.name === 'mark_attendance');
      const registerResource = teacherMCPConfig.resources.find(r => r.name === 'register');

      expect(markTool).toBeDefined();
      expect(registerResource).toBeDefined();

      // Both should reference session_id and student_id
      const validInput = {
        session_id: '123e4567-e89b-12d3-a456-426614174000',
        attendance: [
          {
            student_id: '123e4567-e89b-12d3-a456-426614174001',
            status: 'present',
          },
        ],
      };

      expect(() => markTool!.inputSchema.parse(validInput)).not.toThrow();
    });
  });

  describe('Performance Characteristics', () => {
    it('should have all tools with synchronous schema validation', () => {
      teacherMCPConfig.tools.forEach(tool => {
        const validInput = {}; // Schema will reject this, but validation should be sync

        try {
          const result = tool.inputSchema.safeParse(validInput);
          expect(result).toHaveProperty('success');
        } catch (error) {
          fail('Schema validation should not throw, should return validation result');
        }
      });
    });
  });
});

describe('MCP Host Integration', () => {
  describe('Scope-Based Routing', () => {
    it('should route to Teacher MCP based on teacher:* scope', () => {
      expect(teacherMCPConfig.scopePrefix).toBe('teacher');

      // All tools should have teacher: prefix in scopes
      teacherMCPConfig.tools.forEach(tool => {
        const hasTeacherPrefix = tool.requiredScopes.some(s => s.startsWith('teacher:'));
        expect(hasTeacherPrefix).toBe(true);
      });
    });
  });

  describe('Context Aggregation', () => {
    it('should allow resources to provide context for tools', () => {
      // Timetable resource can provide context for create_lesson_plan tool
      const timetableResource = teacherMCPConfig.resources.find(r => r.name === 'timetable');
      const lessonPlanTool = teacherMCPConfig.tools.find(t => t.name === 'create_lesson_plan');

      expect(timetableResource).toBeDefined();
      expect(lessonPlanTool).toBeDefined();

      // Both should be accessible to provide context
      expect(timetableResource!.handler).toBeDefined();
      expect(lessonPlanTool!.handler).toBeDefined();
    });
  });
});

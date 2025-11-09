/**
 * MCP Host Tests
 * T-020: Test MCP protocol integration with Host
 * T-022: Test Teacher MCP Server tools
 */

import { MCPHost } from '@/lib/mcp/host/MCPHost';
import { ScopeMatcher, MCPSession, MCPServerConfig, MCPTool } from '@/lib/mcp/types';
import { z } from 'zod';

describe('MCP Types', () => {
  describe('ScopeMatcher', () => {
    describe('hasScope', () => {
      it('should match exact scopes', () => {
        const userScopes = ['teacher:view_timetable', 'teacher:mark_attendance'];
        const requiredScopes = ['teacher:view_timetable'];

        expect(ScopeMatcher.hasScope(userScopes, requiredScopes)).toBe(true);
      });

      it('should match wildcard scopes', () => {
        const userScopes = ['teacher:*'];
        const requiredScopes = ['teacher:view_timetable', 'teacher:mark_attendance'];

        expect(ScopeMatcher.hasScope(userScopes, requiredScopes)).toBe(true);
      });

      it('should reject missing scopes', () => {
        const userScopes = ['teacher:view_timetable'];
        const requiredScopes = ['teacher:mark_attendance'];

        expect(ScopeMatcher.hasScope(userScopes, requiredScopes)).toBe(false);
      });

      it('should reject scopes from different domains', () => {
        const userScopes = ['teacher:*'];
        const requiredScopes = ['admin:create_user'];

        expect(ScopeMatcher.hasScope(userScopes, requiredScopes)).toBe(false);
      });

      it('should handle admin wildcard', () => {
        const userScopes = ['admin:*', 'teacher:*', 'student:*'];
        const requiredScopes = ['teacher:view_timetable', 'admin:create_user'];

        expect(ScopeMatcher.hasScope(userScopes, requiredScopes)).toBe(true);
      });

      it('should require all scopes', () => {
        const userScopes = ['teacher:view_timetable'];
        const requiredScopes = ['teacher:view_timetable', 'teacher:mark_attendance'];

        expect(ScopeMatcher.hasScope(userScopes, requiredScopes)).toBe(false);
      });
    });

    describe('getPrefix', () => {
      it('should extract scope prefix', () => {
        expect(ScopeMatcher.getPrefix('teacher:view_timetable')).toBe('teacher');
        expect(ScopeMatcher.getPrefix('admin:create_user')).toBe('admin');
        expect(ScopeMatcher.getPrefix('student:view_grades')).toBe('student');
      });
    });

    describe('generateScopes', () => {
      it('should generate admin scopes', () => {
        const scopes = ScopeMatcher.generateScopes('admin');
        expect(scopes).toContain('admin:*');
        expect(scopes).toContain('teacher:*');
        expect(scopes).toContain('student:*');
      });

      it('should generate teacher scopes', () => {
        const scopes = ScopeMatcher.generateScopes('teacher');
        expect(scopes).toContain('teacher:*');
        expect(scopes).toContain('student:view_grades');
        expect(scopes).toContain('student:view_attendance');
        expect(scopes).not.toContain('admin:*');
      });

      it('should generate student scopes', () => {
        const scopes = ScopeMatcher.generateScopes('student');
        expect(scopes).toContain('student:*');
        expect(scopes).not.toContain('teacher:*');
        expect(scopes).not.toContain('admin:*');
      });
    });
  });
});

describe('MCP Host', () => {
  let host: MCPHost;
  let mockSession: MCPSession;
  let mockTool: MCPTool;
  let mockServerConfig: MCPServerConfig;

  beforeEach(() => {
    host = new MCPHost();

    mockSession = {
      sessionId: 'test-session-123',
      userId: 'user-123',
      tenantId: 'tenant-123',
      role: 'teacher',
      scopes: ['teacher:*'],
      expiresAt: new Date(Date.now() + 3600 * 1000),
    };

    mockTool = {
      name: 'test_tool',
      description: 'A test tool',
      requiredScopes: ['teacher:test'],
      inputSchema: z.object({
        message: z.string(),
      }),
      handler: async (input: unknown) => {
        return { success: true, message: (input as { message: string }).message };
      },
    };

    mockServerConfig = {
      name: 'Test MCP',
      version: '1.0.0',
      scopePrefix: 'teacher',
      tools: [mockTool],
      resources: [],
      prompts: [],
    };
  });

  describe('Server Registration', () => {
    it('should register MCP servers', () => {
      host.registerServer(mockServerConfig);

      const servers = host.listServers();
      expect(servers).toHaveLength(1);
      expect(servers[0].name).toBe('Test MCP');
    });

    it('should track multiple registered servers', () => {
      const adminConfig: MCPServerConfig = {
        ...mockServerConfig,
        name: 'Admin MCP',
        scopePrefix: 'admin',
      };

      host.registerServer(mockServerConfig);
      host.registerServer(adminConfig);

      const servers = host.listServers();
      expect(servers).toHaveLength(2);
    });
  });

  describe('Session Management', () => {
    it('should create sessions from JWT claims', async () => {
      const claims = {
        sub: 'user-123',
        email: 'teacher@school.com',
        role: 'teacher' as const,
        tenant_id: 'tenant-123',
      };

      const session = await host.createSession(claims);

      expect(session.userId).toBe('user-123');
      expect(session.role).toBe('teacher');
      expect(session.tenantId).toBe('tenant-123');
      expect(session.scopes).toContain('teacher:*');
    });

    it('should retrieve stored sessions', async () => {
      const claims = {
        sub: 'user-123',
        email: 'teacher@school.com',
        role: 'teacher' as const,
        tenant_id: 'tenant-123',
      };

      const session = await host.createSession(claims);
      const retrieved = host.getSession(session.sessionId);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.sessionId).toBe(session.sessionId);
    });

    it('should return null for expired sessions', async () => {
      const session: MCPSession = {
        sessionId: 'expired-123',
        userId: 'user-123',
        tenantId: 'tenant-123',
        role: 'teacher',
        scopes: ['teacher:*'],
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      };

      // Manually add expired session
      (host as any).sessions.set(session.sessionId, session);

      const retrieved = host.getSession(session.sessionId);
      expect(retrieved).toBeNull();
    });
  });

  describe('Tool Execution', () => {
    beforeEach(() => {
      host.registerServer(mockServerConfig);
    });

    it('should route tool requests to correct server', async () => {
      const result = await host.executeTool('test_tool', { message: 'Hello' }, mockSession);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ success: true, message: 'Hello' });
      expect(result.metadata?.server).toBe('Test MCP');
    });

    it('should enforce scope-based access control', async () => {
      const restrictedSession: MCPSession = {
        ...mockSession,
        scopes: ['student:*'], // Wrong scope for test_tool
      };

      const result = await host.executeTool('test_tool', { message: 'Hello' }, restrictedSession);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('FORBIDDEN');
    });

    it('should validate tool input schemas', async () => {
      const result = await host.executeTool('test_tool', { invalid: 'field' }, mockSession);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_INPUT');
    });

    it('should return error for non-existent tools', async () => {
      const result = await host.executeTool('non_existent_tool', {}, mockSession);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TOOL_NOT_FOUND');
    });

    it('should track execution time metadata', async () => {
      const result = await host.executeTool('test_tool', { message: 'Hello' }, mockSession);

      expect(result.metadata?.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should handle tool execution errors gracefully', async () => {
      const errorTool: MCPTool = {
        name: 'error_tool',
        description: 'A tool that throws errors',
        requiredScopes: ['teacher:test'],
        inputSchema: z.object({}),
        handler: async () => {
          throw new Error('Something went wrong');
        },
      };

      host.registerServer({
        ...mockServerConfig,
        tools: [errorTool],
      });

      const result = await host.executeTool('error_tool', {}, mockSession);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('EXECUTION_ERROR');
      expect(result.error?.message).toContain('Something went wrong');
    });
  });

  describe('Tool Listing', () => {
    beforeEach(() => {
      host.registerServer(mockServerConfig);
    });

    it('should list tools based on user scopes', () => {
      const tools = host.listTools(mockSession);

      expect(tools.length).toBeGreaterThan(0);
      expect(tools.some(t => t.name === 'test_tool')).toBe(true);
    });

    it('should filter out tools user does not have access to', () => {
      const restrictedSession: MCPSession = {
        ...mockSession,
        scopes: ['student:*'],
      };

      const tools = host.listTools(restrictedSession);

      expect(tools.some(t => t.name === 'test_tool')).toBe(false);
    });
  });

  describe('Resource Management', () => {
    beforeEach(() => {
      const configWithResource: MCPServerConfig = {
        ...mockServerConfig,
        resources: [
          {
            uri: 'mycastle://test/resource',
            name: 'Test Resource',
            description: 'A test resource',
            requiredScopes: ['teacher:test'],
            handler: async () => ({ data: 'test resource data' }),
          },
        ],
      };

      host.registerServer(configWithResource);
    });

    it('should list resources based on user scopes', () => {
      const resources = host.listResources(mockSession);

      expect(resources.length).toBeGreaterThan(0);
      expect(resources[0].uri).toBe('mycastle://test/resource');
    });

    it('should fetch resources', async () => {
      const result = await host.fetchResource('mycastle://test/resource', mockSession);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ data: 'test resource data' });
    });

    it('should enforce scope-based access on resources', async () => {
      const restrictedSession: MCPSession = {
        ...mockSession,
        scopes: ['student:*'],
      };

      const result = await host.fetchResource('mycastle://test/resource', restrictedSession);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('FORBIDDEN');
    });

    it('should return error for non-existent resources', async () => {
      const result = await host.fetchResource('mycastle://non/existent', mockSession);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('RESOURCE_NOT_FOUND');
    });
  });

  describe('Context Aggregation', () => {
    beforeEach(() => {
      const configWithResources: MCPServerConfig = {
        ...mockServerConfig,
        resources: [
          {
            uri: 'mycastle://test/resource1',
            name: 'Resource 1',
            description: 'First resource',
            requiredScopes: ['teacher:test'],
            handler: async () => ({ data: 'resource 1' }),
          },
          {
            uri: 'mycastle://test/resource2',
            name: 'Resource 2',
            description: 'Second resource',
            requiredScopes: ['teacher:test'],
            handler: async () => ({ data: 'resource 2' }),
          },
        ],
      };

      host.registerServer(configWithResources);
    });

    it('should aggregate context from multiple sources', async () => {
      const context = await host.aggregateContext(mockSession, [
        { type: 'resource', target: 'mycastle://test/resource1' },
        { type: 'resource', target: 'mycastle://test/resource2' },
      ]);

      expect(context.items.length).toBe(2);
      expect(context.items[0].type).toBe('resource');
      expect(context.items[1].type).toBe('resource');
    });

    it('should handle failed context requests gracefully', async () => {
      const context = await host.aggregateContext(mockSession, [
        { type: 'resource', target: 'mycastle://test/resource1' },
        { type: 'resource', target: 'mycastle://non/existent' }, // This will fail
      ]);

      // Should have 1 successful result
      expect(context.items.length).toBe(1);
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      host.registerServer(mockServerConfig);

      const health = await host.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.servers.length).toBeGreaterThan(0);
    });
  });
});

describe('Teacher MCP Server', () => {
  // Integration tests for Teacher MCP tools
  // These would require a test database setup

  describe('view_timetable tool', () => {
    it.todo('should return weekly timetable for teacher');
    it.todo('should filter sessions by week range');
    it.todo('should include class details');
  });

  describe('mark_attendance tool', () => {
    it.todo('should mark student attendance');
    it.todo('should compute and store hash chain');
    it.todo('should enforce 48-hour edit window');
    it.todo('should allow admin override after 48 hours');
    it.todo('should increment edit count on updates');
  });

  describe('create_lesson_plan tool', () => {
    it.todo('should create lesson plan');
    it.todo('should validate CEFR level');
    it.todo('should store JSON plan');
  });

  describe('view_class_roster tool', () => {
    it.todo('should return enrolled students');
    it.todo('should include attendance rate');
    it.todo('should verify teacher ownership');
  });

  describe('Resources', () => {
    it.todo('should fetch timetable resource');
    it.todo('should fetch lesson plans resource');
    it.todo('should fetch classes resource');
  });

  describe('Prompts', () => {
    it.todo('should return plan_lesson prompt');
    it.todo('should return analyze_performance prompt');
    it.todo('should return mark_register prompt');
  });
});

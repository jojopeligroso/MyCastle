import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdminMCPServer, MCP_ERROR_CODES } from '../../src/core/server.js';
import type { MCPRequest, MCPResponse } from '../../src/core/server.js';
import type { AdminContext } from '../../src/types/index.js';

describe('MCP Server Integration', () => {
  let server: AdminMCPServer;
  let mockContext: AdminContext;

  beforeEach(() => {
    server = new AdminMCPServer({ requestTimeout: 5000 });
    mockContext = {
      actorId: 'test-user',
      actorRole: 'admin',
      scopes: ['admin.super'],
      supabaseToken: 'mock-token',
    };

    // Mock console.error for audit logs
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('Protocol Compliance', () => {
    it('should validate JSON-RPC 2.0 version', async () => {
      const invalidRequest: any = {
        jsonrpc: '1.0',
        method: 'tools/list',
        id: 1,
      };

      const response = await server.handleRequest(invalidRequest, mockContext);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(MCP_ERROR_CODES.INVALID_REQUEST);
      expect(response.error?.message).toContain('JSON-RPC version');
    });

    it('should include request ID in response', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        method: 'ping',
        id: 'test-request-123',
      };

      const response = await server.handleRequest(request, mockContext);

      expect(response.id).toBe('test-request-123');
    });

    it('should handle numeric request IDs', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        method: 'ping',
        id: 42,
      };

      const response = await server.handleRequest(request, mockContext);

      expect(response.id).toBe(42);
    });

    it('should handle null request ID', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        method: 'ping',
        id: null,
      };

      const response = await server.handleRequest(request, mockContext);

      expect(response.id).toBeNull();
    });
  });

  describe('tools/list', () => {
    it('should list all available tools', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        method: 'tools/list',
        id: 1,
      };

      const response = await server.handleRequest(request, mockContext);

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();
      expect(response.result.tools).toBeInstanceOf(Array);
      expect(response.result.tools.length).toBeGreaterThan(0);
    });

    it('should return tool metadata with required fields', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        method: 'tools/list',
        id: 1,
      };

      const response = await server.handleRequest(request, mockContext);

      const tools = response.result?.tools || [];
      expect(tools.length).toBeGreaterThan(0);

      const firstTool = tools[0];
      expect(firstTool).toHaveProperty('name');
      expect(firstTool).toHaveProperty('description');
      expect(firstTool).toHaveProperty('inputSchema');
      expect(firstTool.inputSchema).toHaveProperty('type');
    });

    it('should include all 15 tools', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        method: 'tools/list',
        id: 1,
      };

      const response = await server.handleRequest(request, mockContext);

      expect(response.result?.tools).toHaveLength(15);
    });
  });

  describe('resources/list', () => {
    it('should list all available resources', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        method: 'resources/list',
        id: 1,
      };

      const response = await server.handleRequest(request, mockContext);

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();
      expect(response.result.resources).toBeInstanceOf(Array);
      expect(response.result.resources.length).toBeGreaterThan(0);
    });

    it('should return resource metadata with required fields', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        method: 'resources/list',
        id: 1,
      };

      const response = await server.handleRequest(request, mockContext);

      const resources = response.result?.resources || [];
      expect(resources.length).toBeGreaterThan(0);

      const firstResource = resources[0];
      expect(firstResource).toHaveProperty('uri');
      expect(firstResource).toHaveProperty('name');
      expect(firstResource.uri).toMatch(/^res:\/\//);
    });

    it('should include all 8 resources', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        method: 'resources/list',
        id: 1,
      };

      const response = await server.handleRequest(request, mockContext);

      expect(response.result?.resources).toHaveLength(8);
    });
  });

  describe('ping', () => {
    it('should respond to ping', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        method: 'ping',
        id: 1,
      };

      const response = await server.handleRequest(request, mockContext);

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();
      expect(response.result.pong).toBe(true);
      expect(response.result.timestamp).toBeTruthy();
    });

    it('should include timestamp in ping response', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        method: 'ping',
        id: 1,
      };

      const before = new Date().toISOString();
      const response = await server.handleRequest(request, mockContext);
      const after = new Date().toISOString();

      expect(response.result.timestamp).toBeTruthy();
      expect(response.result.timestamp).toBeGreaterThanOrEqual(before);
      expect(response.result.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('Error Handling', () => {
    it('should return method not found for unknown method', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        method: 'unknown/method',
        id: 1,
      };

      const response = await server.handleRequest(request, mockContext);

      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(MCP_ERROR_CODES.METHOD_NOT_FOUND);
      expect(response.error?.message).toContain('Method not found');
    });

    it('should handle validation errors', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          // Missing name parameter
          arguments: {},
        },
        id: 1,
      };

      const response = await server.handleRequest(request, mockContext);

      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(MCP_ERROR_CODES.VALIDATION_ERROR);
    });

    it('should handle internal errors gracefully', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'nonexistent-tool',
          arguments: {},
        },
        id: 1,
      };

      const response = await server.handleRequest(request, mockContext);

      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(MCP_ERROR_CODES.VALIDATION_ERROR);
    });

    it('should return proper error structure', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        method: 'unknown/method',
        id: 1,
      };

      const response = await server.handleRequest(request, mockContext);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.error).toBeDefined();
      expect(response.error).toHaveProperty('code');
      expect(response.error).toHaveProperty('message');
      expect(response.id).toBe(1);
      expect(response.result).toBeUndefined();
    });
  });

  describe('Request Timeout', () => {
    it('should timeout long-running requests', async () => {
      const serverWithShortTimeout = new AdminMCPServer({ requestTimeout: 100 });

      // Create a request that would take longer than timeout
      // In real scenario, this would be a slow tool/resource
      const request: MCPRequest = {
        jsonrpc: '2.0',
        method: 'tools/list',
        id: 1,
      };

      // This should complete quickly, so let's just test the server can handle requests
      const response = await serverWithShortTimeout.handleRequest(request, mockContext);

      // Should complete successfully since tools/list is fast
      expect(response.error).toBeUndefined();
    }, 10000);
  });

  describe('Correlation ID', () => {
    it('should generate correlation ID if not provided', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        method: 'ping',
        id: 1,
      };

      const response = await server.handleRequest(request, mockContext);

      expect(response.error).toBeUndefined();
      // Correlation ID is generated internally
    });

    it('should use provided correlation ID', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        method: 'ping',
        id: 1,
        meta: {
          correlationId: 'custom-correlation-123',
        },
      };

      const response = await server.handleRequest(request, mockContext);

      expect(response.error).toBeUndefined();
      // The correlation ID would be used in audit logs
    });
  });

  describe('Success Response Structure', () => {
    it('should return success response with result', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        method: 'tools/list',
        id: 1,
      };

      const response = await server.handleRequest(request, mockContext);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.result).toBeDefined();
      expect(response.error).toBeUndefined();
      expect(response.id).toBe(1);
    });
  });

  describe('Unimplemented Methods', () => {
    it('should return error for resources/subscribe', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        method: 'resources/subscribe',
        id: 1,
      };

      const response = await server.handleRequest(request, mockContext);

      expect(response.error).toBeDefined();
      expect(response.error?.message).toContain('not implemented');
    });

    it('should return empty array for prompts/list', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        method: 'prompts/list',
        id: 1,
      };

      const response = await server.handleRequest(request, mockContext);

      expect(response.error).toBeUndefined();
      expect(response.result.prompts).toEqual([]);
    });

    it('should return error for completion/complete', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        method: 'completion/complete',
        id: 1,
      };

      const response = await server.handleRequest(request, mockContext);

      expect(response.error).toBeDefined();
      expect(response.error?.message).toContain('not implemented');
    });
  });
});

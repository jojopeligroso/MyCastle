import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createHttpServer } from '../../src/adapters/http/http-server.js';
import type { Express } from 'express';
import type { Server } from 'http';

describe('HTTP Transport Integration', () => {
  let app: Express;
  let server: Server;
  let baseURL: string;
  const PORT = 3001; // Use different port for testing

  beforeAll(async () => {
    app = createHttpServer();

    // Start server
    await new Promise<void>((resolve) => {
      server = app.listen(PORT, () => {
        baseURL = `http://localhost:${PORT}`;
        resolve();
      });
    });

    // Mock console.error for cleaner test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      if (server) {
        server.close(() => resolve());
      } else {
        resolve();
      }
    });
  });

  describe('Health Check', () => {
    it('should respond to health check', async () => {
      const response = await fetch(`${baseURL}/health`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.service).toBe('admin-mcp');
      expect(data.version).toBeTruthy();
      expect(data.timestamp).toBeTruthy();
    });

    it('should return correct content type', async () => {
      const response = await fetch(`${baseURL}/health`);

      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });

  describe('Root Endpoint', () => {
    it('should return service information', async () => {
      const response = await fetch(`${baseURL}/`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.service).toBe('Admin MCP Server');
      expect(data.version).toBeTruthy();
      expect(data.protocol).toBe('JSON-RPC 2.0');
      expect(data.endpoints).toBeDefined();
    });
  });

  describe('MCP Endpoint', () => {
    it('should reject requests without content', async () => {
      const response = await fetch(`${baseURL}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should reject requests without authentication (except ping)', async () => {
      const response = await fetch(`${baseURL}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/list',
          id: 1,
        }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe(-32001);
    });

    it('should allow ping without authentication', async () => {
      const response = await fetch(`${baseURL}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'ping',
          id: 1,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.result).toBeDefined();
      expect(data.result.pong).toBe(true);
    });

    it('should handle invalid JSON-RPC structure', async () => {
      const response = await fetch(`${baseURL}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Missing jsonrpc and method
          id: 1,
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should return JSON-RPC 2.0 response', async () => {
      const response = await fetch(`${baseURL}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'ping',
          id: 1,
        }),
      });

      const data = await response.json();
      expect(data.jsonrpc).toBe('2.0');
      expect(data).toHaveProperty('id');
    });

    it('should set appropriate status codes for errors', async () => {
      // Method not found should return 404
      const response = await fetch(`${baseURL}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'nonexistent/method',
          id: 1,
        }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe(-32601);
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers in responses', async () => {
      const response = await fetch(`${baseURL}/health`);

      expect(response.headers.get('access-control-allow-origin')).toBeTruthy();
      expect(response.headers.get('access-control-allow-methods')).toBeTruthy();
      expect(response.headers.get('access-control-allow-headers')).toBeTruthy();
    });

    it('should handle OPTIONS preflight requests', async () => {
      const response = await fetch(`${baseURL}/mcp`, {
        method: 'OPTIONS',
      });

      expect(response.status).toBe(204);
      expect(response.headers.get('access-control-allow-origin')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown endpoints', async () => {
      const response = await fetch(`${baseURL}/unknown`);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Not Found');
    });

    it('should handle internal errors gracefully', async () => {
      // Send malformed JSON to trigger parse error
      const response = await fetch(`${baseURL}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'not valid json{',
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Request Logging', () => {
    it('should log requests (via middleware)', async () => {
      // Just verify the request completes - logging is mocked
      const response = await fetch(`${baseURL}/health`);

      expect(response.status).toBe(200);
      // Actual logging would be captured in console.error mock
    });
  });

  describe('SSE Stream Endpoint', () => {
    it('should require authentication', async () => {
      const response = await fetch(`${baseURL}/mcp/stream`);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Authentication required');
    });

    it('should reject invalid authentication', async () => {
      const response = await fetch(`${baseURL}/mcp/stream`, {
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Authentication failed');
    });
  });

  describe('Content Type Validation', () => {
    it('should accept application/json', async () => {
      const response = await fetch(`${baseURL}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'ping',
          id: 1,
        }),
      });

      expect(response.status).toBe(200);
    });

    it('should handle large payloads within limit', async () => {
      // Create a request with reasonable size
      const request = {
        jsonrpc: '2.0',
        method: 'ping',
        id: 1,
        params: {
          data: 'x'.repeat(1000), // 1KB of data
        },
      };

      const response = await fetch(`${baseURL}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      // Should be accepted (limit is 10MB)
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('Response Format', () => {
    it('should return well-formed JSON-RPC responses', async () => {
      const response = await fetch(`${baseURL}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'ping',
          id: 'test-123',
        }),
      });

      const data = await response.json();

      expect(data).toHaveProperty('jsonrpc', '2.0');
      expect(data).toHaveProperty('id', 'test-123');
      expect(data.result || data.error).toBeDefined();
    });

    it('should preserve request ID in response', async () => {
      const requestIds = ['string-id', 42, null];

      for (const id of requestIds) {
        const response = await fetch(`${baseURL}/mcp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'ping',
            id,
          }),
        });

        const data = await response.json();
        expect(data.id).toBe(id);
      }
    });
  });

  describe('Method Handling', () => {
    it('should only accept POST for MCP endpoint', async () => {
      const methods = ['GET', 'PUT', 'DELETE', 'PATCH'];

      for (const method of methods) {
        const response = await fetch(`${baseURL}/mcp`, {
          method,
        });

        // Should either be 404 or 405 (Method Not Allowed)
        expect(response.status).toBeGreaterThanOrEqual(404);
      }
    });

    it('should accept GET for health and root', async () => {
      const endpoints = ['/health', '/'];

      for (const endpoint of endpoints) {
        const response = await fetch(`${baseURL}${endpoint}`);
        expect(response.status).toBe(200);
      }
    });
  });
});

/**
 * HTTP Transport Adapter for Admin MCP Server
 *
 * Implements the MCP protocol over HTTP/HTTPS with REST endpoints.
 * Supports standard JSON-RPC 2.0 over POST, health checks, and
 * optional server-sent events for streaming updates.
 */

import express, { Request, Response, NextFunction } from 'express';
import { AdminMCPServer } from '../../core/server.js';
import { verifyAuthHeader } from '../../core/auth/jwt-verify.js';
import type { MCPRequest, MCPResponse } from '../../core/server.js';
import type { AdminContext } from '../../types/index.js';
import { AuthenticationError, AuthorizationError, ValidationError } from '../../types/index.js';

/**
 * Create Express app with MCP endpoints
 *
 * Sets up routes for health checks, JSON-RPC requests, and optional streaming.
 *
 * @returns Express application
 */
export function createHttpServer(): express.Application {
  const app = express();
  const mcpServer = new AdminMCPServer({ requestTimeout: 30000 });

  // Middleware
  app.use(express.json({ limit: '10mb' }));

  // Request logging middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.error(
        `[HTTP] ${new Date().toISOString()} - ${req.method} ${req.path} ${res.statusCode} ${duration}ms`
      );
    });
    next();
  });

  // CORS middleware (configure as needed)
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    next();
  });

  /**
   * Health check endpoint
   *
   * Returns 200 OK if server is running and ready to accept requests.
   */
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      service: 'admin-mcp',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Root endpoint - basic info
   */
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      service: 'Admin MCP Server',
      version: '1.0.0',
      protocol: 'JSON-RPC 2.0',
      endpoints: {
        health: '/health',
        mcp: '/mcp (POST)',
        stream: '/mcp/stream (GET)',
      },
      documentation: 'https://github.com/your-org/admin-mcp',
    });
  });

  /**
   * Main MCP endpoint
   *
   * Accepts JSON-RPC 2.0 requests, verifies authentication,
   * and processes through the MCP server.
   */
  app.post('/mcp', async (req: Request, res: Response) => {
    let requestId: string | number | null = null;

    try {
      const request: MCPRequest = req.body;
      requestId = request?.id || null;

      // Validate JSON-RPC structure
      if (!request || typeof request !== 'object') {
        const errorResponse: MCPResponse = {
          jsonrpc: '2.0',
          error: {
            code: -32600,
            message: 'Invalid request: Expected JSON-RPC 2.0 object',
          },
          id: null,
        };
        return res.status(400).json(errorResponse);
      }

      // Extract and verify authentication
      const authHeader = req.headers.authorization as string | undefined;

      if (!authHeader && request.method !== 'ping') {
        const errorResponse: MCPResponse = {
          jsonrpc: '2.0',
          error: {
            code: -32001,
            message: 'Authentication required. Provide Authorization header with Bearer token.',
          },
          id: requestId,
        };
        return res.status(401).json(errorResponse);
      }

      // Verify token and create context
      let context: AdminContext;
      if (authHeader) {
        try {
          context = await verifyAuthHeader(authHeader);
        } catch (authError) {
          const errorResponse: MCPResponse = {
            jsonrpc: '2.0',
            error: {
              code: -32001,
              message: authError instanceof Error ? authError.message : 'Authentication failed',
            },
            id: requestId,
          };
          return res.status(401).json(errorResponse);
        }
      } else {
        // Ping without auth - create minimal context
        context = {
          actorId: 'anonymous',
          actorRole: 'anonymous',
          scopes: [],
          supabaseToken: '',
        };
      }

      // Process request through MCP server
      const response = await mcpServer.handleRequest(request, context);

      // Determine HTTP status code from response
      const httpStatus = response.error
        ? response.error.code === -32001
          ? 401 // Authentication error
          : response.error.code === -32002
          ? 403 // Authorization error
          : response.error.code === -32600 || response.error.code === -32602
          ? 400 // Bad request / invalid params
          : response.error.code === -32601
          ? 404 // Method not found
          : 500 // Internal error
        : 200;

      res.status(httpStatus).json(response);
    } catch (error) {
      // Unexpected error outside of MCP server
      console.error('[HTTP] Unhandled error:', error);

      const errorResponse: MCPResponse = {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal server error',
        },
        id: requestId,
      };

      res.status(500).json(errorResponse);
    }
  });

  /**
   * Server-sent events endpoint for streaming
   *
   * Optional endpoint for real-time updates and notifications.
   * Clients can subscribe to resource changes or system events.
   */
  app.get('/mcp/stream', async (req: Request, res: Response) => {
    // Verify authentication
    const authHeader = req.headers.authorization as string | undefined;

    if (!authHeader) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Provide Authorization header with Bearer token',
      });
    }

    let context: AdminContext;
    try {
      context = await verifyAuthHeader(authHeader);
    } catch (authError) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: authError instanceof Error ? authError.message : 'Unknown error',
      });
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Send initial connection event
    res.write(`data: ${JSON.stringify({
      type: 'connected',
      timestamp: new Date().toISOString(),
      actor: context.actorId,
    })}\n\n`);

    // Send heartbeat every 30 seconds
    const heartbeatInterval = setInterval(() => {
      res.write(`data: ${JSON.stringify({
        type: 'heartbeat',
        timestamp: new Date().toISOString(),
      })}\n\n`);
    }, 30000);

    // Handle client disconnect
    req.on('close', () => {
      clearInterval(heartbeatInterval);
      console.error('[HTTP] SSE client disconnected');
    });

    // TODO: Implement resource subscription logic
    // - Allow clients to subscribe to specific resources
    // - Push updates when resources change
    // - Implement efficient change detection (polling or event-based)
  });

  /**
   * 404 handler
   */
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Endpoint ${req.method} ${req.path} not found`,
      availableEndpoints: ['/health', '/mcp (POST)', '/mcp/stream (GET)'],
    });
  });

  /**
   * Global error handler
   */
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('[HTTP] Global error handler:', err);

    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal server error',
      },
      id: null,
    });
  });

  return app;
}

/**
 * Start HTTP server on specified port
 *
 * @param port - Port number to listen on
 * @param host - Host address to bind to
 */
export async function startHttpServer(port: number = 3000, host: string = '0.0.0.0'): Promise<void> {
  const app = createHttpServer();

  return new Promise((resolve, reject) => {
    const server = app.listen(port, host, () => {
      console.error(`[HTTP] Admin MCP Server listening on http://${host}:${port}`);
      console.error(`[HTTP] Health check: http://${host}:${port}/health`);
      console.error(`[HTTP] MCP endpoint: http://${host}:${port}/mcp`);
      console.error(`[HTTP] SSE stream: http://${host}:${port}/mcp/stream`);
      resolve();
    });

    server.on('error', (error) => {
      console.error('[HTTP] Server error:', error);
      reject(error);
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.error('[HTTP] Received SIGINT, shutting down gracefully...');
      server.close(() => {
        console.error('[HTTP] Server closed');
        process.exit(0);
      });
    });

    process.on('SIGTERM', () => {
      console.error('[HTTP] Received SIGTERM, shutting down gracefully...');
      server.close(() => {
        console.error('[HTTP] Server closed');
        process.exit(0);
      });
    });
  });
}

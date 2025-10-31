#!/usr/bin/env node
/**
 * STDIO Transport Adapter for Admin MCP Server
 *
 * Implements the MCP protocol over standard input/output streams.
 * Reads JSON-RPC requests line-by-line from stdin and writes responses to stdout.
 * Logs diagnostic messages to stderr to avoid polluting the protocol stream.
 */

import * as readline from 'readline';
import { AdminMCPServer } from '../../core/server.js';
import { verifyAuthHeader } from '../../core/auth/jwt-verify.js';
import type { MCPRequest, MCPResponse } from '../../core/server.js';
import type { AdminContext } from '../../types/index.js';

/**
 * Start STDIO MCP server
 *
 * Listens for JSON-RPC requests on stdin, processes them through the
 * AdminMCPServer, and writes responses to stdout. Authentication can
 * come from environment variables or request metadata.
 */
export async function startStdioServer(): Promise<void> {
  const server = new AdminMCPServer({ requestTimeout: 30000 });

  // Create readline interface for line-by-line input
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  // Log to stderr (not stdout which is reserved for protocol)
  const log = (message: string) => {
    process.stderr.write(`[STDIO] ${new Date().toISOString()} - ${message}\n`);
  };

  log('Admin MCP Server (STDIO) started');
  log('Listening for JSON-RPC 2.0 requests on stdin...');

  // Handle each line as a separate JSON-RPC request
  rl.on('line', async (line: string) => {
    // Skip empty lines
    if (!line.trim()) {
      return;
    }

    let request: MCPRequest;
    let requestId: string | number | null = null;

    try {
      // Parse JSON-RPC request
      try {
        request = JSON.parse(line);
        requestId = request.id;
      } catch (parseError) {
        // Invalid JSON - return parse error
        const errorResponse: MCPResponse = {
          jsonrpc: '2.0',
          error: {
            code: -32700,
            message: 'Parse error: Invalid JSON',
          },
          id: null,
        };
        console.log(JSON.stringify(errorResponse));
        log(`Parse error: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
        return;
      }

      log(`Request received: ${request.method} (id: ${request.id})`);

      // Extract authentication
      // Priority: request.meta.authorization > env var > error
      const authHeader =
        request.meta?.authorization ||
        process.env.MCP_AUTH_HEADER ||
        process.env.AUTHORIZATION;

      if (!authHeader && request.method !== 'ping') {
        // Allow ping without auth for health checks
        const errorResponse: MCPResponse = {
          jsonrpc: '2.0',
          error: {
            code: -32001,
            message: 'Authentication required. Provide authorization in request.meta.authorization or MCP_AUTH_HEADER env var.',
          },
          id: requestId,
        };
        console.log(JSON.stringify(errorResponse));
        log('Authentication missing');
        return;
      }

      // Verify authentication and create context
      let context: AdminContext;
      if (authHeader) {
        try {
          context = await verifyAuthHeader(authHeader);
          log(`Authenticated as: ${context.actorId} (${context.actorRole})`);
        } catch (authError) {
          const errorResponse: MCPResponse = {
            jsonrpc: '2.0',
            error: {
              code: -32001,
              message: authError instanceof Error ? authError.message : 'Authentication failed',
            },
            id: requestId,
          };
          console.log(JSON.stringify(errorResponse));
          log(`Authentication failed: ${authError instanceof Error ? authError.message : 'Unknown error'}`);
          return;
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
      const response = await server.handleRequest(request, context);

      // Write response to stdout
      console.log(JSON.stringify(response));
      log(`Response sent: ${response.error ? 'error' : 'success'} (id: ${response.id})`);
    } catch (error) {
      // Unexpected error in request handling
      const errorResponse: MCPResponse = {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error',
        },
        id: requestId,
      };
      console.log(JSON.stringify(errorResponse));
      log(`Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  // Handle stdin close
  rl.on('close', () => {
    log('Stdin closed, shutting down...');
    process.exit(0);
  });

  // Handle process signals for graceful shutdown
  process.on('SIGINT', () => {
    log('Received SIGINT, shutting down gracefully...');
    rl.close();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    log('Received SIGTERM, shutting down gracefully...');
    rl.close();
    process.exit(0);
  });

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    log(`Uncaught exception: ${error.message}`);
    log(error.stack || '');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    log(`Unhandled rejection: ${reason}`);
    process.exit(1);
  });
}

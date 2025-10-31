#!/usr/bin/env node
/**
 * Admin MCP Server - Main Entry Point
 *
 * Launches the Admin MCP server with the specified transport adapter.
 * Supports STDIO (for CLI integration) and HTTP (for web/API access).
 *
 * Usage:
 *   node dist/index.js stdio        # Start STDIO server
 *   node dist/index.js http         # Start HTTP server (port from PORT env)
 *   PORT=8080 node dist/index.js http  # Start HTTP server on custom port
 */

import dotenv from 'dotenv';
import { startStdioServer } from './adapters/stdio/index.js';
import { startHttpServer } from './adapters/http/index.js';

// Load environment variables from .env file
dotenv.config();

/**
 * Main entry point
 */
async function main() {
  // Determine transport from CLI args or env var
  const transport = process.argv[2] || process.env.MCP_TRANSPORT || 'stdio';

  // Parse port for HTTP transport
  const port = parseInt(process.env.PORT || '3000', 10);
  const host = process.env.HOST || '0.0.0.0';

  // Validate environment configuration
  if (!process.env.JWKS_URI) {
    console.error('ERROR: JWKS_URI environment variable is required for JWT verification');
    console.error('Set JWKS_URI to your authentication server\'s JWKS endpoint');
    process.exit(1);
  }

  if (!process.env.SUPABASE_URL) {
    console.error('ERROR: SUPABASE_URL environment variable is required');
    process.exit(1);
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    process.exit(1);
  }

  // Start appropriate transport
  switch (transport.toLowerCase()) {
    case 'stdio':
      await startStdioServer();
      break;

    case 'http':
      await startHttpServer(port, host);
      break;

    default:
      console.error(`ERROR: Unknown transport: ${transport}`);
      console.error('');
      console.error('Usage:');
      console.error('  node dist/index.js stdio    # Start STDIO transport');
      console.error('  node dist/index.js http     # Start HTTP transport');
      console.error('');
      console.error('Environment variables:');
      console.error('  MCP_TRANSPORT    - Transport type (stdio or http)');
      console.error('  PORT             - HTTP server port (default: 3000)');
      console.error('  HOST             - HTTP server host (default: 0.0.0.0)');
      console.error('  JWKS_URI         - JWT verification endpoint (required)');
      console.error('  JWT_AUDIENCE     - Expected JWT audience (default: admin-mcp)');
      console.error('  SUPABASE_URL     - Supabase project URL (required)');
      console.error('  SUPABASE_SERVICE_ROLE_KEY - Supabase service role key (required)');
      console.error('  MCP_AUTH_HEADER  - Default auth header for STDIO (optional)');
      process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  console.error('FATAL ERROR:', error);
  console.error(error.stack);
  process.exit(1);
});

/**
 * MCP Initialization - Register MCP servers as separate processes
 *
 * Each server runs as a standalone process and communicates via stdio using JSON-RPC 2.0
 */

import { getMCPHost } from './host/MCPHostRefactored';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Initialize all MCP servers as separate processes
 * Called on application startup
 */
export async function initializeMCP(): Promise<void> {
  const host = getMCPHost();

  console.log('[MCP] Initializing MCP servers as separate processes...');

  // Get the path to the servers directory
  const serversDir = path.join(process.cwd(), 'src/lib/mcp/servers');

  try {
    // Register Identity MCP Server
    await host.registerServer({
      name: 'Identity & Access MCP',
      version: '3.0.0',
      scopePrefix: 'identity',
      command: 'tsx', // Use tsx to run TypeScript directly
      args: [path.join(serversDir, 'identity/server.ts')],
      env: {
        // Pass any necessary environment variables
        DATABASE_URL: process.env.DATABASE_URL || '',
        SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      },
    });

    console.log('[MCP] Successfully initialized Identity MCP server');

    // Register Finance MCP Server
    await host.registerServer({
      name: 'Finance MCP',
      version: '3.0.0',
      scopePrefix: 'finance',
      command: 'tsx',
      args: [path.join(serversDir, 'finance/server.ts')],
      env: {
        DATABASE_URL: process.env.DATABASE_URL || '',
        SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      },
    });

    // Register Academic Operations MCP Server
    await host.registerServer({
      name: 'Academic Operations MCP',
      version: '3.0.0',
      scopePrefix: 'academic',
      command: 'tsx',
      args: [path.join(serversDir, 'academic/server.ts')],
      env: {
        DATABASE_URL: process.env.DATABASE_URL || '',
        SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      },
    });

    // Register Attendance & Compliance MCP Server
    await host.registerServer({
      name: 'Attendance & Compliance MCP',
      version: '3.0.0',
      scopePrefix: 'attendance',
      command: 'tsx',
      args: [path.join(serversDir, 'attendance/server.ts')],
      env: {
        DATABASE_URL: process.env.DATABASE_URL || '',
        SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      },
    });

    // Register Teacher MCP Server
    await host.registerServer({
      name: 'Teacher MCP',
      version: '3.0.0',
      scopePrefix: 'teacher',
      command: 'tsx',
      args: [path.join(serversDir, 'teacher/server.ts')],
      env: {
        DATABASE_URL: process.env.DATABASE_URL || '',
        SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      },
    });

    console.log(`[MCP] All 5 servers registered and connected`);
  } catch (error) {
    console.error('[MCP] Failed to initialize MCP servers:', error);
    throw error;
  }
}

/**
 * Get initialized MCP Host instance
 */
export async function getMCPHostInstance() {
  const host = getMCPHost();

  // Check if servers are registered
  const health = await host.healthCheck();

  if (health.servers.length === 0) {
    console.log('[MCP] No servers registered, initializing...');
    await initializeMCP();
  }

  return host;
}

/**
 * Cleanup function to close all server connections
 */
export async function shutdownMCP(): Promise<void> {
  console.log('[MCP] Shutting down MCP servers...');
  const host = getMCPHost();
  await host.close();
  console.log('[MCP] All servers shut down');
}

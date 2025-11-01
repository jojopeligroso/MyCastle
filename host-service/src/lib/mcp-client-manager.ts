/**
 * MCP Client Manager
 * Manages connections to multiple MCP servers
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn, ChildProcess } from 'child_process';

export interface MCPServerConfig {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  description?: string;
}

export interface MCPConnection {
  client: Client;
  config: MCPServerConfig;
  process: ChildProcess;
  connected: boolean;
  lastActivity: Date;
}

/**
 * Manages lifecycle of MCP server connections
 */
export class MCPClientManager {
  private connections: Map<string, MCPConnection> = new Map();
  private configs: Map<string, MCPServerConfig> = new Map();

  constructor() {
    this.loadConfigurations();
  }

  /**
   * Load MCP server configurations
   */
  private loadConfigurations() {
    // Admin MCP (Phase 1 - MVP)
    this.configs.set('admin', {
      name: 'admin-mcp',
      description: 'Administrative operations for ESL platform',
      command: 'node',
      args: [
        process.env.ADMIN_MCP_PATH || '../admin-mcp/dist/index.js',
        'stdio'
      ],
      env: {
        JWKS_URI: process.env.JWKS_URI!,
        SUPABASE_URL: process.env.SUPABASE_URL!,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        JWT_AUDIENCE: process.env.JWT_AUDIENCE || 'admin-mcp',
      },
    });

    // Future MCPs (commented out for now)
    /*
    this.configs.set('teacher', {
      name: 'teacher-mcp',
      description: 'Teaching workflows and lesson management',
      command: 'node',
      args: ['../teacher-mcp/dist/index.js', 'stdio'],
      env: { ... }
    });

    this.configs.set('student', {
      name: 'student-mcp',
      description: 'Student learning support and AI tutoring',
      command: 'node',
      args: ['../student-mcp/dist/index.js', 'stdio'],
      env: { ... }
    });
    */
  }

  /**
   * Get or create a connection to an MCP server
   */
  async getConnection(role: string): Promise<MCPConnection> {
    // Return existing connection if available and healthy
    const existing = this.connections.get(role);
    if (existing && existing.connected) {
      existing.lastActivity = new Date();
      return existing;
    }

    // Create new connection
    const config = this.configs.get(role);
    if (!config) {
      throw new Error(`Unknown MCP role: ${role}`);
    }

    console.log(`[MCP] Connecting to ${config.name}...`);

    // Create MCP client
    const client = new Client(
      {
        name: 'host-service',
        version: '1.0.0',
      },
      {
        capabilities: {
          roots: {
            listChanged: true,
          },
        },
      }
    );

    // Spawn MCP server process
    const serverProcess = spawn(config.command, config.args, {
      env: { ...process.env, ...config.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Handle process errors
    serverProcess.on('error', (error) => {
      console.error(`[MCP] ${config.name} process error:`, error);
      this.connections.delete(role);
    });

    serverProcess.on('exit', (code) => {
      console.log(`[MCP] ${config.name} exited with code ${code}`);
      this.connections.delete(role);
    });

    // Capture stderr for debugging
    serverProcess.stderr?.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg) {
        console.error(`[MCP] ${config.name} stderr:`, msg);
      }
    });

    // Create transport
    const transport = new StdioClientTransport({
      reader: serverProcess.stdout!,
      writer: serverProcess.stdin!,
    });

    // Connect to MCP server
    await client.connect(transport);

    console.log(`[MCP] Connected to ${config.name}`);

    const connection: MCPConnection = {
      client,
      config,
      process: serverProcess,
      connected: true,
      lastActivity: new Date(),
    };

    // Store connection
    this.connections.set(role, connection);

    return connection;
  }

  /**
   * Get MCP client for a role
   */
  async getClient(role: string): Promise<Client> {
    const connection = await this.getConnection(role);
    return connection.client;
  }

  /**
   * Disconnect from an MCP server
   */
  async disconnect(role: string): Promise<void> {
    const connection = this.connections.get(role);
    if (connection) {
      console.log(`[MCP] Disconnecting from ${connection.config.name}...`);

      try {
        await connection.client.close();
      } catch (error) {
        console.error(`[MCP] Error closing client:`, error);
      }

      connection.process.kill();
      this.connections.delete(role);

      console.log(`[MCP] Disconnected from ${connection.config.name}`);
    }
  }

  /**
   * Disconnect from all MCP servers
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.connections.keys()).map(
      (role) => this.disconnect(role)
    );
    await Promise.all(disconnectPromises);
  }

  /**
   * Get connection status for all MCPs
   */
  getStatus(): Record<string, { connected: boolean; lastActivity?: Date }> {
    const status: Record<string, any> = {};

    for (const [role, connection] of this.connections) {
      status[role] = {
        connected: connection.connected,
        lastActivity: connection.lastActivity,
      };
    }

    return status;
  }

  /**
   * Health check - verify MCP is responding
   */
  async healthCheck(role: string): Promise<boolean> {
    try {
      const client = await this.getClient(role);
      // Try to list resources as a health check
      await client.listResources();
      return true;
    } catch (error) {
      console.error(`[MCP] Health check failed for ${role}:`, error);
      return false;
    }
  }
}

// Singleton instance
export const mcpManager = new MCPClientManager();

// Cleanup on process exit
process.on('beforeExit', async () => {
  await mcpManager.disconnectAll();
});

process.on('SIGINT', async () => {
  await mcpManager.disconnectAll();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await mcpManager.disconnectAll();
  process.exit(0);
});
